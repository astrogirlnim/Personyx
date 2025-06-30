# PRD · **DeskResearcher — Persona-Lens**

---

## 1. Project Overview
*Desktop AI companion that ingests real customer-interview transcripts, clusters insights by **persona**, scores every PRD for evidence, and lets devs/PMs chat with persona bots—^before^ and ^during^ coding.*

---

## 2. Problem Statement
Teams lose weeks on **“shiny-object” features** because early ideas lack real user proof. Evidence is scattered in interview docs, Slack threads, and PM decks. Developers often discover the mismatch only when code is already written.

---

## 3. Goals & Success Metrics

| Goal | KPI / Target |
|------|--------------|
| Block low-evidence features | ≥ 80 % of PRDs receive Evidence Score before sprint planning |
| Speed up persona-aligned copy tweaks | Persona Chat latency ≤ 2 s; devs use command ≥ 5× / week |
| Centralize qualitative evidence | 100 % of new interview transcripts auto-ingested within 5 min |
| Team visibility | Weekly digest posted by 8:05 AM every Monday |

---

## 4. Target Users & Personas

| ID | Role | Primary Need |
|----|------|--------------|
| `solo_founder` | Founder-dev | Avoid building unused features |
| `agency_marketer` | Front-end dev in agency | Persona-driven copy feedback |
| `pm_lead` | PM over 3 squads | Evidence health overview before sprint |

*(Starter YAML file can be expanded later.)*

---

## 5. Core User Stories

1. **Evidence Gate Before Sprint** (Solo Founder) — upload PRD → get Evidence Score; iterates after more interviews.  
2. **In-Editor Persona Feedback** (Agency Marketer) — VS Code `/ask-persona` improves CTA copy.  
3. **Weekly Evidence Health Check** (PM Lead) — Slack digest lists low-evidence tickets with sentiment trend.

---

## 6. Functional Requirements  
*(ordered by build priority)*

| # | Requirement | Priority | Phase |
|---|-------------|----------|-------|
| F-1 | Electron/Tauri scaffold with tray window | P0 | Core |
| F-2 | Load `personas.yml` into SQLite | P0 | Core |
| F-3 | File-watch `/interviews` folder; trigger n8n flow | P0 | Core |
| F-4 | LangGraph pipeline: split, embed, classify to persona | P0 | Core |
| F-5 | AES-encrypted SQLite tables (`personas`, `evidence`, `docs`) | P0 | Core |
| F-6 | PRD Markdown import & parsing | P0 | Core |
| F-7 | Evidence Score calc (recency-weighted count) | P0 | Core |
| F-8 | Tray UI: upload PRD, show score + top quotes | P0 | Core |
| F-9 | Persona Chat pop-up (LangGraph RAG) | P1 | Final |
| F-10 | VS Code command `/ask-persona` | P1 | Final |
| F-11 | Product-description ingest | P1 | Final |
| F-12 | Dark / light theme toggle | P1 | Final |
| F-13 | 30-day auto-prune + audit log export | P1 | Final |
| F-14 | Weekly Slack digest of low-evidence tickets | P2 | Wow |
| F-15 | Multi-source ingest (app-store reviews, analytics CSV) | P2 | Wow |
| F-16 | Proactive tray badge (red if Score < 60) | P2 | Wow |
| F-17 | Smart context inference (file → feature) | P2 | Wow |
| F-18 | Sentiment trend graph (Recharts) | P2 | Wow |
| F-19 | Linear/Jira auto-labeler (persona + severity) | P2 | Wow |

---

## 7. Non-Functional Requirements

* **Security**:  
  * All tokens stored locally with AES-256.  
  * Data never leaves machine except optional Slack digest.  
  * 30-day evidence auto-prune (configurable).  
* **Performance**:  
  * Evidence Score ≤ 3 s for PRD ≤ 5 kB.  
  * Chat response latency ≤ 2 s (local embed cache).  
* **Compatibility**: macOS 13+, Windows 10+ (focus macOS first).  
* **Privacy**: PII removal via LangGraph text scrubber.  
* **Accessibility**: Dark/light themes, keyboard shortcuts.

---

## 8. Technical Architecture

```text
Electron/Tauri Tray
└─ REST IPC
   ├─ LangGraph server (persona RAG, scoring)
   ├─ n8n worker (file-watch, cron, Slack digest)
   └─ SQLite (encrypted)
VS Code Ext  ─► REST IPC  (ask-persona)
```

*Embeddings: OpenAI `text-embedding-3-small` (fallback to local MiniLM).*

---

## 9. MVP Scope & Timeline

| Milestone | Deadline | Included FRs |
|-----------|----------|--------------|
| **Early Submission** | Tue 8 PM | F-1 → F-8 |
| **Final Polished MVP** | Thu 8 PM | F-9 → F-13 + screencast |
| **Phase 2 Wow** | Post-sprint | F-14 → F-19 |

---

## 10. Out-of-Scope (Sprint 1)

* Mobile app, cloud sync, additional personas beyond starter set, real-time analytics streaming.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI rate limits | Chat latency ↑ | Cache embeddings locally; small prompt windows |
| Transcript format variability | Ingest failures | Add simple front-end lint & regex fallback |
| Slack/Jira API auth friction | Onboarding drop-off | Keep Phase-1 local only; add APIs in Phase-2 |

---

## 12. Open Questions

1. Should Evidence Score weight *sentiment* or just *volume + recency*?  
2. Minimum viable regex for persona classification acceptable, or enforce embeddings only?  
3. Which platform to prioritize for demo—macOS or Windows?

---

*Prepared 30 June 2025 for FlowGenius desktop-AI sprint.*
