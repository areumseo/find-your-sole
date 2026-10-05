import { BASE, launch } from './helpers.mjs';
let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? '✅' : '❌'} ${n}${c ? '' : '  ← ' + x}`); };
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-News-Updated' };
const ITEMS = [
  { title: '나이키, 새 러닝화 페가수스 43 출시', source: 'sportsnews.co.kr', url: 'https://sportsnews.co.kr/a1', published_at: daysAgo(0.2) },
  { title: '호카 신제품 클리프턴 10 공개', source: 'example.com', url: 'https://example.com/a2', published_at: daysAgo(1) },
  { title: '아디다스 러닝화 신제품 선보여', source: '네이버 뉴스', url: 'https://n.news.naver.com/a3', published_at: daysAgo(3) },
  { title: '뉴발란스 새 러닝화 출시', source: 'b.com', url: 'https://b.com/a4', published_at: daysAgo(9) },
  { title: '아식스 러닝화 신제품 출시', source: 'c.com', url: 'https://c.com/a5', published_at: daysAgo(20) },
  { title: '여섯 번째 기사는 보이면 안 됨 러닝화 출시', source: 'd.com', url: 'https://d.com/a6', published_at: daysAgo(30) },
];
const b = await launch();
async function open(w, route, seed) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/news', route);
  await page.goto(BASE); await page.waitForSelector('.mode-card'); await page.evaluate(() => document.fonts.ready);
  return { page, errors, ctx };
}

// ① 데이터가 있을 때
{
  const { page, errors } = await open(1280, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { ...cors, 'X-News-Updated': '2026-10-05T09:30:00Z' }, body: JSON.stringify(ITEMS) }));
  await page.waitForSelector('.widget.news');
  const w = page.locator('.widget.news');
  check('① 뉴스 위젯 표시, 제목 "솔이의 신상 레이더"', (await w.locator('h2').textContent()) === '솔이의 신상 레이더');
  check('① 최대 5건만 표시(6번째 숨김)', (await w.locator('.row').count()) === 5 && !(await w.textContent()).includes('여섯 번째'));
  const first = w.locator('.row').first();
  check('① 최신 기사가 맨 위', (await first.textContent()).includes('페가수스 43'));
  check('① 출처와 상대 날짜 표시("오늘")', (await first.locator('.row-sub').textContent()) === 'sportsnews.co.kr · 오늘', await first.locator('.row-sub').textContent());
  check('① 어제/3일 전 표기', (await w.locator('.row-sub').nth(1).textContent()).endsWith('어제') && (await w.locator('.row-sub').nth(2).textContent()).endsWith('3일 전'));
  const a = first.locator('a');
  check('① 링크: 새 탭 + noopener noreferrer', (await a.getAttribute('target')) === '_blank' && (await a.getAttribute('rel')) === 'noopener noreferrer' && (await a.getAttribute('href')) === 'https://sportsnews.co.kr/a1');
  { const foot = await w.locator('.widget-foot').textContent(); check('① 갱신 시각("… 기준")과 네이버 출처 표기', /기준 · 뉴스 검색 제공: 네이버$/.test(foot) && /10월 5일|Oct 5/.test(foot), foot); }
  const box = await w.boundingBox(), hero = await page.locator('.hero').boundingBox(), side = await page.locator('.col-side').boundingBox();
  check('① 데스크톱: 뉴스는 히어로 아래 왼쪽, 오늘의 픽·상식 열이 오른쪽에 나란히', box.y >= hero.y + hero.height - 1 && side.x >= box.x + box.width && box.width > side.width, JSON.stringify({ box, side }));
  check('① 페이지 오류 없음', errors.length === 0, errors.join());
  await page.screenshot({ path: process.argv[2] + '/news-desktop.png', fullPage: true });
  // 영어로 전환하면 제목/날짜도 영어
  await page.click('.lang');
  check('① 영어 전환: 제목 "Shoe launch news", 날짜 영어', (await page.locator('.widget.news h2').textContent()) === 'Soli’s New Arrivals Radar' && /today/.test(await page.locator('.widget.news .row-sub').first().textContent()));
}

// ② 모바일
{
  const { page } = await open(390, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(ITEMS) }));
  await page.waitForSelector('.widget.news');
  check('② 모바일: 가로 스크롤 없음', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: process.argv[2] + '/news-mobile.png', fullPage: true });
}

// ③ 빈 목록 / 서버 오류 / 이상한 응답 → 위젯 없음, 화면 정상
for (const [name, handler] of [
  ['빈 목록 []', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })],
  ['HTTP 500', (r) => r.fulfill({ status: 500, headers: cors, body: 'oops' })],
  ['연결 실패', (r) => r.abort()],
  ['JSON 이 아닌 응답', (r) => r.fulfill({ status: 200, contentType: 'text/html', headers: cors, body: '<html>' })],
  ['배열이 아닌 JSON', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"error":"x"}' })],
]) {
  const { page, errors } = await open(1280, handler);
  await page.waitForTimeout(600);
  check(`③ ${name}: 위젯 없음, 나머지 대시보드 정상`, (await page.locator('.widget.news').count()) === 0 && (await page.locator('.tile').count()) === 0 && (await page.locator('.col-main .widget').count()) === 0 && errors.length === 0, errors.join());
}

// ④ 악의적 입력
{
  const evil = [
    { title: '<img src=x onerror="window.__xss=1"> 러닝화 출시 <b>굵게</b>', source: '<script>window.__xss=2</script>', url: 'https://ok.example/1', published_at: daysAgo(1) },
    { title: 'javascript: 링크 러닝화 출시', source: 'bad.com', url: 'javascript:window.__xss=3', published_at: daysAgo(1) },
    { title: '날짜 없는 기사 러닝화 출시', source: 'nodate.com', url: 'https://nodate.example/1', published_at: 'garbage' },
  ];
  const { page, errors } = await open(1280, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(evil) }));
  await page.waitForSelector('.widget.news');
  const html = await page.locator('.widget.news').innerHTML();
  check('④ 제목/출처의 HTML 은 글자로만 표시(태그 주입 없음)', !/<img|<script|<b>/i.test(html.replace(/<h2>|<\/h2>/g, '')) && (await page.evaluate(() => window.__xss)) === undefined);
  const rows = page.locator('.widget.news .row');
  check('④ javascript: 기사(2번째 행)는 링크 없이 제목만 표시', (await rows.nth(1).locator('a').count()) === 0 && (await rows.nth(1).textContent()).includes('javascript: 링크'));
  check('④ 안전한 http(s) 기사 2건만 링크', (await page.locator('.widget.news a').count()) === 2 && (await page.locator('.widget.news a[href^="javascript"]').count()) === 0);
  check('④ 날짜가 이상한 기사도 오류 없이 표시', (await page.locator('.widget.news .row').count()) === 3 && errors.length === 0, errors.join());
}

// ⑤ 같은 세션에서 탭을 오가도 다시 요청하지 않음 (10분 재사용)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  const page = await ctx.newPage(); let calls = 0;
  await page.route('**/news', (r) => { calls++; return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(ITEMS) }); });
  await page.goto(BASE); await page.waitForSelector('.widget.news');
  await page.click('.tabs a:has-text("저장")'); await page.click('.tabs a:has-text("홈")'); await page.waitForSelector('.widget.news');
  await page.click('.tabs a:has-text("저장")'); await page.click('.tabs a:has-text("홈")'); await page.waitForSelector('.widget.news');
  check('⑤ 탭을 오가도 /news 는 1번만 요청', calls === 1, String(calls));
}

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
