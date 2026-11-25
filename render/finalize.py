#!/usr/bin/env python3
"""Turn the 2x Chromium render into the committed entry.png.

Reads render/out/page@2x.png (2048x2048), shrinks it to 1024x1024 with Lanczos,
then chooses the cheapest encoding that stays faithful to the render: plain RGB
when it fits the 1 MiB budget with room to spare, otherwise the best palette
quantisation. Prints byte counts, PSNR where applicable, and a luminance profile
that catches a blank or broken render without human eyes.
"""
import math
import sys

from PIL import Image, ImageChops, ImageStat

SOURCE = 'render/out/page@2x.png'
BUDGET = 1024 * 1024
PALETTES = (64, 96, 128, 192, 256)


def psnr(reference, candidate):
    rms = ImageStat.Stat(ImageChops.difference(reference, candidate)).rms
    mse = sum(v * v for v in rms) / 3
    return 99.0 if mse == 0 else 10 * math.log10(255 ** 2 / mse)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'entry.png'
    page = Image.open(SOURCE).convert('RGB')
    if page.size != (2048, 2048):
        raise SystemExit(f'unexpected render size {page.size}, expected 2048x2048')
    small = page.resize((1024, 1024), Image.LANCZOS)

    trials = []
    for colours in PALETTES:
        quant = small.quantize(colors=colours, method=Image.MEDIANCUT, dither=Image.NONE)
        name = f'render/out/q{colours}.png'
        quant.save(name, optimize=True)
        trials.append((name, colours, len(open(name, 'rb').read()), psnr(small, quant.convert('RGB'))))

    true_name = 'render/out/true.png'
    small.save(true_name, optimize=True)
    trials.append((true_name, 0, len(open(true_name, 'rb').read()), 99.0))

    for name, colours, weight, quality in trials:
        print(f'  {name:26s} colours={colours:3d} bytes={weight:7d} psnr={quality:5.2f}dB')

    # Prefer lossless RGB when it fits comfortably; otherwise the largest
    # palette that fits the budget while staying visually faithful.
    pick = next((t for t in trials if t[1] == 0 and t[2] <= BUDGET * 0.85), None)
    if pick is None:
        pick = next((t for t in trials if t[2] <= BUDGET * 0.97 and t[3] >= 44), None)
    if pick is None:
        pick = min(trials, key=lambda t: t[2] if t[2] <= BUDGET else 1 << 30)

    with open(pick[0], 'rb') as fh:
        with open(out_path, 'wb') as dst:
            dst.write(fh.read())
    print(f'wrote {out_path} from {pick[0]} ({pick[2]} bytes, psnr {pick[3]:.2f} dB)')

    # Eight horizontal luminance bands: a blank band means something broke.
    probe = small.convert('L').resize((64, 64), Image.BOX)
    pixels = list(probe.getdata())
    for band in range(8):
        rows = pixels[band * 512:(band + 1) * 512]
        print(f'  band {band}: mean {sum(rows) / len(rows):6.1f} '
              f'min {min(rows):3d} max {max(rows):3d}')


if __name__ == '__main__':
    main()
