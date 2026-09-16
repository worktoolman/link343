import {
  getStats,
  setBudget,
  shiftMonth,
  currentMonth,
  formatAmount,
  formatMonth,
} from '../store.js'
import { escapeHtml, promptDialog, toast, haptic } from '../ui.js'

export const statsView = {
  id: 'stats',
  label: '统计',
  title: '统计',
  icon: `<svg viewBox="0 0 24 24"><path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.5" height="6.5" rx="1"/><rect x="10.5" y="6" width="3.5" height="11.5" rx="1"/><rect x="16" y="14" width="3.5" height="3.5" rx="1"/></svg>`,

  mount(el, ctx) {
    let month = currentMonth()

    /** 已用占比对应的状态色 */
    function budgetState(percent) {
      if (percent > 100) return 'over'
      if (percent >= 80) return 'warn'
      return 'ok'
    }

    // ---------- 生活费卡片 ----------

    function budgetCard(s) {
      if (s.budget == null) {
        return `
          <div class="budget-card is-empty" data-act="set-budget" role="button" tabindex="0">
            <div class="donut-wrap is-empty">
              <svg class="donut" viewBox="0 0 36 36" aria-hidden="true">
                <circle class="donut-track" cx="18" cy="18" r="16" pathLength="100" />
              </svg>
              <div class="donut-center"><span class="donut-plus">+</span></div>
            </div>
            <div class="budget-detail">
              <div class="budget-prompt">设置本月生活费</div>
              <div class="budget-sub">看看这个月还能花多少</div>
            </div>
          </div>
        `
      }

      const pct = s.usedPercent ?? 0
      const state = budgetState(pct)
      // 环形最多画满一圈，超支的部分靠颜色和文字表达
      const fill = Math.min(pct, 100)
      const remain = s.remaining ?? 0

      return `
        <div class="budget-card" data-act="set-budget" role="button" tabindex="0">
          <div class="donut-wrap" data-state="${state}">
            <svg class="donut" viewBox="0 0 36 36" aria-hidden="true">
              <circle class="donut-track" cx="18" cy="18" r="16" pathLength="100" />
              <circle class="donut-fill" cx="18" cy="18" r="16" pathLength="100"
                      style="stroke-dasharray:${fill} 100" />
            </svg>
            <div class="donut-center">
              <span class="donut-pct tnum">${pct.toFixed(pct >= 100 ? 0 : 1)}%</span>
              <span class="donut-cap">已用</span>
            </div>
          </div>
          <div class="budget-detail">
            <div class="budget-row">
              <span class="budget-key">生活费</span>
              <span class="budget-val tnum">¥${formatAmount(s.budget)}</span>
            </div>
            <div class="budget-row">
              <span class="budget-key">已用</span>
              <span class="budget-val amount-expense tnum">¥${formatAmount(s.expense)}</span>
            </div>
            <div class="budget-row">
              <span class="budget-key">${remain < 0 ? '超支' : '剩余'}</span>
              <span class="budget-val tnum ${
                remain < 0 ? 'amount-expense' : 'amount-income'
              }">¥${formatAmount(Math.abs(remain))}</span>
            </div>
          </div>
        </div>
      `
    }

    // ---------- 设置生活费 ----------

    async function editBudget() {
      const s = getStats(month)
      const raw = await promptDialog({
        title: `${formatMonth(month)}的生活费`,
        message: '设置后每月会自动沿用，可随时修改',
        defaultValue: s.budget == null ? '' : String(s.budget),
        placeholder: '例如 2000',
        inputMode: 'decimal',
        suffix: '元',
        confirmText: '保存',
        validate: (v) => {
          if (!v) return '请输入金额'
          const n = Number(v)
          if (!Number.isFinite(n) || n <= 0) return '请输入大于 0 的数字'
          return null
        },
      })

      if (raw == null) return // 取消

      try {
        setBudget(raw, month)
        haptic(15)
        toast('生活费已更新', 'success')
        render()
      } catch (err) {
        toast(err.message || '设置失败', 'error')
      }
    }

    // ---------- 渲染 ----------

    function render() {
      const s = getStats(month)
      const canGoNext = month < currentMonth()

      const lower = s.count
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
        ${budgetCard(s)}
        ${lower}
      `

      ctx?.setSubtitle(s.count ? `${s.count} 笔记录` : '')
    }

    // ---------- 事件 ----------

    el.addEventListener('click', (e) => {
      const monthBtn = e.target.closest('.month-btn')

      if (monthBtn) {
        if (monthBtn.disabled) return
        const delta = monthBtn.dataset.act === 'prev' ? -1 : 1
        const next = shiftMonth(month, delta)
        if (next > currentMonth()) return
        month = next
        render()
        el.scrollTop = 0
        return
      }

      if (e.target.closest('[data-act="set-budget"]')) {
        editBudget()
      }
    })

    render()
  },
}
