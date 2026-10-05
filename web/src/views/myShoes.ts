import { h } from '../dom';
import { t } from '../i18n';
import { REPLACE_KM, myShoes } from '../storage';
import { openForm, toast } from '../ui';

/** The user's shoe collection, shown as a section of the My Page screen. */
export function myShoesSection(rerender: () => void, stats?: Node): HTMLElement {
  const s = t();
  const shoes = myShoes.all();

  const addButton = h('button', {
    type: 'button',
    class: 'btn btn-primary btn-small',
    onClick: () =>
      openForm(
        s.addShoe,
        [
          { name: 'name', label: s.shoeName, required: true },
          { name: 'brand', label: s.brand },
        ],
        s.addShoe,
        ({ name, brand }) => {
          if (!name) return;
          myShoes.add(name, brand);
          toast(s.shoeAdded(name));
          rerender();
        },
      ),
  }, `＋ ${s.addShoe}`);

  return h('section', { class: 'panel' },
    h('div', { class: 'section-head' }, h('h2', {}, s.myShoesTitle), addButton),
    stats ?? null,
    shoes.length
      ? h('div', { class: 'cards-grid' }, ...shoes.map((shoe) => {
          const worn = shoe.km > REPLACE_KM;
          const pct = Math.min(100, (shoe.km / REPLACE_KM) * 100);
          return h('article', { class: 'card owned' },
            h('div', { class: 'avatar', 'aria-hidden': 'true' }, '👟'),
            h('div', { class: 'info' },
              h('div', { class: 'shoe-name' }, shoe.name),
              h('div', { class: 'meta' }, [shoe.brand, shoe.purchased_at].filter(Boolean).join(' · ')),
              h('div', {
                class: worn ? 'progress worn' : 'progress',
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': REPLACE_KM,
                'aria-valuenow': Math.round(shoe.km),
              }, h('i', { style: `width:${pct}%` })),
            ),
            h('div', { class: worn ? 'km worn' : 'km' },
              `${shoe.km.toFixed(0)}km`,
              worn ? h('small', {}, s.replaceTime) : null,
            ),
            h('div', { class: 'menu' },
              h('button', {
                type: 'button', class: 'link-btn',
                onClick: () =>
                  openForm(
                    s.cumulativeKm,
                    [{ name: 'km', label: s.cumulativeKmLabel, type: 'number', suffix: 'km', value: shoe.km.toFixed(0), required: true }],
                    s.save,
                    ({ km }) => {
                      const value = Number(km);
                      if (Number.isFinite(value) && value >= 0) {
                        myShoes.updateKm(shoe.id, value);
                        rerender();
                      }
                    },
                  ),
              }, s.kmUpdate),
              h('button', {
                type: 'button', class: 'link-btn danger',
                onClick: () => {
                  if (confirm(s.confirmDelete(shoe.name))) {
                    myShoes.remove(shoe.id);
                    rerender();
                  }
                },
              }, s.delete),
            ),
          );
        }))
      : h('p', { class: 'empty' }, s.myShoesEmpty),
  );
}
