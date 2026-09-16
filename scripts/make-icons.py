#!/usr/bin/env python3
"""
生成 PWA 图标（纯标准库，不依赖 Pillow / ImageMagick）

用法：python scripts/make-icons.py

产出到 public/icons/：
  icon-192.png            普通图标
  icon-512.png            普通图标
  icon-maskable-512.png   可遮罩图标（内容收在安全区内）

原理：按 SS 倍超采样渲染，再盒式降采样，得到抗锯齿边缘。
左右对称，所以只算左半边再镜像，省一半计算量。
"""

import math
import os
import struct
import zlib

# ---------- 参数 ----------

SS = 4                      # 超采样倍数
BG = (0x3B, 0x82, 0xC4)     # 背景蓝
FG = (0xFF, 0xFF, 0xFF)     # 前景白

# ¥ 字形：五条线段，归一化坐标
GLYPH_SEGMENTS = [
    (0.285, 0.225, 0.500, 0.505),   # 左上斜
    (0.715, 0.225, 0.500, 0.505),   # 右上斜
    (0.500, 0.505, 0.500, 0.790),   # 竖
    (0.325, 0.585, 0.675, 0.585),   # 横一
    (0.325, 0.690, 0.675, 0.690),   # 横二
]
STROKE = 0.072              # 笔画粗细（归一化）

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')


# ---------- 几何 ----------

def dist_to_segment(px, py, x1, y1, x2, y2):
    """点到线段的距离"""
    dx, dy = x2 - x1, y2 - y1
    length_sq = dx * dx + dy * dy
    if length_sq == 0.0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / length_sq
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))


def in_rounded_rect(x, y, size, radius):
    """点是否落在圆角矩形内（矩形铺满 0..size）"""
    if radius <= 0:
        return 0 <= x <= size and 0 <= y <= size
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    return math.hypot(x - cx, y - cy) <= radius


def scaled_segments(scale):
    """把字形按 scale 绕中心缩放"""
    out = []
    for x1, y1, x2, y2 in GLYPH_SEGMENTS:
        out.append((
            0.5 + (x1 - 0.5) * scale,
            0.5 + (y1 - 0.5) * scale,
            0.5 + (x2 - 0.5) * scale,
            0.5 + (y2 - 0.5) * scale,
        ))
    return out


# ---------- 渲染 ----------

def render(size, maskable):
    """
    渲染 size x size 的 RGB 像素（行优先，每项是 (r,g,b)）
    maskable=True 时背景铺满整幅，字形缩小到安全区
    """
    W = size * SS
    segments = scaled_segments(0.72 if maskable else 1.0)
    half_stroke = STROKE * scale_of(maskable) / 2.0
    corner_radius = 0 if maskable else W * 0.22

    # 每行先算左半边，再镜像
    rows = []
    half_w = W // 2

    for iy in range(W):
        y = iy + 0.5
        ny = y / W

        row = []
        for ix in range(half_w):
            x = ix + 0.5
            nx = x / W

            # 背景覆盖（圆角判定在超采样精度下已足够平滑）
            if not in_rounded_rect(x, y, W, corner_radius):
                row.append((0, 0, 0, 0))
                continue

            # 字形覆盖
            covered = False
            for x1, y1, x2, y2 in segments:
                if dist_to_segment(nx, ny, x1, y1, x2, y2) <= half_stroke:
                    covered = True
                    break

            row.append((*FG, 255) if covered else (*BG, 255))

        # 镜像补齐右半边
        rows.append(row + row[::-1][: W - half_w])

    # 盒式降采样
    return downsample(rows, W, size)


def scale_of(maskable):
    return 0.72 if maskable else 1.0


def downsample(rows, W, size):
    """
    SS x SS 盒式平均。
    颜色按 alpha 预乘后再平均，否则透明像素的黑色会渗进边缘，出现黑边。
    """
    out = []
    n = SS * SS

    for oy in range(size):
        line = []
        for ox in range(size):
            ar = ag = ab = aa = 0
            for dy in range(SS):
                row = rows[oy * SS + dy]
                base = ox * SS
                for dx in range(SS):
                    pr, pg, pb, pa = row[base + dx]
                    ar += pr * pa
                    ag += pg * pa
                    ab += pb * pa
                    aa += pa

            if aa == 0:
                line.append((0, 0, 0, 0))
            else:
                line.append((ar // aa, ag // aa, ab // aa, aa // n))
        out.append(line)

    return out


# ---------- PNG 编码 ----------

def write_png(path, pixels):
    height = len(pixels)
    width = len(pixels[0])

    # 全不透明就写 RGB，有透明像素就写 RGBA
    opaque = all(px[3] == 255 for row in pixels for px in row)
    color_type = 2 if opaque else 6

    raw = bytearray()
    for row in pixels:
        raw.append(0)  # 过滤器类型：None
        if opaque:
            for r, g, b, _ in row:
                raw += bytes((r, g, b))
        else:
            for r, g, b, a in row:
                raw += bytes((r, g, b, a))

    def chunk(tag, data):
        return (
            struct.pack('>I', len(data))
            + tag
            + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color_type, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)

    return len(png)


# ---------- 主流程 ----------

def main():
    jobs = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
    ]

    print(f'输出目录：{os.path.normpath(OUT_DIR)}\n')

    for name, size, maskable in jobs:
        kind = '可遮罩' if maskable else '普通'
        print(f'  渲染 {name} ({size}x{size}, {kind}) ...', end='', flush=True)

        # 主图按 512 渲染，其他尺寸从降采样结果缩放过于麻烦，直接各自渲染
        pixels = render(size, maskable)
        nbytes = write_png(os.path.join(OUT_DIR, name), pixels)

        print(f' 完成 ({nbytes / 1024:.1f} KB)')

    print('\n全部生成完毕。')


if __name__ == '__main__':
    main()
