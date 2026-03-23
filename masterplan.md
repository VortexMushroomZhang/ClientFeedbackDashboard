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

**Secondary**

- Engineering
- CX team

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
  - Related theme
  - Owning department
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
  - Manual prioritization by management
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
  - Defines origin (survey, interview, CX log, etc.)
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

#### **Themes Page**

- Filter pills for quick category filtering
- Long list card of all themes
- Each card shows:
  - Theme name
  - Metric count + trend indicator
  - Category tag
  - Linked feedback count
  - Possibility to create action

#### **Feedback Page**

- Shows all feedback items in a full list
- Can be filtered by theme
- Empty state when no selection

#### **Actions Page**

- Track action items and progress
- Empty state (ready for implementation)

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
