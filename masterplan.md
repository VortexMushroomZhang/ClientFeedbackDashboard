### 30-second elevator pitch

A calm, decision-ready dashboard that turns scattered client feedback into a single source of truth—so teams align, leaders prioritize confidently, and real UX issues get fixed.

---

### Problem & mission

**Problem**

- Client feedback lives in silos.
- Formats vary wildly (quotes, notes, surveys, interviews).
- Insights are hard to compare, prioritize, and act on.
- Progress is opaque across teams.

**Mission**

- Normalize all feedback into one shared structure.
- Surface what matters most—clearly and calmly.
- Support human decision-making, not replace it.

---

### Target audience

**Primary (daily users)**

- Product team
- Management / leadership
- Engineering

**Secondary**

- CX team
- CS team

**Shared need**

- One truth.
- No debates about data.
- Clear ownership and status.

---

### Core features (scannable)

- **Unified feedback ingestion**
  - Multiple sources → one normalized table
  - No matter the original format
- **Standardized feedback schema**
  - Date
  - Data source
  - Original quote
  - English translation
  - Feedback category
  - Thematic code
  - Thematic analysis
  - Sentiment
  - Handling department
  - Status
- **Insight dashboards**
  - Top 10 most-mentioned issues
  - New feedback since last check
  - Trending categories and themes
- **Analysis & synthesis**
  - Mention counts by category/theme
  - Hierarchical grouping of issues
  - Emerging vs recurring signals
- **Action & progress tracking**
  - Proposed action list (advisory)
  - Manual prioritization by team
  - Status visibility across teams

---

### High-level tech stack (conceptual)

- **Central database**
  - Fits structured, normalized records
  - Enables filtering, aggregation, and history
- **Ingestion layer**
  - Handles different formats gracefully
  - Maps all inputs to the same schema
- **Analytics layer**
  - Counts, trends, and comparisons
  - No black-box decision making
- **Dashboard UI**
  - Calm, scannable, decision-focused
  - Optimized for quick reviews, not deep training

---

### Conceptual data model (in words)

- **Feedback**
  - One row per feedback item
  - Always normalized, regardless of source
- **Source**
  - Defines origin (survey, interview, CX client feedback book, CS support ticket, feedback tooling, individuals)
- **Theme**
  - Groups multiple feedback items
  - Supports hierarchy (theme → sub-theme)
- **Action**
  - Linked to one or more themes
  - Owned by a department
  - Has a status and timeline

---

### UI design principles (Krug-aligned)

- Show **answers before controls**
- Default to **Top 10** view
- One screen = one question
- No charts without a clear takeaway
- Progress always visible without clicking

---

### Security & compliance notes

- Role-based access (view vs edit)
- Feedback immutability (original quote never altered)
- Audit trail for status changes
- Privacy-aware handling of interview data

---

## 📐 App Structure

### **1. Navigation Architecture**

```
┌──────────────────────----───────────────────┐
│  Sidebar (Fixed)        │   Main Content    │
│                         │                   │
│  ClientFeedback         │   Page Content    │
│  ├─ Overview            │   ├─ Header       │
│  ├─ Feedback list       │   ├─ Filters      │
│  ├─ Themes (active)     │   └─ Card Grid    │
│  └─ Actions             │                   │
│                         │                   │
│  [Last sync status]     │                   │
└─────────────────────----────────────────────┘
```

### **2. Page Structure**

#### **Overview Page** (Default)

- 4 stat cards showing key metrics
- Trending themes preview (top 3)
- Quick navigation to detailed views

#### **Themes -> Action Page**

- Filter pills for quick category filtering
- The new themes are on top, 

Left panel (Big section)
- Long list of all themes
- Each card shows:
  - Theme name
  - Metric count + trend indicator
  - Category tag
  - Linked feedback count
  - Department
  - Importance
  - Possibility to create action

Right panel (small section)
- Parallel to the themes, user review all the action suggestions (cards) given by AI.
- Action card shows:
  - Proposed action
  - Department
  - Status

Archive section
- Themes that have been handled by actions by departments.

#### **Feedback Page**

- Shows all feedback items in a full list
- Can be filtered by theme
- Can clear all filter to see full table
- Empty state when no selection

#### **Actions Page**

- Action table that shows
  - The action needed
  - Why: Related theme, example quotes
  - Handing department
  - Progress status
  - Notes left by department
- Empty state (ready for implementation)





### Key user flows
**User Flow 1**
- Data import
  - In the future, the platform can fetch the data directly from the different platforms.
  - For now, users who have access to that platform will be able to upload data sets.
  - User select the source: 
  - The datasets can be PDF files, .doc, .csv, Excel, text. There can be missing informations. There can be sensitive information that needs to be removed.
  - When user upload, AI should clean up the data and format the data first.
  

After the data cleaning process, AI can conduct the following analysis: translation to english, proposed category, theme code, proposed department, status, sentiment analysis.
- Data analysis
  - Step 1 — Category (what type of problem is it?)

  ┌───────────────┬─────────────────────────────────────────────────────────────────────────────┐
  │   Category    │                               What it covers                                │
  ├───────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ UX            │ Interface, usability, layout, flows, accessibility, navigation              │
  ├───────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ Communication │ Notifications, messaging clarity, pricing transparency, billing information │
  ├───────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ Engineering   │ Bugs, crashes, performance issues, authentication failures, data errors     │
  ├───────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ Feature       │ Requests for new capabilities or improvements to existing ones              │
  └───────────────┴─────────────────────────────────────────────────────────────────────────────┘

  Step 2 — Sub-type (refinement within the category)

  ┌───────────────┬─────────────────────┬─────────────────────────────────────────┐
  │   Category    │      Sub-type       │            Trigger condition            │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ UX            │ Clear solution      │ Problem is well-defined, fix is obvious │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ UX            │ Unclear issue       │ Problem is vague, needs investigation   │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Communication │ (none)              │ —                                       │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Engineering   │ (none)              │ —                                       │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Feature       │ Feature improvement │ Enhancing something that already exists │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Feature       │ New feature request │ Well-defined request for something new  │
  ├───────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Feature       │ Needs validation    │ Vague or unproven new feature idea      │
  └───────────────┴─────────────────────┴─────────────────────────────────────────┘

  Step 3 — Department (who owns it?)

  ┌──────────────────────────────────────┬──────────────────┐
  │         Category + Sub-type          │   Assigned to    │
  ├──────────────────────────────────────┼──────────────────┤
  │ UX — Clear solution                  │ UX Design        │
  ├──────────────────────────────────────┼──────────────────┤
  │ UX — Unclear issue                   │ UX Research      │
  ├──────────────────────────────────────┼──────────────────┤
  │ Communication                        │ Customer Service │
  ├──────────────────────────────────────┼──────────────────┤
  │ Engineering                          │ Engineering      │
  ├──────────────────────────────────────┼──────────────────┤
  │ Feature — improvement or new request │ Product          │
  ├──────────────────────────────────────┼──────────────────┤
  │ Feature — needs validation           │ UX Research      │
  └──────────────────────────────────────┴──────────────────┘

  Step 4 — Supporting fields (all set by Claude per item)

  ┌──────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    Field     │                                                                  Values                                                                   │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Sentiment    │ Negative / Neutral / Positive — inferred from text, or derived directly from mood rating (1–2 = Negative, 3 = Neutral, 4–5 = Positive) if │
  │              │  present in the source file                                                                                                               │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Priority     │ High / Medium / Low                                                                                                                       │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Thematic     │ Short uppercase slug e.g. SEARCH-REL, PAY-FAIL                                                                                            │
  │ code         │                                                                                                                                           │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Theme        │ 2–4 word group name; deduplicated against existing themes in a second Claude call                                                         │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Translation  │ English translation added if original is in another language                                                                              │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Analysis     │ 1–2 sentence expert interpretation of why it matters                                                                                      │
  └──────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


**User flow 2 - themes -> actions**

- User look at the themes generated by AI, user then also see the suggestions by AI next to it.
- User have the ability to reassign certain elements, eg. Importance, handling Department, rewrite theme code, reassign theme.

**User flow 3 - checking status**
- User check how is the current action status, give update on the actions.
  - eg. If action is done, theme is closed (handled), these themes will go to archive.
  - eg. if the action needs to go to another department, we'll create a follow up action on this action that will assign to another department.


**User flow 4 - Quick look**
- User check the lastest update since last login through dashboard.




### Logic
Feedback -> Theme -> Action
Table	Key fields	
	Important information:
  1. feedback  ──── theme_id ──▶  themes  ◀──── theme_id ──  actions
  2. theme_id is linked to: category, sub_type, department
  3. theme_id and related items are shared amongst all.	
feedback	Taken from uploaded file: 
  1. date, 
  2. source: Survey, Interview, CX log, CS ticket, feedback tooling, others
  3. orignal quote,
Generated: 
  1. translation (English)
  2. category: UX, Communication, Engineering, Feature
  3. sub_type, 
  4. theme_id, 
  5. department: Research, Design, Product, Customer Service, Engineering
  6. status: new, ongoing, archived
  7. sentiment: negative, neutral, positive	Status of feedback logic:
  1. New feedback that comes in, user see it the first time - new
  2. the theme_id is not archived - ongoing
  3. theme_id archived - archived
themes	  1. name = theme id
  2. category: UX, Communication, Engineering, Feature
  3. description, 
  4. mentions: counts of related feedback
  5. trend, 
  6. priority: low, medium, high
  7. Linked feedback
  8. Department: Research, Design, Product, Customer Service, Engineering
  9. Status: new, ongoing, archived	Status of theme logic:
  1. new theme formed, user see it the first time - new
  2. the theme_id is not archived - ongoing
  3. theme_id archived - archived
actions	  1. theme_id, 
  2. department 
  3. action title, 
  4. status: new, in progress, completed, blocked, out of scope 
  5. priority: same as theme, linked by theme_id
  6. notes, 
Others:
  1. parent_action_id	Action status → theme_id status
  1. new → new
  2. in progress, blocked → ongoing
  3. completed, out of scope → archived




### Phased roadmap

**MVP**

- Unified table
- Manual ingestion
- Core dashboard (Top 10, New, Status)

**V1**

- Thematic grouping
- Trend detection
- Action tracking

**V2**

- Smarter synthesis
- Cross-theme insights
- Historical comparisons

---

### Risks & mitigations

- **Overcomplexity**
  → Default views, progressive disclosure
- **Loss of nuance**
  → Always preserve original quote
- **Trust issues**
  → Transparent counts, no hidden logic

---

### Future expansion ideas

- Sentiment tagging (assistive, not authoritative)
- Alerts for sudden spikes
- Quarterly insight snapshots
- Exportable reports for leadership

