# adsy.com reference palette

Measured 2026-10-19 with `getComputedStyle` at 1440×900. The cookie banner was declined.
Screenshots are in `reference/`.

## Type

| What | Value |
|---|---|
| Body | "Space Grotesk", sans-serif, 18px, `#000000` on a transparent body |
| h1 | `#112c3e`, weight 400, 76px, Space Grotesk |
| Keyword highlight in h1 ("Digital PR") | `#3e4fea` |

## Buttons (all pills, no shadow)

| Text | Background | Text colour | Border | Radius | Padding | Height | Weight |
|---|---|---|---|---|---|---|---|
| Sign Up / Read All Reviews (primary) | `#112c3e` | `#ffffff` | none | 65px | 10–15px 20–30px | 46–54 | 600 |
| Login (secondary) | `#f5f8fa` | `#000000` | 1px `#112c3e` | 65px | 10px 20px | 46 | 600 |
| More News (outline) | transparent | `#112c3e` | 1px `#112c3e` | 65px | 10px 20px | 54 | 600 |
| Sign Up & Get the guide (accent) | `#8cf08a` | `#112c3e` | none | 65px | 15px 4px 15px 30px | 54 | 600 |
| Contact us | `#677f9b` | `#112c3e` | 2px transparent | 65px | 15px 20px | 58 | 700 |
| Sign Up on dark sections | `#ffffff` | `#000000` | 2px `#ffffff` | 65px | 15px 18px | 58 | 700 |

## Tags (18–44 px tall, rounded, filled, short text)

| Example | Background | Text | Radius | Weight |
|---|---|---|---|---|
| "+15k last month" | `#8cf08a` | `#112c3e` | pill (58px) | 500 |
| "+10k last month" | `#e2e6f8` | `#112c3e` | pill (58px) | 500 |
| URL pill "https://techbullion.com" | `#3e4fea` | `#ffffff` | pill | — |
| Notice pill ("With automatic WhatsApp…") | `#c0f4c2` | `#112c3e` | rounded | — |

## Cards (wider than 250, taller than 150, rounded, filled)

| Use | Background | Radius | Shadow | Border | Count |
|---|---|---|---|---|---|
| Category / metric cards | `#ffffff` | 40px | none | 1px `#eaf1f6` | 32 |
| Review cards | `#ffffff` | 16px | none | none | 15 |
| Feature cards | `#8cf08a` | 40px | none | none | 6 |
| Large content cards | `#ffffff` | 30–40px | none | none | 4 |
| Dark banner | `#112c3e` | 40px | none | none | 1 |

## Backgrounds

- By painted area (elements at least 1,200 px wide): `#f4f7f9` 15,989k px², `#112c3e` 2,522k,
  `#eaf1f6` 1,079k, `#ffffff` 952k, `#f5f8fa` 312k. The page background is `#f4f7f9`, painted by
  `main`.
- By element count: `#ffffff` ×72, `#f9ede4` ×15, `#112c3e` ×11, `#8cf08a` ×9, `#3e4fea` ×5,
  `#f5f8fa` ×2, `#e2e6f8` ×2, `#f4f7f9` ×1, `#c0f4c2` ×1, `#eaf1f6` ×1, `#677f9b` ×1.

## Text colours by count

`#112c3e` ×191, `#677f9b` ×29, `#ffffff` ×22, `#a14326` ×15 (avatar initials), `#000000` ×9,
`#c4c9ff` ×4, `#0e810c` ×4 (check marks), `#6a737d` ×4, `#8cf08a` ×2, `#3e4fea` ×1.

## Palette

| Colour | Value | Use on adsy.com |
|---|---|---|
| Navy | `#112c3e` | Headings and body text, primary buttons, dark sections |
| Indigo | `#3e4fea` | Keyword highlight, URL pill, logo tile |
| Green | `#8cf08a` | Accent buttons, "+15k" tags, feature cards |
| Lavender | `#e2e6f8` | Neutral tags ("+10k") |
| Slate | `#677f9b` | Secondary text, one button |
| Page grey | `#f4f7f9` | Page background |
| White | `#ffffff` | Cards, header |
| Line | `#eaf1f6` | Card borders, one section background |
| Mist | `#f5f8fa` | Secondary button background |
| Peach / rust | `#f9ede4` / `#a14326` | Review avatar background and initials |

## Contrast (WCAG 2.x)

| Pair | Ratio | Verdict |
|---|---|---|
| Navy `#112c3e` on page `#f4f7f9` | 13.43 | pass |
| Navy on white | 14.45 | pass |
| Slate `#677f9b` on white | 4.13 | fails 4.5 |
| Slate on page `#f4f7f9` | 3.84 | fails 4.5 |
| Slate adjusted to `#5c728c` on page / on white | 4.60 / 4.95 | pass |
| Indigo `#3e4fea` on white / on page | 5.98 / 5.56 | pass |
| White on indigo | 5.98 | pass |
| White on navy | 14.45 | pass |
| Navy on green `#8cf08a` | 10.28 | pass |
| Navy on lavender `#e2e6f8` | 11.63 | pass |
