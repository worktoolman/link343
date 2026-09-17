/* ============================================
   数据层
   - 唯一碰 localStorage 的地方
   - 界面层只通过这里导出的函数读写数据

   存储键：
     ledger.records.v1     记账记录
     ledger.categories.v1  自定义分类
     ledger.budgets.v2     生活费总额 + 专项额度
   ============================================ */

const KEY = 'ledger.records.v1'
const CAT_KEY = 'ledger.categories.v1'
const BUDGET_KEY = 'ledger.budgets.v2'
/** 旧的单值预算结构，读到就自动迁移到 v2 */
const LEGACY_BUDGET_KEY = 'ledger.budget.v1'

/** 分类名 / 额度项名的长度上限（太长会把九宫格撑破） */
export const MAX_NAME_LEN = 8
/** 单类分类数量上限 */
const MAX_CATEGORIES = 30

// ============================================
//   分类（可自由增删改，存在 localStorage）
// ============================================

/** 预置分类：没自定义过时用这一套，恢复默认时也用它 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '居住',
  '娱乐',
  '医疗',
  '其他',
]

export const DEFAULT_INCOME_CATEGORIES = ['工资', '兼职', '红包', '其他']

function normType(type) {
  return type === 'income' ? 'income' : 'expense'
}

function defaultCategories() {
  return {
    expense: [...DEFAULT_EXPENSE_CATEGORIES],
    income: [...DEFAULT_INCOME_CATEGORIES],
  }
}

/** 清洗一个分类名列表：去空、去重、截断到长度上限 */
function cleanNames(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const raw of list) {
    const name = String(raw ?? '').trim().slice(0, MAX_NAME_LEN)
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CAT_KEY)
    if (!raw) return defaultCategories()

    const data = JSON.parse(raw)
    const clean = {
      expense: cleanNames(data?.expense),
      income: cleanNames(data?.income),
    }
    // 某一类被清空了就回落预置分类，保证永远有东西可选
    if (!clean.expense.length) clean.expense = [...DEFAULT_EXPENSE_CATEGORIES]
    if (!clean.income.length) clean.income = [...DEFAULT_INCOME_CATEGORIES]
    return clean
  } catch (err) {
    console.error('[store] 分类读取失败，用预置分类兜底', err)
    return defaultCategories()
  }
}

function saveCategories(cats) {
  localStorage.setItem(CAT_KEY, JSON.stringify(cats))
}

/** 校验分类名 / 额度项名 */
export function validateName(raw) {
  const name = String(raw ?? '').trim()
  if (!name) return { ok: false, reason: '名称不能为空' }
  if (name.length > MAX_NAME_LEN) {
    return { ok: false, reason: `名称最多 ${MAX_NAME_LEN} 个字` }
  }
  return { ok: true, name }
}

/**
 * 按收支类型取分类列表
 * @param {'expense'|'income'} type
 * @returns {string[]} 副本，改它不会影响存储
 */
export function categoriesOf(type) {
  return loadCategories()[normType(type)].slice()
}

/** 当前全部自定义分类 */
export function getCategories() {
  const c = loadCategories()
  return { expense: c.expense.slice(), income: c.income.slice() }
}

/**
 * 新增分类
 * @returns {string} 清洗后的分类名
 */
export function addCategory(type, name) {
  const t = normType(type)
  const v = validateName(name)
  if (!v.ok) throw new Error(v.reason)

  const cats = loadCategories()
  if (cats[t].includes(v.name)) throw new Error(`「${v.name}」已经存在`)
  if (cats[t].length >= MAX_CATEGORIES) {
    throw new Error(`最多 ${MAX_CATEGORIES} 个分类，先删掉一些吧`)
  }

  cats[t].push(v.name)
  saveCategories(cats)
  return v.name
}

/**
 * 分类改名
 * 已有记录和绑定了该分类的专项额度会一起改过来，统计口径不会断
 * @returns {string} 新名字
 */
export function renameCategory(type, from, to) {
  const t = normType(type)
  const oldName = String(from ?? '').trim()

  const v = validateName(to)
  if (!v.ok) throw new Error(v.reason)
  if (v.name === oldName) return oldName

  const cats = loadCategories()
  const i = cats[t].indexOf(oldName)
  if (i === -1) throw new Error('分类不存在')
  if (cats[t].includes(v.name)) throw new Error(`「${v.name}」已经存在`)

  cats[t][i] = v.name
  saveCategories(cats)

  // 记录里的分类名跟着改
  const records = load()
  let recordTouched = false
  for (const r of records) {
    if (r.category === oldName && normType(r.type) === t) {
      r.category = v.name
      recordTouched = true
    }
  }
  if (recordTouched) save(records)

  // 专项额度绑定的也是分类名，一起改
  const budgets = loadBudgets()
  let budgetTouched = false
  const fix = (conf) => {
    for (const it of conf.items) {
      if (it.category === oldName) {
        it.category = v.name
        budgetTouched = true
      }
    }
  }
  fix(budgets.defaults)
  for (const m of Object.keys(budgets.months)) fix(budgets.months[m])
  if (budgetTouched) saveBudgets(budgets)

  return v.name
}

/**
 * 删除分类
 * 已有记录会保留原分类名（统计里仍能看到），只是以后不能再选它
 * @returns {boolean} 是否真的删掉了
 */
export function removeCategory(type, name) {
  const t = normType(type)
  const target = String(name ?? '').trim()

  const cats = loadCategories()
  const i = cats[t].indexOf(target)
  if (i === -1) return false
  if (cats[t].length <= 1) throw new Error('至少要保留一个分类')

  cats[t].splice(i, 1)
  saveCategories(cats)
  return true
}

/**
 * 恢复预置分类
 * @param {'expense'|'income'} [type] 不传则两类都恢复
 */
export function resetCategories(type) {
  if (type == null) {
    saveCategories(defaultCategories())
    return
  }
  const cats = loadCategories()
  const t = normType(type)
  cats[t] = [
    ...(t === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES),
  ]
  saveCategories(cats)
}

/** 有多少条记录用了这个分类（删除前提示用） */
export function countRecordsOfCategory(category) {
  return load().filter((r) => r.category === category).length
}

// ---------- 日期工具 ----------

/** 补零：5 -> "05" */
const pad = (n) => String(n).padStart(2, '0')

/** 今天，格式 YYYY-MM-DD */
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 从日期串取出月份，格式 YYYY-MM */
export function monthOf(dateStr) {
  return dateStr.slice(0, 7)
}

/** 当前月份，格式 YYYY-MM */
export function currentMonth() {
  return monthOf(todayStr())
}

/** 月份偏移，如 shiftMonth("2026-01", -1) -> "2025-12" */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** 把 YYYY-MM-DD 显示成「9月16日 周三」 */
export function formatDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = '日一二三四五六'[date.getDay()]
  return `${m}月${d}日 周${week}`
}

/** 把 YYYY-MM 显示成「2026年9月」 */
export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return `${y}年${m}月`
}

// ---------- 数值工具 ----------

/** 保留两位小数，规避浮点误差累积 */
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/** 金额显示，如 1234.5 -> "1,234.50" */
export function formatAmount(n) {
  return round2(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 用掉多少比例对应的状态色：ok 正常 / warn 快超了 / over 超了 */
export function budgetState(percent) {
  if (percent > 100) return 'over'
  if (percent >= 80) return 'warn'
  return 'ok'
}

// ---------- 存储读写 ----------

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[store] 读取失败，返回空列表', err)
    return []
  }
}

function save(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch (err) {
    console.error('[store] 写入失败（可能是存储空间已满）', err)
    throw err
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ---------- 记录增删查 ----------

/**
 * 新增一条记录
 * @param {{amount:number|string, type:'expense'|'income', category:string, note?:string, date?:string}} input
 * @returns {object} 新建的完整记录
 */
export function addRecord(input) {
  const amount = round2(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('金额必须是大于 0 的数字')
  }

  const type = normType(input.type)
  const date = input.date || todayStr()

  const record = {
    id: newId(),
    amount,
    type,
    category: input.category || categoriesOf(type)[0] || '其他',
    note: (input.note || '').trim(),
    date,
    createdAt: Date.now(),
  }

  const records = load()
  records.push(record)
  save(records)
  return record
}

/**
 * 按 id 删除
 * @returns {boolean} 是否真的删掉了
 */
export function deleteRecord(id) {
  const records = load()
  const next = records.filter((r) => r.id !== id)
  if (next.length === records.length) return false
  save(next)
  return true
}

/**
 * 取全部记录，按日期倒序；同一天内按创建时间倒序
 */
export function getRecords() {
  return load().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt - a.createdAt
  })
}

/**
 * 按月筛选记录
 * @param {string} month 格式 YYYY-MM
 */
export function getRecordsOfMonth(month) {
  return getRecords().filter((r) => monthOf(r.date) === month)
}

/**
 * 按天分组（用于明细页）
 * @returns {Array<{date:string, records:object[], expense:number, income:number}>}
 */
export function groupByDay(records = getRecords()) {
  const map = new Map()

  for (const r of records) {
    let group = map.get(r.date)
    if (!group) {
      group = { date: r.date, records: [], expense: 0, income: 0 }
      map.set(r.date, group)
    }
    group.records.push(r)
    if (r.type === 'income') group.income = round2(group.income + r.amount)
    else group.expense = round2(group.expense + r.amount)
  }

  return [...map.values()]
}

/**
 * 月度统计
 * @param {string} month 格式 YYYY-MM
 * @returns {{
 *   month:string, expense:number, income:number, balance:number, count:number,
 *   byCategory:Array<{category:string, amount:number, percent:number}>,
 *   budget:number|null, remaining:number|null, usedPercent:number|null,
 *   budgetItems:Array<object>, itemsTotal:number
 * }}
 */
export function getStats(month = currentMonth()) {
  const list = getRecordsOfMonth(month)

  let expense = 0
  let income = 0
  const catMap = new Map()

  for (const r of list) {
    if (r.type === 'income') {
      income = round2(income + r.amount)
      continue
    }
    expense = round2(expense + r.amount)
    catMap.set(r.category, round2((catMap.get(r.category) || 0) + r.amount))
  }

  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: expense > 0 ? round2((amount / expense) * 100) : 0,
    }))
    // 金额降序；并列时按分类名排序，保证顺序稳定
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'zh'))

  const budget = getBudget(month)

  // 专项额度：额度自己设，已花多少按绑定的支出分类算
  const budgetItems = getBudgetItems(month).map((it) => {
    const spent = catMap.get(it.category) || 0
    const remaining = round2(it.amount - spent)
    const usedPercent = round2((spent / it.amount) * 100)
    return {
      ...it,
      spent,
      remaining,
      usedPercent,
      state: budgetState(usedPercent),
    }
  })

  return {
    month,
    expense,
    income,
    balance: round2(income - expense),
    count: list.length,
    byCategory,
    // 生活费：没设置过预算时这三项都是 null
    budget,
    remaining: budget == null ? null : round2(budget - expense),
    usedPercent: budget ? round2((expense / budget) * 100) : null,
    // 专项额度：每一项自带已花 / 剩余 / 状态
    budgetItems,
    itemsTotal: round2(budgetItems.reduce((a, i) => a + i.amount, 0)),
  }
}

/**
 * 有记录的月份列表，倒序。用于统计页的月份切换
 */
export function getMonths() {
  const set = new Set(load().map((r) => monthOf(r.date)))
  const months = [...set].sort().reverse()
  const now = currentMonth()
  if (!set.has(now)) months.unshift(now)
  return months
}

// ============================================
//   生活费与专项额度
//
//   存储结构（ledger.budgets.v2）：
//     {
//       defaults: { total: 2000|null, items: [{id,name,category,amount}] },
//       months:   { "2026-09": { total: 2500, items: [...] } }
//     }
//
//   defaults = 以后的月份都这样，months = 某个月的单独设置。
//   每次修改都会把结果同步写进 defaults，所以下个月自动沿用，不用重复设置。
// ============================================

/** 清洗一条额度项；金额非法就丢掉 */
function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null

  const amount = round2(raw.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const name = String(raw.name ?? '').trim().slice(0, MAX_NAME_LEN) || '未命名'

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name,
    category: String(raw.category ?? '').trim(),
    amount,
  }
}

/** 清洗一个「总额 + 专项额度」配置 */
function cleanConfig(raw) {
  const total = round2(raw?.total)
  const items = Array.isArray(raw?.items)
    ? raw.items.map(cleanItem).filter(Boolean)
    : []

  return {
    total: Number.isFinite(total) && total > 0 ? total : null,
    items,
  }
}

function emptyBudgets() {
  return { defaults: { total: null, items: [] }, months: {} }
}

function loadBudgets() {
  let data = null
  try {
    const raw = localStorage.getItem(BUDGET_KEY)
    if (raw) data = JSON.parse(raw)
  } catch (err) {
    console.error('[store] 预算读取失败，按未设置处理', err)
  }

  // 没有 v2 数据时，看看有没有旧的单值预算，有就迁移过来
  if (!data || typeof data !== 'object') {
    try {
      const legacy = JSON.parse(
        localStorage.getItem(LEGACY_BUDGET_KEY) || 'null'
      )
      if (legacy && typeof legacy === 'object') {
        const out = emptyBudgets()
        const d = round2(legacy.default)
        if (Number.isFinite(d) && d > 0) out.defaults.total = d

        for (const [m, v] of Object.entries(
          legacy.months && typeof legacy.months === 'object' ? legacy.months : {}
        )) {
          const n = round2(v)
          if (Number.isFinite(n) && n > 0) out.months[m] = { total: n, items: [] }
        }
        return out
      }
    } catch (err) {
      console.error('[store] 旧预算迁移失败', err)
    }
    return emptyBudgets()
  }

  const out = emptyBudgets()
  out.defaults = cleanConfig(data.defaults)
  const months =
    data.months && typeof data.months === 'object' ? data.months : {}
  for (const [m, v] of Object.entries(months)) out.months[m] = cleanConfig(v)
  return out
}

function saveBudgets(b) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b))
}

function cloneConfig(c) {
  return { total: c.total, items: c.items.map((i) => ({ ...i })) }
}

/** 取某月的配置：优先月度单独设置，否则用默认 */
function configOf(budgets, month) {
  return cloneConfig(budgets.months[month] ?? budgets.defaults)
}

/**
 * 改某月的配置：写进该月，并把结果设为以后的默认值
 * fn 里抛错时不会写入（改的是副本）
 */
function mutateConfig(month, fn) {
  const b = loadBudgets()
  const conf = configOf(b, month)

  fn(conf)
  conf.items = conf.items.map(cleanItem).filter(Boolean)

  b.months[month] = conf
  b.defaults = cloneConfig(conf)
  saveBudgets(b)
  return conf
}

/**
 * 取某月的生活费总额
 * @returns {number|null} 没设置过返回 null
 */
export function getBudget(month = currentMonth()) {
  return configOf(loadBudgets(), month).total
}

/**
 * 设置某月的生活费总额
 * 同时更新默认值，这样下个月会自动沿用，不用重复设置
 * @returns {number} 实际写入的金额
 */
export function setBudget(amount, month = currentMonth()) {
  const v = round2(amount)
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error('生活费必须是大于 0 的数字')
  }
  mutateConfig(month, (c) => {
    c.total = v
  })
  return v
}

/** 取消生活费总额设置（专项额度保留） */
export function clearBudget(month = currentMonth()) {
  mutateConfig(month, (c) => {
    c.total = null
  })
}

/**
 * 取某月的专项额度列表
 * @returns {Array<{id:string, name:string, category:string, amount:number}>}
 */
export function getBudgetItems(month = currentMonth()) {
  return configOf(loadBudgets(), month).items
}

/**
 * 新增一条专项额度
 * @param {{name:string, category:string, amount:number|string}} input
 * @returns {object} 新建的额度项
 */
export function addBudgetItem(input = {}, month = currentMonth()) {
  const v = validateName(input.name)
  if (!v.ok) throw new Error(`额度名称${v.reason.replace('名称', '')}`)

  const amount = round2(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('额度必须是大于 0 的数字')
  }

  const item = {
    id: newId(),
    name: v.name,
    category: String(input.category ?? '').trim(),
    amount,
  }

  mutateConfig(month, (c) => {
    c.items.push(item)
  })
  return item
}

/**
 * 修改一条专项额度（只传要改的字段）
 * @returns {object} 修改后的额度项
 */
export function updateBudgetItem(id, patch = {}, month = currentMonth()) {
  let updated = null

  mutateConfig(month, (c) => {
    const item = c.items.find((x) => x.id === id)
    if (!item) throw new Error('找不到这条额度')

    if (patch.name !== undefined) {
      const v = validateName(patch.name)
      if (!v.ok) throw new Error(`额度名称${v.reason.replace('名称', '')}`)
      item.name = v.name
    }
    if (patch.category !== undefined) {
      item.category = String(patch.category).trim()
    }
    if (patch.amount !== undefined) {
      const amount = round2(patch.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('额度必须是大于 0 的数字')
      }
      item.amount = amount
    }

    updated = { ...item }
  })

  return updated
}

/**
 * 删除一条专项额度（不影响记账记录）
 * @returns {boolean} 是否真的删掉了
 */
export function removeBudgetItem(id, month = currentMonth()) {
  if (!getBudgetItems(month).some((x) => x.id === id)) return false
  mutateConfig(month, (c) => {
    c.items = c.items.filter((x) => x.id !== id)
  })
  return true
}

/** 清空所有数据（调试用） */
export function clearAll() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(CAT_KEY)
  localStorage.removeItem(BUDGET_KEY)
  localStorage.removeItem(LEGACY_BUDGET_KEY)
}

/** 写入演示数据（调试用） */
export function seedDemo() {
  const today = todayStr()
  const [y, m] = today.split('-').map(Number)
  const day = (d) => `${y}-${pad(m)}-${pad(d)}`

  const demo = [
    { amount: 32.5, type: 'expense', category: '餐饮', note: '午饭', date: today },
    { amount: 12, type: 'expense', category: '交通', note: '地铁', date: today },
    { amount: 268, type: 'expense', category: '购物', note: '鞋子', date: day(14) },
    { amount: 45, type: 'expense', category: '餐饮', note: '和朋友吃饭', date: day(14) },
    { amount: 1200, type: 'expense', category: '居住', note: '水电', date: day(10) },
    { amount: 8000, type: 'income', category: '工资', note: '月薪', date: day(10) },
  ]

  for (const r of demo) addRecord(r)

  // 顺带给一份生活费与专项额度的示例，方便调试
  if (getBudget() == null) setBudget(2000)
  if (!getBudgetItems().length) {
    addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 })
    addBudgetItem({ name: '购物额度', category: '购物', amount: 500 })
  }

  return demo.length
}

// ---------- 开发环境暴露到控制台，方便调试 ----------

if (import.meta.env?.DEV) {
  window.store = {
    addRecord,
    deleteRecord,
    getRecords,
    getRecordsOfMonth,
    groupByDay,
    getStats,
    getMonths,
    categoriesOf,
    getCategories,
    addCategory,
    renameCategory,
    removeCategory,
    resetCategories,
    countRecordsOfCategory,
    getBudget,
    setBudget,
    clearBudget,
    getBudgetItems,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem,
    clearAll,
    seedDemo,
  }
  console.info('[store] 已挂到 window.store，可直接在控制台调用')
}
