"""Грейдинг hero-кадра: подсветить фигуры, не тронув чёрный фон и золотое пятно."""
import numpy as np
from PIL import Image

SRC = "/home/user/gambaryan-family-law/site/assets/hero-duo-2623w.020f19ef.jpg"
OUT = "/tmp/claude-0/-home-user/5f455c01-c3d3-5ae5-8a36-2fa7e928eb20/graded.png"


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32) / 255.0
h, w, _ = a.shape

lum = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722

# Маска субъектов = «правее середины кадра» И «светлее глубокого чёрного».
xs = np.linspace(0.0, 1.0, w)[None, :]
pos = smoothstep(xs, 0.42, 0.58)
tone = smoothstep(lum, 0.045, 0.14)          # фон (< 4.5% яркости) не трогаем вовсе
mask = (pos * tone)[..., None]

# --- Осветление фигур: гамма по средним тонам + мягкий подъём теней ---
lifted = np.power(a, 1.0 / 1.26)             # midtone gamma +
lifted = lifted + 0.030 * (1.0 - smoothstep(lum, 0.10, 0.55))[..., None]  # тени
lifted = np.clip(lifted, 0.0, 1.0)

out = a * (1.0 - mask) + lifted * mask

# --- Микро-растяжка уровней: убирает вялость, чернь остаётся чернью ---
lo, hi = 0.012, 0.985
out = np.clip((out - lo) / (hi - lo), 0.0, 1.0)

# --- Vibrance: подтянуть цвет кожи и волос, не трогая насыщенное золото ---
mx = out.max(axis=2, keepdims=True)
mn = out.min(axis=2, keepdims=True)
sat = (mx - mn) / (mx + 1e-5)
gray = (out * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(axis=2, keepdims=True)
vib = 0.22 * (1.0 - sat) * mask            # чем менее насыщен пиксель, тем сильнее подъём
out = np.clip(gray + (out - gray) * (1.0 + vib), 0.0, 1.0)

Image.fromarray((out * 255.0 + 0.5).astype(np.uint8)).save(OUT)
print("saved", OUT)
