## Persona-Lens · High-Value User Stories  
*(each story exercises most of the feature stack)*

---

### **User Story 1 — Evidence Gate Before Sprint**

**As a** Solo Founder juggling product & code  
**I want** to know—_before I start building_—whether my new “Instant PDF Export” idea has enough real-user backing  
**So that** I don’t waste two days on a shiny object.

| Step | Interaction | Features Touched |
|------|-------------|------------------|
| 1 | Drag PRD markdown into the Tray UI. | #5 PRD Import |
| 2 | Persona-Lens triggers ingest, queries interview DB, returns **Evidence Score = 38/100** plus top persona quotes. | #6 Evidence Score · #4 DB |
| 3 | Tray flashes red badge; VS Code toast suggests “collect more Solo Founder evidence.” | #7 Tray UI · #15 Badge |
| 4 | Founder schedules 3 quick interviews ⇒ drops transcripts into `/interviews`. | #2 Watcher · #3 Classify |
| 5 | Score auto-recalculates to **78/100**; tray turns green. | #6, #15 |
| 6 | Uses tray **Persona Chat** to ask: “Does PDF matter more than CSV?” — bot answers with citations. | #8 Chat Bot |

**Acceptance Criteria**

* PRD upload returns score ≤ 40 when evidence is insufficient.  
* Score updates automatically when new interviews arrive.  
* Tray badge color reflects pass/fail threshold.  
* Persona Chat cites at least two interview snippets.

---

### **User Story 2 — In-Editor Persona Feedback**

**As a** Senior Front-end Dev at an agency  
**I want** to sanity-check CTA copy against the **Agency Marketer** persona while coding  
**So that** I ship persuasive text without waiting for PM review.

| Step | Interaction | Features Touched |
|------|-------------|------------------|
| 1 | Opens `CheckoutCTA.jsx`; types `/ask-persona "Is this CTA compelling?"` in VS Code. | #9 VS Code Command |
| 2 | Persona-Lens infers feature context, fetches top Agency Marketer quotes. | #16 Context Inference |
| 3 | Bot replies inline with refinement suggestions + evidence score 92/100. | #8 Chat Bot |
| 4 | Dev adjusts copy, re-runs command — score rises to 97. | Loop on #9 |

**Acceptance Criteria**

* Command works in any file and auto-selects relevant persona.  
* Response contains actionable copy tweaks and citation links.  
* Score improvement reflects updated code snippet.

---

### **User Story 3 — Weekly Evidence Health Check**

**As a** Product Manager overseeing three squads  
**I want** a Monday digest highlighting proposals with low persona evidence  
**So that** I can block risky tickets during sprint planning.

| Step | Interaction | Features Touched |
|------|-------------|------------------|
| 1 | n8n cron runs every Monday 8 AM. | #13 Slack Digest |
| 2 | Digest lists Linear tickets where Evidence Score < 60, grouped by persona. | #6 Evidence Score |
| 3 | Trend sparkline shows declining sentiment for “Solo Founder” on Reporting features. | #17 Sentiment Graph |
| 4 | PM clicks a ticket link → DeskResearcher opens with detailed quotes and auto-applies `persona:solo_founder 🟥` label. | #18 Linear Labeler |

**Acceptance Criteria**

* Slack message arrives by 8:05 AM local time.  
* Each ticket entry shows score, persona, and last-7-day trend arrow.  
* Clicking ticket opens DeskResearcher with pre-filtered evidence view.  
* Label is applied in Linear/Jira without manual action.

---
