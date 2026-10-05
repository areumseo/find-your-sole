import { BASE, launch } from './helpers.mjs';
const SHOTS = process.argv[2];
let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? '✅' : '❌'} ${n}${c ? '' : '  ← ' + x}`); };
const b = await launch();

async function open(w, h, scheme = 'light') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'ko-KR', colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(BASE + ''); await page.waitForSelector('.mode-card');
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const box = (page, sel) => page.locator(sel).first().boundingBox();
const css = (page, sel, prop) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e)[p], prop);

// ── 데스크톱 1280×800 ──
let d = await open(1280, 800);
const side = await box(d, '.sidebar'), main = await box(d, 'main'), tabs = await box(d, '.tabs');
check('데스크톱: 사이드바가 왼쪽 248px, 전체 높이', side.x === 0 && Math.round(side.width) === 248 && Math.round(side.height) === 800, JSON.stringify(side));
check('데스크톱: 탭이 하단 고정이 아님(static)', (await css(d, '.tabs', 'position')) === 'static');
check('데스크톱: 사이드바 메뉴 5개가 세로 배치(홈/저장/비교/마이페이지/앱 정보)', (await d.locator('.tabs a:visible').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)) === 5);
check('데스크톱: 더보기는 숨김, 마이페이지·앱 정보는 보임', (await d.locator('.tabs a:visible:has-text("더보기")').count()) === 0 && (await d.locator('.tabs a:visible:has-text("마이페이지")').count()) === 1 && (await d.locator('.tabs a:visible:has-text("앱 정보")').count()) === 1);
check('데스크톱: 탭이 사이드바 안쪽', tabs.x >= side.x && tabs.x + tabs.width <= side.x + side.width + 1);
check('데스크톱: 본문이 사이드바 오른쪽, 겹치지 않음', main.x >= side.width, JSON.stringify(main));
const mainCenter = main.x + main.width / 2, areaCenter = 248 + (1280 - 248) / 2;
check('데스크톱: 본문이 남은 영역 가운데 정렬', Math.abs(mainCenter - areaCenter) < 2, `${mainCenter} vs ${areaCenter}`);
check('데스크톱: 본문 폭이 1200px 이하', main.width <= 1200);
const brand = await box(d, '.brand'), lang = await box(d, '.lang');
check('데스크톱: 브랜드는 위, 언어 버튼은 사이드바 맨 아래', brand.y < 80 && lang.y > 700 && lang.x < 248, `brand ${brand.y} lang ${lang.y}`);
check('데스크톱: 활성 탭 강조 배경', (await d.locator('.tabs a[aria-current=page]').evaluate((e) => getComputedStyle(e).backgroundColor)) !== 'rgba(0, 0, 0, 0)');
check('데스크톱: 가로 스크롤 없음', await d.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await d.click('.tabs a:has-text("앱 정보")');
await d.waitForSelector('.about-card');
check('데스크톱: 탭 클릭으로 이동(#/about)', d.url().endsWith('#/about'));
check('데스크톱: 긴 페이지에서도 사이드바 고정(sticky)', await (async () => {
  await d.evaluate(() => window.scrollTo(0, 600));
  const sb = await box(d, '.sidebar'); return Math.abs(sb.y) < 1;
})());
await d.click('.tabs a:has-text("홈")');
await d.click('.mode-card >> nth=0'); await d.click('.btn-primary'); await d.waitForSelector('article.card');
await d.click('article.card >> nth=0 >> button[aria-label="저장"]');
await d.click('article.card >> nth=0 >> button[aria-label="내 신발에 추가"]'); await d.waitForSelector('dialog[open]'); await d.click('dialog .btn-primary');
await d.waitForSelector('.toast.show');
const toast = await box(d, '.toast');
check('데스크톱: 토스트가 콘텐츠 영역 안(사이드바 밖)', toast.x > 248, JSON.stringify(toast));
await d.evaluate(() => window.scrollTo(0, 0));
await d.screenshot({ path: `${SHOTS}/6-desktop-sidebar.png` });
await d.emulateMedia({ colorScheme: 'dark' });
await d.screenshot({ path: `${SHOTS}/7-desktop-sidebar-dark.png` });

// ── 데스크톱 홈: 전체 폭 활용 ──
let h2 = await open(1280, 800);
const hero = await box(h2, '.hero'), widgets = await h2.locator('.widget').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
check('데스크톱 홈: 본문 영역 폭(1280-248-64=968px)을 전부 사용', hero.width >= 1280 - 248 - 64 - 2, String(hero.width));
check('데스크톱 홈: 찾기 카드 3개가 한 줄', (await h2.locator('.hero .mode-card').count()) === 3 && (await h2.locator('.hero .mode-card').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)) === 1);
check('데스크톱 홈: 개인 통계 타일 없음, 오늘의 픽·상식 위젯 2개(마이페이지로 이동)', (await h2.locator('.tile').count()) === 0 && widgets.length === 2 && (await h2.locator('.col-main').count()) === 1, JSON.stringify(widgets));
await h2.goto(BASE + '#/more'); await h2.waitForSelector('.page-header');
check('데스크톱에서 #/more 접근 → 마이페이지로 이동', h2.url().endsWith('#/me'), h2.url());
await h2.goto(BASE + '#/favorites'); await h2.waitForSelector('.page-header');
check('예전 주소 #/favorites → #/saved', h2.url().endsWith('#/saved'), h2.url());
await h2.goto(BASE + '#/my-shoes'); await h2.waitForSelector('.page-header');
check('예전 주소 #/my-shoes → #/me', h2.url().endsWith('#/me'), h2.url());

// ── 모바일 390×844: 지금 형태 유지 ──
let m = await open(390, 844);
check('모바일: 탭이 하단 고정', (await css(m, '.tabs', 'position')) === 'fixed');
const mt = await box(m, '.tabs');
check('모바일: 탭이 화면 맨 아래 가로 전체', Math.round(mt.y + mt.height) === 844 && Math.round(mt.width) === 390, JSON.stringify(mt));
check('모바일: 보이는 탭 3개가 한 줄(홈/저장/더보기)', (await m.locator('.tabs a:visible').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)) === 1);
const mb = await box(m, '.brand'), ml = await box(m, '.lang');
check('모바일: 브랜드 왼쪽·언어 버튼 오른쪽, 같은 줄(상단바)', mb.y < 80 && ml.y < 80 && ml.x > 200 && Math.abs((mb.y + mb.height / 2) - (ml.y + ml.height / 2)) < 12, `${JSON.stringify(mb)} ${JSON.stringify(ml)}`);
check('모바일: 마이페이지·앱 정보는 탭에 없음(더보기 안)', (await m.locator('.tabs a:visible:has-text("마이페이지")').count()) === 0 && (await m.locator('.tabs a:visible').count()) === 3);
check('모바일: 사이드바 박스 없음(display: contents)', (await css(m, '.sidebar', 'display')) === 'contents');
check('모바일: 가로 스크롤 없음', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await m.screenshot({ path: `${SHOTS}/8-mobile-unchanged.png` });

// ── 경계: 899px(모바일 형태) / 900px(사이드바) ──
let e1 = await open(899, 800), e2 = await open(900, 800);
check('899px 는 하단 탭', (await css(e1, '.tabs', 'position')) === 'fixed');
check('900px 부터 사이드바', (await css(e2, '.tabs', 'position')) === 'static' && (await box(e2, '.sidebar')).width === 248);

// ── 영어 + 사이드바 라벨 줄바꿈 ──
let en = await open(1280, 800);
await en.click('.lang');
check('영어: 사이드바 탭 라벨이 한 줄', (await en.locator('.tabs a:visible').evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height < 60))));
await en.screenshot({ path: `${SHOTS}/9-desktop-en.png` });


// ── 브랜드: 마스코트 + 두 줄 워드마크 (Stockpulse Select 방식) ──
async function brandChecks(page, label) {
  const r = await page.evaluate(() => {
    const logo = document.querySelector('.brand-logo'), name = document.querySelector('.brand-name'), sole = document.querySelector('.brand-name b');
    const lr = logo.getBoundingClientRect(), nr = name.getBoundingClientRect(), sr = sole.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(name).fontSize);
    return {
      text: name.textContent.replace(/\s+/g, ' ').trim(),
      // exactly two line boxes tall, and "Sole" begins on the second one (inline boxes sit a hair above the line box, so compare against the line height, not the font size)
      twoLines: Math.abs(nr.height - 2 * parseFloat(getComputedStyle(name).lineHeight)) < 2 && sr.top > nr.top + parseFloat(getComputedStyle(name).lineHeight) * 0.6,
      logoLeft: lr.right <= nr.left + 1,
      centered: Math.abs((lr.top + lr.height / 2) - (nr.top + nr.height / 2)) < 4,
      logoLoaded: logo.complete && logo.naturalWidth > 0,
      logoPx: Math.round(lr.width),
      soleColor: getComputedStyle(sole).color,
      lineColor: getComputedStyle(name).color,
    };
  });
  check(`${label}: 브랜드 텍스트가 "Find Your Sole"로 읽힘`, r.text === 'Find Your Sole', r.text);
  check(`${label}: 두 줄 배치(Find Your / Sole)`, r.twoLines);
  check(`${label}: 마스코트가 텍스트 왼쪽, 세로 가운데 정렬`, r.logoLeft && r.centered);
  check(`${label}: 로고 SVG 로드됨 (${r.logoPx}px)`, r.logoLoaded);
  check(`${label}: Sole 은 브랜드 파랑, Find Your 는 본문색`, r.soleColor === 'rgb(74, 171, 219)' && r.soleColor !== r.lineColor, `${r.soleColor} / ${r.lineColor}`);
  return r;
}
const bd = await open(1280, 800);
const rd = await brandChecks(bd, '데스크톱 사이드바');
check('데스크톱: 마스코트 44px', rd.logoPx === 44, String(rd.logoPx));
check('데스크톱: 브랜드가 사이드바 안(248px)에 들어감', (await box(bd, '.brand')).x + (await box(bd, '.brand')).width <= 248);
const bm = await open(390, 844);
const rm = await brandChecks(bm, '모바일 상단바');
check('모바일: 마스코트 40px', rm.logoPx === 40, String(rm.logoPx));
const mbrand = await box(bm, '.brand'), mlang = await box(bm, '.lang');
check('모바일: 브랜드와 언어 버튼이 겹치지 않음', mbrand.x + mbrand.width < mlang.x);
await bm.click('.lang');
await brandChecks(bm, '영어 전환 후 모바일');
check('홈 히어로에 솔이(큰 마스코트 + 말풍선) 하나', (await bd.locator('.hero .sol-e').count()) === 1 && (await bd.locator('.hero .bubble').count()) === 1 && (await bd.locator('.hero-mascot').count()) === 0);

// ── 사이트 아이콘/매니페스트가 실제로 서비스되는지 ──
const net = await open(1280, 800);
const assets = await net.evaluate(async () => {
  const man = await (await fetch('/manifest.webmanifest')).json();
  const urls = ['/logo.svg', '/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', ...man.icons.map((i) => i.src)];
  const out = [];
  for (const u of [...new Set(urls)]) { const r = await fetch(u); out.push([u, r.status, r.headers.get('content-type')]); }
  return { out, links: [...document.querySelectorAll('link[rel~=icon],link[rel=apple-touch-icon],link[rel=manifest]')].map((l) => l.getAttribute('href')) };
});
for (const [u, st, ct] of assets.out) check(`자산 ${u} → ${st} ${ct}`, st === 200 && /image|svg/.test(ct));
check('head 에 파비콘(svg+png)·apple-touch·manifest 링크', assets.links.some((h) => h === '/favicon.svg') && assets.links.some((h) => h === '/favicon-32.png') && assets.links.some((h) => h === '/apple-touch-icon.png') && assets.links.some((h) => h === '/manifest.webmanifest'), assets.links.join(','));

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
