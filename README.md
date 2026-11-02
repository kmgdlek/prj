<div align="center">

# 🌙 탐라신화 3D

### 설문대할망의 섬 — 돌려 보고, 눌러 보고, 물어보는 제주 신화 지도

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?logo=threedotjs&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-vapor-7952B3?logo=bootstrap&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-DB-3FCF8E?logo=supabase&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-AI_Agent-D97757)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

제주대 청년도약 부트캠프 1기 · 제주 콘텐츠·문화 IP 프로젝트

### 🔗 [라이브 데모 → prj-kappa-nine.vercel.app](https://prj-kappa-nine.vercel.app/)

</div>

---

## ✨ 기획 의도

치마폭의 흙으로 한라산을 쌓고, 흘린 흙이 368개의 오름이 되었다는 **설문대할망**.
제주에는 *1만 8천 신*의 이야기가 있지만, 책 속에 머물러 있어 여행자가 만나기 어렵습니다.

**탐라신화 3D**는 신화를 *읽는 콘텐츠*에서 *걸어 다니는 지도*로 바꿉니다.
3D 섬 위의 빛나는 구슬을 누르면 신화가 열리고, 그 신화의 실제 장소·국가유산·날씨까지 공공데이터로 이어집니다.
궁금한 건 **이야기꾼 AI**에게 물어보면, 에이전트가 알아서 도구를 골라 답합니다.

## 🗺️ 주요 기능

| 메뉴 | 설명 |
|---|---|
| 🌌 **신화의 섬** | three.js 로 만든 3D 제주. 한라산 지형, 368개 오름, 별·달·파도, 신화 마커 8곳. 드래그로 회전·휠로 확대 |
| 📖 **신화 도감** | 신화 8편 목록 ↔ 3D 지도가 같은 선택을 공유. 고르면 카메라가 그 장소로 날아가고, 주변 관광지를 TourAPI 로 찾아옴 |
| 📍 **신화 속 장소** | 한국관광공사 TourAPI 검색 결과가 3D 섬 위에 구슬로 표시 |
| 🏛️ **국가유산** | 국가유산청 오픈API 로 제주의 유산을 검색, 좌표를 3D 에 표시 |
| 🤖 **이야기꾼 AI** | Claude 에이전트가 신화·관광·날씨·유산 **5개 도구**(신화·관광·날씨·유산·상품)를 스스로 골라 호출하고, 어떤 도구를 썼는지 화면에 공개 |
| 🔐 **로그인·회원가입** | Supabase Auth(이메일+비밀번호). 별자리·장바구니·주문이 내 계정에만 보이도록 RLS 로 보호 |
| 🛍️ **제주 장터** | 한라봉·오메기떡·돌하르방 등 제주 특산품·기념품 9종. 담기 → 장바구니(수량·삭제·합계) → 주문하기(주문 내역 저장, 실제 결제 없음) |
| ⭐ **내 별자리** | 별표를 누른 신화·장소·유산을 Supabase 에 저장 · 삭제. 별을 누르면 이야기와 Pixabay 사진이 열림 |

## 🌐 사용한 API (공공데이터 3 + 오픈 1)

| # | API | 제공 | 용도 |
|---|---|---|---|
| 1 | 국문 관광정보 서비스 (TourAPI) | 한국관광공사 | 신화 속 장소·문화시설·축제 검색 |
| 2 | 단기예보 조회서비스 | 기상청 | 서귀포·제주시 날씨, 비 오면 실내 대안 제안 |
| 3 | 국가유산 검색 오픈API | 국가유산청 | 신화·민속과 이어진 유산 검색 |
| 4 | 이미지 검색 API | Pixabay | 내 별자리 상세 화면의 관련 사진 |

> 신화 원천 데이터(`server/myths.js`)는 이 프로젝트의 자체 콘텐츠이며, 에이전트의 4번째 도구 `get_myth_story` 로도 쓰입니다.

## 🏗️ 아키텍처

```mermaid
flowchart LR
  U[👤 브라우저<br/>React + three.js] -->|fetch /api/*| F[⚡ Vercel Functions<br/>api/]
  U <-->|favorites| S[(🟢 Supabase)]
  F --> T[TourAPI]
  F --> W[기상청 단기예보]
  F --> H[국가유산청]
  F --> M[(myths.js)]
  F <-->|tool use 루프| C[🤖 Claude]
```

- **키는 서버에만.** 공공데이터·Claude 키는 `/api` 안에서만 쓰고, 브라우저에는 `VITE_` 값(Supabase anon)만 내려갑니다.
- **`server/` 공용.** 화면용 API(`api/tour.js`)와 에이전트(`api/agent.js`)가 같은 함수를 재사용합니다.

### 에이전트 루프

```
질문 → Claude가 도구 선택 → 서버가 도구 실행 → 결과를 Claude에 전달 → (반복, 최대 5회) → 최종 답
```

## 🧱 폴더 구조

```
api/          Vercel 서버 함수 (비밀 키는 여기서만)  hello · tour · weather · heritage · agent
server/       공공데이터 호출 + 신화 데이터          tour · weather · heritage · myths
supabase/     schema.sql  (favorites 테이블 + RLS)
src/
  main.jsx          Bootswatch 'vapor' 테마 + 라우터 시작
  router.jsx        메뉴(NAV_ITEMS) + 주소별 페이지 (Router: 이동 경로)
  store/            Zustand 전역 상태 (Store: 공유 내용) — 닉네임·토스트·선택한 신화·즐겨찾기·대화
  layouts/          공통 틀 (메뉴·푸터·토스트)
  components/       Jeju3D(three.js) · Scene(lazy) · ItemCard · WeatherBadge ...
  pages/            Home · Myths · Places · Heritage · Agent · My
```

## 🎮 3D 구현 포인트

- **절차적 지형** — 타원형 섬 + 한라산 가우시안 봉우리를 높이 함수 `heightAt(x, z)` 하나로 만들고, 정점 색을 높이별(모래·초원·암석·정상의 눈)로 칠했습니다. 마커도 같은 함수로 지표면에 얹습니다.
- **InstancedMesh** — 오름 368개를 드로우콜 1번으로. 고정 난수라 누구에게나 같은 섬이 나옵니다.
- **위·경도 → 3D** — 실제 좌표를 `toXZ(lat, lng)` 로 변환해 신화 장소가 실제 위치에 놓입니다.
- **카메라 연출** — 선택한 마커로 부드럽게 날아간 뒤 다시 자유 회전.
- **코드 스플리팅** — three.js(≈950 kB)는 `React.lazy` 로 3D 가 필요할 때만 내려받습니다.

## 🚀 실행하기

```bash
npm install
cp .env.example .env.local     # 값 채우기
npm run dev                    # 화면만  → http://localhost:5173
vercel dev                     # 화면 + /api 서버 함수 → http://localhost:3000
```

### 환경변수

| 이름 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase 프로젝트 (브라우저 공개 가능) |
| `DATA_GO_KR_KEY` | 공공데이터포털 **Decoding** 키 (서버 전용) |
| `ANTHROPIC_API_KEY` | Claude 키 (서버 전용, 절대 커밋 금지) |
| `PIXABAY_KEY` | Pixabay 무료 키 (서버 전용) |

### Supabase 준비

1. 프로젝트 생성 후 SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) 실행 (favorites · cart_items · orders 테이블과 RLS. 여러 번 실행해도 안전)
2. Authentication → Providers → Email 에서 **Confirm email** 을 끄면 가입 즉시 로그인됩니다(수업용). 켜 두면 메일 인증 후 로그인
3. 첫 화면의 **동작 체크** 카드가 모두 초록색이면 연결 성공

### 단계별 확인 (홈 화면 "동작 체크")

- [x] React · 라우터
- [ ] Supabase 연결
- [ ] 서버 함수 `/api`

## ☁️ Vercel 배포

1. GitHub 에 push → Vercel 에서 *Import Project*
2. Environment Variables 에 위 4~5개 값 등록
3. Deploy — `vercel.json` 이 SPA 라우팅(`/api` 제외)과 서울 리전(`icn1`)을 설정합니다

## 🎨 디자인

Bootstrap 5 + Bootswatch **vapor**(네온 다크). 신화의 밤하늘에 맞춰 골랐고, `src/main.jsx` 의 테마 이름 한 단어로 전체 분위기를 바꿀 수 있습니다.

## 📄 라이선스 · 출처

데이터 출처: 공공데이터포털 — 한국관광공사, 기상청, 국가유산청. 신화 내용은 구전 설화를 요약·재구성한 것입니다.
