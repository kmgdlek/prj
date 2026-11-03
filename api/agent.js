import { searchTour } from '../server/tour.js';
import { getWeather } from '../server/weather.js';
import { searchHeritage } from '../server/heritage.js';
import { findMyth, getMythStory } from '../server/myths.js';
import { searchProducts } from '../server/products.js';

// ── 모델 고르기 ─────────────────────────────────────────────────
// 무료 한도는 모델마다 달라서(큰 모델은 하루 20번, lite 모델은 하루 500번 정도) 가벼운 lite 모델부터 쓴다. 그리고 모델 이름은 자주 바뀌고,
// 옛 모델은 새 사용자에게 막히고, 몰린 모델은 느리거나 끊긴다. 그래서
//  ① GEMINI_MODEL 을 정했으면 그 모델, 아니면 이 키로 쓸 수 있는 flash 모델을 Google 에 물어 가장 새 lite 모델부터 시작하고, 호출마다 시간 제한(12초)을 두고,
//  ② 못 쓰거나(404·429·503) 시간이 넘으면 다음 모델(다른 lite → 큰 flash)로 차례로 넘어가고,
//  ③ 잘 되는 모델을 이 서버가 켜져 있는 동안 기억한다. 한 요청은 25초 안에 끝낸다.
let learnedModel = null;
let modelList = null;
const CALL_TIMEOUT = 12000, TOTAL_BUDGET = 25000;
const API = 'https://generativelanguage.googleapis.com/v1beta';

// 시작할 모델: 직접 정한 것 > 지난번에 잘 됐던 것 > 쓸 수 있는 모델 중 가장 새 lite > (목록을 못 받으면) 기본값
const startModel = async () => process.env.GEMINI_MODEL || learnedModel || (await discoverModels())[0] || 'gemini-3.8-flash';

async function discoverModels() {
  if (modelList) return modelList;
  try {
    const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(6000) });
    const data = await r.json();
    modelList = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /flash/.test(m.name) && !/image|tts|audio|live|native|robotics|computer|embedding|vision|exp/.test(m.name))
      .map((m) => m.name.replace(/^models\//, ''))
      .sort((a, b) => (/lite/.test(b) - /lite/.test(a)) || (a < b ? 1 : -1));   // lite 먼저, 그다음 이름이 큰(새) 것부터
  } catch { modelList = []; }
  return modelList;
}

// ① 도구 설명서: 모델은 이 설명만 보고 "어떤 도구를 언제 쓸지" 결정한다
const tools = [
  {
    name: 'get_myth_story',
    description: '탐라 신화(설문대할망·오백장군·삼성혈·영등할망 등)의 이야기와 신화 속 장소를 찾는다. 신화 질문에는 가장 먼저 쓴다',
    input_schema: {
      type: 'object',
      properties: { keyword: { type: 'string', description: '신화 이름이나 장소 (예: 설문대할망, 산방산). 비우면 전체 목록' } },
    },
  },
  {
    name: 'show_on_map',
    description: '사용자가 "지도에서 보여줘", "~로 데려가 줘"처럼 3D 지도에서 어떤 신화 장소를 보고 싶다고 할 때 쓴다. 그러면 화면의 3D 지도가 그 장소로 이동한다',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string', description: '신화 이름이나 장소 (예: 삼성혈, 산방산, 설문대할망, 한라산)' } },
      required: ['place'],
    },
  },
  {
    name: 'search_tour_places',
    description: '한국관광공사 TourAPI로 제주의 관광지·문화시설·축제·음식점을 검색한다. 비 오는 날·실내 질문에는 contentTypeId 14(문화시설: 박물관·미술관·전시관)를 쓰고, 키워드는 "박물관" "미술관" 처럼 짧은 낱말 하나만 쓴다. 실내외 정보는 결과에 없으니 문화시설(14)만 "실내 대안"이라고 부른다',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '검색어 (예: 한라산, 삼성혈, 용두암)' },
        contentTypeId: { type: 'string', description: '12 관광지, 14 문화시설, 15 축제·행사, 39 음식점' },
      },
    },
  },
  {
    name: 'search_products',
    description: '제주 장터에서 파는 특산품·기념품을 찾는다 (한라봉, 오메기떡, 돌하르방, 에코백 등). 가격은 주식처럼 1분마다 오르내리며 평소에도 정가(price)보다 5~15% 높다. salePrice 가 지금 판매가, vsListPercent 가 정가 대비 % (양수면 정가보다 비쌈), flashPercent 가 평소 시세 대비 타임특가 할인율, stock 이 지금 재고다. 선물·기념품·살 거리 질문에 쓴다',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '상품 검색어 (예: 돌하르방, 차)' },
        category: { type: 'string', description: '과일, 간식, 기념품, 차, 공예, 굿즈 중 하나' },
        maxPrice: { type: 'number', description: '이 가격(원) 이하만' },
      },
    },
  },
  {
    name: 'get_weather',
    description: '기상청 단기예보로 제주시/서귀포시의 앞으로 몇 시간 기온·하늘·강수를 조회한다',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string', enum: ['제주시', '서귀포시'] } },
      required: ['place'],
    },
  },
  {
    name: 'search_heritage',
    description: '국가유산청 API로 신화·민속과 이어진 제주의 국가유산(천연기념물·민속문화유산 등)을 이름으로 검색한다',
    input_schema: { type: 'object', properties: { keyword: { type: 'string' } } },
  },
];

// ② 도구 이름 → 실제 실행할 함수
const runTool = {
  get_myth_story: async (input) => getMythStory(input),
  show_on_map: async ({ place }) => {
    const m = findMyth(place);
    return m ? { moved: true, id: m.id, title: m.title, place: m.place } : { moved: false, error: '지도에 표시된 신화 장소에서 찾지 못했다' };
  },
  search_tour_places: searchTour,
  search_products: async (input) => searchProducts(input),
  get_weather: getWeather,
  search_heritage: searchHeritage,
};

const SYSTEM = `너는 '탐라 신화 여행' 서비스의 이야기꾼 가이드 에이전트다.
- '지도에서 보여 줘' 같은 요청은 show_on_map(지도가 실제로 그 장소로 움직인다), 신화 이야기는 get_myth_story, 실제 장소는 search_tour_places, 국가유산은 search_heritage, 날씨는 get_weather, 살 만한 특산품은 search_products 도구로 확인한 뒤 답한다.
- 도구 결과에 없는 장소나 신화는 지어내지 않는다.
- 갈 만한 곳·박물관·전시관·맛집을 추천하기 전에는 반드시 search_tour_places 로 검색하고, 검색 결과에 나온 곳만 추천한다 (너 자신의 기억으로 장소를 말하지 않는다). 결과가 없으면 없다고 말한다.
- 날씨와 장소를 함께 묻는 질문은 get_weather 와 search_tour_places 를 모두 쓴다. 비·실내 대안은 문화시설(contentTypeId 14)을 키워드 "박물관" 같은 짧은 낱말 하나로 찾고, 문화시설(14)이 아닌 곳(공원·오름 등)을 '실내'라고 부르지 않는다. 국가유산 질문에는 search_heritage 결과의 이름만 말한다.
- 비가 오거나 강수확률이 높으면 실내 대안(박물관·전시관)을 함께 제안한다.
- 신화 한 줄 + 갈 만한 장소 + 날씨 팁 순서로, 한국어 5문장 이내로 짧게 답한다.`;

// 도구 한 번 실행: 결과를 돌려주고, 화면에 보여 줄 기록(steps)과 화면이 실행할 동작(actions)을 쌓는다
async function execTool(name, input, steps, actions) {
  let result;
  try { result = await runTool[name](input ?? {}); }
  catch (e) { result = { error: e.message }; }
  steps.push({ tool: name, args: input, count: Array.isArray(result) ? result.length : result?.moved ? 1 : 0 });
  if (name === 'show_on_map' && result?.moved) actions.push({ type: 'map', mythId: result.id, title: result.title });
  return result;
}

// ③ 에이전트 루프(Gemini function calling): 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
const geminiTools = [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];

// 모델 한 번 호출. 안 되면 다른 모델로 넘어간다 (st: 이 요청의 상태 — 지금 모델, 시도한 모델, 마감 시각)
async function callGemini(body, st) {
  let lastErr;
  for (let n = 0; n < 6; n++) {
    const left = st.deadline - Date.now();
    if (left < 1500) break;
    try {
      const r = await fetch(`${API}/models/${st.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT, left)),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { learnedModel = st.model; return data; }
      lastErr = Object.assign(new Error(data.error?.message ?? r.statusText), { status: r.status });
      const suggested = r.status === 404 && /use models\/([A-Za-z0-9._-]+)/.exec(lastErr.message)?.[1];   // 단종된 모델이면 오류 문구가 새 모델을 알려 준다
      if (suggested && !st.tried.has(suggested)) { st.tried.add(st.model); st.model = suggested; continue; }
      if (![404, 429, 500, 503].includes(r.status)) throw lastErr;                                          // 키 오류 같은 건 모델을 바꿔도 소용없다
    } catch (e) {
      if (e.name !== 'TimeoutError' && e.name !== 'AbortError') throw e;
      lastErr = Object.assign(new Error('AI 응답이 늦어요'), { status: 504 });
    }
    st.tried.add(st.model);
    const next = (await discoverModels()).find((m) => !st.tried.has(m));
    if (!next) break;
    st.model = next;
  }
  throw lastErr ?? Object.assign(new Error('AI 응답이 늦어요'), { status: 504 });
}

async function runAgent({ message, history }, steps, actions) {
  const st = { model: await startModel(), tried: new Set(), deadline: Date.now() + TOTAL_BUDGET };
  // 대화는 Gemini 형식(role: user | model, parts)으로. 첫 칸은 반드시 사용자 말이어야 해서, 앞쪽의 모델 말은 뺀다
  const past = history.slice(-10).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content ?? '') }] }));
  while (past.length && past[0].role !== 'user') past.shift();
  const contents = [...past, { role: 'user', parts: [{ text: message }] }];
  for (let turn = 0; turn < 5; turn++) {
    const data = await callGemini({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, tools: geminiTools, generationConfig: { maxOutputTokens: 4096 } }, st);
    const cand = data.candidates?.[0];
    const parts = cand?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const text = parts.map((p) => p.text).filter(Boolean).join('\n');
      if (!text && data.promptFeedback?.blockReason) throw new Error('이 질문에는 답할 수 없어요. 다르게 물어봐 주세요.');
      return text;
    }
    contents.push(cand.content); // 모델의 도구 호출 요청을 대화에 그대로 기록 (모델이 붙인 서명 포함)
    const responses = [];
    for (const p of calls) {
      const result = await execTool(p.functionCall.name, p.functionCall.args ?? {}, steps, actions);
      responses.push({ functionResponse: { name: p.functionCall.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: responses }); // 도구 결과를 돌려줌
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { message, history = [] } = req.body ?? {};
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY 가 설정되지 않았어요' });
  const steps = []; // 화면에 "에이전트가 무엇을 했는지" 보여주기용
  const actions = []; // 화면이 실제로 실행할 동작 (예: 3D 지도 이동)

  try {
    const answer = await runAgent({ message, history }, steps, actions);
    res.status(200).json({ answer: answer ?? '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps, actions });
  } catch (e) {
    const keyBad = e.status === 401 || e.status === 403 || (e.status === 400 && /api key/i.test(e.message));
    const msg = e.status === 429 ? '무료 사용량을 잠깐 넘었어요. 1분 뒤 다시 시도하세요.'
      : e.status === 503 || e.status === 504 ? 'AI가 지금 많이 바빠요. 잠시 뒤 다시 물어봐 주세요.'
      : keyBad ? 'Gemini API 키가 올바르지 않아요'
      : e.message;
    res.status(e.status ?? 500).json({ error: msg });
  }
}
