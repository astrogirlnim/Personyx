# Product Context – The "Why"

_Last updated: 2025-06-30_

## Problem Statement

PMs and engineers often green‑light features on gut feeling, leading to **wasted sprints** and churn‑driving releases. Interviews and analytics **exist** but live in silos, making evidence hard to surface at planning time.

## User Experience Goals

1. **Zero‑friction upload** – Drop a `.md` or `.txt` PRD onto the Tray; get an Evidence Score in under 3 s.
2. **Context‑aware chat** – Ask _“What does Solo Founder think about onboarding?”_ directly from VS Code.
3. **One‑click export** – Push a polished scorecard to Notion or a slide deck for exec review.
4. **Stay local & secure** – All data resides in an encrypted SQLite store; no external servers needed.

## Personas in Detail

```yaml
- id: solo_founder
  name: 'Solo Founder'
  goals: ['ship MVP fast', 'minimal tooling overhead']
  pains: ['context switching', 'uncertain feature value']

- id: agency_marketer
  name: 'Agency Marketer'
  goals: ['optimize funnels', 'client reporting']
  pains: ['copy iteration speed', 'proof of ROI']
```
