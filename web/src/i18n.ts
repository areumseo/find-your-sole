export type Locale = 'ko' | 'en';

const KEY = 'fys.locale';

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let current: Locale = detect();
const listeners = new Set<() => void>();

export const getLocale = (): Locale => current;

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // not persisted; still applies for this session
  }
  document.documentElement.lang = next;
  document.title = t().pageTitle;
  listeners.forEach((fn) => fn());
}

export const onLocaleChange = (fn: () => void): void => {
  listeners.add(fn);
};

const ko = {
  pageTitle: 'Find Your Sole · 러닝화 추천',
  navHome: '홈',
  navSearch: '검색',
  navSaved: '저장',
  navCompare: '비교',
  navMe: '마이페이지',
  navAbout: '앱 정보',
  navMore: '더보기',
  langToggle: 'EN',
  langToggleLabel: 'Switch to English',

  heroSubtitle: '러닝 경험이 어느 정도인가요?',
  beginnerTitle: '러닝 초심자',
  beginnerSubtitle: '입문 ~ 1년',
  beginnerDescription: '전문 용어 없이 쉽게 추천받아요',
  expertTitle: '러닝 경험자',
  expertSubtitle: '1년 이상',
  expertDescription: '발 유형부터 훈련 스타일까지 정밀하게 추천받아요',
  beginnerModeTitle: '🌱 초심자 모드',
  expertModeTitle: '🏃 경험자 모드',
  back: '뒤로',

  sectionFrequency: '러닝 경험',
  sectionTerrain: '주로 어디서 뛰나요?',
  sectionPain: '불편한 부위가 있나요? (복수 선택 가능)',
  sectionWideFoot: '발볼이 넓은 편인가요?',
  wideFootYes: '넓은 편이에요',
  wideFootNo: '보통이에요',
  sectionWeight: '체중 (선택)',
  weightUnder60: '60kg 미만',
  weight60to80: '60~80kg',
  weightOver80: '80kg 이상',
  btnRecommend: '추천 받기',
  freq: ['이제 막 시작했어요', '6개월 미만', '1년 미만'],
  terrains: ['공원 / 도로', '산 / 흙길'],
  pains: ['없음', '무릎', '발목', '발바닥 (족저근막염 등)', '여러 곳이 불편해요'],
  sectionBudget: (won: number) => `예산 (${won / 10000}만원 이하)`,
  sectionWeeklyKm: (km: number) => `주간 러닝 거리 (${km}km)`,

  sectionArch: '발 아치',
  sectionPronation: '프로네이션',
  sectionMainTerrain: '주 지면',
  sectionUseCase: '용도 (복수 선택)',
  sectionCushion: '쿠션 선호도',
  sectionWidth: '발볼',
  arch: ['보통 (normal)', '평발 (flat)', '높은 아치 (high)'],
  pronation: ['뉴트럴', '약한 과내전', '과내전'],
  terrainShort: ['로드', '트레일'],
  useCases: ['데일리', '장거리', '레이스', '입문', '회복런', '트레일'],
  cushions: ['낮음', '중간', '높음', '최고'],
  widths: ['좁음', '보통', '넓음'],

  resultsTitle: '추천 결과',
  weight: '무게',
  drop: '드롭',
  cushion: '쿠션',
  width: '발볼',
  naverShopping: '네이버 쇼핑에서 보기',
  explanationError: '설명을 불러오지 못했어요.',
  errorRecommend: (e: string) => `오류가 발생했어요: ${e}`,
  wakingServer: '서버를 깨우는 중이에요. 처음에는 최대 1분 정도 걸릴 수 있어요…',
  noResults: '조건에 맞는 신발을 찾지 못했어요',
  addFavorite: '저장하기',
  removeFavorite: '저장 해제',
  addToMyShoes: '내 신발에 추가',
  toggleDetails: '자세히 보기',

  savedTitle: '저장한 신발',
  savedEmpty: '저장한 신발이 없어요',
  savedHint: '추천 결과에서 ♡를 눌러 저장해 보세요',

  homeGreeting: '나에게 맞는 러닝화 찾기',
  homeSubtitle: '질문 몇 개에 답하면 발과 러닝 스타일에 맞는 러닝화를 추천해 드려요.',
  statShoes: '보유 신발',
  statKm: '누적 거리',
  statSoon: '교체 임박',
  statSaved: '저장한 신발',
  pairs: (n: number) => `${n}켤레`,
  count: (n: number) => `${n}개`,
  widgetMyShoes: '내 신발 현황',
  widgetSaved: '저장한 신발',
  widgetNews: '신발 출시 소식',
  newsCredit: '뉴스 검색 제공: 네이버',
  viewAll: '모두 보기',
  soonLabel: '교체 임박',
  myShoesWidgetEmpty: '아직 등록한 신발이 없어요',
  myShoesWidgetEmptyCta: '신발 추가하기',
  savedWidgetEmpty: '아직 저장한 신발이 없어요',
  savedWidgetEmptyCta: '러닝화 찾으러 가기',

  searchTitle: '러닝화 검색',
  mePageTitle: '마이페이지',
  deviceNotice: '저장한 신발과 내 신발은 이 기기의 브라우저에만 저장돼요. 다른 기기나 iOS 앱과는 공유되지 않아요.',
  settingsTitle: '설정',
  languageLabel: '언어',
  moreTitle: '더보기',

  myShoesTitle: '내 신발',
  myShoesEmpty: '신발을 추가해보세요',
  addShoe: '신발 추가',
  shoeAdded: (name: string) => `${name} 추가됐어요 👟`,
  shoeName: '신발 이름',
  brand: '브랜드',
  kmUpdate: '거리 업데이트',
  delete: '삭제',
  cancel: '취소',
  save: '저장',
  replaceTime: '교체 시기',
  cumulativeKm: '누적 거리 업데이트',
  cumulativeKmLabel: '누적 km',
  confirmDelete: (name: string) => `${name}을(를) 삭제할까요?`,

  priceRange: (p: number): string =>
    p < 100000 ? '10만원 미만' : p < 150000 ? '10~15만원대' : p < 200000 ? '15~20만원대' : '20만원 이상',
  tag: (t: string) => t,
  cushionName: (c: string) => c,
  widthName: (w: string) => w,

  aboutTitle: '앱 정보',
  licensesTitle: '📄 오픈소스 라이선스',
  licensesBody: 'IBM Plex Sans KR\nCopyright © 2017 IBM Corp. with Reserved Font Name "Plex"\nSIL Open Font License 1.1',
  licensesLink: '라이선스 전문 보기',
  aboutCards: [
    {
      title: '🔍 Find Your Sole 소개',
      body: '초심자부터 경험자까지, 간단한 질문에 답하면 나에게 맞는 러닝화를 추천해드립니다.',
    },
    {
      title: '⚙️ 추천 로직',
      body: '추천 결과는 발 아치, 프로네이션, 지면, 쿠션 선호도, 발볼, 주간 거리, 예산, 체중을 반영한 룰 기반 점수 알고리즘으로 계산됩니다.\n\nAI(Claude Haiku)는 신발이 나에게 맞는 이유를 설명하는 데만 사용되며, 순위 계산에는 사용되지 않습니다.',
    },
    {
      title: '📦 데이터 및 가격 정보',
      body: '러닝화 데이터는 RunRepeat 및 브랜드 공식 사이트를 참고해 약 50개 모델을 수동으로 정리한 것입니다.\n\n가격은 참고용 가격대이며, 실제 가격과 다를 수 있습니다. 정확한 가격은 네이버 쇼핑 또는 브랜드 공식 사이트에서 확인하세요.',
    },
    {
      title: '⚠️ 면책 조항',
      body: '이 앱은 러닝화 선택을 돕기 위한 참고 도구이며, 의학적 진단이나 처방이 아닙니다. 발이나 관절에 이상이 있으신 분은 전문의와 상담하시기 바랍니다.',
    },
    {
      title: '📬 피드백',
      body: 'UAT 참여 및 피드백 환영합니다. 지속적으로 기능을 개선하고 있습니다.',
    },
  ],
};

type Strings = typeof ko;

const TAGS_EN: Record<string, string> = {
  데일리: 'Daily', 장거리: 'Long Run', 레이스: 'Race', 입문: 'Beginner',
  회복런: 'Recovery', 트레일: 'Trail', 템포: 'Tempo', 인터벌: 'Interval',
};
const CUSHION_EN: Record<string, string> = { 낮음: 'Low', 중간: 'Medium', 높음: 'High', 최고: 'Maximum' };
const WIDTH_EN: Record<string, string> = { 좁음: 'Narrow', 보통: 'Normal', 넓음: 'Wide' };

const en: Strings = {
  pageTitle: 'Find Your Sole · Running Shoe Finder',
  navHome: 'Home',
  navSearch: 'Search',
  navSaved: 'Saved',
  navCompare: 'Compare',
  navMe: 'My Page',
  navAbout: 'About',
  navMore: 'More',
  langToggle: '한국어',
  langToggleLabel: '한국어로 전환',

  heroSubtitle: 'How much running experience do you have?',
  beginnerTitle: 'Beginner',
  beginnerSubtitle: 'Up to 1 year',
  beginnerDescription: 'Get recommendations without the jargon',
  expertTitle: 'Experienced Runner',
  expertSubtitle: '1+ years',
  expertDescription: 'Precise recommendations based on your running profile',
  beginnerModeTitle: '🌱 Beginner Mode',
  expertModeTitle: '🏃 Expert Mode',
  back: 'Back',

  sectionFrequency: 'Running experience',
  sectionTerrain: 'Where do you usually run?',
  sectionPain: 'Any discomfort or pain? (multi-select)',
  sectionWideFoot: 'Do you have wide feet?',
  wideFootYes: 'Yes, wide feet',
  wideFootNo: 'Normal width',
  sectionWeight: 'Weight (optional)',
  weightUnder60: 'Under 60kg',
  weight60to80: '60–80kg',
  weightOver80: 'Over 80kg',
  btnRecommend: 'Get Recommendations',
  freq: ['Just starting out', 'Under 6 months', 'Under 1 year'],
  terrains: ['Park / Road', 'Trail / Dirt'],
  pains: ['None', 'Knee', 'Ankle', 'Plantar fascia', 'Multiple areas'],
  sectionBudget: (won: number) => `Budget (under ₩${won.toLocaleString('en-US')})`,
  sectionWeeklyKm: (km: number) => `Weekly distance (${km}km)`,

  sectionArch: 'Foot arch',
  sectionPronation: 'Pronation',
  sectionMainTerrain: 'Main terrain',
  sectionUseCase: 'Use case (multiple)',
  sectionCushion: 'Cushion preference',
  sectionWidth: 'Foot width',
  arch: ['Normal', 'Flat', 'High arch'],
  pronation: ['Neutral', 'Mild overpronation', 'Overpronation'],
  terrainShort: ['Road', 'Trail'],
  useCases: ['Daily', 'Long distance', 'Race', 'Beginner', 'Recovery', 'Trail'],
  cushions: ['Low', 'Medium', 'High', 'Maximum'],
  widths: ['Narrow', 'Normal', 'Wide'],

  resultsTitle: 'Results',
  weight: 'Weight',
  drop: 'Drop',
  cushion: 'Cushion',
  width: 'Width',
  naverShopping: 'View on Naver Shopping',
  explanationError: 'Failed to load explanation.',
  errorRecommend: (e: string) => `An error occurred: ${e}`,
  wakingServer: 'Waking up the server. The first request can take up to a minute…',
  noResults: 'No matching shoes found',
  addFavorite: 'Save',
  removeFavorite: 'Remove from saved',
  addToMyShoes: 'Add to My Shoes',
  toggleDetails: 'Show details',

  savedTitle: 'Saved shoes',
  savedEmpty: 'No saved shoes yet',
  savedHint: 'Tap ♡ on a recommendation to save it',

  homeGreeting: 'Find your running shoe',
  homeSubtitle: 'Answer a few questions and get shoes matched to your feet and running style.',
  statShoes: 'My shoes',
  statKm: 'Total distance',
  statSoon: 'Due for replacement',
  statSaved: 'Saved shoes',
  pairs: (n: number) => `${n} ${n === 1 ? 'pair' : 'pairs'}`,
  count: (n: number) => String(n),
  widgetMyShoes: 'My shoes',
  widgetSaved: 'Saved shoes',
  widgetNews: 'Shoe launch news',
  newsCredit: 'News search by Naver',
  viewAll: 'View all',
  soonLabel: 'Replace soon',
  myShoesWidgetEmpty: 'No shoes added yet',
  myShoesWidgetEmptyCta: 'Add a shoe',
  savedWidgetEmpty: 'No saved shoes yet',
  savedWidgetEmptyCta: 'Find running shoes',

  searchTitle: 'Find running shoes',
  mePageTitle: 'My Page',
  deviceNotice: 'Saved shoes and My Shoes are stored only in this browser. They are not shared with other devices or the iOS app.',
  settingsTitle: 'Settings',
  languageLabel: 'Language',
  moreTitle: 'More',

  myShoesTitle: 'My Shoes',
  myShoesEmpty: 'Add your running shoes',
  addShoe: 'Add Shoe',
  shoeAdded: (name: string) => `${name} added 👟`,
  shoeName: 'Shoe name',
  brand: 'Brand',
  kmUpdate: 'Update distance',
  delete: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  replaceTime: 'Time to replace',
  cumulativeKm: 'Update cumulative distance',
  cumulativeKmLabel: 'Total km',
  confirmDelete: (name: string) => `Delete ${name}?`,

  priceRange: (p: number) =>
    p < 100000 ? 'Under ₩100,000' : p < 150000 ? '₩100,000–150,000' : p < 200000 ? '₩150,000–200,000' : '₩200,000+',
  tag: (t: string) => TAGS_EN[t] ?? t,
  cushionName: (c: string) => CUSHION_EN[c] ?? c,
  widthName: (w: string) => WIDTH_EN[w] ?? w,

  aboutTitle: 'About',
  licensesTitle: '📄 Open-source licenses',
  licensesBody: 'IBM Plex Sans KR\nCopyright © 2017 IBM Corp. with Reserved Font Name "Plex"\nSIL Open Font License 1.1',
  licensesLink: 'View full license text',
  aboutCards: [
    {
      title: '🔍 About Find Your Sole',
      body: 'A running shoe recommendation app for beginners and experienced runners alike. Answer a few simple questions and get personalized shoe recommendations.',
    },
    {
      title: '⚙️ How Recommendations Work',
      body: 'Recommendations are based on a rule-based scoring algorithm that considers foot arch, pronation, terrain, cushion preference, foot width, weekly mileage, budget, and body weight.\n\nAI (Claude Haiku) is used only to generate the explanation of why a shoe suits you — not for the ranking itself. This keeps costs low and results consistent.',
    },
    {
      title: '📦 Data & Pricing',
      body: "The shoe database covers approximately 50 models across road and trail categories, curated with reference to RunRepeat and brand official sites.\n\nPrices shown are approximate ranges for reference only. Please check Naver Shopping or the brand's official site for current pricing.",
    },
    {
      title: '⚠️ Disclaimer',
      body: 'This app is a running shoe selection aid and does not constitute medical advice or diagnosis. If you have foot or joint conditions, please consult a medical professional.',
    },
    {
      title: '📬 Feedback',
      body: 'UAT participation and feedback are welcome. This app is an ongoing side project — features are being added gradually.',
    },
  ],
};

const bundles: Record<Locale, Strings> = { ko, en };

export const t = (): Strings => bundles[current];
