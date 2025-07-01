# DeskResearcher – Concept & Execution Plan

_(BrainLift-style)_

---

## 🌟 Purpose

Give **frontend & full-stack developers in small/medium teams (plus solo devs)** an always-on desktop companion that pipes real-time user feedback and usage metrics straight into their coding workflow, so they can ship features users actually need instead of “shiny-object” ideas handed down from on-high.:contentReference[oaicite:0]{index=0}

---

## 👥 Experts to Consult

| Domain                           | Why they're vital                                       | Example voice                              |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **Developer-Experience PM**      | Map insight feed to code contexts & IDE ergonomics      | Staff PM from VS Code extensions team      |
| **Data Privacy / Security Lead** | Validate OAuth + API-key model, GDPR/CCPA compliance    | Fractional CISO familiar with desktop apps |
| **AI Workflow Architect**        | Tune LangGraph pipelines for clustering & summarization | LangGraph instructor (Day 1 class)         |
| **Support/Success Manager**      | Prioritize the most actionable feedback signals         | Intercom or Zendesk champion               |
| **UX Researcher**                | Test passive vs. proactive alert balance                | Contract researcher with dev-tool focus    |

---

## 🔥 Spiky POVs

1. **“Insight latency kills product-market fit.”** If a dev can’t see user pain _while the file is open_, it’s already stale.
2. **“Developers deserve unfiltered data, not PM PowerPoints.”** DeskResearcher bypasses bottlenecks and speaks in code-level terms.
3. **“Privacy is a feature, not a checkbox.”** All tokens stay local & encrypted; PII is stripped before storage.:contentReference[oaicite:1]{index=1}
4. **“Automation beats dashboards.”** Summaries and severity tags appear contextually; no more tab-hunting.

---

## 🛠️ Phased Feature Scope

### **Phase 1 – Core (Early Submission, due Tue 8 PM CT)**:contentReference[oaicite:2]{index=2}

| Pillar              | Minimal but demo-able slice                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Data Ingest**     | OAuth for Slack + API key for Linear; pull last 50 items each                                            |
| **AI Workflow**     | LangGraph chain → cluster by _feature_ + _severity_; store results locally (SQLite + AES-256)            |
| **Desktop Surface** | VS Code sidebar extension **or** tray window listing top 5 feedback clusters for the current repo/module |
| **Auth UX**         | Simple settings dialog implementing guide’s OAuth/API-key flow:contentReference[oaicite:3]{index=3}      |
| **Security**        | TLS 1.2 in transit, encrypted tokens at rest (local only)                                                |
| **Demo Script**     | Stubbed “mock Intercom” JSON to prove end-to-end flow                                                    |

### **Phase 2 – Polished (Final, due Thu 8 PM CT)**

| Pillar                   | Enhancements                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source Expansion**     | Add Intercom, GA / Amplitude, optional IMAP email                                                                                              |
| **Context Inference**    | Detect open file/class → match clusters (e.g., `CheckoutForm.jsx` ⇆ “Checkout drop-off 30%”):contentReference[oaicite:4]{index=4}              |
| **Passive vs Proactive** | Default passive feed; configurable severity threshold pushes Slack/Discord alerts during planning windows:contentReference[oaicite:5]{index=5} |
| **Weekly Digest**        | n8n workflow generates markdown summary & auto-posts to Slack                                                                                  |
| **Linear Enrichment**    | Auto-tag issues with “User-impact” + severity score                                                                                            |
| **UI Polish**            | Light/dark themes, quick-filter chips (Feature / Severity / Confusion)                                                                         |
| **Compliance Extras**    | 30-day auto-prune, consent prompts, audit log export                                                                                           |

---

## ⏱️ Why This Fits the 4-Day Sprint

- **Small, vertical slice first.** OAuth + one API key + LangGraph flow is achievable in < 2 days.
- **Clear grading hooks.** Shows intelligent automation, desktop integration, and a solved personal pain, matching FlowGenius criteria.:contentReference[oaicite:6]{index=6}
- **Scalable polish.** Phase 2 items layer on UI/UX and more sources without rewriting core.

---

_Use this concept as your “north star” BrainLift doc and checkpoint progress against the Phase tables above._
