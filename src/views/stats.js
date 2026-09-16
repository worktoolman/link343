import {
  getStats,
  shiftMonth,
  currentMonth,
  formatAmount,
  formatMonth,
} from '../store.js'
import { escapeHtml } from '../ui.js'

export const statsView = {
  id: 'stats',
  label: '统计',
  title: '统计',
  icon: `<svg viewBox="0 0 24 24"><path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.5" height="6.5" rx="1"/><rect x="10.5" y="6" width="3.5" height="11.5" rx="1"/><rect x="16" y="14" width="3.5" height="3.5" rx="1"/></svg>`,

  mount(el, ctx) {
    let month = currentMonth()

    function render() {
      const s = getStats(month)
      const canGoNext = month < currentMonth()

      const body = s.count
        ? `
          <div class="sum-cards">
            <div class="sum-card">
              <div class="sum-label">支出</div>
              <div class="sum-value amount-expense tnum">¥${formatAmount(s.expense)}</div>
            </div>
            <div class="sum-card">
              <div class="sum-label">收入</div>
              <div class="sum-value amount-income tnum">¥${formatAmount(s.income)}</div>
            </div>
          </div>

          <div class="balance-row">
            <span>结余</span>
            <span class="balance-value tnum ${
              s.balance >= 0 ? 'amount-income' : 'amount-expense'
            }">
              ${s.balance >= 0 ? '+' : '−'}¥${formatAmount(Math.abs(s.balance))}
            </span>
          </div>

          <div class="field">
            <div class="field-label">支出构成</div>
            ${
              s.byCategory.length
                ? `<div class="cat-stats">${s.byCategory
                    .map(
                      (c) => `
                  <div class="cat-stat">
                    <div class="cat-stat-row">
                      <span class="cat-stat-name">${escapeHtml(c.category)}</span>
                      <span class="cat-stat-pct tnum">${c.percent.toFixed(1)}%</span>
                      <span class="cat-stat-amount tnum">¥${formatAmount(c.amount)}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width:${c.percent}%"></div>
                    </div>
                  </div>
                `
                    )
                    .join('')}</div>`
                : `<p class="muted-note">本月没有支出</p>`
            }
          </div>
        `
        : `
          <div class="placeholder">
            <div class="placeholder-icon">📊</div>
            <div class="placeholder-title">这个月还没有记录</div>
            <div class="placeholder-hint">换个月份看看，或者去记一笔</div>
          </div>
        `

      el.innerHTML = `
        <div class="month-nav">
          <button type="button" class="month-btn" data-act="prev" aria-label="上个月">‹</button>
          <span class="month-label">${formatMonth(month)}</span>
          <button type="button" class="month-btn" data-act="next" aria-label="下个月" ${
            canGoNext ? '' : 'disabled'
          }>›</button>
        </div>
        ${body}
      `

      ctx?.setSubtitle(s.count ? `${s.count} 笔记录` : '')
    }

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.month-btn')
      if (!btn || btn.disabled) return

      const delta = btn.dataset.act === 'prev' ? -1 : 1
      const next = shiftMonth(month, delta)
      if (next > currentMonth()) return

      month = next
      render()
      el.scrollTop = 0
    })

    render()
  },
}
