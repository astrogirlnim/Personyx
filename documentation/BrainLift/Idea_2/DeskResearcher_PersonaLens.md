# DeskResearcher — **Persona-Lens Desktop Assistant**

A FlowGenius-compliant desktop app that ingests raw **customer-interview transcripts**, clusters insights by **persona**, scores new PRDs for evidence, and lets devs/PMs _chat_ with persona bots while they work.

---

## 0 · Assignment Fit ✅

| FlowGenius Requirement                 | How DeskResearcher Complies (Phase-1) |
|----------------------------------------|----------------------------------------|
| **Desktop app**                        | Electron / Tauri tray + optional VS Code panel |
| **LangGraph / n8n intelligent workflow** | LangGraph = RAG + persona chat; n8n = auto-ingest interviews |
| **Local execution & security**         | SQLite + AES token vault; no cloud storage |
| **Personal productivity focus**        | Blocks “shiny-object” ideas by demanding persona evidence **before** coding |
| **4-day sprint deliverables**          | Phase-1 core loop demo-able by Tue 8 PM |

---

## 1 · Purpose

> _“Give makers instant, persona-specific proof that a feature is worth building—before they write code—and live feedback while they do.”_

---

## 2 · Architecture (Phase-1 Scope)

```text
┌─────────┐      drop .md/.txt      ┌────────────┐
│ Tray UI │ ──────────────────────►│  n8n Flow  │
└─────────┘                        └────┬───────┘
   ▲  chat / PRD upload                │  LangGraph: embed, classify
   │                                   ▼
┌────────────────────────────────────────────────┐
│  SQLite: personas, evidence, product docs      │
└────────────────────────────────────────────────┘
   ▲                               │
   │ RAG answer / evidence score   │
┌───────────────────────────┐   ┌─────────────┐
│  Tray & VS Code panel     │◄──│ Persona Bot │
└───────────────────────────┘   └─────────────┘
```

---

## 3 · Personas YAML (starter)

```yaml
- id: solo_founder
  name: "Solo Founder"
  goals: ["ship MVP fast", "minimal tooling overhead"]
  pains: ["context switching", "uncertain feature value"]

- id: agency_marketer
  name: "Agency Marketer"
  goals: ["optimize funnels", "client reporting"]
  pains: ["copy iteration speed", "proof of ROI"]
```

---

## 4 · Phased Feature Roadmap

| Phase | Deadline | What Ships | Demo Wow |
|-------|----------|------------|----------|
| **1 · Core** | **Tue 8 PM** | • File-watch `/interviews` → auto-ingest & embed<br>• Import PRD markdown → Evidence Score (0-100) per persona<br>• Tray “Chat with Persona” window (1 persona)<br>• Local AES token vault | Show PRD with score **42** → tray alert “Needs more Solo Founder evidence!” |
| **Final Polish (Phase-1+)** | Thu 8 PM | • VS Code slash-command `/ask-persona`<br>• Product-description ingestion<br>• Dark / light theme<br>• 30-day auto-prune & audit log | Live ask: _“Agency Marketer, is this CTA persuasive?”_ & bot replies citing interviews |
| **2 · Wow & Impress** | Post-sprint or stretch goals | 1. **Multi-source ingest**: App-store reviews, analytics CSV (Amplitude / GA)<br>2. **Slack digest**: “Proposals lacking persona evidence” (runs weekly)<br>3. **Proactive severity alerts**: tray badge turns red if Evidence Score \< 60<br>4. **Smart context inference**: map open file/module to feature → auto-surface persona quotes<br>5. **Persona sentiment trend graph** (Recharts)<br>6. **One-click Linear labeler**: auto-tags tickets with _Persona + Severity_ | Judges see real-time alerts & a sentiment sparkline tied to code context |

---

## 5 · Day-by-Day Checklist (Phase-1)

| Day | Key Tasks |
|-----|-----------|
| **Mon** | • Scaffold Electron/Tauri<br>• Build `personas.yml`<br>• Seed two mock transcripts |
| **Tue (Core Due)** | • n8n file-watch + LangGraph embedding/classification<br>• Import-PRD UI → Evidence Score<br>• Basic tray chat<br>• Record 1-min demo |
| **Wed** | • VS Code extension stub<br>• Evidence-score toast<br>• UI polish session |
| **Thu (Final)** | • Product-desc ingest<br>• Dark mode<br>• Security & pruning<br>• 5-min screencast + README |

---

### TL;DR  
Phase-1 keeps scope razor-thin—**one data source, two personas, one Evidence Score loop, chat bot**—yet nails every FlowGenius rubric. Phase-2 layers “wow” features without refactoring core.
