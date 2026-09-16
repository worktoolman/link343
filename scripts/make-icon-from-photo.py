#!/usr/bin/env python3
"""
从照片生成 PWA 图标

用法：python scripts/make-icon-from-photo.py

需要 Pillow：pip install Pillow
"""

import os
import sys

from PIL import Image

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, '..', 'bull-src.jpg')
OUT = os.path.join(BASE, '..', 'public', 'icons')

# 裁剪框 (左, 上, 右, 下)
# 上边贴顶保留牛角，下边切到 640 以避开右下角水印（水印在 y>656）
CROP = (60, 0, 700, 640)

# 可遮罩图标：内容缩到中间这个比例，四周补背景色
MASK_RATIO = 0.78


def classify(r, g, b):
    """把像素归类成字符，用于 ASCII 预览"""
    if b > 150 and b > r:
        return '#'          # 蓝底
    if r > 180 and g > 140 and b < 120:
        return '@'          # 黄牛
    if r > 200 and g > 190 and b > 170:
        return 'o'          # 浅色（口鼻、耳内）
    if r < 120 and g < 100:
        return 'X'          # 深色（牛角）
    if r > 220 and g > 220 and b > 220:
        return '.'
    return '+'


def preview(img, cols=56):
    """输出 ASCII 预览，用来确认构图"""
    rows = max(1, int(img.height / img.width * cols * 0.5))
    s = img.resize((cols, rows), Image.LANCZOS)

    print('  +' + '-' * cols + '+')
    for y in range(rows):
        line = ''.join(classify(*s.getpixel((x, y))) for x in range(cols))
        print('  |' + line + '|')
    print('  +' + '-' * cols + '+')


def main():
    if not os.path.isfile(SRC):
        raise SystemExit(f'找不到源图：{SRC}')

    img = Image.open(SRC).convert('RGB')
    print(f'源图：{img.size[0]}x{img.size[1]}')

    box = CROP
    cw, ch = box[2] - box[0], box[3] - box[1]
    if cw != ch:
        raise SystemExit(f'裁剪框必须是正方形，当前 {cw}x{ch}')

    cropped = img.crop(box)
    print(f'裁剪：{box}  ->  {cw}x{ch}')
    print()
    preview(cropped)
    print()

    os.makedirs(OUT, exist_ok=True)

    # 普通图标
    for name, size in [('icon-192.png', 192), ('icon-512.png', 512)]:
        cropped.resize((size, size), Image.LANCZOS).save(
            os.path.join(OUT, name), 'PNG', optimize=True
        )
        print(f'  ✓ {name}  ({size}x{size})')

    # 可遮罩图标：取左上角颜色当背景，内容收进安全区
    bg = cropped.getpixel((3, 3))
    inner = int(512 * MASK_RATIO)
    canvas = Image.new('RGB', (512, 512), bg)
    canvas.paste(
        cropped.resize((inner, inner), Image.LANCZOS),
        ((512 - inner) // 2, (512 - inner) // 2),
    )
    canvas.save(os.path.join(OUT, 'icon-maskable-512.png'), 'PNG', optimize=True)
    print(f'  ✓ icon-maskable-512.png  (内容{int(MASK_RATIO * 100)}%，底色 RGB{bg})')

    print()
    print('图标已更新到 public/icons/')


if __name__ == '__main__':
    main()
