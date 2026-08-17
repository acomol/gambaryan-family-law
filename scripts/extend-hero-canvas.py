"""Расширение кадра hero: воздух сверху и чёрное поле справа от фигур.

Исходный снимок обрезан вплотную к правому плечу Юлии и по макушке
Александра — при любом кадрировании под hero фигуры упираются в край.
Фон студии по этим кромкам ровный (RGB ~8-11, разброс единицы), поэтому
холст достраивается продлением самой кромки: содержимое не выдумывается,
продолжается существующий градиент фона.

Порядок: продлить кромку -> размыть -> увести в темноту к внешнему краю
-> вернуть зерно, чтобы стык с фотографией не читался.
"""
import numpy as np
from PIL import Image, ImageFilter

SRC = "/tmp/claude-0/-home-user/5f455c01-c3d3-5ae5-8a36-2fa7e928eb20/graded.png"
OUT = "/tmp/claude-0/-home-user/5f455c01-c3d3-5ae5-8a36-2fa7e928eb20/extended.png"

# Справа нужен запас, а не поле: пара должна остаться в правой трети кадра,
# иначе на десктопе она наезжает на текстовую колонку.
EXT_RIGHT = 0.09   # доля от исходной ширины
EXT_TOP = 0.24     # доля от исходной высоты
SEED = 20260804


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


src = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
h, w, _ = src.shape
ext_r = int(round(w * EXT_RIGHT))
ext_t = int(round(h * EXT_TOP))
nh, nw = h + ext_t, w + ext_r

canvas = np.zeros((nh, nw, 3), np.float32)
canvas[ext_t:, :w] = src

# --- Правое поле: продлеваем последний столбец ---
canvas[ext_t:, w:] = src[:, -1:, :]

# --- Верхнее поле: продлеваем верхнюю строку уже расширенного холста ---
canvas[:ext_t, :] = canvas[ext_t:ext_t + 1, :, :]

# --- Размытие только достроенных зон, чтобы убрать полосатость от протяжки ---
blurred = np.asarray(
    Image.fromarray(canvas.astype(np.uint8)).filter(ImageFilter.GaussianBlur(90))
).astype(np.float32)

xs = np.linspace(0.0, 1.0, nw)[None, :]
ys = np.linspace(0.0, 1.0, nh)[:, None]
inside_x = 1.0 - smoothstep(xs, (w - 60) / nw, (w + 40) / nw)
inside_y = smoothstep(ys, (ext_t - 60) / nh, (ext_t + 40) / nh)
inside = (inside_x * inside_y)[..., None]        # 1 = исходный кадр, 0 = достройка
canvas = canvas * inside + blurred * (1.0 - inside)

# --- Мягкий увод в темноту к внешним краям: кадр не должен «раскрываться» ---
fall_x = 1.0 - 0.42 * smoothstep(xs, w / nw, 1.0)
fall_y = 1.0 - 0.38 * (1.0 - smoothstep(ys, 0.0, ext_t / nh))
canvas *= (fall_x * fall_y)[..., None]

# --- Зерно под уровень шума фотографии, иначе достройка выглядит пластиковой ---
rng = np.random.default_rng(SEED)
grain = rng.normal(0.0, 1.5, (nh, nw, 1)).astype(np.float32)
canvas = canvas + grain * (1.0 - inside)

Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)).save(OUT)
print(f"{w}x{h} -> {nw}x{nh}  ({OUT})")
