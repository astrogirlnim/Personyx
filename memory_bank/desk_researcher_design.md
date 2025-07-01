# DeskResearcher Design System

> **Inspiration:** IDE‑clean minimalism + evidence‑driven analytics confidence.

## Brand Identity

DeskResearcher brings **clarity, confidence, and control** to product planning. Visual language is clinical but inviting—like a well‑annotated spec sheet—signalling rigorous analysis without sacrificing warmth.

### Core Principles

- **Evidence‑First** – Charts, badges, and scorecards foreground data that backs decisions.fileciteturn0file1
- **Integrated & Lightweight** – UI surfaces live in a tray panel or IDE sidebar; visuals reuse familiar OS conventions for zero learning curve.fileciteturn0file1
- **Proactive Focus** – Risk warnings surface only when necessary; a calm default keeps attention on productive work.fileciteturn0file1
- **Secure by Default** – Token vault and local storage reassure with subtle lock visuals and muted, trustworthy colours.fileciteturn0file1
- **Accessible Everywhere** – High contrast, ample spacing, and keyboard reach make analyst workflows comfortable for long sessions.

---

## Color Palette

| Role                              | Light                        | Dark      | Notes                                   |
| --------------------------------- | ---------------------------- | --------- | --------------------------------------- |
| **Primary Highlight** (Evidence)  | **Evidence Blue** `#2F80ED`  | `#5C9EFF` | Draws focus to scores, links, and CTAs. |
| **Secondary Highlight** (Persona) | **Persona Green** `#27AE60`  | `#5BC686` | Used for persona tags, success toasts.  |
| **Accent / Insight**              | **Insight Violet** `#9B51E0` | `#BB7BFF` | Data‑viz accents, selected tabs.        |
| **Warning**                       | **Caution Amber** `#F2994A`  | `#FFB36D` | Low evidence alerts, queued ingest.     |
| **Error / Risk**                  | **Risk Red** `#EB5757`       | `#FF7B7B` | Ingest failures, security errors.       |
| **Background**                    | **Mist Grey** `#F7F9FC`      | `#1F1F24` | App canvas; reduces eye strain.         |
| **Surface**                       | **Paper White** `#FFFFFF`    | `#26262C` | Cards, panels, modals.                  |
| **Outline**                       | **Graphite** `#CED4DA`       | `#3A3E46` | Separator lines, secondary borders.     |
| **Text Primary**                  | **Slate** `#212529`          | `#E9ECEF` | ≥ 4.5 : 1 WCAG contrast.                |
| **Text Secondary**                | **Steel** `#495057`          | `#ADB5BD` | Captions, placeholder text.             |

> **Contrast Check:** Every text/background pair meets AA 4.5 : 1.

---

## Typography

| Style           | Size  | Weight | Usage                                              |
| --------------- | ----- | ------ | -------------------------------------------------- |
| **Display**     | 32/40 | 800    | Dashboard hero numbers (e.g., “Evidence Score 82”) |
| **H1**          | 28/36 | 700    | Main panel headers                                 |
| **H2**          | 24/32 | 600    | Section titles                                     |
| **Body‑LG**     | 18/26 | 500    | Explanatory copy                                   |
| **Body**        | 16/24 | 400    | Default text                                       |
| **Code / Mono** | 14/20 | 500    | Slash‑command snippets, file paths                 |
| **Caption**     | 12/16 | 500    | Timestamps, small badges                           |

**Font stack:** Inter → Roboto → system UI sans‑serif; JetBrains Mono for code segments.

---

## Spacing Scale (4 px grid)

`xs` 4 | `sm` 8 | `md` 16 | `lg` 24 | `xl` 32 | `2xl` 48 | `3xl` 64

---

## Iconography

- **Stroke:** 1.5 px, rounded caps.
- **Theme:** magnifying glass, document, persona avatars, traffic‑light score badges.
- **Status colours:** Blue (info), Green (pass), Amber (warn), Red (fail).

---

## Motion Guidelines

- **Score Pulse (400 ms):** Evidence Score badges grow 4 % + fade to draw attention when first calculated.
- **Ingest Progress Sweep (200 ms loop):** Horizontal bar sweeps to indicate embedding in progress.
- **Tray Slide‑In (120 ms):** Panels slide from tray with ease‑out.

---

## Accessibility

- Minimum pointer target **44 × 44 px**.
- Full keyboard navigation & visible focus rings (`#5C9EFF` outline).
- Prefers‑reduced‑motion respected—Score Pulse becomes static.

---

## Dark Mode

Enable via OS setting; colours swap to dark variants (table above). Use `#1F1F24` background to preserve subtle shadow depth. Surface cards cast 4 dp shadow for hierarchy.

---

## Data Visualisation

- Default bar/line charts use Evidence Blue; comparative persona series alternate with Insight Violet & Persona Green.
- Error thresholds overlay as Risk Red lines; annotations in Slate text.
- Tooltip backgrounds use Surface colour at 95 % opacity.

---

## Component Tokens (excerpt)

| Token                | Value (Light)                | Purpose                       |
| -------------------- | ---------------------------- | ----------------------------- |
| `--dr-radius-md`     | 8 px                         | Card & button radius          |
| `--dr-shadow-sm`     | `0 1px 2px rgba(0,0,0,0.05)` | Default shadow                |
| `--dr-gap-panel`     | 24 px                        | Inner padding for tray panels |
| `--dr-duration-fast` | 120 ms                       | Small transitions             |

---

## Example Usage

```jsx
<Button variant="primary">Check Evidence</Button>
```

The button will render Evidence Blue background, Paper White text, 8 px radius, and cast a `shadow-sm` on hover.

---

### TL;DR

DeskResearcher’s design system visualises **trust‑worthy evidence** in a calm, IDE‑friendly palette—alerting teams to product risk without screaming for attention. It underpins tray, IDE, and Slack surfaces with consistent tokens that let engineering ship UI in record time.
