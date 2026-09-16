# 记账

自己用的最简记账 PWA。记一笔、看明细、按月统计。

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

覆盖数据层（增删查、月度统计、浮点精度）和金额输入清洗。

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

存在 localStorage 的 `ledger.records.v1`：

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

> ⚠️ 数据只在浏览器本地。清缓存或卸载浏览器会丢，重要数据建议定期导出备份
> （导出功能见「阶段7 · 打磨」）。
