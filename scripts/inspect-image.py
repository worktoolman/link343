#!/usr/bin/env python3
"""查看图片信息并输出 ASCII 预览，用来确认裁剪范围"""

import sys

from PIL import Image

path = sys.argv[1] if len(sys.argv) > 1 else 'bull-src.jpg'
img = Image.open(path).convert('RGB')
w, h = img.size

print(f'尺寸: {w}x{h}  (比例 {w / h:.3f})')
print(f'模式: {img.mode}')
print()

# 缩小到 60 列做预览
COLS = 60
rows = max(1, int(h / w * COLS * 0.5))  # 0.5 是字符宽高比修正
small = img.resize((COLS, rows), Image.LANCZOS)

# 每个字符代表的主色调
def classify(r, g, b):
    if b > 150 and b > r:          return '#'   # 蓝底
    if r > 180 and g > 140 and b < 120: return '@'  # 黄牛
    if r > 200 and g > 190 and b > 170: return 'o'  # 浅色（口鼻）
    if r < 120 and g < 100:        return 'X'   # 深色（角）
    if r > 220 and g > 220 and b > 220: return '.' # 白
    return '+'

print(f'{"俯视预览":^{COLS}}')
print('+' + '-' * COLS + '+')
for y in range(rows):
    line = ''
    for x in range(COLS):
        line += classify(*small.getpixel((x, y)))
    print('|' + line + '|')
print('+' + '-' * COLS + '+')

print()
print('图例: # 蓝底  @ 黄牛  o 浅色  X 深色  . 白  + 其他')
print()
print('=== 参考坐标 ===')
print(f'  整图:        (0,0) - ({w},{h})')
print(f'  右下角区域:  x>{int(w*0.62)}, y>{int(h*0.82)}   ← 水印大概在这')
