# makefun-news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/xiaosong-wb1/makefun-news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/xiaosong-wb1/makefun-news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

The world-news front page for Wednesday, 25 November 2026 — 29 stories from 22 countries on one
1024×1024 broadsheet image, and the program that publishes it.

Submission for the make.fun bounty [`news-image-20261125`](https://make.fun/bounty/news-image-20261125).

## Layout

```
main.ts       the entrypoint: checks the gate's limits, writes entry.png to $MAKEFUN_OUTPUT_DIR
entry.png     the page itself — 1024x1024, 579 kB, baked into the repository
render/       how the page is made: page.html (layout + copy), build.sh, finalize.py
tools/        local acceptance: check.sh runs the program twice and verifies the image
```

## The image

A broadsheet front page, 1024×1024:

- a masthead that names the day — **Wednesday 25 November 2026** — and a six-figure stat strip
  (Taiex −7.9%, 55% of US voters want the Iran war ended now, 74 lashes for Iran's Parastoo
  Ahmadi, Cuban life expectancy down to 74.4 years, Hormuz oil traffic −40%, $2.7tn of AI
  investment this year);
- three illustrated leads: the Gulf war widening (two tankers ablaze off the Strait of Hormuz
  after mine strikes, the Saudi-led bombing of Hodeidah at dawn, Houthi threats against Saudi
  ports), the Asian AI-bubble selloff (Taiex −7.9%, Kospi −6%+, Nikkei −3.6%, Tokyo Electron
  −13.5%), and the WHO chief's demand in Havana that the US fuel blockade of Cuba end;
- 16 numbered briefs by region — Gaza (a family of four killed in Shati camp), Israel (the
  Eisenkot–Lieberman coalition pact), Iran (the flogging), China–Pakistan (the first Pakistani
  astronaut, launched to Tiangong), the US (the UMD/Ipsos poll, Alaska's voter-records refusal,
  the 4-tonne lead-azide detonation in Iowa), Venezuela, Colombia, the UK (the NPSA sabotage
  warning to Ukraine suppliers), Australia (the Lamarre-Condon verdict), Senegal (CAS restores
  its AFCON 2025 title), the Gambia, Norway–Cameroon (the Oslo war-crimes trial), Türkiye, and
  the UN's five-women-an-hour figure;
- a UTC timeline of the day, ten more stories with sources, and a red **date check** box that
  lists what the page deliberately leaves out as Tuesday's news (the Huawei verdict, Sheikh
  Hasina's announced return, the Landmine Monitor, the Chen Jining probe, Mexico's El Chapo
  Isidro decision, the Hanoi blast, Rep. Gomez's resignation);
- a footer naming the wires it was compiled from.

29 stories, 22 countries. Every item is dated 25 November 2026 (or its first report on that
day) and carries its source.

## How it is built

The page is one hand-written HTML file (`render/page.html`), laid out at exactly 1024×1024 and
drawn with inline SVG where a photograph would go. `render/build.sh` renders it headless with
Chromium at 2× and dumps a layout audit; `render/finalize.py` downscales the render to 1024×1024
and picks the smallest faithful PNG (plain RGB won here: 578,684 bytes, no quantisation
artefacts). The finished image is committed as `entry.png`.

`main.ts` is the entrypoint the grader runs. It does no network, no clock, no randomness: it
re-checks what the gate checks (PNG magic, at most 1 MiB, at most 1024×1024) and copies the
repository's `entry.png` byte for byte into `$MAKEFUN_OUTPUT_DIR` (default `/output`), so the
two graded runs write the same bytes.

```
node main.ts        # MAKEFUN_OUTPUT_DIR=/output by default
```

## Local acceptance

`tools/check.sh`:

It copies the repository to a scratch directory with the files read-only (as `/bot` is), runs
the program twice into fresh output directories, compares the two files with the repository's
`entry.png`, then runs `tools/verify.mjs` — the gate as `RULES.txt` states it: a whole PNG or
JPEG, every chunk with its checksum, image data that matches the header, at most 1 MiB, at
most 1024 by 1024.

## Files

- `main.ts` — entrypoint.
- `.makefun/owner.json` — wallet that owns this submission.
- `/output` (or `$MAKEFUN_OUTPUT_DIR`) receives `entry.png` only; nothing else is written.

---

Built with [make.fun](https://make.fun/r/d2ns9aah) — recommended link.
