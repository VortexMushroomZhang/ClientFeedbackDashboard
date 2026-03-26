# Design System — Client Feedback Dashboard

Based on **Vercel Geist** design system (https://vercel.com/geist/introduction).
Adapted for a vanilla JS + Express project. All tokens are CSS custom properties.

---

## 1. Typography

### Font Family
**Geist Sans** — Vercel's primary UI typeface, created in collaboration with Basement Studio.
Self-hosted via the `geist` npm package, served at `/fonts/geist/`.

```css
font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
```

| Weight | Name        | Value |
|--------|-------------|-------|
| 400    | Regular     | Body text, labels |
| 500    | Medium      | Nav items, button labels |
| 600    | Semi Bold   | Card titles, table headers, section headings |
| 700    | Bold        | Page titles, metric values |

### Type Scale

| Role              | Size   | Weight | Letter Spacing | Line Height |
|-------------------|--------|--------|----------------|-------------|
| Page title (h2)   | 24px   | 700    | -0.02em        | 1.2         |
| Section heading   | 20px   | 600    | -0.02em        | 1.3         |
| Card title        | 14px   | 600    | -0.01em        | 1.4         |
| Body / copy       | 14px   | 400    | -0.005em       | 1.625       |
| Label / meta      | 13px   | 400–500| -0.005em       | 1.5         |
| Caption / hint    | 12px   | 400    | 0              | 1.5         |
| Micro / tag       | 11px   | 600    | +0.03em        | 1           |

### Font Smoothing
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 2. Color System

Geist uses **10-stop color scales** (100 = lightest, 1000 = darkest) for each hue.
Stops 100–300 = backgrounds · 400–600 = borders · 700–800 = high contrast · 900–1000 = text/icons.

### Gray Scale (Light Theme)

| Token              | HSL                | Hex equiv.  | Usage                    |
|--------------------|--------------------|-------------|--------------------------|
| `--gray-100`       | `hsl(0 0% 95%)`    | `#f2f2f2`   | Subtle backgrounds       |
| `--gray-200`       | `hsl(0 0% 92%)`    | `#ebebeb`   | Borders, dividers        |
| `--gray-300`       | `hsl(0 0% 90%)`    | `#e5e5e5`   | Active border            |
| `--gray-400`       | `hsl(0 0% 92%)`    | `#ebebeb`   | Hover border             |
| `--gray-500`       | `hsl(0 0% 79%)`    | `#c9c9c9`   | Disabled                 |
| `--gray-600`       | `hsl(0 0% 66%)`    | `#a8a8a8`   | Placeholder text         |
| `--gray-700`       | `hsl(0 0% 56%)`    | `#8f8f8f`   | Hint / muted text        |
| `--gray-800`       | `hsl(0 0% 49%)`    | `#7d7d7d`   | Secondary icons          |
| `--gray-900`       | `hsl(0 0% 40%)`    | `#666666`   | Secondary text           |
| `--gray-1000`      | `hsl(0 0% 9%)`     | `#171717`   | Primary text             |

### Gray Alpha (Light Theme)

| Token                  | Value                    | Usage                  |
|------------------------|--------------------------|------------------------|
| `--gray-alpha-100`     | `rgba(0,0,0, 0.05)`      | Hover overlays         |
| `--gray-alpha-200`     | `rgba(0,0,0, 0.08)`      | Subtle borders         |
| `--gray-alpha-300`     | `rgba(0,0,0, 0.10)`      | Component borders      |
| `--gray-alpha-600`     | `rgba(0,0,0, 0.34)`      | Focus ring inner       |
| `--gray-alpha-1000`    | `rgba(0,0,0, 0.91)`      | Near-black             |

### Backgrounds

| Token               | Value     | Usage                       |
|---------------------|-----------|-----------------------------|
| `--background-100`  | `#ffffff`  | Surface / card background   |
| `--background-200`  | `#fafafa`  | Page background             |

### Blue Scale (Light)

| Token        | HSL                        | Usage                    |
|--------------|----------------------------|--------------------------|
| `--blue-100` | `hsl(212 100% 97%)`        | Status "New" background  |
| `--blue-400` | `hsl(209 100% 90%)`        | Hover border             |
| `--blue-700` | `hsl(212 100% 48%)`        | Primary blue, links      |
| `--blue-900` | `hsl(211 100% 42%)`        | Dark blue text           |

### Red Scale (Light)

| Token       | HSL                        | Usage                     |
|-------------|----------------------------|---------------------------|
| `--red-100` | `hsl(0 100% 97%)`          | Error / negative bg       |
| `--red-700` | `hsl(358 75% 59%)`         | Error text, negative      |
| `--red-900` | `hsl(358 66% 48%)`         | Dark error                |

### Amber Scale (Light)

| Token         | HSL                        | Usage                     |
|---------------|----------------------------|---------------------------|
| `--amber-100` | `hsl(39 100% 95%)`         | Warning / assigned bg     |
| `--amber-700` | `hsl(39 100% 57%)`         | Warning, accent           |
| `--amber-900` | `hsl(30 100% 32%)`         | Dark warning text         |

### Green Scale (Light)

| Token         | HSL                        | Usage                     |
|---------------|----------------------------|---------------------------|
| `--green-100` | `hsl(120 60% 96%)`         | Success / resolved bg     |
| `--green-700` | `hsl(131 41% 46%)`         | Success, resolved         |
| `--green-900` | `hsl(133 50% 32%)`         | Dark success text         |

### Teal Scale (Light) — Primary Brand Color

| Token        | HSL                        | Usage                     |
|--------------|----------------------------|---------------------------|
| `--teal-100` | `hsl(169 70% 96%)`         | Primary light / active nav bg |
| `--teal-700` | `hsl(173 80% 36%)`         | Primary actions, links    |
| `--teal-900` | `hsl(174 91% 25%)`         | Primary dark / buttons    |

### Purple Scale (Light)

| Token          | HSL                        | Usage                     |
|----------------|----------------------------|---------------------------|
| `--purple-100` | `hsl(276 100% 97%)`        | "In Review" status bg     |
| `--purple-700` | `hsl(272 51% 54%)`         | "In Review" status text   |

### Semantic Color Tokens

These are the tokens used throughout component code. Always use these — never raw hex.

```css
/* Surfaces */
--bg:           var(--background-200)   /* #fafafa */
--surface:      var(--background-100)   /* #ffffff */
--border:       var(--gray-200)         /* hsl(0 0% 92%) */
--border-light: var(--gray-100)         /* hsl(0 0% 95%) */

/* Text */
--text-primary:   var(--gray-1000)      /* hsl(0 0% 9%) */
--text-secondary: var(--gray-900)       /* hsl(0 0% 40%) */
--text-hint:      var(--gray-700)       /* hsl(0 0% 56%) */

/* Brand */
--primary:      var(--teal-700)
--primary-light: var(--teal-100)
--primary-dark:  var(--teal-900)
--accent:       var(--amber-700)
--accent-light: var(--amber-100)

/* Status */
--status-new:         var(--blue-700)
--status-in-review:   var(--purple-700)
--status-assigned:    var(--amber-700)
--status-in-progress: var(--teal-700)
--status-resolved:    var(--green-700)

/* Sentiment */
--sentiment-negative: var(--red-700)
--sentiment-neutral:  var(--gray-700)
--sentiment-positive: var(--green-700)

/* Priority */
--priority-high:   var(--red-700)
--priority-medium: var(--amber-700)
--priority-low:    var(--gray-700)
```

---

## 3. Spacing

Geist uses a **4px base unit** (Tailwind-aligned). All spacing should be multiples of 4px.

| Scale | Value | Usage                              |
|-------|-------|------------------------------------|
| 1     | 4px   | Icon gap, micro padding            |
| 2     | 8px   | Badge padding, small gaps          |
| 3     | 12px  | Input padding, compact card body   |
| 4     | 16px  | Standard padding, section gaps     |
| 5     | 20px  | Card padding, medium gaps          |
| 6     | 24px  | Card body, dialog padding          |
| 8     | 32px  | Page padding, section spacing      |
| 10    | 40px  | Page horizontal padding            |
| 12    | 48px  | Large section gaps                 |

### Layout

| Token                | Value  |
|----------------------|--------|
| `--sidebar-width`    | 260px  |
| `--sidebar-collapsed`| 60px   |
| Page horizontal pad  | 40px   |
| Page top pad         | 32px   |
| Max container width  | 1400px |

---

## 4. Border Radius

| Token        | Value  | Usage                           |
|--------------|--------|---------------------------------|
| `--radius`   | 6px    | Cards, inputs, buttons, badges  |
| `--radius-sm`| 4px    | Tags, small chips, dropdowns    |
| `--radius-lg`| 10px   | Dialogs, modals, tooltips       |
| `--radius-xl`| 12px   | Large cards, action cards       |
| `--radius-full`| 9999px| Pills, full-round chips        |

> Geist default radius is **6px** — not 8px. This is intentionally tighter than typical Material Design.

---

## 5. Shadows

Geist shadows use a layered approach: a 1px border ring + soft depth layers.

| Token          | Value                                                                 | Usage                   |
|----------------|-----------------------------------------------------------------------|-------------------------|
| `--shadow`     | `0 0 0 1px rgba(0,0,0,0.08)`                                         | Cards, default surfaces |
| `--shadow-sm`  | `0px 1px 2px rgba(0,0,0,0.16)`                                       | Elevated small elements |
| `--shadow-md`  | `0 0 0 1px rgba(0,0,0,0.08), 0px 4px 8px -4px rgba(0,0,0,0.04), 0px 16px 24px -8px rgba(0,0,0,0.06)` | Dropdowns, tooltips, menus |
| `--shadow-lg`  | `0 0 0 1px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.12)`          | Modals, dialogs         |
| `--focus-ring` | `0 0 0 2px #fff, 0 0 0 4px hsl(212 100% 48%)`                       | Keyboard focus state    |

---

## 6. Transitions

Geist standard: **200ms ease**.

| Token          | Value        | Usage                         |
|----------------|--------------|-------------------------------|
| `--transition` | `200ms ease` | All interactive state changes |
| Fast           | `150ms ease` | Hover backgrounds             |
| Slow           | `250ms ease` | Sidebar collapse, expansion   |

---

## 7. Component Patterns

### Badges
Inline status/label chips. Always use background + matching text from the same color scale.

```
Format: background = [color]-100, text = [color]-700 or [color]-900
Padding: 2px 10px | Border-radius: --radius-full | Font-size: 12px | Font-weight: 500
```

### Tags (Category)
Uppercase micro labels for categorization.
```
Padding: 2px 8px | Border-radius: --radius-sm | Font-size: 11px | Font-weight: 600 | Letter-spacing: 0.03em | Text-transform: uppercase
```

### Cards
Primary content containers.
```
Background: --surface | Border: 1px solid --border | Border-radius: --radius-xl (12px) | Shadow: --shadow
```

Card with accent left border (action cards, feedback quotes):
```
Border-left: 3px solid --primary
```

### Buttons

**Primary:**
```
Background: --primary-dark | Color: white | Padding: 10px 20px | Radius: --radius | Font-weight: 600
Hover: --primary | Transition: --transition
```

**Outline:**
```
Background: transparent | Border: 1px solid --border | Color: --text-primary
Hover: border-color --primary, color --primary
```

### Inputs & Selects
```
Border: 1px solid --border | Radius: --radius | Padding: 8px 12px–14px | Font-size: 14px
Focus: border-color --primary (no outline) | Transition: --transition
```

### Tables
```
Header background: --gray-100 | Header text: --text-secondary, 12px, 600, uppercase, letter-spacing 0.04em
Row border: 1px solid --border-light | Row hover: --gray-alpha-100
```

### Dialogs / Modals
```
Width: 640px (standard) / 720px (large) | Radius: --radius-lg | Shadow: --shadow-lg
Overlay: rgba(0,0,0,0.4)
```

### Navigation Sidebar
```
Width: 260px (expanded) / 60px (collapsed) | Transition: 250ms ease
Active item: background --primary-light, color --primary
Hover item: background --gray-alpha-100
```

---

## 8. Icons

Uses **Google Material Icons Outlined** (`material-icons-outlined`).
Standard sizes: `20px` (nav), `18px` (inline), `14px` (badge/label), `48px` (empty state hero).

Vercel Geist uses its own SVG icon set (800+ icons, hyphenated naming e.g. `check-circle-fill`).
Migration to Geist icons is recommended when moving to a bundled framework.

---

## 9. Z-Index Scale

| Layer      | Value | Usage              |
|------------|-------|--------------------|
| Default    | 0     | Normal flow        |
| Sidebar    | 100   | Fixed navigation   |
| Tooltip    | 200   | Hover overlays     |
| Dialog     | 1000  | Modal overlays     |

---

## 10. Design Principles (from Geist)

1. **Answers before controls** — Show the most important data first, filters second.
2. **One screen, one question** — Each page answers a single clear question.
3. **Calm, not colorful** — Use color to communicate state, not decoration.
4. **Consistent density** — 4px grid throughout. Never use arbitrary spacing.
5. **Subtle shadows over heavy borders** — Geist prefers `box-shadow: 0 0 0 1px` ring over thick borders.
6. **200ms transitions** — Fast enough to feel instant, slow enough to be perceived.
7. **Neutral grays, not tinted** — Backgrounds and borders use pure gray (HSL 0 0% x%), not warm/cool grays.
8. **Font weight communicates hierarchy** — Use 400/500/600/700 intentionally, not interchangeably.
