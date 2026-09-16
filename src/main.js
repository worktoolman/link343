import './style.css'
// 副作用导入：开发环境会把 API 挂到 window.store，方便控制台调试
import './store.js'
import { recordView } from './views/record.js'
import { listView } from './views/list.js'
import { statsView } from './views/stats.js'

/** 视图注册表，顺序即标签栏顺序 */
const VIEWS = [recordView, listView, statsView]

const app = document.querySelector('#app')

// ---------- 构建骨架 ----------

app.innerHTML = `
  <header class="app-header">
    <h1 class="app-title" id="title"></h1>
    <p class="app-subtitle" id="subtitle"></p>
  </header>
  <main class="app-main" id="body"></main>
  <nav class="tabbar" id="tabbar"></nav>
`

const titleEl = app.querySelector('#title')
const subtitleEl = app.querySelector('#subtitle')
const bodyEl = app.querySelector('#body')
const tabbarEl = app.querySelector('#tabbar')

// ---------- 标签栏 ----------

tabbarEl.innerHTML = VIEWS.map(
  (v) => `
  <button class="tab" data-id="${v.id}" type="button">
    ${v.icon}
    <span class="tab-label">${v.label}</span>
  </button>
`
).join('')

const tabEls = [...tabbarEl.querySelectorAll('.tab')]

// ---------- 路由 ----------

let currentId = null

function setSubtitle(text) {
  subtitleEl.textContent = text ?? ''
  subtitleEl.hidden = !text
}

function go(id) {
  const view = VIEWS.find((v) => v.id === id)
  if (!view || id === currentId) return

  currentId = id
  titleEl.textContent = view.title
  setSubtitle(
    typeof view.subtitle === 'function' ? view.subtitle() : view.subtitle
  )

  bodyEl.scrollTop = 0
  bodyEl.innerHTML = ''
  view.mount(bodyEl, { setSubtitle })

  for (const el of tabEls) {
    el.classList.toggle('is-active', el.dataset.id === id)
  }
}

tabbarEl.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab')
  if (tab) go(tab.dataset.id)
})

// ---------- Service Worker（仅生产环境）----------
//
// 开发环境不注册：那会把 Vite 的动态模块缓存住，改了代码看不到效果。
// 想本地验证 PWA，用 `npm run build && npm run preview`。

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[sw] 注册失败', err)
    })
  })
}

// ---------- 启动 ----------

go(VIEWS[0].id)
