#!/usr/bin/env python3
"""
把一张 PNG 缩成 PWA 需要的图标尺寸（纯标准库，不依赖 Pillow）

用法：
    python scripts/resize-icon.py <源图片.png>

产出到 public/icons/：
    icon-192.png            192x192
    icon-512.png            512x512
    icon-maskable-512.png   512x512（同图，供 maskable 用）

支持：8位 RGB / RGBA、非隔行扫描的 PNG。
要求：源图必须是正方形。
"""

import os
import struct
import sys
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'icons')
MAX_EDGE = 4096


# ---------- 解码 ----------

def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def decode_png(path):
    """返回 (width, height, pixels)，pixels 是 [[(r,g,b,a), ...], ...]"""
    data = open(path, 'rb').read()

    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('错误：不是有效的 PNG 文件')

    pos = 8
    w = h = None
    bit_depth = color_type = interlace = None
    idat = bytearray()

    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]

        if tag == b'IHDR':
            w, h, bit_depth, color_type, _, _, interlace = struct.unpack('>IIBBBBB', body)
        elif tag == b'IDAT':
            idat += body
        elif tag == b'IEND':
            break

        pos += 12 + length

    if bit_depth != 8:
        raise SystemExit(f'错误：只支持 8 位色深，当前是 {bit_depth} 位')
    if color_type not in (2, 6):
        names = {0: '灰度', 3: '索引色', 4: '灰度+透明'}
        raise SystemExit(
            f'错误：只支持 RGB 或 RGBA，当前是 {names.get(color_type, color_type)}。\n'
            f'      请用画图/截图工具另存为 24 位 PNG。'
        )
    if interlace != 0:
        raise SystemExit('错误：不支持隔行扫描(interlaced)的 PNG')
    if w > MAX_EDGE or h > MAX_EDGE:
        raise SystemExit(f'错误：图片过大（{w}x{h}），请先缩到 {MAX_EDGE} 以内')

    channels = 4 if color_type == 6 else 3
    stride = w * channels

    raw = zlib.decompress(bytes(idat))

    # 逐行反滤波
    rows = []
    prev = bytearray(stride)
    p = 0

    for _ in range(h):
        ftype = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride

        if ftype == 1:      # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif ftype == 2:    # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:    # Average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:    # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                line[i] = (line[i] + paeth(a, b, c)) & 0xFF
        elif ftype != 0:
            raise SystemExit(f'错误：未知的滤波器类型 {ftype}')

        # 拆成像素
        if channels == 4:
            row = [tuple(line[i:i + 4]) for i in range(0, stride, 4)]
        else:
            row = [(line[i], line[i + 1], line[i + 2], 255) for i in range(0, stride, 3)]

        rows.append(row)
        prev = line

    return w, h, rows


# ---------- 缩放 ----------

def resize(src, sw, sh, size):
    """面积平均法缩放到 size x size"""
    out = []

    for ty in range(size):
        sy0 = ty * sh // size
        sy1 = max(sy0 + 1, (ty + 1) * sh // size)

        line = []
        for tx in range(size):
            sx0 = tx * sw // size
            sx1 = max(sx0 + 1, (tx + 1) * sw // size)

            r = g = b = a = 0
            n = 0
            for sy in range(sy0, sy1):
                srow = src[sy]
                for sx in range(sx0, sx1):
                    pr, pg, pb, pa = srow[sx]
                    r += pr
                    g += pg
                    b += pb
                    a += pa
                    n += 1

            line.append((r // n, g // n, b // n, a // n))

        out.append(line)

    return out


# ---------- 编码 ----------

def write_png(path, pixels):
    height = len(pixels)
    width = len(pixels[0])

    # 如果全不透明就写 RGB，否则写 RGBA（省体积）
    opaque = all(px[3] == 255 for row in pixels for px in row)
    color_type = 2 if opaque else 6

    raw = bytearray()
    for row in pixels:
        raw.append(0)
        if opaque:
            for r, g, b, _ in row:
                raw += bytes((r, g, b))
        else:
            for r, g, b, a in row:
                raw += bytes((r, g, b, a))

    def chunk(tag, body):
        return (
            struct.pack('>I', len(body))
            + tag
            + body
            + struct.pack('>I', zlib.crc32(tag + body) & 0xFFFFFFFF)
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
    if len(sys.argv) < 2:
        raise SystemExit('用法：python scripts/resize-icon.py <源图片.png>')

    src_path = sys.argv[1]
    if not os.path.isfile(src_path):
        raise SystemExit(f'错误：找不到文件 {src_path}')

    print(f'读取 {src_path} ...')
    w, h, src = decode_png(src_path)
    print(f'  源尺寸：{w}x{h}')

    if w != h:
        raise SystemExit(
            f'错误：源图必须是正方形，当前是 {w}x{h}\n'
            f'      请先裁成正方形再给我。'
        )

    for name, size in [
        ('icon-192.png', 192),
        ('icon-512.png', 512),
        ('icon-maskable-512.png', 512),
    ]:
        print(f'  生成 {name} ({size}x{size}) ...', end='', flush=True)
        pixels = resize(src, w, h, size)
        nbytes = write_png(os.path.join(OUT_DIR, name), pixels)
        print(f' 完成 ({nbytes / 1024:.1f} KB)')

    print('\n图标已更新到 public/icons/')


if __name__ == '__main__':
    main()
