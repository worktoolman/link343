/* ============================================
   数据层
   - 唯一碰 localStorage 的地方
   - 界面层只通过这里导出的函数读写数据
   ============================================ */

const KEY = 'ledger.records.v1'

/** 预置分类（先写死，将来要自定义再说） */
export const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '居住',
  '娱乐',
  '医疗',
  '其他',
]

export const INCOME_CATEGORIES = ['工资', '兼职', '红包', '其他']

/** 按收支类型取分类列表 */
export function categoriesOf(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
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

// ---------- 对外 API ----------

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

  const type = input.type === 'income' ? 'income' : 'expense'
  const date = input.date || todayStr()

  const record = {
    id: newId(),
    amount,
    type,
    category: input.category || '其他',
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
 *   byCategory:Array<{category:string, amount:number, percent:number}>
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

  return {
    month,
    expense,
    income,
    balance: round2(income - expense),
    count: list.length,
    byCategory,
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

/** 清空所有数据（调试用） */
export function clearAll() {
  localStorage.removeItem(KEY)
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
    clearAll,
    seedDemo,
  }
  console.info('[store] 已挂到 window.store，可直接在控制台调用')
}
