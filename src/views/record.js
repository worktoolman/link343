import {
  addRecord,
  categoriesOf,
  todayStr,
  formatAmount,
  getStats,
  addCategory,
  renameCategory,
  removeCategory,
  countRecordsOfCategory,
  MAX_NAME_LEN,
} from '../store.js'
import { toast, sanitizeAmount, haptic, escapeHtml, confirmDialog } from '../ui.js'

export const recordView = {
  id: 'record',
  label: '记账',
  title: '记一笔',
  subtitle: () => `本月支出 ¥${formatAmount(getStats().expense)}`,
  icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/></svg>`,

  mount(el, ctx) {
    let type = 'expense'
    let category = categoriesOf(type)[0]
    /** 分类管理面板是否展开（页内展开，不弹窗、不遮住其他内容） */
    let managing = false

    el.innerHTML = `
      <div class="segmented" id="seg">
        <button type="button" data-type="expense" class="is-active">支出</button>
        <button type="button" data-type="income">收入</button>
      </div>

      <div class="amount-box" id="amountBox">
        <span class="amount-symbol">¥</span>
        <input
          id="amount"
          class="amount-input"
          type="text"
          inputmode="decimal"
          placeholder="0.00"
          autocomplete="off"
          enterkeyhint="done"
        />
      </div>

      <div class="field">
        <div class="field-label">
          <span>分类</span>
          <button type="button" class="field-action" id="manageBtn">管理</button>
        </div>
        <div class="category-grid" id="cats"></div>
      </div>

      <section class="inline-panel" id="catPanel" hidden></section>

      <div class="field">
        <div class="field-label"><span>备注</span></div>
        <input id="note" class="text-input" type="text" placeholder="选填" maxlength="30" />
      </div>

      <div class="field">
        <div class="field-label"><span>日期</span></div>
        <input id="date" class="text-input" type="date" value="${todayStr()}" />
      </div>

      <button id="save" class="btn-primary" type="button">保存</button>
    `

    const segEl = el.querySelector('#seg')
    const amountBoxEl = el.querySelector('#amountBox')
    const amountEl = el.querySelector('#amount')
    const catsEl = el.querySelector('#cats')
    const manageBtnEl = el.querySelector('#manageBtn')
    const panelEl = el.querySelector('#catPanel')
    const noteEl = el.querySelector('#note')
    const dateEl = el.querySelector('#date')
    const saveEl = el.querySelector('#save')

    // ---------- 分类九宫格 ----------

    function renderCats() {
      const list = categoriesOf(type)
      if (!list.includes(category)) category = list[0]

      catsEl.innerHTML = list
        .map(
          (c) =>
            `<button type="button" class="cat${
              c === category ? ' is-active' : ''
            }" data-cat="${escapeHtml(c)}" title="${escapeHtml(c)}">${escapeHtml(c)}</button>`
        )
        .join('')
    }

    catsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat')
      if (!btn) return
      category = btn.dataset.cat
      haptic(8)
      renderCats()
    })

    // ---------- 分类管理（页内展开）----------

    function renderPanel() {
      if (!managing) {
        panelEl.hidden = true
        panelEl.innerHTML = ''
        return
      }

      const list = categoriesOf(type)
      panelEl.hidden = false
      panelEl.innerHTML = `
        <div class="panel-head">
          <span class="panel-title">管理「${
            type === 'income' ? '收入' : '支出'
          }」分类</span>
          <button type="button" class="panel-done" data-act="cat-done">完成</button>
        </div>
        <div class="cat-edit-list">
          ${list
            .map(
              (c) => `
            <div class="cat-edit" data-cat="${escapeHtml(c)}">
              <input
                class="boxed-input"
                type="text"
                data-field="cat-name"
                value="${escapeHtml(c)}"
                maxlength="${MAX_NAME_LEN}"
                autocomplete="off"
                aria-label="分类名"
              />
              <button type="button" class="icon-btn" data-act="cat-del" aria-label="删除分类">✕</button>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="cat-edit-add">
          <input
            id="newCat"
            class="boxed-input"
            type="text"
            placeholder="新分类，如 宠物"
            maxlength="${MAX_NAME_LEN}"
            autocomplete="off"
          />
          <button type="button" class="mini-btn" data-act="cat-add">添加</button>
        </div>
        <p class="panel-hint">改名会同步已有记录和专项额度；删掉分类不会删掉已有记录</p>
      `
    }

    /** 点「管理」展开/收起面板 */
    manageBtnEl.addEventListener('click', () => {
      managing = !managing
      manageBtnEl.textContent = managing ? '收起' : '管理'
      manageBtnEl.classList.toggle('is-active', managing)

      renderPanel()
      if (managing) {
        panelEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    })

    panelEl.addEventListener('click', async (e) => {
      if (e.target.closest('[data-act="cat-done"]')) {
        managing = false
        manageBtnEl.textContent = '管理'
        manageBtnEl.classList.remove('is-active')
        renderPanel()
        return
      }

      if (e.target.closest('[data-act="cat-add"]')) {
        addCat()
        return
      }

      const delBtn = e.target.closest('[data-act="cat-del"]')
      if (!delBtn) return

      const row = delBtn.closest('.cat-edit')
      const name = row?.dataset.cat
      if (!name) return

      const used = countRecordsOfCategory(name)
      const ok = await confirmDialog({
        title: `删除分类「${name}」？`,
        message: used
          ? `已有 ${used} 笔记录用它，记录会保留，但以后不能再选这个分类`
          : '以后记账不能再选这个分类',
        confirmText: '删除',
        danger: true,
      })
      if (!ok) return

      try {
        removeCategory(type, name)
        if (category === name) category = categoriesOf(type)[0]
        renderCats()
        renderPanel()
        haptic(15)
        toast('已删除', 'success')
      } catch (err) {
        toast(err.message || '删除失败', 'error')
      }
    })

    /** 分类改名：就地更新，不重建面板，免得正在输入时焦点跑掉 */
    panelEl.addEventListener('change', (e) => {
      const input = e.target.closest('input[data-field="cat-name"]')
      if (!input) return

      const row = input.closest('.cat-edit')
      const oldName = row?.dataset.cat
      const next = input.value.trim()
      if (!oldName || next === oldName) {
        input.value = oldName || ''
        return
      }

      try {
        const saved = renameCategory(type, oldName, next)
        row.dataset.cat = saved
        input.value = saved
        if (category === oldName) category = saved
        renderCats()
        haptic(8)
        toast('已改名', 'success')
      } catch (err) {
        input.value = oldName
        toast(err.message || '改名失败', 'error')
      }
    })

    /** 新增分类：加完保持焦点，方便连着加几个 */
    function addCat() {
      const input = panelEl.querySelector('#newCat')
      if (!input) return

      const name = input.value.trim()
      if (!name) {
        toast('请输入分类名', 'error')
        input.focus()
        return
      }

      try {
        addCategory(type, name)
        haptic(12)
        renderCats()
        renderPanel()
        const next = panelEl.querySelector('#newCat')
        next.value = ''
        next.focus()
        toast(`已添加「${name}」`, 'success')
      } catch (err) {
        toast(err.message || '添加失败', 'error')
        input.focus()
      }
    }

    panelEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      const input = e.target.closest('input')
      if (!input) return
      e.preventDefault()
      if (input.id === 'newCat') addCat()
      else input.blur() // 触发 change，提交改名
    })

    // ---------- 收支切换 ----------

    function applyType() {
      amountBoxEl.dataset.type = type
      saveEl.dataset.type = type
      for (const b of segEl.children) {
        b.classList.toggle('is-active', b.dataset.type === type)
      }
      renderCats()
      renderPanel()
    }

    segEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-type]')
      if (!btn || btn.dataset.type === type) return
      type = btn.dataset.type
      haptic(8)
      applyType()
    })

    // ---------- 金额输入 ----------

    amountEl.addEventListener('input', () => {
      const clean = sanitizeAmount(amountEl.value)
      if (clean !== amountEl.value) amountEl.value = clean
    })

    amountEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    })

    // ---------- 保存 ----------

    function save() {
      const raw = amountEl.value.trim()

      if (!raw || Number(raw) <= 0) {
        toast('请输入金额', 'error')
        amountEl.focus()
        return
      }

      try {
        addRecord({
          amount: raw,
          type,
          category,
          note: noteEl.value,
          date: dateEl.value || todayStr(),
        })
      } catch (err) {
        toast(err.message || '保存失败', 'error')
        return
      }

      haptic(15)
      toast(`已记下 ¥${formatAmount(raw)}`, 'success')

      // 重置，方便连续记账
      amountEl.value = ''
      noteEl.value = ''
      amountEl.focus()

      ctx?.setSubtitle(recordView.subtitle())
    }

    saveEl.addEventListener('click', save)

    // ---------- 初始化 ----------

    applyType()
    amountEl.focus()
  },
}
