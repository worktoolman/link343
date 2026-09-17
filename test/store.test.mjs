/* ============================================
   数据层测试
   运行：node test/store.test.mjs
   ============================================ */

// ---------- 环境垫片 ----------

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
}
globalThis.window = globalThis

const {
  addRecord,
  deleteRecord,
  getRecords,
  getRecordsOfMonth,
  groupByDay,
  getStats,
  getMonths,
  clearAll,
  round2,
  todayStr,
  monthOf,
  shiftMonth,
  formatDay,
  formatMonth,
  formatAmount,
  getBudget,
  setBudget,
  clearBudget,
  // 自定义分类
  categoriesOf,
  addCategory,
  renameCategory,
  removeCategory,
  resetCategories,
  countRecordsOfCategory,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  // 专项额度
  getBudgetItems,
  addBudgetItem,
  updateBudgetItem,
  removeBudgetItem,
} = await import('../src/store.js')

// ---------- 迷你断言 ----------

let pass = 0
const fails = []

function check(name, fn) {
  try {
    fn()
    pass++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    fails.push({ name, msg: err.message })
    console.log(`  ✗ ${name}`)
    console.log(`      ${err.message}`)
  }
}

function eq(actual, expected, label = '') {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${label} 期望 ${b}，实际 ${a}`)
}

function ok(cond, label = '条件应为真') {
  if (!cond) throw new Error(label)
}

// ---------- 测试 ----------

console.log('\n【日期与数值工具】')

check('todayStr 格式为 YYYY-MM-DD', () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStr()), `实际 ${todayStr()}`)
})

check('monthOf 截取月份', () => {
  eq(monthOf('2026-09-16'), '2026-09')
})

check('shiftMonth 跨年回退', () => {
  eq(shiftMonth('2026-01', -1), '2025-12')
})

check('shiftMonth 跨年前进', () => {
  eq(shiftMonth('2025-12', 1), '2026-01')
})

check('round2 规避浮点误差', () => {
  eq(round2(0.1 + 0.2), 0.3)
  eq(round2(32.555), 32.56)
})

check('formatMonth 显示为中文年月', () => {
  eq(formatMonth('2026-09'), '2026年9月')
  eq(formatMonth('2026-12'), '2026年12月')
  eq(formatMonth('2025-01'), '2025年1月')
})

check('formatDay 星期计算正确', () => {
  // 2026-01-01 是周四，2026-09-16 是周三
  eq(formatDay('2026-01-01'), '1月1日 周四')
  eq(formatDay('2026-09-16'), '9月16日 周三')
})

check('formatAmount 千分位与两位小数', () => {
  eq(formatAmount(1234.5), '1,234.50')
  eq(formatAmount(0), '0.00')
  eq(formatAmount(1000000), '1,000,000.00')
  eq(formatAmount(0.1 + 0.2), '0.30')
})

console.log('\n【增删查】')

check('addRecord 返回完整记录', () => {
  clearAll()
  const r = addRecord({ amount: 32.5, type: 'expense', category: '餐饮', note: '午饭' })
  ok(r.id, '应有 id')
  eq(r.amount, 32.5)
  eq(r.type, 'expense')
  eq(r.category, '餐饮')
  eq(r.note, '午饭')
  ok(/^\d{4}-\d{2}-\d{2}$/.test(r.date), 'date 应默认今天')
  ok(typeof r.createdAt === 'number', 'createdAt 应为数字')
})

check('addRecord 拒绝非法金额', () => {
  clearAll()
  for (const bad of [0, -5, 'abc', NaN, null]) {
    let threw = false
    try {
      addRecord({ amount: bad, type: 'expense', category: '餐饮' })
    } catch {
      threw = true
    }
    ok(threw, `金额 ${bad} 应被拒绝`)
  }
})

check('addRecord 金额字符串可被接受', () => {
  clearAll()
  const r = addRecord({ amount: '18.60', type: 'expense', category: '交通' })
  eq(r.amount, 18.6)
})

check('note 首尾空格被清理', () => {
  clearAll()
  const r = addRecord({ amount: 1, type: 'expense', category: '其他', note: '  测试  ' })
  eq(r.note, '测试')
})

check('getRecords 按日期倒序', () => {
  clearAll()
  addRecord({ amount: 1, type: 'expense', category: '其他', date: '2026-09-10' })
  addRecord({ amount: 2, type: 'expense', category: '其他', date: '2026-09-16' })
  addRecord({ amount: 3, type: 'expense', category: '其他', date: '2026-09-12' })
  eq(getRecords().map((r) => r.date), ['2026-09-16', '2026-09-12', '2026-09-10'])
})

check('deleteRecord 删除成功返回 true', () => {
  clearAll()
  const r = addRecord({ amount: 5, type: 'expense', category: '其他' })
  eq(deleteRecord(r.id), true)
  eq(getRecords().length, 0)
})

check('deleteRecord 删除不存在的 id 返回 false', () => {
  clearAll()
  eq(deleteRecord('不存在'), false)
})

check('getRecordsOfMonth 按月筛选', () => {
  clearAll()
  addRecord({ amount: 1, type: 'expense', category: '其他', date: '2026-08-31' })
  addRecord({ amount: 2, type: 'expense', category: '其他', date: '2026-09-01' })
  addRecord({ amount: 3, type: 'expense', category: '其他', date: '2026-09-30' })
  eq(getRecordsOfMonth('2026-09').length, 2)
})

console.log('\n【按天分组】')

check('groupByDay 分组并算出当日收支', () => {
  clearAll()
  addRecord({ amount: 10, type: 'expense', category: '餐饮', date: '2026-09-16' })
  addRecord({ amount: 5, type: 'expense', category: '交通', date: '2026-09-16' })
  addRecord({ amount: 100, type: 'income', category: '红包', date: '2026-09-16' })
  addRecord({ amount: 7, type: 'expense', category: '其他', date: '2026-09-15' })

  const groups = groupByDay()
  eq(groups.length, 2, '应有 2 天')
  eq(groups[0].date, '2026-09-16', '第一天应是 9-16')
  eq(groups[0].expense, 15)
  eq(groups[0].income, 100)
  eq(groups[0].records.length, 3)
  eq(groups[1].expense, 7)
})

console.log('\n【月度统计】')

check('getStats 合计与分类占比正确', () => {
  clearAll()
  // 支出：餐饮 60 + 20 = 80，交通 50 => 总支出 130
  addRecord({ amount: 60, type: 'expense', category: '餐饮', date: '2026-09-01' })
  addRecord({ amount: 20, type: 'expense', category: '餐饮', date: '2026-09-02' })
  addRecord({ amount: 50, type: 'expense', category: '交通', date: '2026-09-03' })
  // 收入 200
  addRecord({ amount: 200, type: 'income', category: '工资', date: '2026-09-10' })

  const s = getStats('2026-09')
  eq(s.month, '2026-09')
  eq(s.expense, 130)
  eq(s.income, 200)
  eq(s.balance, 70)
  eq(s.count, 4)
  eq(s.byCategory.map((c) => c.category), ['餐饮', '交通'], '应按金额降序')
  eq(s.byCategory[0].amount, 80)
  eq(s.byCategory[0].percent, 61.54)
  eq(s.byCategory[1].percent, 38.46)
})

check('byCategory 百分比合计约等于 100', () => {
  clearAll()
  addRecord({ amount: 33.33, type: 'expense', category: '餐饮', date: '2026-09-01' })
  addRecord({ amount: 33.33, type: 'expense', category: '交通', date: '2026-09-02' })
  addRecord({ amount: 33.34, type: 'expense', category: '购物', date: '2026-09-03' })

  const sum = getStats('2026-09').byCategory.reduce((a, c) => a + c.percent, 0)
  ok(Math.abs(sum - 100) < 0.05, `百分比合计 ${sum}，应接近 100`)
})

check('getStats 空月份不报错', () => {
  clearAll()
  const s = getStats('2020-01')
  eq(s.expense, 0)
  eq(s.income, 0)
  eq(s.balance, 0)
  eq(s.count, 0)
  eq(s.byCategory, [])
})

check('收入不计入分类占比', () => {
  clearAll()
  addRecord({ amount: 100, type: 'income', category: '工资', date: '2026-09-01' })
  addRecord({ amount: 50, type: 'expense', category: '餐饮', date: '2026-09-02' })
  const s = getStats('2026-09')
  eq(s.byCategory.length, 1)
  eq(s.byCategory[0].category, '餐饮')
  eq(s.byCategory[0].percent, 100, '唯一支出应占 100%')
})

check('浮点累加不产生误差', () => {
  clearAll()
  for (let i = 0; i < 3; i++) {
    addRecord({ amount: 0.1, type: 'expense', category: '其他', date: '2026-09-01' })
  }
  eq(getStats('2026-09').expense, 0.3)
})

console.log('\n【月份列表】')

check('getMonths 倒序且含当前月', () => {
  clearAll()
  addRecord({ amount: 1, type: 'expense', category: '其他', date: '2026-07-01' })
  addRecord({ amount: 1, type: 'expense', category: '其他', date: '2026-09-01' })
  const months = getMonths()
  eq(months[0], monthOf(todayStr()), '第一个应是当前月')
  ok(months.includes('2026-07'), '应包含 2026-07')
  ok(months.includes('2026-09'), '应包含 2026-09')
})

// ---------- 汇总 ----------

console.log('\n【生活费预算】')

check('未设置时 getBudget 返回 null', () => {
  clearAll()
  eq(getBudget('2026-09'), null)
})

check('setBudget 设置并返回金额', () => {
  clearAll()
  eq(setBudget(2000, '2026-09'), 2000)
  eq(getBudget('2026-09'), 2000)
})

check('setBudget 同时更新默认值，其他月份自动沿用', () => {
  clearAll()
  setBudget(2000, '2026-09')
  eq(getBudget('2026-10'), 2000, '10月应沿用9月设的值')
  eq(getBudget('2025-01'), 2000, '更早的月份也应沿用默认')
})

check('setBudget 可单独覆盖某月', () => {
  clearAll()
  setBudget(2000, '2026-09')
  setBudget(2500, '2026-11')
  eq(getBudget('2026-11'), 2500)
  eq(getBudget('2026-09'), 2000, '9月应保持原值')
})

check('setBudget 拒绝非法金额', () => {
  clearAll()
  for (const bad of [0, -100, 'abc', NaN, null]) {
    let threw = false
    try {
      setBudget(bad, '2026-09')
    } catch {
      threw = true
    }
    ok(threw, `金额 ${bad} 应被拒绝`)
  }
})

check('clearBudget 清除设置', () => {
  clearAll()
  setBudget(2000, '2026-09')
  clearBudget('2026-09')
  eq(getBudget('2026-09'), null)
})

check('getStats 带出预算、剩余与占比', () => {
  clearAll()
  setBudget(2000, '2026-09')
  addRecord({ amount: 500, type: 'expense', category: '餐饮', date: '2026-09-05' })

  const s = getStats('2026-09')
  eq(s.budget, 2000)
  eq(s.remaining, 1500)
  eq(s.usedPercent, 25)
})

check('超支时剩余为负数、占比超过100', () => {
  clearAll()
  setBudget(100, '2026-09')
  addRecord({ amount: 250, type: 'expense', category: '餐饮', date: '2026-09-05' })

  const s = getStats('2026-09')
  eq(s.remaining, -150)
  eq(s.usedPercent, 250)
})

check('未设预算时三项均为 null', () => {
  clearAll()
  addRecord({ amount: 50, type: 'expense', category: '餐饮', date: '2026-09-05' })

  const s = getStats('2026-09')
  eq(s.budget, null)
  eq(s.remaining, null)
  eq(s.usedPercent, null)
})

check('收入不影响生活费占比', () => {
  clearAll()
  setBudget(1000, '2026-09')
  addRecord({ amount: 300, type: 'expense', category: '餐饮', date: '2026-09-05' })
  addRecord({ amount: 5000, type: 'income', category: '工资', date: '2026-09-10' })

  const s = getStats('2026-09')
  eq(s.usedPercent, 30, '只算支出')
  eq(s.remaining, 700)
})

console.log('\n【自定义分类】')

check('默认分类就是预置列表', () => {
  clearAll()
  eq(categoriesOf('expense'), DEFAULT_EXPENSE_CATEGORIES)
  eq(categoriesOf('income'), DEFAULT_INCOME_CATEGORIES)
})

check('addCategory 新增分类，互不影响收支两侧', () => {
  clearAll()
  eq(addCategory('expense', '宠物'), '宠物')
  ok(categoriesOf('expense').includes('宠物'), '支出分类应含新分类')
  eq(
    categoriesOf('income').length,
    DEFAULT_INCOME_CATEGORIES.length,
    '收入分类不该被改动'
  )
})

check('addCategory 去空格、拒绝重复与空名', () => {
  clearAll()
  eq(addCategory('expense', '  宠物  '), '宠物')
  for (const bad of ['宠物', '', '   ']) {
    let threw = false
    try {
      addCategory('expense', bad)
    } catch {
      threw = true
    }
    ok(threw, `${JSON.stringify(bad)} 应被拒绝`)
  }
})

check('addCategory 拒绝超长名称', () => {
  clearAll()
  let threw = false
  try {
    addCategory('expense', '一二三四五六七八九')
  } catch {
    threw = true
  }
  ok(threw, '超过 8 个字应被拒绝')
})

check('renameCategory 同步已有记录', () => {
  clearAll()
  addRecord({ amount: 10, type: 'expense', category: '餐饮', date: '2026-09-01' })
  // 收入侧的同名分类不该被误改
  addRecord({ amount: 20, type: 'income', category: '餐饮', date: '2026-09-01' })

  eq(renameCategory('expense', '餐饮', '吃饭'), '吃饭')
  ok(categoriesOf('expense').includes('吃饭'), '列表里应是新名字')
  ok(!categoriesOf('expense').includes('餐饮'), '旧名字应消失')

  const records = getRecords()
  eq(records.find((r) => r.type === 'expense').category, '吃饭')
  eq(records.find((r) => r.type === 'income').category, '餐饮', '收入不该被改')
})

check('renameCategory 重名或不存在的分类会报错', () => {
  clearAll()
  let threw = 0
  try {
    renameCategory('expense', '餐饮', '交通')
  } catch {
    threw++
  }
  try {
    renameCategory('expense', '不存在', '新名')
  } catch {
    threw++
  }
  eq(threw, 2)
})

check('renameCategory 同步专项额度绑定的分类', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')
  renameCategory('expense', '餐饮', '吃饭')
  eq(getBudgetItems('2026-09')[0].category, '吃饭')
})

check('removeCategory 删分类但不删记录', () => {
  clearAll()
  addRecord({ amount: 10, type: 'expense', category: '餐饮', date: '2026-09-01' })

  eq(removeCategory('expense', '餐饮'), true)
  ok(!categoriesOf('expense').includes('餐饮'), '列表里应消失')
  eq(getRecords()[0].category, '餐饮', '记录保留原分类名')
  eq(getStats('2026-09').byCategory[0].category, '餐饮', '统计里仍能看到')
  eq(countRecordsOfCategory('餐饮'), 1)
})

check('removeCategory 分类不存在返回 false', () => {
  clearAll()
  eq(removeCategory('expense', '不存在'), false)
})

check('removeCategory 至少保留一个分类', () => {
  clearAll()
  const list = categoriesOf('expense')
  for (let i = 0; i < list.length - 1; i++) removeCategory('expense', list[i])
  eq(categoriesOf('expense').length, 1)

  let threw = false
  try {
    removeCategory('expense', list.at(-1))
  } catch {
    threw = true
  }
  ok(threw, '删最后一个应报错')
})

check('分类被清空时回落预置分类', () => {
  clearAll()
  localStorage.setItem(
    'ledger.categories.v1',
    JSON.stringify({ expense: [], income: [] })
  )
  eq(categoriesOf('expense'), DEFAULT_EXPENSE_CATEGORIES)
})

check('resetCategories 恢复预置分类', () => {
  clearAll()
  addCategory('expense', '宠物')
  removeCategory('expense', '餐饮')
  resetCategories('expense')
  eq(categoriesOf('expense'), DEFAULT_EXPENSE_CATEGORIES)
})

check('addRecord 缺省分类用该类型的第一个', () => {
  clearAll()
  eq(addRecord({ amount: 5, type: 'expense' }).category, DEFAULT_EXPENSE_CATEGORIES[0])
})

console.log('\n【专项额度】')

check('默认没有专项额度', () => {
  clearAll()
  eq(getBudgetItems('2026-09'), [])
  eq(getStats('2026-09').budgetItems, [])
})

check('addBudgetItem 新增并可读回', () => {
  clearAll()
  const it = addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')
  ok(it.id, '应有 id')
  eq(it.amount, 800)

  const list = getBudgetItems('2026-09')
  eq(list.length, 1)
  eq(list[0].name, '饮食花销')
  eq(list[0].category, '餐饮')
})

check('addBudgetItem 校验名称与额度', () => {
  clearAll()
  const bad = [
    { name: '', category: '餐饮', amount: 100 },
    { name: '   ', category: '餐饮', amount: 100 },
    { name: '饮食', category: '餐饮', amount: 0 },
    { name: '饮食', category: '餐饮', amount: -1 },
    { name: '饮食', category: '餐饮', amount: 'abc' },
    { name: '一二三四五六七八九', category: '餐饮', amount: 100 },
  ]
  for (const b of bad) {
    let threw = false
    try {
      addBudgetItem(b, '2026-09')
    } catch {
      threw = true
    }
    ok(threw, `${JSON.stringify(b)} 应被拒绝`)
  }
  eq(getBudgetItems('2026-09').length, 0, '被拒绝的不该写进去')
})

check('updateBudgetItem 改名称 / 分类 / 额度', () => {
  clearAll()
  const it = addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')

  updateBudgetItem(it.id, { name: '吃饭钱' }, '2026-09')
  updateBudgetItem(it.id, { category: '购物' }, '2026-09')
  const after = updateBudgetItem(it.id, { amount: '999.5' }, '2026-09')

  eq(after.name, '吃饭钱')
  eq(after.category, '购物')
  eq(after.amount, 999.5)
  eq(getBudgetItems('2026-09').length, 1, '不应变成两条')
})

check('updateBudgetItem 找不到会报错且不写入', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')

  let threw = false
  try {
    updateBudgetItem('不存在', { amount: 1 }, '2026-09')
  } catch {
    threw = true
  }
  ok(threw, '应报错')
  eq(getBudgetItems('2026-09')[0].amount, 800, '原值不该被动过')
})

check('removeBudgetItem 删除', () => {
  clearAll()
  const it = addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')
  eq(removeBudgetItem(it.id, '2026-09'), true)
  eq(getBudgetItems('2026-09').length, 0)
  eq(removeBudgetItem(it.id, '2026-09'), false)
})

check('专项额度跨月自动沿用', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')
  eq(getBudgetItems('2026-10')[0].name, '饮食花销')
  eq(getBudgetItems('2025-01')[0].amount, 800)
})

check('getStats 算出每项额度的已花 / 剩余 / 状态', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 100 }, '2026-09')
  addBudgetItem({ name: '购物额度', category: '购物', amount: 100 }, '2026-09')
  addRecord({ amount: 30, type: 'expense', category: '餐饮', date: '2026-09-02' })
  addRecord({ amount: 150, type: 'expense', category: '购物', date: '2026-09-03' })
  // 收入不该算进已花
  addRecord({ amount: 500, type: 'income', category: '餐饮', date: '2026-09-03' })

  const items = getStats('2026-09').budgetItems
  const food = items.find((x) => x.name === '饮食花销')
  const shop = items.find((x) => x.name === '购物额度')

  eq(food.spent, 30)
  eq(food.remaining, 70)
  eq(food.usedPercent, 30)
  eq(food.state, 'ok')

  eq(shop.spent, 150)
  eq(shop.remaining, -50)
  eq(shop.usedPercent, 150)
  eq(shop.state, 'over')
})

check('用到 80% 进入 warn 状态', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 100 }, '2026-09')
  addRecord({ amount: 80, type: 'expense', category: '餐饮', date: '2026-09-02' })
  eq(getStats('2026-09').budgetItems[0].state, 'warn')
})

check('未绑定分类的额度已花为 0', () => {
  clearAll()
  addBudgetItem({ name: '没绑分类', category: '', amount: 100 }, '2026-09')
  addRecord({ amount: 30, type: 'expense', category: '餐饮', date: '2026-09-02' })

  const it = getStats('2026-09').budgetItems[0]
  eq(it.spent, 0)
  eq(it.remaining, 100)
})

check('分类被删掉后额度仍能显示', () => {
  clearAll()
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 100 }, '2026-09')
  addRecord({ amount: 30, type: 'expense', category: '餐饮', date: '2026-09-02' })
  removeCategory('expense', '餐饮')

  const it = getStats('2026-09').budgetItems[0]
  eq(it.category, '餐饮')
  eq(it.spent, 30)
})

check('itemsTotal 是各项额度之和', () => {
  clearAll()
  addBudgetItem({ name: '饮食', category: '餐饮', amount: 100.5 }, '2026-09')
  addBudgetItem({ name: '购物', category: '购物', amount: 200 }, '2026-09')
  eq(getStats('2026-09').itemsTotal, 300.5)
})

check('clearBudget 只清总额，保留专项额度', () => {
  clearAll()
  setBudget(2000, '2026-09')
  addBudgetItem({ name: '饮食花销', category: '餐饮', amount: 800 }, '2026-09')

  clearBudget('2026-09')
  eq(getBudget('2026-09'), null)
  eq(getBudgetItems('2026-09').length, 1, '专项额度不该被清掉')
})

check('旧版单值预算自动迁移到 v2', () => {
  clearAll()
  localStorage.setItem(
    'ledger.budget.v1',
    JSON.stringify({ default: 1500, months: { '2026-09': 2500 } })
  )

  eq(getBudget('2026-09'), 2500, '月度单独设置应保留')
  eq(getBudget('2026-10'), 1500, '默认值应保留')
  eq(getBudgetItems('2026-09'), [], '迁移后没有专项额度')
})

console.log('\n' + '─'.repeat(40))
if (fails.length === 0) {
  console.log(`✅ 全部通过：${pass} 项`)
  process.exit(0)
} else {
  console.log(`❌ ${fails.length} 项失败，${pass} 项通过`)
  for (const f of fails) console.log(`   · ${f.name}\n     ${f.msg}`)
  process.exit(1)
}
