# DeskResearcher — **Pre‑Code Risk Control**

### Executive Snapshot

DeskResearcher **blocks costly feature bets** by scoring every PRD against real‑user evidence, surfacing persona‑linked churn risks, and piping insights straight into the tools product teams already use.

---

## 0 · Assignment Fit ✅

| FlowGenius Requirement                   | How DeskResearcher Complies (Phase‑1)                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Desktop app**                          | Electron / Tauri tray + optional VS Code panel                                                 |
| **LangGraph / n8n intelligent workflow** | LangGraph = RAG + persona chat; n8n = auto‑ingest interviews                                   |
| **Local execution & security**           | SQLite + AES token vault; no cloud storage                                                     |
| **Personal productivity focus**          | Prevents 2–3 wasted sprints per unfounded idea by demanding persona evidence **before** coding |
| **4‑day sprint deliverables**            | Phase‑1 core loop demo‑able by Tue 8 PM                                                        |

---

## 1 · Purpose

> *Give makers an evidence‑backed go/no‑go gate that prevents wasted sprints before the first line of code — and provides live persona feedback while they build.*

---

## 2 · Business Impact & KPIs

| Metric                          | Target / Observation Window                    |
| ------------------------------- | ---------------------------------------------- |
| Features rejected pre‑build     | ≥ 25 % of backlog per quarter                  |
| Engineering sprints saved       | ≥ 1.5 per month                                |
| Renewal‑threat stories surfaced | 100 % flagged ≥ 90 days before renewal         |
| Churn‑driver coverage index     | > 80 % of top churn reasons mapped to evidence |
| Average PRD Evidence Score      | ≥ 80 (team‑configurable)                       |

---

## 3 · Architecture (Phase‑1 Scope)

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
┌───────────────────────────┐   ┌─────────────┐        ┌────────────┐
│ VS Code / Tray Panel      │◄──│ Persona Bot │◄───────│ Notion Pane│
└───────────────────────────┘   └─────────────┘        └────────────┘
        ▲   ▲                                   ▲
        │   │ Evidence labels                   │ Scorecard export
        │   └──────────────┐                    │
┌─────────────┐   slash cmd │             ┌──────────────┐
│ Linear API  │◄────────────┘             │ Slack Bot    │
└─────────────┘                            └──────────────┘
```

### Activation Flows (Compelling Events)

- **Retro import** – pull the Jira epic for a just‑flopped feature and auto‑map usage & interview data.
- **Quarterly planning kick‑off** – bulk‑score every backlog item, highlighting low‑evidence bets.
- **New‑PM starter pack** – auto‑assign must‑read personas and evidence checklist on Day 1.

---

## 4 · Personas YAML (starter)

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

---

## 5 · Phased Feature Roadmap

| Phase                       | Deadline    | What Ships                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Demo Wow                                                                                                                     |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **1 · Core**                | Tue 8 PM    | • File‑watch `/interviews` → auto‑ingest & embed• Import PRD markdown → Evidence Score (0‑100) per persona• **Evidence Scorecard one‑click export (Notion → slide deck)**• Notion Scorecard prototype panel• Tray ‘Chat with Persona’ window (1 persona)• Local AES token vault                                                                                                                                                                                                                                                                   | PM exports Scorecard deck in 2 clicks and shows PRD with score 42 → tray banner ‘Solo Founder evidence missing!’             |
| **Final Polish (Phase‑1+)** | Thu 8 PM    | • VS Code slash‑command `/ask‑persona`• **Slack slash‑command** `/evidence‑check <PRD link>` returns score + key quotes• Product‑description ingestion• Linear ‘Evidence Score’ labeler• Notion sidebar live panel• Dark / light theme• 30‑day auto‑prune & audit log                                                                                                                                                                                                                                                                             | In Slack, `/evidence‑check` posts a confidence card with persona pull‑quotes in under 3 s                                    |
| **2 · Wow & Impress**       | Post‑sprint | 1. **Multi‑source ingest**: App‑store reviews & analytics CSV (Amplitude/GA)2. **Retro wizard**: import failed feature & quantify wasted effort3. **Slack digest**: weekly ‘Proposals lacking persona evidence’ (fires only if slash‑command unused)4. **Renewal‑risk radar**: flags missing capabilities 90 days pre‑renewal5. **Proactive severity alerts**: tray badge turns red if Evidence Score < 606. **Smart context inference**: map open module to feature → auto‑surface persona quotes7. **Persona sentiment trend graph** (Recharts) | Renewal‑risk radar highlights an at‑risk \$200 K account; sentiment sparkline updates live as the judge scrolls through code |

---

## 6 · Day‑by‑Day Checklist (Phase‑1)

| Day                | Key Tasks                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mon**            | • Scaffold Electron/Tauri• Build `personas.yml`• Seed two mock transcripts                                                                                      |
| **Tue (Core Due)** | • n8n file‑watch + LangGraph embedding/classification• Import‑PRD UI → Evidence Score• **Evidence Scorecard export**• Notion prototype panel• Record 1‑min demo |
| **Wed**            | • VS Code extension stub• Slack `/evidence‑check` MVP• Linear labeler• UI polish session                                                                        |
| **Thu (Final)**    | • Product‑desc ingest• Dark mode• Security & pruning• 5‑min screencast + README                                                                                 |

---

### TL;DR

**Phase‑1 proves we can stop one bad feature before demo day — saving two engineering sprints — inside the tools teams already use.**

