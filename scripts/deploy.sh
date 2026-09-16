#!/usr/bin/env bash
#
# 部署到 GitHub Pages（gh-pages 分支方式，不依赖 GitHub Actions）
#
# 用法：npm run deploy
#
# 原理：把 dist/ 的内容作为一次提交推到 gh-pages 分支，
#       GitHub Pages 从那个分支直接发布静态文件。
#
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
GIT_NAME=$(git config user.name || echo "deploy")
GIT_EMAIL=$(git config user.email || echo "deploy@local")
STAMP=$(date '+%Y-%m-%d %H:%M')

echo "▶ 构建..."
npm run build

echo
echo "▶ 推送到 gh-pages 分支..."

cd dist
rm -rf .git

git init -q -b gh-pages
git add -A
git -c user.name="$GIT_NAME" -c user.email="$GIT_EMAIL" \
    commit -q -m "部署 $STAMP"

# 首次推送需要凭据；之前 push 过的话凭据管理器已经记住了
git push -f -q "$REMOTE" gh-pages

rm -rf .git
cd ..

echo
echo "✅ 已部署到 gh-pages 分支"
echo
echo "如果这是第一次部署，去仓库设置里开启："
echo "  Settings → Pages → Source → Deploy from a branch"
echo "  分支选 gh-pages，目录选 / (root)，然后 Save"
