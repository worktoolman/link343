import {
  groupByDay,
  deleteRecord,
  formatAmount,
  formatDay,
} from '../store.js'
import { toast, haptic, escapeHtml, confirmDialog, bindLongPress } from '../ui.js'

export const listView = {
  id: 'list',
  label: '明细',
  title: '明细',
  icon: `<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8.5h5M9.5 12.5h5"/></svg>`,

  mount(el, ctx) {
    function render() {
      const groups = groupByDay()

      if (groups.length === 0) {
        el.innerHTML = `
          <div class="placeholder">
            <div class="placeholder-icon">📋</div>
            <div class="placeholder-title">还没有记录</div>
            <div class="placeholder-hint">去「记账」页记下第一笔吧</div>
          </div>
        `
        ctx?.setSubtitle('')
        return
      }

      el.innerHTML =
        groups
          .map(
            (g) => `
        <section class="day-group">
          <header class="day-head">
            <span class="day-date">${formatDay(g.date)}</span>
            <span class="day-sums tnum">
              ${
                g.expense
                  ? `<span class="amount-expense">-${formatAmount(g.expense)}</span>`
                  : ''
              }
              ${
                g.income
                  ? `<span class="amount-income">+${formatAmount(g.income)}</span>`
                  : ''
              }
            </span>
          </header>
          <div class="day-list">
            ${g.records
              .map(
                (r) => `
              <article class="rec" data-id="${r.id}">
                <div class="rec-main">
                  <span class="rec-cat">${escapeHtml(r.category)}</span>
                  ${
                    r.note
                      ? `<span class="rec-note">${escapeHtml(r.note)}</span>`
                      : ''
                  }
                </div>
                <span class="rec-amount tnum ${
                  r.type === 'income' ? 'amount-income' : 'amount-expense'
                }">${r.type === 'income' ? '+' : '-'}${formatAmount(r.amount)}</span>
              </article>
            `
              )
              .join('')}
          </div>
        </section>
      `
          )
          .join('') + `<p class="list-hint">长按某条记录可删除</p>`

      const total = groups.reduce((a, g) => a + g.records.length, 0)
      ctx?.setSubtitle(`共 ${total} 笔`)
    }

    // ---------- 长按删除 ----------

    bindLongPress(el, '.rec', async (node) => {
      const id = node.dataset.id
      const cat = node.querySelector('.rec-cat')?.textContent ?? ''
      const amount = node.querySelector('.rec-amount')?.textContent ?? ''

      const ok = await confirmDialog({
        title: '删除这条记录？',
        message: `${cat} ${amount}`,
        confirmText: '删除',
        danger: true,
      })
      if (!ok) return

      if (deleteRecord(id)) {
        haptic(15)
        toast('已删除', 'success')
        render()
      } else {
        toast('删除失败，记录可能已不存在', 'error')
        render()
      }
    })

    render()
  },
}
