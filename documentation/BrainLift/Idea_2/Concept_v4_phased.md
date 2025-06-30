# DeskResearcher — **Persona-Lens**  
_Refined Concept Roadmap (features listed in build order)_

---

## 🎯 Purpose
Deliver a desktop companion that **ingests customer-interview transcripts**, groups insights by **persona**, scores every new PRD for real-user evidence, and lets devs/PMs _chat_ with persona bots—all **before** and **during** coding.

---

## 🧩 Key Personas (starter set)
| ID | Name            | Primary Goal                   | Main Pain Point                     |
|----|-----------------|--------------------------------|-------------------------------------|
| `solo_founder` | Solo Founder      | Ship MVP fast with minimal overhead | Uncertain which features users value |
| `agency_marketer` | Agency Marketer | Optimize funnels, report ROI        | Rapid copy iteration & proof of ROI  |

---

## 🛠️ Build-Order Feature Stack

| # | Feature / Task | Why first? | Dependencies |
|---|----------------|-----------|--------------|
| **0** | **Project scaffold** (Electron/Tauri + LangGraph + n8n) | Foundation for UI & workflows | — |
| **1** | **Persona YAML loader** (`personas.yml`) | All later steps need persona metadata | 0 |
| **2** | **Interview file-watcher** (`/interviews` folder ➞ n8n trigger) | Minimal, local data source for evidence | 0 |
| **3** | **LangGraph embed & classify** <br>• Split transcript, create embeddings <br>• Assign each snippet to nearest persona | Populates evidence DB | 2 |
| **4** | **SQLite evidence store (AES-encrypted)** | Persist and secure persona snippets | 3 |
| **5** | **PRD importer (Markdown)** | Core user action to score evidence | 4 |
| **6** | **Evidence Score engine** <br>Score = (# snippets in last 60 d) × (recency weight) | First measurable output | 5 |
| **7** | **Tray UI** <br>• Upload PRD <br>• Display Evidence Score + top quotes | Earliest visible value | 6 |
| **8** | **Persona Chat bot (tray pop-up)** <br>Chat context = PRD + top persona quotes | Enables qualitative feedback | 4 |
| **9** | **VS Code command `/ask-persona`** | In-editor convenience | 8 |
| **10** | **Product-description ingest** (Markdown) | Adds context depth for chat | 5 |
| **11** | **Dark / light theme toggle** | Basic usability polish | 7 |
| **12** | **30-day auto-prune & audit log** | Meets security/compliance edge | 4 |
| **13** | **Weekly Slack digest: “Low-evidence proposals”** (n8n) | Proactive team visibility | 6 |
| **14** | **Multi-source ingest** <br>• App-store reviews <br>• Analytics CSV (Amplitude / GA) | Broadens evidence beyond interviews | 3 |
| **15** | **Proactive tray badge (red if Score < 60)** | Instant visual alert | 6 |
| **16** | **Smart context inference** <br>Map open file/module ➞ feature ➞ persona quotes | Real-time coding relevance | 9 |
| **17** | **Sentiment trend graph (Recharts)** | Wow-factor analytics | 14 |
| **18** | **Linear/Jira auto-labeler** (persona + severity) | Closes loop into issue tracker | 6 |

---

## 🚦 Phased Delivery Milestones

| Phase | Deadline | Must-have features (by #) | Nice-to-have (stretch) |
|-------|----------|---------------------------|------------------------|
| **Early Submission** | **Tue 8 PM** | 0-7 | — |
| **Final (polish)**   | **Thu 8 PM** | 8-12 | — |
| **Phase 2 “Wow”**    | post-sprint | 13-18 | Further persona sets, cloud sync, etc. |

---

## ⏱️ Day-by-Day Sprint Plan (Phase 1)

| Day | Target completions |
|-----|--------------------|
| **Mon** | 0 → 3 (scaffold, persona YAML, watcher, embed/classify) |
| **Tue AM** | 4 → 6 (DB, PRD import, Evidence Score) |
| **Tue PM** | 7 (Tray UI) **→ submit core demo** |
| **Wed** | 8 → 10 (Chat bot, VS Code cmd, product description) |
| **Thu** | 11 → 12 (theme polish, security, prune) + screencast |

---

## 📌 TL;DR  
Build the stack **in numbered order**—interviews → embeddings → evidence score → tray UI—then layer chat, IDE command, polish, and finally multi-source “wow” features. This roadmap feeds directly into your forthcoming PRD and keeps the 4-day sprint laser-focused.
