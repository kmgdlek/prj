import Anthropic from '@anthropic-ai/sdk';
import { searchTour } from '../server/tour.js';
import { getWeather } from '../server/weather.js';
import { searchHeritage } from '../server/heritage.js';
import { findMyth, getMythStory } from '../server/myths.js';
import { searchProducts } from '../server/products.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5-5';

// ① 도구 설명서: Claude는 이 설명만 보고 "어떤 도구를 언제 쓸지" 결정한다
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
    description: '한국관광공사 TourAPI로 신화와 관련된 제주의 관광지·문화시설·축제·음식점을 검색한다',
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
    description: '제주 장터에서 파는 특산품·기념품을 찾는다 (한라봉, 오메기떡, 돌하르방, 에코백 등). 가격은 1분마다, 재고는 10분마다 바뀌는 타임특가(최대 20% 추가 인하)이며, 결과의 salePrice 가 지금 판매가, flashPercent 가 추가 인하율, stock 이 지금 재고다. 선물·기념품·살 거리 질문에 쓴다',
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
- 비가 오거나 강수확률이 높으면 실내 대안(박물관·전시관)을 함께 제안한다.
- 신화 한 줄 + 갈 만한 장소 + 날씨 팁 순서로, 한국어 5문장 이내로 짧게 답한다.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { message, history = [] } = req.body ?? {};
  const messages = [...history.slice(-10), { role: 'user', content: message }]; // 최근 10개만 보내 비용 절약
  const steps = []; // 화면에 "에이전트가 무엇을 했는지" 보여주기용
  const actions = []; // 화면이 실제로 실행할 동작 (예: 3D 지도 이동)

  try {
    // ③ 에이전트 루프: 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
    for (let turn = 0; turn < 5; turn++) {
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools,
        messages,
      });

      if (r.stop_reason !== 'tool_use') {
        const answer = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        return res.status(200).json({ answer, steps, actions });
      }

      messages.push({ role: 'assistant', content: r.content }); // Claude의 도구 호출 요청을 대화에 기록
      const results = [];
      for (const block of r.content) {
        if (block.type !== 'tool_use') continue;
        let result;
        try { result = await runTool[block.name](block.input ?? {}); }
        catch (e) { result = { error: e.message }; }
        steps.push({ tool: block.name, args: block.input, count: Array.isArray(result) ? result.length : result?.moved ? 1 : 0 });
        if (block.name === 'show_on_map' && result?.moved) actions.push({ type: 'map', mythId: result.id, title: result.title });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: results }); // 도구 결과를 Claude에게 돌려줌
    }
    res.status(200).json({ answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps, actions });
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도하세요.' : e.message });
  }
}
