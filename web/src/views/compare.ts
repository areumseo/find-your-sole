import { comparison, type CompareEntry } from '../compare';
import { h, safeUrl } from '../dom';
import { t } from '../i18n';
import { pageHeader } from '../ui';
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function fresh(e: CompareEntry): boolean {
  const time = Date.parse(e.shoe.sale_checked_at || '');
  return Number.isFinite(time) && time <= Date.now() && Date.now() - time <= 7 * 86400000;
}
function sellingPrice(e: CompareEntry): string {
  const s=t(), shoe=e.shoe;
  if (!fresh(e)) return s.unknownSpec;
  if (shoe.sale_available === false) return s.compareSoldOut;
  if (shoe.sale_available !== true || !numeric(shoe.sale_price)) return s.unknownSpec;
  return `₩${shoe.sale_price.toLocaleString()}${numeric(shoe.sale_price_max) && shoe.sale_price_max > shoe.sale_price ? `–₩${shoe.sale_price_max.toLocaleString()}` : ''} · ${shoe.sale_checked_at!.slice(0,10)}`;
}
function matches(e: CompareEntry): string {
  const s=t();
  if (!e.matches) return s.compareNoContext;
  return [e.matches.width && s.widthMatch, e.matches.cushion && s.cushionMatch, e.matches.terrain && s.compareTerrainMatch].filter(Boolean).join(' · ') || s.compareNoMatches;
}
export function renderCompare(): HTMLElement {
  const s=t(), entries=comparison.all();
  const chips=h('div',{class:'compare-chips'},...entries.map(e=>h('button',{type:'button',class:'compare-chip','aria-label':s.compareRemove(e.shoe.name),onClick:()=>comparison.remove(e.shoe.id)}, e.shoe.name, h('span',{'aria-hidden':'true'},' ×'))));
  if(entries.length < 2) return h('div',{},pageHeader(s.navCompare),chips,h('div',{class:'empty'},h('p',{},s.compareEmpty),h('a',{class:'btn btn-primary',href:'#/saved'},s.navSaved),h('a',{class:'btn btn-text',href:'#/'},s.navHome)));
  const rows: [string,(e:CompareEntry)=>string|HTMLElement][] = [
    [s.compareListPrice,e=>s.priceBrief(e.shoe)],
    [s.compareSellingPrice,sellingPrice],
    [s.weight,e=>numeric(e.shoe.weight_g)?`${e.shoe.weight_g}g`:s.unknownSpec],
    [s.compareWeightBasis,e=>e.shoe.weight_note?s.weightBasis(e.shoe.weight_note):s.unknownSpec],
    [s.drop,e=>numeric(e.shoe.drop_mm)?`${e.shoe.drop_mm}mm`:s.unknownSpec],
    [s.cushion,e=>e.shoe.cushion?s.cushionName(e.shoe.cushion):s.unknownSpec],
    [s.width,e=>e.shoe.width?s.widthName(e.shoe.width):s.unknownSpec],
    [s.compareUse,e=>Array.isArray(e.shoe.use_case)?e.shoe.use_case.map(s.tag).join(' · ')||s.unknownSpec:s.unknownSpec],
    [s.compareMatch,matches],
    [s.compareBudget,e=>!e.matches?s.compareNoContext:e.shoe.price_source !== 'kr_list'?s.priceUnconfirmed:e.shoe.budget_status === 'within'?s.withinBudget:e.shoe.budget_status === 'over'?s.overBudget:s.unknownSpec],
    [s.compareSource,e=>{
      const url=safeUrl(e.shoe.source_url || '');
      return url?h('a',{href:url,target:'_blank',rel:'noopener noreferrer'},e.shoe.specs_checked_at?s.sourceChecked(e.shoe.specs_checked_at):s.compareOfficialSource):s.unknownSpec;
    }],
    [s.compareSelected,e=>e.selected_at.slice(0,10)],
    [s.compareShopping,e=>{
      const url=safeUrl(e.shoe.naver_url);
      return url?h('a',{class:'compare-shop-link',href:url,target:'_blank',rel:'noopener noreferrer'},s.naverName):s.unknownSpec;
    }],
  ];
  const summary:string[]=[];
  const bases=entries.map(e=>e.shoe.weight_note);
  if(entries.every(e=>numeric(e.shoe.weight_g)) && bases.every(b=>b && b===bases[0])) {
    const weights=entries.map(e=>e.shoe.weight_g!);const min=Math.min(...weights),max=Math.max(...weights);
    summary.push(min===max?s.compareSameWeight:s.compareWeightRange(min,max));
  } else summary.push(s.compareWeightCaution);
  const drops=entries.map(e=>e.shoe.drop_mm);
  if(drops.every(numeric)) summary.push(s.compareDropRange(Math.min(...drops as number[]),Math.max(...drops as number[])));
  summary.push(s.comparePriceCaution);
  return h('div',{},pageHeader(s.navCompare),chips,
    h('p',{class:'hint'},s.compareSnapshot),
    h('section',{class:'panel'},h('h2',{},s.compareSummary),...summary.map(line=>h('p',{},line))),
    h('p',{class:'hint'},s.compareScroll),
    h('div',{class:'compare-scroll',tabindex:'0',role:'region','aria-label':s.compareTable},
      h('table',{class:'compare-table'},h('caption',{class:'sr-only'},s.compareTable),
        h('thead',{},h('tr',{},h('th',{scope:'col'},s.compareItem),...entries.map(e=>h('th',{scope:'col'},e.shoe.name,h('span',{class:'compare-brand'},e.shoe.brand))))),
        h('tbody',{},...rows.map(([label,value])=>h('tr',{},h('th',{scope:'row'},label),...entries.map(e=>h('td',{},value(e)))))))),
    h('button',{type:'button',class:'btn btn-text',onClick:()=>comparison.clear()},s.compareClear));
}
