import {
  getStats,
  setBudget,
  clearBudget,
  shiftMonth,
  currentMonth,
  formatAmount,
  formatMonth,
  budgetState,
  categoriesOf,
  addBudgetItem,
  updateBudgetItem,
  removeBudgetItem,
  MAX_NAME_LEN,
} from '../store.js'
import { escapeHtml, toast, haptic, confirmDialog, sanitizeAmount } from '../ui.js'

/** 取事件目标最近的匹配元素 */
const hit = (e, sel) => (e.target.closest ? e.target.closest(sel) : null)

export const statsView = {
  id: 'stats',
  label: '统计',
  title: '统计',
  icon: `<svg viewBox="0 0 24 24"><path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.5" height="6.5" rx="1"/><rect x="10.5" y="6" width="3.5" height="11.5" rx="1"/><rect x="16" y="14" width="3.5" height="3.5" rx="1"/></svg>`,

  mount(el, ctx) {
    let month = currentMonth()
    /** 生活费 / 专项额度的编辑面板是否展开（页内展开，不用弹窗） */
    let editing = false
    /** 正在填、还没保存的额度项；保存后自动变成正式条目 */
    let draft = null

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
      const remain = s.remaining ?? 0
      // 环形最多画满一圈，超支的部分靠颜色和文字表达
      const fill = Math.min(pct, 100)

      return `
        <div class="budget-card" data-act="set-budget" role="button" tabindex="0">
          <div class="donut-wrap" data-state="${budgetState(pct)}">
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

    // ---------- 专项额度（只读展示）----------

    function itemsHtml(s) {
      if (!s.budgetItems.length) {
        return `
          <button type="button" class="add-row-btn" data-act="editor-open">
            + 添加专项额度（如 饮食花销、购物）
          </button>
        `
      }

      return `
        <div class="bi-list">
          ${s.budgetItems
            .map(
              (it) => `
            <div class="bi-card" data-state="${it.state}">
              <div class="bi-head">
                <span class="bi-name">${escapeHtml(it.name)}</span>
                <span class="bi-amount tnum">
                  ¥${formatAmount(it.spent)}<span class="bi-of">/ ¥${formatAmount(
                it.amount
              )}</span>
                </span>
              </div>
              <div class="bi-track">
                <div class="bi-fill" style="width:${Math.min(it.usedPercent, 100)}%"></div>
              </div>
              <div class="bi-foot">
                <span class="bi-cat">${escapeHtml(it.category || '未绑定分类')}</span>
                <span class="bi-remain tnum ${
                  it.remaining < 0 ? 'amount-expense' : ''
                }">
                  ${
                    it.remaining < 0
                      ? `超支 ¥${formatAmount(-it.remaining)}`
                      : `剩 ¥${formatAmount(it.remaining)}`
                  }
                  · ${it.usedPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        <button type="button" class="add-row-btn" data-act="editor-open">
          + 编辑生活费 / 专项额度
        </button>
      `
    }

    // ---------- 专项额度（编辑态）----------

    function itemRowHtml(it, cats, isDraft = false) {
      // 绑定的分类被删掉了也保留这个选项，免得下拉框突然变空
      const options = cats.includes(it.category)
        ? cats
        : [it.category, ...cats].filter(Boolean)

      return `
        <div class="bi-edit" data-id="${escapeHtml(String(it.id))}">
          <div class="bi-edit-row">
            <input
              class="boxed-input"
              type="text"
              data-field="name"
              value="${escapeHtml(it.name ?? '')}"
              placeholder="名称，如 饮食花销"
              maxlength="${MAX_NAME_LEN}"
              autocomplete="off"
            />
            <button type="button" class="icon-btn" data-act="item-del" aria-label="删除这条额度">✕</button>
          </div>
          <div class="bi-edit-row">
            <select class="bi-select" data-field="category" aria-label="绑定分类">
              ${options
                .map(
                  (c) =>
                    `<option value="${escapeHtml(c)}"${
                      c === it.category ? ' selected' : ''
                    }>${escapeHtml(c)}</option>`
                )
                .join('')}
            </select>
            <span class="editor-input-wrap">
              <span class="editor-symbol">¥</span>
              <input
                class="editor-input tnum"
                type="text"
                inputmode="decimal"
                data-field="amount"
                value="${it.amount === '' || it.amount == null ? '' : escapeHtml(String(it.amount))}"
                placeholder="额度"
                autocomplete="off"
              />
            </span>
          </div>
          ${isDraft ? '<div class="bi-edit-tip">填好名称和额度就会自动保存</div>' : ''}
        </div>
      `
    }

    function editorHtml(s) {
      const cats = categoriesOf('expense')
      const rows = s.budgetItems.map((it) => itemRowHtml(it, cats)).join('')
      const draftRow = draft
        ? itemRowHtml(
            {
              id: 'draft',
              name: draft.name,
              category: draft.category,
              amount: draft.amount,
            },
            cats,
            true
          )
        : ''

      return `
        <section class="inline-panel" id="budgetPanel">
          <div class="panel-head">
            <span class="panel-title">生活费与专项额度</span>
            <button type="button" class="panel-done" data-act="editor-done">完成</button>
          </div>

          <label class="editor-field">
            <span class="editor-label">生活费总额</span>
            <span class="editor-input-wrap">
              <span class="editor-symbol">¥</span>
              <input
                class="editor-input tnum"
                type="text"
                inputmode="decimal"
                data-field="total"
                value="${s.budget == null ? '' : s.budget}"
                placeholder="留空表示不设上限"
                autocomplete="off"
              />
            </span>
          </label>

          <div class="editor-sub">专项额度（按绑定的支出分类自动算已花多少）</div>
          <div class="bi-edit-list">
            ${rows}${draftRow}
            ${
              !rows && !draftRow
                ? '<p class="panel-hint">还没有专项额度，点下面的按钮加一条</p>'
                : ''
            }
          </div>
          <button type="button" class="add-row-btn" data-act="item-add">+ 添加专项额度</button>
          <p class="panel-hint">改完直接生效，不用点保存；名称和额度都填好后自动存下</p>
        </section>
      `
    }

    // ---------- 下半部分：合计与支出构成 ----------

    function lowerHtml(s) {
      if (!s.count) {
        return `
          <div class="placeholder">
            <div class="placeholder-icon">📊</div>
            <div class="placeholder-title">这个月还没有记录</div>
            <div class="placeholder-hint">换个月份看看，或者去记一笔</div>
          </div>
        `
      }

      return `
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
          <div class="field-label"><span>支出构成</span></div>
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
    }

    // ---------- 渲染 ----------

    /** 只刷新生活费卡片与专项额度展示，编辑面板原样不动（输入时不掉焦点） */
    function renderSummary() {
      const s = getStats(month)
      const summary = el.querySelector('#summaryZone')
      const items = el.querySelector('#itemsZone')
      if (summary) summary.innerHTML = budgetCard(s)
      if (items) items.innerHTML = editing ? '' : itemsHtml(s)
    }

    function render() {
      const s = getStats(month)
      const canGoNext = month < currentMonth()
      const scrollTop = el.scrollTop

      el.innerHTML = `
        <div class="month-nav">
          <button type="button" class="month-btn" data-act="prev" aria-label="上个月">‹</button>
          <span class="month-label">${formatMonth(month)}</span>
          <button type="button" class="month-btn" data-act="next" aria-label="下个月" ${
            canGoNext ? '' : 'disabled'
          }>›</button>
        </div>

        <div id="summaryZone">${budgetCard(s)}</div>
        <div id="itemsZone">${editing ? '' : itemsHtml(s)}</div>
        ${editing ? editorHtml(s) : ''}
        <div id="lowerZone">${lowerHtml(s)}</div>
      `

      el.scrollTop = scrollTop
      ctx?.setSubtitle(s.count ? `${s.count} 笔记录` : '')
    }

    // ---------- 编辑面板操作 ----------

    function openEditor() {
      if (editing) return
      editing = true
      render()
      el.querySelector('#budgetPanel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }

    function closeEditor() {
      editing = false
      draft = null
      render()
    }

    function addDraft() {
      if (draft) {
        toast('先把上面这条填完', 'error')
        el.querySelector('.bi-edit[data-id="draft"] [data-field="name"]')?.focus()
        return
      }

      const cats = categoriesOf('expense')
      draft = { name: '', category: cats[0] || '', amount: '' }
      render()

      const input = el.querySelector('.bi-edit[data-id="draft"] [data-field="name"]')
      input?.focus()
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    /** 把草稿行的输入同步进内存，避免「完成」时丢掉没 blur 的内容 */
    function syncDraft(row) {
      if (!draft || !row) return
      draft.name = row.querySelector('[data-field="name"]')?.value ?? draft.name
      draft.category = row.querySelector('[data-field="category"]')?.value ?? draft.category
      draft.amount = row.querySelector('[data-field="amount"]')?.value ?? draft.amount
    }

    /** 名称和额度都填好了就把草稿转正 */
    function tryCommitDraft(row) {
      if (!draft) return
      syncDraft(row)

      const name = String(draft.name ?? '').trim()
      const amount = Number(draft.amount)
      if (!name || !Number.isFinite(amount) || amount <= 0) return

      try {
        const item = addBudgetItem({ name, category: draft.category, amount }, month)
        draft = null

        // 就地转正，不重建面板，免得焦点跑掉
        row.dataset.id = item.id
        row.querySelector('.bi-edit-tip')?.remove()
        const nameEl = row.querySelector('[data-field="name"]')
        const amountEl = row.querySelector('[data-field="amount"]')
        if (nameEl) nameEl.value = item.name
        if (amountEl) amountEl.value = item.amount

        haptic(12)
        toast('已添加专项额度', 'success')
        renderSummary()
      } catch (err) {
        toast(err.message || '添加失败', 'error')
      }
    }

    function commitTotal(input) {
      const raw = input.value.trim()
      try {
        if (!raw) {
          clearBudget(month)
          haptic(10)
          toast('已取消生活费上限', 'success')
        } else {
          setBudget(raw, month)
          haptic(10)
        }
        renderSummary()
      } catch (err) {
        toast(err.message || '设置失败', 'error')
        render()
      }
    }

    function commitItemField(row, field) {
      const id = row.dataset.id
      const key = field.dataset.field

      try {
        if (key === 'name') {
          const v = field.value.trim()
          if (!v) throw new Error('名称不能为空')
          updateBudgetItem(id, { name: v }, month)
          field.value = v
        } else if (key === 'category') {
          updateBudgetItem(id, { category: field.value }, month)
        } else if (key === 'amount') {
          const raw = field.value.trim()
          if (!raw) throw new Error('额度不能为空')
          const item = updateBudgetItem(id, { amount: raw }, month)
          field.value = item.amount
        }
        renderSummary()
      } catch (err) {
        toast(err.message || '保存失败', 'error')
        render()
      }
    }

    // ---------- 事件 ----------

    el.addEventListener('click', async (e) => {
      const monthBtn = hit(e, '.month-btn')
      if (monthBtn) {
        if (monthBtn.disabled) return
        const delta = monthBtn.dataset.act === 'prev' ? -1 : 1
        const next = shiftMonth(month, delta)
        if (next > currentMonth()) return
        month = next
        draft = null
        render()
        el.scrollTop = 0
        return
      }

      // 点生活费卡片 → 展开页内编辑面板
      if (hit(e, '[data-act="set-budget"]')) {
        openEditor()
        return
      }

      if (hit(e, '[data-act="editor-open"]')) {
        openEditor()
        return
      }

      if (hit(e, '[data-act="editor-done"]')) {
        closeEditor()
        return
      }

      if (hit(e, '[data-act="item-add"]')) {
        addDraft()
        return
      }

      const delBtn = hit(e, '[data-act="item-del"]')
      if (delBtn) {
        const row = delBtn.closest('.bi-edit')
        if (!row) return

        // 草稿还没保存，直接丢掉
        if (row.dataset.id === 'draft') {
          draft = null
          render()
          return
        }

        const item = getStats(month).budgetItems.find((x) => x.id === row.dataset.id)
        const ok = await confirmDialog({
          title: `删除「${item?.name ?? '这条额度'}」？`,
          message: '只删额度设置，已经记下的账不受影响',
          confirmText: '删除',
          danger: true,
        })
        if (!ok) return

        if (removeBudgetItem(row.dataset.id, month)) {
          haptic(15)
          toast('已删除', 'success')
        }
        render()
      }
    })

    el.addEventListener('input', (e) => {
      const field = hit(e, '[data-field]')
      if (!field) return

      const key = field.dataset.field
      if (key === 'total' || key === 'amount') {
        const clean = sanitizeAmount(field.value)
        if (clean !== field.value) field.value = clean
      }

      const row = field.closest('.bi-edit')
      if (draft && row?.dataset.id === 'draft') syncDraft(row)
    })

    el.addEventListener('change', (e) => {
      const field = hit(e, '[data-field]')
      if (!field) return

      if (field.dataset.field === 'total') {
        commitTotal(field)
        return
      }

      const row = field.closest('.bi-edit')
      if (!row) return

      if (row.dataset.id === 'draft') tryCommitDraft(row)
      else commitItemField(row, field)
    })

    // 键盘上的「完成/前往」= 收起键盘，顺便触发 change 提交
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      const field = hit(e, '[data-field]')
      if (!field) return
      e.preventDefault()
      field.blur()
    })

    render()
  },
}
