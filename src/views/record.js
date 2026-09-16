import { addRecord, categoriesOf, todayStr, formatAmount, getStats } from '../store.js'
import { toast, sanitizeAmount, haptic } from '../ui.js'

export const recordView = {
  id: 'record',
  label: '记账',
  title: '记一笔',
  subtitle: () => `本月支出 ¥${formatAmount(getStats().expense)}`,
  icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/></svg>`,

  mount(el, ctx) {
    let type = 'expense'
    let category = categoriesOf(type)[0]

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
        <div class="field-label">分类</div>
        <div class="category-grid" id="cats"></div>
      </div>

      <div class="field">
        <div class="field-label">备注</div>
        <input id="note" class="text-input" type="text" placeholder="选填" maxlength="30" />
      </div>

      <div class="field">
        <div class="field-label">日期</div>
        <input id="date" class="text-input" type="date" value="${todayStr()}" />
      </div>

      <button id="save" class="btn-primary" type="button">保存</button>
    `

    const segEl = el.querySelector('#seg')
    const amountBoxEl = el.querySelector('#amountBox')
    const amountEl = el.querySelector('#amount')
    const catsEl = el.querySelector('#cats')
    const noteEl = el.querySelector('#note')
    const dateEl = el.querySelector('#date')
    const saveEl = el.querySelector('#save')

    // ---------- 分类 ----------

    function renderCats() {
      const list = categoriesOf(type)
      if (!list.includes(category)) category = list[0]

      catsEl.innerHTML = list
        .map(
          (c) =>
            `<button type="button" class="cat${
              c === category ? ' is-active' : ''
            }" data-cat="${c}">${c}</button>`
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

    // ---------- 收支切换 ----------

    function applyType() {
      amountBoxEl.dataset.type = type
      saveEl.dataset.type = type
      for (const b of segEl.children) {
        b.classList.toggle('is-active', b.dataset.type === type)
      }
      renderCats()
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
