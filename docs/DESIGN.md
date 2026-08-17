# DESIGN

Derived from the owner's home-screen mock. That image is the reference; where this
document and the mock disagree, the mock wins.

**Do not invent a value.** If you need something that isn't here, stop and say so.

---

## The idea in one line

Every surface is a **physical object hanging in an alley** — a wood sign, a leather
plate, a paper notice, a cloth banner. Nothing is a flat rectangle.

---

## Color

Five families. Four are warm; one is deliberately cold, and that one does all the
work of telling the player what they can touch.

```css
:root {
  /* Parchment — page background and content surfaces */
  --parchment: #d9c9aa;
  --parchment-dark: #c2af8e;
  --parchment-edge: #a8926e;

  /* Wood — signage, headers, ribbon banners */
  --wood-dark: #4a2e19;
  --wood: #6b4423;
  --wood-light: #96663c;

  /* Slate — interactive only. Never decorative. */
  --slate: #3b4750;
  --slate-light: #4e5c67;
  --slate-dark: #2a333b;

  /* Brass — borders, rivets, ornaments, focus rings */
  --brass: #b8935a;
  --brass-dark: #8a6b3e;
  --gold: #d9a94c;

  /* Text */
  --cream: #f0e2c4; /* on wood and slate */
  --ink: #2e241a; /* on parchment */
  --ink-soft: #5a4735; /* secondary on parchment */

  /* Semantic */
  --danger: #8c3a2b; /* leave, kick, destructive */
  --success: #5f7a42; /* ready, confirmed */

  /* Outside the frame — see "The frame" below */
  --void: #0e0b08;
}
```

### The rules that fall out of this

1. **Slate blue is reserved for things you can tap.** Buttons and inputs. Nothing
   else, ever. This is the entire affordance system — the color _is_ the signal, so
   no hover state has to carry that job.
2. **Cream on dark, ink on parchment.** Never cream on parchment; never ink on slate.
3. **Brass is a hairline, never a fill.** 1–2px, inside the dark outer stroke.
4. **Warm depth, cool shadow.** Surfaces are warm; the shadows under them lean
   blue-grey. That contrast is what makes the mock read as sunlight in a stone alley
   rather than a sepia filter.

### Night phase shift

Same layout, same components, different atmosphere. Do not build separate components
— override the tokens under a `[data-phase="night"]` scope:

```css
--parchment: #8c8378; /* desaturated toward stone */
--wood: #3a2614;
--slate: #2a333b;
--cream: #d8cdb4;
```

---

## Type

- **Display:** `Alyamama` — every heading, every button, every role name.
- **Body:** pending Q-04. Until answered, use `Alyamama` throughout.

Arabic has no letter case, so `text-transform: uppercase` and `.toUpperCase()` do
nothing. There are ~60 all-caps labels in the current codebase relying on caps for
emphasis; every one loses its visual weight in Arabic.

**Emphasis in this design comes from surface, not case.** A label matters because it
sits on a wood plate or inside a ribbon banner — not because it's shouting.

Scale (mobile, inside the 430px frame):

| Role           | Size | Weight | Notes                                              |
| -------------- | ---- | ------ | -------------------------------------------------- |
| Game title     | 40px | 800    | Only on the hanging sign                           |
| Screen title   | 28px | 700    | On a wood plate                                    |
| Role name      | 24px | 700    | Card plate                                         |
| Section banner | 20px | 700    | Ribbon                                             |
| Button         | 19px | 600    |                                                    |
| Body           | 17px | 500    | Arabic needs more size than Latin at the same read |
| Caption        | 14px | 500    |                                                    |

Arabic diacritics and descenders need room: `line-height: 1.7` for body, `1.3` for
headings. Never below `1.25`.

---

## The four objects

Everything in the game is built from these. Building anything else needs a reason.

### Plate — wood sign

Headers and titles. Dark wood fill, visible grain, `2px` outer stroke in
`--wood-dark`, `1px` inner hairline in `--brass`, `radius: 12px`, corner rivets.
Cream text. The title variant hangs from ropes.

### Button — slate

The only slate element. `--slate` fill with a `--slate-light` top bevel, `2px`
`--wood-dark` stroke, `1px` `--brass` inner hairline, `radius: 10px`, stitched edge
detail. Cream text. Pressed: swap to `--slate-dark`, drop the bevel, translate 1px
down. Disabled: 55% opacity, no bevel.

### Panel — parchment

Content surfaces. `--parchment` fill with a subtle paper-grain overlay,
`--parchment-edge` stroke, `--brass` inner hairline, `radius: 14px`. Ink text.

### Banner — ribbon

Section headers inside panels. Dark wood band with notched ends, cream text,
overlapping the panel's top edge so it reads as pinned on rather than drawn in.
Used in the mock for **فريق الحرامية** and **القدرة الخاصة**.

---

## The frame

**This game is a phone screen. It is a phone screen on a phone, and it is a phone
screen in the middle of a 27-inch monitor.** (D-14)

430×932, centred, letterboxed in `--void` on anything wider. Scales down
proportionally on smaller phones — never reflows, never rearranges, no desktop or
tablet variant exists.

```css
body {
  background: var(--void);
  display: grid;
  place-items: center;
  overflow: hidden;
}

#root {
  width: min(var(--frame-w), 100vw);
  aspect-ratio: 430 / 932;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 80px 20px rgb(0 0 0 / 0.55); /* vignette into the void */
}
```

`100dvh` rather than `100vh` — mobile browser chrome collapses and expands as you
scroll, and `vh` doesn't notice.

Three rules that follow, and they bind every phase:

1. **Any media query that changes layout is a bug.** The one permitted media query is
   the one scaling the frame to the viewport.
2. **Never use `vw` or `vh` inside the frame.** They measure the browser window, not
   the frame — correct on a phone, wildly wrong on a laptop. Use `%`, `px`, or
   frame-relative custom properties.
3. **Nothing inside is allowed to be taller than the frame** unless it scrolls
   internally. See below.

---

## Spacing and geometry

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;

--radius-sm: 8px;
--radius: 12px;
--radius-lg: 16px;

--frame-w: 430px;
--frame-h: 932px; /* existing, keep */
```

Screen padding: `--space-4` on all sides.

### The overflow problem — read this before writing any layout

`#root` is locked to 430×932 with `aspect-ratio` and **`overflow: hidden`**
(`index.css:52-60`), and `body` also sets `overflow: hidden`. Every screen is designed
to fit exactly.

**Arabic runs 20–30% longer than English for the same content, and there is nowhere
for it to go.** It will be clipped, not scrolled. There is no `text-overflow:
ellipsis` anywhere in the codebase and no truncation logic.

Rules:

- Never `white-space: nowrap` on translated text. `HomePage.css:117` currently does
  this on the button-plate overlay — remove it.
- Any panel holding variable-length copy gets `overflow-y: auto` on the panel, not
  the page.
- Budget every string at 1.3× its English length and check the longest role name
  (**خالتي اللتاتا**) in every component that shows a role name.

---

## RTL

`dir="rtl"` on `<html>`. Logical properties only — `margin-inline-start`,
`padding-inline-end`, `inset-inline-start`, `text-align: start`. Zero physical
directional properties in new code.

`dir` does **not** fix these; handle each explicitly:

| Thing                | Where                                                 | What to do                                                                                             |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Player circle        | `roleHelpers.ts:27-48`                                | Trigonometry, not layout. Pending Q-03.                                                                |
| Horizontal scrollers | `NightRoleProgress.tsx:50-58`, `HomePage.tsx:341,393` | `scrollLeft` semantics differ per browser in RTL. Compute from `scrollWidth`, or use `scrollIntoView`. |
| Swipe direction      | `HomePage.tsx:196-211`                                | Hard-coded LTR. Invert.                                                                                |
| Chevrons             | `HomePage.tsx:346,398`                                | Mirror the SVG polylines.                                                                              |
| Flow arrows `→`      | `Results.tsx:171`, `HowToPlay.tsx:188`                | Become `←`.                                                                                            |
| Timer bar `scaleX`   | `NightPhase.tsx:258`                                  | Set an explicit `transform-origin`.                                                                    |

Vertical glyphs (`▲ ▼ ⋮ ✓ ✕`) need nothing.

---

## Motion

Restrained. The design is dense and physical; animation on top of it reads as noise.

Three places only:

1. **Card flip** on role reveal — the one showpiece. 500ms, `cubic-bezier(.4,0,.2,1)`.
2. **Press feedback** on buttons — 80ms translate, nothing more.
3. **Modal entry** — 200ms fade with a small scale from 0.96.

Everything else is instant. Respect `prefers-reduced-motion` on all three.

---

## Placeholder art (D-04)

`<RoleFrame>` renders the frame with no character inside: parchment fill, brass inner
hairline, wood outer stroke, and a low-contrast watermark centred — a simple alley
motif or a neutral silhouette, in `--parchment-edge` at ~15% opacity. Never a "?" in
a box, never a broken-image icon.

Aspect ratios, matching the existing asset shapes:

- `card` — 2:3
- `small` — 2:3, smaller type
- `square` — 1:1

The role name always sits on a plate **above** the frame, never inside it.
