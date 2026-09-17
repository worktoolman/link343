/* ============================================
   通用 UI 小工具
   ============================================ */

let toastTimer = null

/**
 * 底部轻提示
 * @param {string} msg 文案
 * @param {'info'|'success'|'error'} kind 类型
 */
export function toast(msg, kind = 'info') {
  let el = document.querySelector('.toast')

  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    document.body.appendChild(el)
  }

  el.textContent = msg
  el.dataset.kind = kind

  // 强制重排，保证连续调用时动画能重播
  void el.offsetWidth
  el.classList.add('is-show')

  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 1800)
}

/**
 * 清洗金额输入：只留数字和一个小数点，最多两位小数
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeAmount(raw) {
  let v = String(raw).replace(/[^\d.]/g, '')

  // 只保留第一个小数点
  const firstDot = v.indexOf('.')
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
  }

  // 小数位截到两位
  const [int, dec] = v.split('.')
  if (dec !== undefined) v = `${int}.${dec.slice(0, 2)}`

  // 去掉多余的前导零，但保留 "0." 这种中间态
  if (int.length > 1 && int.startsWith('0')) v = v.replace(/^0+/, '') || '0' + (dec !== undefined ? '.' + dec : '')

  return v
}

/** 触发一次短振动（安卓有效，iOS 无感，静默失败） */
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* 忽略 */
  }
}

/** 转义用户输入，避免备注里的特殊字符破坏结构 */
export function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  )
}

/**
 * 底部弹出的确认对话框
 * @param {{title?:string, message?:string, confirmText?:string, cancelText?:string, danger?:boolean}} opts
 * @returns {Promise<boolean>} 点确定返回 true，取消或点遮罩返回 false
 */
export function confirmDialog({
  title = '确认操作',
  message = '',
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const mask = document.createElement('div')
    mask.className = 'dlg-mask'
    mask.innerHTML = `
      <div class="dlg">
        <div class="dlg-title">${escapeHtml(title)}</div>
        ${message ? `<div class="dlg-msg">${escapeHtml(message)}</div>` : ''}
        <div class="dlg-actions">
          <button type="button" class="dlg-btn" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button type="button" class="dlg-btn ${
            danger ? 'is-danger' : 'is-primary'
          }" data-act="ok">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `
    document.body.appendChild(mask)

    requestAnimationFrame(() => mask.classList.add('is-show'))

    let done = false
    function close(ok) {
      if (done) return
      done = true
      mask.classList.remove('is-show')
      setTimeout(() => mask.remove(), 220)
      resolve(ok)
    }

    mask.addEventListener('click', (e) => {
      if (e.target === mask) return close(false)
      const btn = e.target.closest('.dlg-btn')
      if (btn) close(btn.dataset.act === 'ok')
    })
  })
}

/**
 * 跟随软键盘调整布局
 *
 * 把键盘高度写进 CSS 变量 --kb，页面据此在底部留白，
 * 输入时内容就不会被键盘压住（#app / 对话框 / toast 都用到它）。
 *
 * 安卓 Chrome 配了 viewport 的 interactive-widget=resizes-content 后，
 * innerHeight 会跟着键盘一起变，算出来是 0，不会重复留白。
 *
 * @returns {() => void} 手动同步一次的句柄
 */
export function trackKeyboardInset() {
  const vv = window.visualViewport
  if (!vv) return () => {}

  const apply = () => {
    const overlap = window.innerHeight - vv.height - vv.offsetTop
    // 60px 阈值：过滤地址栏收缩/展开造成的抖动
    const kb = overlap > 60 ? Math.round(overlap) : 0
    document.documentElement.style.setProperty('--kb', `${kb}px`)
  }

  apply()
  vv.addEventListener('resize', apply)
  vv.addEventListener('scroll', apply)
  window.addEventListener('orientationchange', apply)
  return apply
}

/**
 * 输入框获得焦点时把它滚到屏幕中间
 * 键盘弹出后立刻滚一次，避免输入框刚好躲在键盘下面
 */
export function bindFocusScroll() {
  document.addEventListener('focusin', (e) => {
    const el = e.target
    if (!(el instanceof HTMLElement)) return
    if (!el.matches('input, select, textarea')) return

    // 等键盘动画开始再滚，否则滚完键盘才顶上来
    setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 260)
  })
}

/**
 * 绑定长按手势
 * @param {HTMLElement} container 事件委托的容器
 * @param {string} selector 目标元素选择器
 * @param {(el:HTMLElement)=>void} handler 长按触发时的回调
 * @param {number} duration 长按判定时长(ms)
 */
export function bindLongPress(container, selector, handler, duration = 550) {
  let timer = null
  let startX = 0
  let startY = 0

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  container.addEventListener('pointerdown', (e) => {
    const target = e.target.closest(selector)
    if (!target) return

    startX = e.clientX
    startY = e.clientY

    cancel()
    timer = setTimeout(() => {
      timer = null
      haptic(20)
      handler(target)
    }, duration)
  })

  container.addEventListener('pointerup', cancel)
  container.addEventListener('pointercancel', cancel)

  // 手指滑动超过阈值就当作滚动，取消长按
  container.addEventListener('pointermove', (e) => {
    if (!timer) return
    if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) {
      cancel()
    }
  })

  // 阻止长按弹出系统右键菜单
  container.addEventListener('contextmenu', (e) => {
    if (e.target.closest(selector)) e.preventDefault()
  })
}
