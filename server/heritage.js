// 국가유산청 국가유산 검색 오픈API (키 불필요, XML 응답)
// 목록(SearchKindOpenapiList)에는 사진이 없어서, 항목마다 상세(SearchKindOpenapiDt)를 불러 사진·설명을 붙인다.
import { XMLParser } from 'fast-xml-parser';
// 번호(ccbaAsno)는 앞자리 0이 의미 있으므로 숫자로 바꾸지 않고 문자열 그대로 읽는다
const parser = new XMLParser({ parseTagValue: false });
const BASE = 'https://www.khs.go.kr/cha';

const toArray = (item) => (!item ? [] : Array.isArray(item) ? item : [item]);
const https = (url) => (url ? String(url).replace(/^http:\/\//, 'https://') : '');  // http 이미지는 https 페이지에서 막힘

async function getDetail(h) {
  const params = new URLSearchParams({ ccbaKdcd: h.ccbaKdcd, ccbaAsno: h.ccbaAsno, ccbaCtcd: h.ccbaCtcd });
  const r = await fetch(`${BASE}/SearchKindOpenapiDt.do?${params}`, { signal: AbortSignal.timeout(5000) });
  const item = parser.parse(await r.text())?.result?.item;
  return { image: https(item?.imageUrl), desc: String(item?.content ?? '').trim().slice(0, 300) };
}

export async function searchHeritage({ keyword = '', rows = 10 } = {}) {
  const params = new URLSearchParams({ ccbaCtcd: '50', pageUnit: String(rows), pageIndex: '1' }); // 50 = 제주
  if (keyword) params.set('ccbaMnm1', keyword);
  const r = await fetch(`${BASE}/SearchKindOpenapiList.do?${params}`);
  const list = toArray(parser.parse(await r.text())?.result?.item);

  // 상세 호출이 몇 개 실패해도 목록은 보여 주도록 allSettled
  const details = await Promise.allSettled(list.map(getDetail));
  return list.map((h, i) => ({
    name: h.ccbaMnm1, kind: h.ccmaName, city: h.ccsiName,
    lat: h.latitude, lng: h.longitude,
    image: details[i].value?.image || '',
    desc: details[i].value?.desc || '',
  }));
}
