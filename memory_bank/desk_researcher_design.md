# Personyx Design System – **Version 2 (June 2025)**

> **Restyle codename:** _Evidence Gate_ — a focused refresh that elevates the value proposition (evidence‑first) and aligns the visual language with our tray‑first workflow.

---

## 1 · Core Layout – _Tray Home («Evidence Gate»)_

```
┌──────────────────────────────────────────────────────────────┐
│ Header (56 px)  ╴ Personyx ─────────────────────── 🌙 │
├──────────────────────────────────────────────────────────────┤
│ Evidence gate (Hero)                                        │
├────────────┬────────────────────────────────────────┬────────┤
│            │                                        │        │
│ Import PRD │   Evidence Scores (card column)         │        │
│  (2 cols)  │   – Ring gauge (empty → % value)        │        │
│            │   – CTA "Import First PRD"             │        │
│            ├────────────────────────────────────────┤ Personas│
│            │   Persona pills (wrap)                 │  card   │
└────────────┴────────────────────────────────────────┴────────┘
```

- **Grid:** 12‑col, 24 px gutters (`gap‑lg`); Import card spans 8 cols on ≥1024 px.
- **Surface elevation:** `shadow‑sm` on all cards; outer tray gets `shadow‑md`.
- **Spacing:** Outer padding `p‑6` (24 px); internal card padding `p‑4` (16 px).

### 1.1 Header

| Token      | Value                 | Notes                      |
| ---------- | --------------------- | -------------------------- |
| Typography | H1 28/36 · 700        | Brand name                 |
| Underline  | 2 px Evidence Blue    | 8 px offset below baseline |
| Icon       | `Moon` (Lucide 24 px) | Toggles `dark:` classes    |

### 1.2 Import PRD Card

| Element     | Spec                                                        |
| ----------- | ----------------------------------------------------------- |
| Card radius | `--dr-radius-md` 8 px                                       |
| Drop‑zone   | min 180 × 360 px; dashed Graphite 2 px border; rounded 6 px |
| Doc icon    | Lucide `FileText` 48 px, Stroke 1.5 px Slate                |
| Hint text   | Body 16/24 regular Slate                                    |
| Hover       | Border Evidence Blue; icon fills Evidence Blue 10 % opacity |

### 1.3 Evidence Scores Card

| State      | UI                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **Empty**  | 160 px diameter ring gauge, Slate dashed inner arc; label "No PRDs analysed yet"                                  |
| **Loaded** | Arc fills Evidence Blue proportional to score; numeric centre label (32/40 · 800)                                 |
| **Motion** | _Score Pulse_ → `scale(1.04) → 1` + opacity `100 → 80 → 100`, 400 ms ease‑out (respects `prefers-reduced-motion`) |

### 1.4 Personas Card

- Pill: `bg‑persona` Persona Green, `text‑white`, `rounded-full`, `px‑3 py‑1`, Caption 12/16 bold.
- Ready state copy "Ready for evidence analysis" Body‑SM Steel.

---

## 2 · Tailwind Tokens

```js
// tailwind.config.js
extend: {
  colors: {
    evidence: '#2F80ED',
    persona:  '#27AE60',
    insight:  '#9B51E0',
    mist:     '#F7F9FC',
    paper:    '#FFFFFF',
    graphite: '#CED4DA',
  },
  borderRadius: { md: '8px' },
  boxShadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
  },
}
```

`shadow‑md` elevates the floating tray; new colour tokens power persona pills and evidence accents.

---

## 3 · Motion Guidelines

| Animation                 | Duration    | Easing     | Trigger                       |
| ------------------------- | ----------- | ---------- | ----------------------------- |
| **Score Pulse**           | 400 ms      | `ease‑out` | First non‑null Evidence Score |
| **Tray Slide‑In**         | 120 ms      | unchanged  | On tray open                  |
| **Ingest Progress Sweep** | 200 ms loop | unchanged  | Upload in progress            |

---

## 4 · Accessibility

- Dark‑mode toggle is keyboard‑focusable (`tabindex=0`) and shows focus ring (`outline‑2 focus-visible:outline-evidence`).
- Ring gauge text maintains 4.5 : 1 contrast on both backgrounds (> AA). Numeric colour: Slate (light) ↔ Mist Grey 95 % (dark).
- Drop‑zone meets 44 × 44 px minimum interactive area with fallback text.

---

## 5 · Component Tokens

| Token                   | Value                             | Purpose                        |
| ----------------------- | --------------------------------- | ------------------------------ |
| `--dr-shadow-md`        | `0 4px 6px rgba(0,0,0,0.1)`       | Elevation for top-level tray   |
| `--dr-ring-gauge-size`  | `160px`                           | Evidence Scores gauge diameter |
| `--dr-anim-score-pulse` | `400ms cubic-bezier(0.4,0,0.2,1)` | Pulse keyframe spec            |

---

## 6 · Example Usage

```jsx
<Button variant="primary">Import First PRD</Button>
```

Button renders in Evidence Blue, Paper White text, 8 px radius and triggers _Score Pulse_ when the first PRD lands.

---

### TL;DR

The _Evidence Gate_ refresh doubles down on our promise of **trust‑worthy analysis, front‑and‑centre**, while preserving the calm, IDE‑adjacent aesthetic and laying groundwork for future persona insights.
