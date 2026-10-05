import { BASE, launch } from './helpers.mjs';

const SHOTS = process.env.SHOTS;
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : '  ← ' + extra}`);
};

const browser = await launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'ko-KR',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

// 1st /explain returns HTML-laced text (must render as text); later ones hit the real backend.
let explainCalls = 0;
await page.route('**/explain', async (route) => {
  explainCalls++;
  if (explainCalls === 1) {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ explanation: '쿠션이 좋아요 <img src=x onerror="window.__xss=1"> <b>굵게</b>' }),
    });
  }
  return route.continue();
});

await page.goto(BASE);
await page.waitForSelector('.mode-card');

// ── 초기 상태 ──
check('한국어 UI (navigator.language=ko)', (await page.textContent('.hero h1')).includes('딱 맞는 한 켤레'));
check('title', (await page.title()).includes('Find Your Sole'));
check('모바일 하단 탭: 홈/저장/더보기 (3개 보임, 검색 메뉴 없음)', (await page.locator('.tabs a:visible').count()) === 3 && (await page.locator('.tabs a:has-text("검색")').count()) === 0);
check('비교 메뉴는 아직 없음(데이터 준비 전)', (await page.locator('.tabs a:has-text("비교")').count()) === 0);
check('홈: 찾기 카드 3개(초심자/경험자/편한 신발), 개인 통계는 없음', (await page.locator('.hero .mode-card').count()) === 3 && (await page.locator('.tile').count()) === 0);
check('홈: 빈 위젯 없음(저장한 신발이 있을 때만 표시)', (await page.locator('.widget-empty').count()) === 0);

// ── 초심자 흐름 ──
await page.click('.mode-card >> nth=0');
check('초심자 폼으로 이동 (#/search/beginner)', page.url().endsWith('#/search/beginner'));
await page.click('text=무릎');
await page.click('text=발목');
check('복수 통증 선택 → "없음" 해제', (await page.locator('.chip[aria-pressed="true"]', { hasText: '없음' }).count()) === 0);
await page.click('.chip:has-text("없음")');
const pressed = await page.locator('.chips').nth(2).locator('.chip[aria-pressed="true"]').allTextContents();
check('"없음" 선택 → 나머지 해제 (배타)', pressed.length === 1 && pressed[0] === '없음', JSON.stringify(pressed));
await page.click('.chip:has-text("60~80kg")');
await page.click('.chip:has-text("60~80kg")');
check('체중 칩 재탭 → 선택 해제', (await page.locator('.chip[aria-pressed="true"]', { hasText: '60~80kg' }).count()) === 0);

// 슬라이더 라벨
await page.locator('input[type=range]').fill('200000');
check('예산 슬라이더 라벨 갱신', (await page.textContent('.field-title >> nth=-1')).includes('20만원'));

// API 요청 페이로드 확인
const reqPromise = page.waitForRequest('**/recommend/beginner');
await page.click('.btn-primary');
const req = await reqPromise;
const body = req.postDataJSON();
console.log('   payload:', JSON.stringify(body));
check('payload: 한글 API 값 + 숫자 budget', body.frequency === '이제 막 시작했어요' && body.terrain === '공원 / 도로' && body.pain === '없음' && body.budget === 200000 && body.wide_foot === false);
await page.waitForSelector('.card');
check('결과 이동 (#/search/results)', page.url().endsWith('#/search/results'));
const n = await page.locator('article.card').count();
check(`결과 카드 렌더 (${n}개, 최대 10)`, n > 0 && n <= 10);
check('1~3위 강조 클래스', (await page.locator('.rank.top').count()) === Math.min(3, n));

// ── 카드 펼침 + 설명(HTML 주입 방어) ──
await page.click('article.card >> nth=0 >> .main');
await page.waitForSelector('.explain');
const explainHtml = await page.innerHTML('.explain p');
check('설명 텍스트 표시', (await page.textContent('.explain p')).includes('쿠션이 좋아요'));
check('설명에 HTML 주입 안 됨 (img/b 태그 없음)', !/<img|<b>/i.test(explainHtml) && (await page.evaluate(() => window.__xss)) === undefined, explainHtml);
check('스펙 4개 표시', (await page.locator('article.card >> nth=0 >> .spec').count()) === 4);
const naver = await page.getAttribute('article.card >> nth=0 >> .btn-outline-naver', 'href');
check('네이버 링크 https + noopener', naver?.startsWith('http') && (await page.getAttribute('article.card >> nth=0 >> .btn-outline-naver', 'rel')).includes('noopener'), String(naver));
check('aria-expanded 갱신', (await page.getAttribute('article.card >> nth=0 >> .main', 'aria-expanded')) === 'true');

// 두 번째 카드: 실제 백엔드 실패(키 없음) → 에러 문구
await page.click('article.card >> nth=1 >> .main');
await page.waitForFunction(() => document.querySelectorAll('.explain').length >= 2, null, { timeout: 15000 });
check('설명 API 실패 시 에러 문구', (await page.locator('.explain').nth(1).textContent()).includes('설명을 불러오지 못했어요'));

// ── 찜 ──
await page.click('article.card >> nth=0 >> button[aria-label="저장하기"]');
check('저장 토글 aria-pressed', (await page.getAttribute('article.card >> nth=0 >> .actions button >> nth=0', 'aria-pressed')) === 'true');
const favName = await page.textContent('article.card >> nth=0 >> .shoe-name');

// ── 내 신발에 추가 (다이얼로그) ──
await page.click('article.card >> nth=0 >> button[aria-label="내 신발에 추가"]');
await page.waitForSelector('dialog[open]');
check('다이얼로그에 신발 이름 prefill', (await page.inputValue('dialog input[name=name]')) === favName);
await page.click('dialog .btn-primary');
await page.waitForSelector('.toast.show');
check('추가 토스트', (await page.textContent('.toast')).includes('추가됐어요'));
check('다이얼로그 닫힘/제거', (await page.locator('dialog').count()) === 0);

// ── 뒤로가기(브라우저) ──
await page.goBack();
check('브라우저 뒤로 → 폼', page.url().endsWith('#/search/beginner'));
await page.goForward();
check('앞으로 → 결과 (메모리 유지)', await page.locator('article.card').first().isVisible());

// ── 찜 탭 ──
await page.click('.tabs a:has-text("저장")');
await page.waitForSelector('article.card');
check('저장 탭에 항목 표시', (await page.textContent('article.card .shoe-name')) === favName);
const callsBefore = explainCalls;
await page.click('article.card >> .main');
await page.waitForTimeout(500);
check('저장 카드 펼쳐도 설명 박스 없음', (await page.locator('.explain').count()) === 0);
check('저장 카드 펼쳐도 /explain 호출 안 함', explainCalls === callsBefore, `${callsBefore} -> ${explainCalls}`);

// ── 내 신발 탭 ──
await page.click('.tabs a:has-text("더보기")');
await page.waitForSelector('.menu-row');
check('더보기: 마이페이지/앱 정보 항목 + 언어 선택', (await page.locator('.menu-row').count()) === 2 && (await page.locator('main .chips .chip').count()) === 2);
check('더보기 탭 활성 표시', (await page.getAttribute('.tabs a:has-text("더보기")', 'aria-current')) === 'page');
await page.click('.menu-row:has-text("마이페이지")');
await page.waitForSelector('.owned');
check('마이페이지에서도 더보기 탭 활성', (await page.getAttribute('.tabs a:has-text("더보기")', 'aria-current')) === 'page');
check('마이페이지: 기기 저장 안내', (await page.textContent('.notice-card')).includes('이 기기의 브라우저'));
check('마이페이지 내 신발 목록에 표시', (await page.textContent('.owned .shoe-name')) === favName);
await page.click('.link-btn:has-text("거리 업데이트")');
await page.fill('dialog input[name=km]', '620');
await page.click('dialog .btn-primary');
await page.waitForSelector('.km.worn');
check('500km 초과 → 교체 시기 표시', (await page.textContent('.km.worn')).includes('교체 시기') && (await page.textContent('.km.worn')).includes('620km'));
check('progressbar aria 값', (await page.getAttribute('.progress', 'aria-valuenow')) === '620');

// 새로고침 후 영속성
await page.reload();
await page.waitForSelector('.owned');
check('새로고침 후 localStorage 유지', (await page.textContent('.km.worn')).includes('620km'));

// 삭제 (confirm)
page.once('dialog', (d) => d.accept());
await page.click('.link-btn.danger');
await page.waitForSelector('.empty');
check('삭제 후 빈 상태', (await page.textContent('.empty')).includes('신발을 추가해보세요'));

// id 재사용 방지: 두 개 추가 → 첫 번째 삭제 → 새로 추가해도 id 중복 X
await page.click('text=신발 추가 >> nth=0');
await page.fill('dialog input[name=name]', 'A'); await page.click('dialog .btn-primary');
await page.click('text=신발 추가 >> nth=0');
await page.fill('dialog input[name=name]', 'B'); await page.click('dialog .btn-primary');
const ids1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fys.myShoes')).map((s) => s.id));
check('id 고유', new Set(ids1).size === ids1.length, JSON.stringify(ids1));
const countBefore = (await page.evaluate(() => JSON.parse(localStorage.getItem('fys.myShoes')).length));
await page.click('text=신발 추가 >> nth=0');
await page.click('dialog .btn-primary'); // 이름 비워둔 채 제출
check('빈 이름 제출 → 다이얼로그 유지 + 추가 안 됨',
  (await page.locator('dialog[open]').count()) === 1 &&
  (await page.evaluate(() => JSON.parse(localStorage.getItem('fys.myShoes')).length)) === countBefore);
await page.click('dialog .btn-text'); // 취소
// 사용자에게 보이는 상태(open 속성)는 즉시 사라지고, 요소 정리는 close 이벤트에서 비동기로 일어난다.
check('취소하면 다이얼로그 즉시 닫힘(open 해제)', (await page.locator('dialog[open]').count()) === 0);
let cleaned = true;
try { await page.waitForSelector('dialog', { state: 'detached', timeout: 2000 }); } catch { cleaned = false; }
check('닫힌 다이얼로그는 DOM 에서 정리됨', cleaned);

// ── 정보 탭: 폰트 라이선스(OFL) 고지 ──
await page.click('.tabs a:has-text("더보기")');
await page.click('.menu-row:has-text("앱 정보")');
await page.waitForSelector('.about-card');
const aboutText = await page.textContent('main');
check('정보 탭에 IBM Plex Sans KR + OFL 고지', aboutText.includes('IBM Plex Sans KR') && aboutText.includes('SIL Open Font License') && aboutText.includes('IBM Corp.'));
check('라이선스 전문 링크', (await page.getAttribute('.about-card a', 'href')) === '/licenses/IBMPlexSansKR-OFL.txt');
check('OFL 전문이 실제로 서비스됨', await page.evaluate(async () => (await (await fetch('/licenses/IBMPlexSansKR-OFL.txt')).text()).includes('SIL OPEN FONT LICENSE')));

// ── 폰트 적용/대체 ──
await page.evaluate(() => document.fonts.ready);
check('IBM Plex Sans KR 4개 face 로드 (400/700 × latin/hangul)', (await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded' && f.family.includes('IBM Plex')).length)) === 4);
check('본문 font-family 첫 번째가 IBM Plex Sans KR', (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).startsWith('"IBM Plex Sans KR"') || (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).startsWith('IBM Plex Sans KR'));
// KS X 1001 밖의 음절('갂')은 Plex 에 없으므로 .notdef(두부) 가 아니라 대체 폰트로 그려져야 한다.
const widths = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  c.font = '32px "IBM Plex Sans KR", sans-serif'; const withPlex = c.measureText('갂').width;
  c.font = '32px sans-serif'; const fallbackOnly = c.measureText('갂').width;
  c.font = '32px "IBM Plex Sans KR", sans-serif'; const inSet = c.measureText('가').width;
  return { withPlex, fallbackOnly, inSet };
});
check('2,350자 밖 음절은 대체 폰트로 렌더(두부 아님)', Math.abs(widths.withPlex - widths.fallbackOnly) < 0.5 && widths.withPlex > 0, JSON.stringify(widths));
await page.click('.tabs a >> nth=0');

// ── 마이페이지가 보유 신발 데이터를 반영 ──
await page.evaluate(() => {
  localStorage.setItem('fys.myShoes', JSON.stringify([
    { id: 1, name: 'A', brand: 'x', purchased_at: '2026-01-01', km: 450 },
    { id: 2, name: 'B', brand: 'y', purchased_at: '2026-02-01', km: 100 },
    { id: 3, name: 'C', brand: 'z', purchased_at: '2026-03-01', km: 520 },
  ]));
});
await page.goto(BASE + '#/me');
await page.reload(); // 새로고침으로 최신 저장 데이터를 읽는다
await page.waitForSelector('.tile');
const vals = await page.locator('.tile-value').allTextContents();
check('마이페이지 타일: 3켤레 / 1,070km / 교체 임박 2개', vals.length === 3 && vals[0] === '3켤레' && vals[1] === '1,070km' && vals[2] === '2개', vals.join('|'));
check('내 신발 카드 3개, 520km만 교체 시기 표시', (await page.locator('.card.owned').count()) === 3 && (await page.locator('.progress.worn').count()) === 1);
check('마이페이지에 저장한 신발·언어 설정 없음', (await page.locator('.panel').count()) === 1 && (await page.locator('.chip:has-text("English")').count()) === 0);
await page.goto(BASE);
await page.waitForSelector('.mode-card');
check('홈: 저장한 신발이 있으면 위젯 표시', (await page.locator('.widget h2', { hasText: '저장한 신발' }).count()) === 1 && (await page.locator('.widget .row').count()) >= 1);

// ── 언어 토글 ──
await page.click('.lang');
check('영어 전환', (await page.textContent('.tabs a >> nth=0')).includes('Home') && (await page.getAttribute('html', 'lang')) === 'en');
check('영어 선택 localStorage 저장', (await page.evaluate(() => localStorage.getItem('fys.locale'))) === 'en');
check('영어 홈 제목', (await page.textContent('.hero h1')).includes('fits your feet'));

// ── 경험자 흐름 (영어) ──
await page.click('.mode-card >> nth=1');
await page.click('.chip:has-text("Race")');
await page.click('.chip:has-text("Daily")'); // 기본 선택 해제
await page.click('.chip:has-text("Race")'); // 마지막 하나 해제 시도 → 유지되어야 함
const uc = await page.locator('.chips').nth(3).locator('.chip[aria-pressed="true"]').allTextContents();
check('용도 최소 1개 유지', uc.length >= 1, JSON.stringify(uc));
const r2 = page.waitForRequest('**/recommend/expert');
await page.click('.btn-primary');
const b2 = (await r2).postDataJSON();
console.log('   payload:', JSON.stringify(b2));
check('expert payload 값', b2.arch === 'normal' && b2.pronation === 'neutral' && b2.terrain === '로드' && Array.isArray(b2.use_case) && b2.cushion === '중간' && b2.width === '보통' && b2.weekly_km === 20 && b2.budget === 150000);
await page.waitForSelector('article.card');
check('영어 가격대 표기', /₩/.test(await page.textContent('.side .price >> nth=0')));

// 폼 상태가 언어 전환 후에도 유지
await page.goBack(); // results → expert form
await page.click('.lang');
const keepUc = await page.locator('.chips').nth(3).locator('.chip[aria-pressed="true"]').count();
check('언어 전환해도 폼 입력 유지', keepUc >= 1);

// ── 결과 없는 해시 직접 접근 ──
// 결과가 메모리에 있을 때: #/results 로 이동하면 결과가 보인다
await page.evaluate(() => (location.hash = '#/results')); // 예전 주소
await page.waitForSelector('article.card');
check('예전 주소 #/results → #/search/results 로 이동하고 결과 표시', page.url().endsWith('#/search/results'), page.url());
// 새 컨텍스트(결과 없음)에서 #/results 직접 접근 → 홈으로 폴백
const fresh = await ctx.newPage();
await fresh.goto(BASE + '#/search/results');
await fresh.waitForSelector('.mode-card');
check('결과 없이 #/search/results 직접 접근 → 홈으로 폴백', (await fresh.locator('article.card').count()) === 0 && fresh.url().endsWith('#/'));
await fresh.close();

// ── 오류: 서버 다운 시 에러 메시지 ──
await page.route('**/recommend/**', (r) => r.abort());
await page.evaluate(() => (location.hash = '#/beginner')); // 예전 주소
await page.waitForSelector('.btn-primary');
await page.click('.btn-primary');
await page.waitForSelector('.notice.error', { timeout: 10000 });
check('API 실패 시 에러 + 버튼 복구', (await page.locator('.btn-primary').isEnabled()) && (await page.textContent('.notice.error')).length > 5);

if (SHOTS) {
  await page.unroute('**/recommend/**');
  await page.evaluate(() => { localStorage.setItem('fys.locale', 'ko'); location.hash = '#/'; });
  await page.reload();
  await page.waitForSelector('.mode-card');
  await page.screenshot({ path: `${SHOTS}/1-mode-mobile.png` });
  await page.click('.mode-card >> nth=0'); await page.click('.btn-primary');
  await page.waitForSelector('article.card');
  await page.click('article.card >> nth=0 >> .main');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/2-results-mobile.png` });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: `${SHOTS}/3-results-dark.png` });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.screenshot({ path: `${SHOTS}/4-results-desktop.png` });
}

// 제외 대상은 딱 두 가지: (a) 테스트가 일부러 abort 한 /recommend 요청, (b) 더미 키로 의도적으로 실패시킨
// /explain 의 500 (백엔드의 미처리 예외 응답에는 CORS 헤더가 없어 브라우저가 CORS 에러로 보고함).
const unexpected = errors.filter((e) => !(/\/explain/.test(e) || /Failed to load resource: net::ERR_FAILED/.test(e)));
check('예상 밖의 콘솔/페이지 에러 없음', unexpected.length === 0, JSON.stringify(unexpected));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
