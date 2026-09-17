# 记账

自己用的最简记账 PWA。记一笔、看明细、按月统计。

## 功能

- **记一笔**：金额、支出/收入、分类、备注、日期
- **分类自由增删**：记账页「分类 → 管理」就地展开，可加、可改名、可删；
  改名会同步已有记录和专项额度，删分类不会删掉已有记录
- **明细**：按天分组，长按删除
- **统计**：按月切换、收支合计、支出构成条形图
- **生活费与专项额度**：生活费总额 + 任意条按分类统计的专项额度
  （如「饮食花销 ¥800」「购物 ¥500」），各自显示已花 / 剩余 / 超支
- **输入都在页面里就地展开**，不用弹窗、不盖遮罩；软键盘弹出时页面整体让位，
  输入时也看得见其他内容

## 技术栈

- **无框架**，原生 JS + ES Module
- **Vite** 构建
- **localStorage** 存储（数据只在你手机上，不上传）
- **纯 CSS** 条形图，零图表库

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173
```

`--host` 已配在脚本里，同一局域网内手机也能访问。

## 测试

```bash
npm test
```

覆盖数据层（增删查、月度统计、浮点精度、分类增删改、专项额度、旧数据迁移）
和金额输入清洗，共 95 项，用 `node` 直接跑，不需要浏览器。

界面还能在真浏览器里跑一遍冒烟检查（分类增删、内联面板不遮挡、专项额度增改删）：

```bash
npm run dev
# 浏览器打开 http://localhost:5173/test/dom-check.html
# 标题变成 DOMCHECK-PASS 就是全过，页面里会逐条列出结果
```

## 构建与预览

```bash
npm run build        # 产出 dist/
npm run preview      # http://localhost:4173
```

> Service Worker 只在生产构建里注册。要在本地验证 PWA（离线可用、可安装），
> 必须用 `build` + `preview`，`dev` 模式下不会注册。

## 图标

```bash
python scripts/make-icons.py       # 用内置设计生成（纯标准库）
python scripts/resize-icon.py 图片.png   # 用自己的图片生成（需正方形）
```

## 部署

```bash
npm run deploy
```

把 `dist/` 的内容推到 `gh-pages` 分支，GitHub Pages 从该分支直接发布。
**不依赖 GitHub Actions**（避免执行器/额度问题），任何账号都能用。

仓库首次部署时需要开启一次：

> **Settings → Pages → Source** 选 **Deploy from a branch**
> 分支选 `gh-pages`，目录选 `/ (root)`，然后 Save

之后每次改完代码，跑一句 `npm run deploy` 就更新了。

## 数据结构

数据全在 localStorage，一共三个键。

**`ledger.records.v1`** —— 记账记录：

```js
{
  id: "lz8k3a2b1",       // 时间戳36进制 + 随机后缀
  amount: 32.5,          // 金额，恒为正数
  type: "expense",       // expense 支出 | income 收入
  category: "餐饮",
  note: "午饭",
  date: "2026-09-17",    // YYYY-MM-DD
  createdAt: 1758000000000
}
```

**`ledger.categories.v1`** —— 自定义分类（每类最多 30 个，名字最多 8 字）：

```js
{
  expense: ["餐饮", "交通", "宠物"],
  income: ["工资", "稿费"]
}
```

> 删掉后又想恢复预置分类：控制台执行 `window.store.resetCategories()`（需 `npm run dev`）。
> 某一类被清空时会自动回落成预置分类，不会出现「没有分类可选」。

**`ledger.budgets.v2`** —— 生活费总额 + 专项额度：

```js
{
  defaults: {                          // 以后的月份都按这套来
    total: 2000,                       // 生活费总额，null = 不设上限
    items: [
      { id: "lz8k3c", name: "饮食花销", category: "餐饮", amount: 800 }
    ]
  },
  months: {                            // 单独改过的月份
    "2026-11": { total: 2500, items: [...] }
  }
}
```

> 专项额度按 `category` 找当月的支出合计，所以「已花」是自动算出来的。
> 旧版 `ledger.budget.v1`（只有总额）读到会自动迁移，不用手动处理。

> ⚠️ 数据只在浏览器本地。清缓存或卸载浏览器会丢，重要数据建议定期导出备份
> （导出功能见「阶段7 · 打磨」）。
