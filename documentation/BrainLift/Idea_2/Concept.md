# DeskResearcher – Concept Document (BrainLift Format)

## 🧭 Purpose

DeskResearcher helps frontend and full-stack developers build features based on real user needs—not just founder whims or PM guesses. It pulls feedback from tools like Slack, Intercom, and Linear, summarizes the signals with AI, and shows actionable insights while you work.

By bridging the gap between engineering and user context, DeskResearcher eliminates the “build it and pray” approach and replaces it with data-grounded focus.

---

## 👥 Experts

- **Frontend Developers** working inside feature codebases, often relying on vague Jira tickets or PM summaries.
- **Full-Stack Devs** building UX-impacting features who rarely get to see user pain firsthand.
- **Solo Developers** who juggle Discord feedback, bug reports, analytics, and user interviews themselves.
- **Tech Leads** responsible for evaluating whether work aligns with business or user goals.

---

## 🧠 Spiky POVs

- **“Code should be informed by user reality, not PM theory.”**
- **“If you’re shipping features without user signals, you’re flying blind.”**
- **“User feedback shouldn’t live in a dozen tools devs never check.”**
- **“Developers shouldn’t need to become analysts to know what users want.”**

---

## 🔀 Feature Scope by Phase

### 🛠 Phase 1 – Core Functionality (Early Submission)

**Scope:**  
Build a functioning proof-of-concept that delivers real value in <4 days and meets grading expectations:

#### ✅ Core Features
- **Tray/Desktop UI**: Cross-platform Electron or Tauri app with a minimal insight feed.
- **Authentication Setup**:
  - OAuth 2.0 for Slack & Intercom (read-only)
  - API Key input for Linear
  - Local 256-bit AES token storage
- **Real-Time Feedback Sync**:
  - Pull recent items from Slack #feedback channels, Intercom chats, and Linear issues
  - Store summarized feedback locally
- **LLM-Powered Summary Engine**:
  - Cluster feedback by topic or feature keyword
  - Generate concise summaries per feature/cluster
- **Focus Context Integration**:
  - Detect open files/folders (via VS Code extension or filename mapping)
  - Match file/module to user-facing feature names
  - Display related user insights in the tray popup

---

### ✨ Phase 2 – Polished Version (Optional Polish & Extra Credit)

**Scope:**  
Demonstrate polish, UX empathy, and extensibility for future growth.

#### 🧩 Enhancements
- **Weekly Digest View**:
  - Auto-generate a weekly PDF or Markdown summary of “Top 3 areas users mention”
- **Sentiment Tags & Severity Heatmap**:
  - Tag clusters as [Bug], [Feature Req], [Confusion], etc.
  - Color-code impact based on frequency
- **VS Code Inline Hover** (Extra Credit):
  - Show recent feedback when hovering over a function/filename if matched to a known feature
- **Local Privacy Dashboard**:
  - Let user anonymize, redact, or purge synced data
- **Mock Analytics Integration**:
  - Add stub GA/Amplitude API for showing feature usage counts alongside qualitative feedback

---

## ✅ Grading Alignment

| Requirement                    | Addressed In Phase |
|-------------------------------|---------------------|
| Desktop-native productivity   | Phase 1             |
| Intelligent automation (LangGraph/LLM) | Phase 1         |
| Connects to user data sources | Phase 1             |
| Offers personal utility       | Phase 1             |
| Clear privacy model + config  | Phase 1             |
| Advanced UX polish            | Phase 2 (optional)  |

---

## 📦 Deliverables

- Working desktop app (Tauri or Electron)
- Config panel with secure OAuth/API Key flows
- Live demo showing syncing and summary logic
- Optional: VS Code plugin, PDF digest, inline insights

