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
  pageTitle: 'Find Your Sole · 신발 추천',
  navHome: '홈',
  navSearch: '검색',
  navSaved: '저장',
  navCompare: '비교',
  navMe: '마이페이지',
  navAbout: '앱 정보',
  navMore: '더보기',
  langToggle: 'EN',
  langToggleLabel: 'Switch to English',
  themeToLight: '라이트 모드로 전환',
  themeToDark: '다크 모드로 전환',

  heroSubtitle: '어떤 신발을 찾고 계세요?',
  beginnerTitle: '러닝 초심자',
  beginnerSubtitle: '입문 ~ 1년',
  beginnerDescription: '전문 용어 없이 쉽게 추천받아요',
  expertTitle: '러닝 경험자',
  expertSubtitle: '1년 이상',
  expertDescription: '발 유형부터 훈련 스타일까지 정밀하게 추천받아요',
  comfortTitle: '편한 신발',
  comfortSubtitle: '워킹 · 출퇴근 · 데일리',
  comfortDescription: '오래 서 있어도, 많이 걸어도 편한 신발을 추천받아요',
  comfortModeTitle: '🚶 편한 신발 찾기',
  sectionWhere: '주로 어디서 신으시나요?',
  wheres: ['출퇴근 · 통학', '서서 일하는 직장', '여행 · 산책', '매일 편하게'],
  sectionHours: '하루에 얼마나 걷거나 서 계시나요?',
  hoursOptions: ['2시간 미만', '2~5시간', '5시간 이상'],
  sectionComfortPain: '발이 불편한 곳이 있나요? (복수 선택 가능)',
  comfortPains: ['없음', '발바닥 · 뒤꿈치', '무릎', '발목', '발가락 · 발볼'],
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
  explanationBusy: '설명 요청이 많아요. 잠시 뒤에 다시 눌러 주세요.',
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

  homeGreeting: '내 발에 딱 맞는 한 켤레, 같이 찾아요',
  homeSubtitle: '질문 몇 개면 충분해요. 솔이가 골라 드릴게요.',
  statShoes: '보유 신발',
  statKm: '누적 거리',
  statSoon: '교체 임박',
  statSaved: '저장한 신발',
  pairs: (n: number) => `${n}켤레`,
  count: (n: number) => `${n}개`,
  widgetMyShoes: '내 신발 현황',
  widgetSaved: '저장한 신발',
  widgetNews: '솔이의 신상 레이더',
  newsCredit: '뉴스 검색 제공: 네이버',
  feedbackFab: '피드백',
  feedbackTitle: '의견을 들려주세요',
  feedbackHint: '불편한 점, 틀린 정보, 바라는 기능 무엇이든 좋아요. 솔이가 꼼꼼히 읽어요.',
  feedbackPrivacy: '답장은 드리기 어려워요. 이름이나 연락처 같은 개인정보는 적지 말아 주세요.',
  feedbackPlaceholder: '여기에 적어 주세요',
  feedbackAttach: '스크린샷 첨부',
  feedbackRemoveImage: '빼기',
  feedbackSend: '보내기',
  feedbackSending: '보내는 중…',
  feedbackThanks: '고마워요! 피드백을 보냈어요.',
  feedbackBusy: '요청이 많아요. 잠시 뒤에 다시 보내 주세요.',
  feedbackBadImage: '이 이미지는 첨부할 수 없어요. 다른 이미지를 골라 주세요.',
  feedbackError: '보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.',
  adminTitle: '피드백 관리',
  adminTokenLabel: '관리자 토큰',
  adminOpen: '열기',
  adminBadToken: '토큰이 맞지 않아요.',
  adminOff: '관리자 기능이 꺼져 있어요. 서버에 ADMIN_TOKEN을 설정해 주세요.',
  adminError: '불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.',
  adminEmpty: '아직 피드백이 없어요.',
  adminHideResolved: '해결된 항목 숨기기',
  adminResolve: '해결됨으로 표시',
  adminReopen: '다시 열기',
  adminResolved: '해결됨',
  adminShot: '스크린샷 보기',
  adminLogout: '나가기',
  adminCount: (open: number, all: number) => `미해결 ${open}건 · 전체 ${all}건`,
  newsUpdated: (when: string) => `${when} 기준`,
  widgetPick: '솔이의 데일리 픽',
  pickCta: '쇼핑에서 보기',
  widgetTip: '솔이의 한 입 상식',
  tips: [
    { q: '드롭이 뭐예요?', a: '뒤꿈치와 앞꿈치의 높이 차이예요. 숫자가 클수록 뒤꿈치가 높아서 발바닥 앞쪽 부담이 줄고, 낮을수록 자연스러운 걸음에 가까워요.' },
    { q: '러닝화는 언제 바꾸면 좋을까요?', a: '보통 500~800km가 교체 시기예요. 쿠션이 꺼지거나 밑창이 한쪽만 닳았다면 더 일찍 바꿔 주세요.' },
    { q: '발볼은 어떻게 알아요?', a: '신발을 신었을 때 새끼발가락 쪽이 눌리거나 저리면 발볼이 좁은 거예요. 이럴 땐 발볼이 넓은 옵션을 골라 보세요.' },
    { q: '신발은 언제 사는 게 좋아요?', a: '저녁에 발이 가장 부어 있어요. 그때 신어 보면 하루 중 가장 큰 발에 맞춰 고를 수 있어요.' },
    { q: '쿠션이 푹신할수록 좋을까요?', a: '꼭 그렇진 않아요. 푹신하면 편하지만 불안정할 수 있어요. 오래 서 있으면 쿠션, 빠르게 걸으면 반발력을 보세요.' },
    { q: '워킹화와 러닝화는 뭐가 달라요?', a: '러닝화는 달릴 때의 충격을 흡수하고, 워킹화는 걷는 동작에 맞춘 안정감과 착화감에 더 신경 써요. 둘 다 되는 신발도 있어요.' },
    { q: '발이 아플 땐 어떤 신발이 좋아요?', a: '뒤꿈치나 발바닥이 아프면 쿠션과 아치 지지가 좋은 신발이 도움이 돼요. 통증이 계속되면 전문의와 상담해 주세요.' },
    { q: '양말도 신발 선택에 영향이 있나요?', a: '네! 평소 신는 두께의 양말을 신고 신어 봐야 해요. 얇은 양말로 샀다가 두꺼운 양말에 끼는 경우가 많아요.' },
    { q: '새 신발은 바로 오래 신어도 돼요?', a: '처음엔 짧게 걸으며 길들이는 게 좋아요. 발과 신발이 서로 익숙해지는 시간이 필요해요.' },
    { q: '두 켤레를 번갈아 신으면 좋은가요?', a: '좋아요. 쿠션이 회복될 시간을 주면 수명이 늘고, 발에 닿는 자극도 달라져서 부담이 줄어요.' },
  ],
  viewAll: '모두 보기',
  soonLabel: '교체 임박',
  myShoesWidgetEmpty: '아직 등록한 신발이 없어요',
  myShoesWidgetEmptyCta: '신발 추가하기',
  savedWidgetEmpty: '아직 저장한 신발이 없어요',
  savedWidgetEmptyCta: '신발 찾으러 가기',

  searchTitle: '신발 검색',
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
  priceLabel: (shoe: { price: number; price_source?: string | null; price_usd?: number | null }): string =>
    shoe.price_source === 'estimate' && shoe.price_usd
      ? `해외 정가 $${shoe.price_usd} · 국내 가격은 판매처 확인`
      : ko.priceRange(shoe.price),
  /** Short form for narrow rows: just the USD list price for estimates. */
  priceBrief: (shoe: { price: number; price_source?: string | null; price_usd?: number | null }): string =>
    shoe.price_source === 'estimate' && shoe.price_usd ? `해외 $${shoe.price_usd}` : ko.priceRange(shoe.price),
  tag: (t: string) => t,
  cushionName: (c: string) => c,
  widthName: (w: string) => w,

  aboutTitle: '앱 정보',
  personaTitle: '솔이를 소개해요',
  personaName: '솔이 (Soli)',
  personaTagline: '“어서 와, 같이 골라보자!”',
  personaBody: '신발장 구석에서 태어난 작은 유령이에요. 수많은 발걸음 곁에서 지내다 보니, 어떤 발에 어떤 신발이 편한지 눈에 보이게 됐대요. 지금은 Find Your Sole에서 여러분의 한 켤레를 같이 골라 줘요.',
  personaFacts: [
    { label: '성격', value: '호기심 많고 다정해요. 발 이야기가 나오면 눈이 반짝여요.' },
    { label: '좋아하는 것', value: '새 신발 상자 여는 순간, 푹신한 쿠션, 맑은 날 산책' },
    { label: '말투', value: '친근한 존댓말로, 모르는 건 모른다고 솔직하게 말해요.' },
    { label: '약속', value: '광고가 아니라 여러분의 발과 생활에 맞춰 골라요. 의학적 진단은 하지 않아요.' },
  ],
  licensesTitle: '📄 오픈소스 라이선스',
  licensesBody: 'IBM Plex Sans KR\nCopyright © 2017 IBM Corp. with Reserved Font Name "Plex"\nSIL Open Font License 1.1',
  licensesLink: '라이선스 전문 보기',
  aboutCards: [
    {
      title: '🔍 Find Your Sole 소개',
      body: '러닝 초심자와 경험자, 그리고 오래 걷고 서 있는 분들까지. 간단한 질문에 답하면 내 발과 생활에 맞는 신발을 솔이가 함께 골라 드려요.',
    },
    {
      title: '⚙️ 추천 로직',
      body: '추천 결과는 발 아치, 프로네이션, 지면, 쿠션 선호도, 발볼, 주간 거리, 예산, 체중을 반영한 룰 기반 점수 알고리즘으로 계산됩니다.\n\nAI(Claude Haiku)는 신발이 나에게 맞는 이유를 설명하는 데만 사용되며, 순위 계산에는 사용되지 않습니다.',
    },
    {
      title: '📦 데이터 및 가격 정보',
      body: '신발 데이터는 RunRepeat, 리뷰 매체 및 브랜드 공식 사이트를 참고해 러닝화와 워킹·데일리 신발 약 60개 모델을 수동으로 정리한 것입니다.\n\n가격은 참고용 가격대이며, 실제 가격과 다를 수 있습니다. 정확한 가격은 네이버 쇼핑 또는 브랜드 공식 사이트에서 확인하세요.',
    },
    {
      title: '⚠️ 면책 조항',
      body: '이 앱은 신발 선택을 돕기 위한 참고 도구이며, 의학적 진단이나 처방이 아닙니다. 발이나 관절에 이상이 있으신 분은 전문의와 상담하시기 바랍니다.',
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
  pageTitle: 'Find Your Sole · Shoe Finder',
  navHome: 'Home',
  navSearch: 'Search',
  navSaved: 'Saved',
  navCompare: 'Compare',
  navMe: 'My Page',
  navAbout: 'About',
  navMore: 'More',
  langToggle: '한국어',
  langToggleLabel: '한국어로 전환',
  themeToLight: 'Switch to light mode',
  themeToDark: 'Switch to dark mode',

  heroSubtitle: 'What kind of shoe are you looking for?',
  beginnerTitle: 'Beginner',
  beginnerSubtitle: 'Up to 1 year',
  beginnerDescription: 'Get recommendations without the jargon',
  expertTitle: 'Experienced Runner',
  expertSubtitle: '1+ years',
  expertDescription: 'Precise recommendations based on your running profile',
  comfortTitle: 'Comfort Shoes',
  comfortSubtitle: 'Walking · commute · everyday',
  comfortDescription: 'Shoes that stay comfortable on long days on your feet',
  comfortModeTitle: '🚶 Comfort Shoes',
  sectionWhere: 'Where will you wear them most?',
  wheres: ['Commute / school', 'Standing at work', 'Travel / strolls', 'Everyday comfort'],
  sectionHours: 'How long are you on your feet each day?',
  hoursOptions: ['Under 2 hours', '2–5 hours', '5+ hours'],
  sectionComfortPain: 'Any foot discomfort? (multi-select)',
  comfortPains: ['None', 'Sole / heel', 'Knee', 'Ankle', 'Toes / width'],
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
  explanationBusy: 'Lots of requests right now. Please try again in a bit.',
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

  homeGreeting: 'Let’s find the pair that fits your feet',
  homeSubtitle: 'A few questions is all it takes. Soli will help you pick.',
  statShoes: 'My shoes',
  statKm: 'Total distance',
  statSoon: 'Due for replacement',
  statSaved: 'Saved shoes',
  pairs: (n: number) => `${n} ${n === 1 ? 'pair' : 'pairs'}`,
  count: (n: number) => String(n),
  widgetMyShoes: 'My shoes',
  widgetSaved: 'Saved shoes',
  widgetNews: 'Soli’s New Arrivals Radar',
  newsCredit: 'News search by Naver',
  feedbackFab: 'Feedback',
  feedbackTitle: 'Tell us what you think',
  feedbackHint: 'Anything helps: something confusing, wrong info, or a feature you want. Soli reads every note.',
  feedbackPrivacy: 'We cannot reply, so please do not include personal details like your name or contact info.',
  feedbackPlaceholder: 'Write here',
  feedbackAttach: 'Attach screenshot',
  feedbackRemoveImage: 'Remove',
  feedbackSend: 'Send',
  feedbackSending: 'Sending…',
  feedbackThanks: 'Thank you! Your feedback was sent.',
  feedbackBusy: 'Lots of requests right now. Please try again in a bit.',
  feedbackBadImage: 'That image cannot be attached. Please pick another one.',
  feedbackError: 'Could not send. Please try again in a moment.',
  adminTitle: 'Feedback inbox',
  adminTokenLabel: 'Admin token',
  adminOpen: 'Open',
  adminBadToken: 'That token is not right.',
  adminOff: 'Admin is turned off. Set ADMIN_TOKEN on the server.',
  adminError: 'Could not load. Please try again in a moment.',
  adminEmpty: 'No feedback yet.',
  adminHideResolved: 'Hide resolved',
  adminResolve: 'Mark resolved',
  adminReopen: 'Reopen',
  adminResolved: 'Resolved',
  adminShot: 'View screenshot',
  adminLogout: 'Sign out',
  adminCount: (open: number, all: number) => `${open} open · ${all} total`,
  newsUpdated: (when: string) => `As of ${when}`,
  widgetPick: 'Soli’s Daily Pick',
  pickCta: 'See in shops',
  widgetTip: 'Soli’s Bite-size Tip',
  tips: [
    { q: 'What is drop?', a: 'The height difference between heel and forefoot. A bigger number puts the heel higher and eases the front of the foot; a lower one feels closer to barefoot.' },
    { q: 'When should I replace running shoes?', a: 'Usually after 500–800 km (300–500 miles). Replace sooner if the cushioning feels flat or the outsole wears on one side.' },
    { q: 'How do I know my foot width?', a: 'If your little toe feels squeezed or numb, the shoe is too narrow. Try a wide option.' },
    { q: 'When should I try on shoes?', a: 'Feet are largest in the evening. Fitting then means the shoe suits your biggest foot of the day.' },
    { q: 'Is softer cushioning always better?', a: 'Not always. Soft is comfy but can feel unstable. Look for cushioning if you stand a lot, and for rebound if you walk fast.' },
    { q: 'Walking vs running shoes?', a: 'Running shoes absorb impact when running; walking shoes focus on stability and comfort for walking. Some do both well.' },
    { q: 'Which shoes help sore feet?', a: 'For heel or sole pain, look for good cushioning and arch support. If the pain persists, please see a medical professional.' },
    { q: 'Do socks matter?', a: 'Yes! Try shoes on with the socks you normally wear. Many people buy with thin socks and then feel squeezed in thick ones.' },
    { q: 'Can I wear new shoes all day right away?', a: 'Break them in with short walks first. Your feet and the shoes need time to get used to each other.' },
    { q: 'Is rotating two pairs good?', a: 'Yes. Cushioning needs time to recover, so rotating extends the life of both pairs and varies the load on your feet.' },
  ],
  viewAll: 'View all',
  soonLabel: 'Replace soon',
  myShoesWidgetEmpty: 'No shoes added yet',
  myShoesWidgetEmptyCta: 'Add a shoe',
  savedWidgetEmpty: 'No saved shoes yet',
  savedWidgetEmptyCta: 'Find shoes',

  searchTitle: 'Find shoes',
  mePageTitle: 'My Page',
  deviceNotice: 'Saved shoes and My Shoes are stored only in this browser. They are not shared with other devices or the iOS app.',
  settingsTitle: 'Settings',
  languageLabel: 'Language',
  moreTitle: 'More',

  myShoesTitle: 'My Shoes',
  myShoesEmpty: 'Add your shoes',
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
  priceLabel: (shoe: { price: number; price_source?: string | null; price_usd?: number | null }): string =>
    shoe.price_source === 'estimate' && shoe.price_usd
      ? `US list price $${shoe.price_usd} · check local price`
      : en.priceRange(shoe.price),
  priceBrief: (shoe: { price: number; price_source?: string | null; price_usd?: number | null }): string =>
    shoe.price_source === 'estimate' && shoe.price_usd ? `US $${shoe.price_usd}` : en.priceRange(shoe.price),
  tag: (t: string) => TAGS_EN[t] ?? t,
  cushionName: (c: string) => CUSHION_EN[c] ?? c,
  widthName: (w: string) => WIDTH_EN[w] ?? w,

  aboutTitle: 'About',
  personaTitle: 'Meet Soli',
  personaName: 'Soli',
  personaTagline: '“Come on in, let’s pick together!”',
  personaBody: 'A little ghost born in the corner of a shoe closet. After spending so long beside countless footsteps, Soli can just tell which shoe feels right on which foot. Now Soli helps you find your pair here at Find Your Sole.',
  personaFacts: [
    { label: 'Personality', value: 'Curious and kind. Lights up whenever feet come up.' },
    { label: 'Loves', value: 'Opening a fresh shoe box, squishy cushioning, walks on sunny days' },
    { label: 'Voice', value: 'Friendly and polite, and honest when it does not know something.' },
    { label: 'Promise', value: 'Picks for your feet and life, not for advertisers. Never gives medical diagnoses.' },
  ],
  licensesTitle: '📄 Open-source licenses',
  licensesBody: 'IBM Plex Sans KR\nCopyright © 2017 IBM Corp. with Reserved Font Name "Plex"\nSIL Open Font License 1.1',
  licensesLink: 'View full license text',
  aboutCards: [
    {
      title: '🔍 About Find Your Sole',
      body: 'A shoe recommendation app for new and experienced runners, and for anyone on their feet all day. Answer a few simple questions and Soli helps you pick shoes that fit your feet and your life.',
    },
    {
      title: '⚙️ How Recommendations Work',
      body: 'Recommendations are based on a rule-based scoring algorithm that considers foot arch, pronation, terrain, cushion preference, foot width, weekly mileage, budget, and body weight.\n\nAI (Claude Haiku) is used only to generate the explanation of why a shoe suits you — not for the ranking itself. This keeps costs low and results consistent.',
    },
    {
      title: '📦 Data & Pricing',
      body: "The shoe database covers approximately 60 running, walking and everyday models, curated with reference to RunRepeat, review sites and brand official pages.\n\nPrices shown are approximate ranges for reference only. Please check Naver Shopping or the brand's official site for current pricing.",
    },
    {
      title: '⚠️ Disclaimer',
      body: 'This app is a shoe selection aid and does not constitute medical advice or diagnosis. If you have foot or joint conditions, please consult a medical professional.',
    },
    {
      title: '📬 Feedback',
      body: 'UAT participation and feedback are welcome. This app is an ongoing side project — features are being added gradually.',
    },
  ],
};

const bundles: Record<Locale, Strings> = { ko, en };

export const t = (): Strings => bundles[current];
