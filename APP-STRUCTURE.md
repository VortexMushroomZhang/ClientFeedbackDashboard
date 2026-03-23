# Client Feedback Dashboard - App Structure

Based on masterplan.md requirements

---

## 🎯 Core Purpose

**A calm, decision-ready dashboard that turns scattered client feedback into a single source of truth.**

### Mission
- Normalize all feedback into one shared structure
- Surface what matters most—clearly and calmly
- Support human decision-making, not replace it

---

## 👥 Target Users

### Primary (Daily Users)
- **Product Team** - Needs to understand user pain points
- **Management/Leadership** - Needs to prioritize confidently

### Secondary
- **Engineering** - Needs to understand technical issues
- **CX Team** - Needs to track customer concerns

### Shared Need
- One truth
- No debates about data
- Clear ownership and status

---

## 📊 Standardized Feedback Schema

Every feedback item has:
1. **Date** - When feedback was received
2. **Data Source** - Survey, Interview, CX log, etc.
3. **Original Quote** - Raw feedback (immutable)
4. **English Translation** - If original is another language
5. **Feedback Category** - UX, Performance, Navigation, etc.
6. **Thematic Code** - Structured categorization
7. **Thematic Analysis** - Interpretation notes
8. **Related Theme** - Which theme this belongs to
9. **Owning Department** - Product, Engineering, CX
10. **Status** - New, In Review, Assigned, In Progress, Resolved

---

## 🗂️ Data Model

### **Feedback**
```
- ID
- Date
- Source (Survey, Interview, CX Log, etc.)
- Original Quote (immutable)
- Translation (if needed)
- Category (UX, Performance, Navigation, Business, etc.)
- Theme ID (foreign key)
- Department (Product, Engineering, CX)
- Status (New, In Review, Assigned, In Progress, Resolved)
- Sentiment (Negative, Neutral, Positive)
- Priority (Low, Medium, High)
```

### **Theme**
```
- ID
- Name (e.g., "Search & Filtering")
- Description
- Category
- Mention Count (calculated from feedback)
- Trend (Up, Down, Stable)
- Status (Active, Archived)
- Parent Theme ID (for hierarchy)
```

### **Action**
```
- ID
- Title
- Description
- Theme IDs (many-to-many)
- Owner (Department or Person)
- Status (Proposed, Approved, In Progress, Completed, Blocked)
- Priority (Low, Medium, High)
- Due Date
- Created Date
- Completed Date
```

---

## 🏗️ App Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar Navigation          │   Main Content Area      │
│                              │                          │
│  📊 Client Voice             │   ┌──────────────────┐  │
│                              │   │  Page Header     │  │
│  Navigation:                 │   │  - Title         │  │
│  ├─ 📈 Overview (default)    │   │  - Subtitle      │  │
│  ├─ 📝 All Feedback          │   │  - Actions       │  │
│  ├─ 🎯 Themes                │   └──────────────────┘  │
│  └─ ⚡ Actions               │                          │
│                              │   ┌──────────────────┐  │
│  Settings:                   │   │  Content Area    │  │
│  └─ ⚙️ Data Import           │   │  (varies by page)│  │
│                              │   └──────────────────┘  │
│  ─────────────────────       │                          │
│  Last sync: 2 min ago        │                          │
│  247 total feedback items    │                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 Page Breakdown

### **1. Overview (Default Landing Page)**

**Purpose:** Show answers before controls. Top 10 view by default.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Overview                                │
│ Your feedback dashboard at a glance     │
├─────────────────────────────────────────┤
│                                         │
│  Key Metrics (4 cards)                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───┐│
│  │  247   │ │   32   │ │   18   │ │ 8 ││
│  │ Total  │ │  New   │ │Progress│ │Thm││
│  └────────┘ └────────┘ └────────┘ └───┘│
│                                         │
│  Top 10 Most-Mentioned Issues           │
│  (Horizontal bars with mention counts)  │
│  ──────────────────────────────── 54    │
│  ─────────────────────────────── 49     │
│  ────────────────────────── 34          │
│  ...                                    │
│                                         │
│  New Feedback Since Last Check          │
│  (Timeline list, max 5 items)           │
│                                         │
│  Trending Categories                    │
│  (Simple bar chart or list)             │
└─────────────────────────────────────────┘
```

**Components:**
- **Key Metrics Cards**
  - Total Feedback Items (247)
  - New This Week (32)
  - In Progress (18)
  - Active Themes (8)

- **Top 10 Most-Mentioned Issues** (Client Voice style horizontal bars)
  - Rank # + Theme Name
  - Horizontal bar (width = % of max)
  - Mention count (54, 49, 34...)
  - Category tag
  - Status badge
  - Quick action button (→ Details)

- **New Feedback Widget**
  - Shows last 5 new items
  - Date + Source + Quote preview
  - "View All New →" link

- **Trending Categories**
  - Bar chart or simple list
  - Shows which categories are increasing

**Design Principles Applied:**
- ✅ Answers before controls (Top 10 shown immediately)
- ✅ Default to Top 10 view
- ✅ One screen = one question ("What needs attention?")
- ✅ Progress always visible (status badges on each item)

---

### **2. All Feedback (Full List)**

**Purpose:** Unified table of all normalized feedback. Single source of truth.

**Layout:**
```
┌─────────────────────────────────────────┐
│ All Feedback                            │
│ 247 feedback items | Last updated: 2m  │
├─────────────────────────────────────────┤
│  [Search]  [Filter: Source ▼] [Export] │
│                                         │
│  Table View:                            │
│  ┌────┬────────┬────────┬──────┬──────┐│
│  │Date│Source  │Quote   │Theme │Status││
│  ├────┼────────┼────────┼──────┼──────┤│
│  │5/14│Survey  │"Search │Search│New   ││
│  │    │        │ is..." │      │      ││
│  ├────┼────────┼────────┼──────┼──────┤│
│  │5/13│CX Log  │"Export │Data  │Review││
│  │    │        │ slow..."│Handle│      ││
│  └────┴────────┴────────┴──────┴──────┘│
│                                         │
│  [Pagination: 1 2 3 ... 10]            │
└─────────────────────────────────────────┘
```

**Features:**
- **Search Bar** - Search by keyword in quotes
- **Filters**
  - Source (Survey, Interview, CX Log, etc.)
  - Category (UX, Performance, Navigation, etc.)
  - Theme (dropdown of all themes)
  - Status (New, In Review, Assigned, etc.)
  - Date Range
  - Department
  - Sentiment

- **Table Columns** (sortable)
  - Date
  - Source
  - Original Quote (truncated, click to expand)
  - Translation (if applicable)
  - Category (tag)
  - Theme (linked)
  - Department (badge)
  - Status (badge)
  - Actions (view details, assign to theme)

- **Row Click** → Opens detail modal
  - Full quote
  - All metadata
  - Thematic analysis notes
  - Link to theme
  - Assign to action
  - Change status

- **Bulk Actions**
  - Select multiple items
  - Assign to theme
  - Change status
  - Export selection

**Design Principles Applied:**
- ✅ Show data immutability (original quote never altered)
- ✅ Transparent counts (247 items always visible)
- ✅ No black-box logic (all data visible)

---

### **3. Themes (Analysis & Synthesis)**

**Purpose:** Hierarchical grouping of issues. Mention counts by theme. Emerging vs recurring.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Themes                                  │
│ Grouped patterns across all feedback    │
├─────────────────────────────────────────┤
│  [Filter: Category ▼] [Sort: Mentions ▼]│
│                                         │
│  Theme List (Vertical, like Client Voice)│
│                                         │
│  #1  Search Feature                     │
│      ──────────────────────────── 54    │
│      [UX] [In Progress]                 │
│      2 feedback items | Create Action → │
│                                         │
│  #2  Customized Account View            │
│      ─────────────────────────── 49     │
│      [UX] [In Progress]                 │
│      5 feedback items | Create Action → │
│                                         │
│  #3  Payment Issues                     │
│      ────────────────────── 34          │
│      [Business] [New]                   │
│      3 feedback items | Create Action → │
│                                         │
│  ...                                    │
│                                         │
│  [View Archived Themes]                 │
└─────────────────────────────────────────┘
```

**Features:**
- **Theme Cards** (vertical list)
  - Rank number (#1, #2, #3...)
  - Theme name (bold, clickable)
  - Horizontal progress bar (width = mention %)
  - Mention count (54)
  - Category tag (UX, Performance, etc.)
  - Status badge (New, In Progress, Resolved)
  - Trend indicator (↗ Up, ↘ Down, → Stable)
  - Linked feedback count ("2 feedback items")
  - Quick action: "Create Action →" button

- **Click Theme → Detail View**
  - Theme description
  - All linked feedback items (quotes)
  - Mention trend over time (simple line chart)
  - Related themes (hierarchy)
  - Existing actions linked to this theme
  - "Create New Action" button

- **Hierarchical Grouping**
  - Parent themes can have sub-themes
  - Indent sub-themes visually
  - Example:
    - **Authentication** (parent)
      - Login Flow (sub-theme)
      - Password Reset (sub-theme)
      - Two-Factor Auth (sub-theme)

- **Emerging vs Recurring Signals**
  - Badge: "🆕 Emerging" (new this week)
  - Badge: "🔁 Recurring" (mentioned for 3+ weeks)
  - Trend arrow color:
    - Red ↗ = Increasing mentions (needs attention!)
    - Green ↘ = Decreasing mentions (improving)
    - Gray → = Stable

**Design Principles Applied:**
- ✅ Mention counts visible (transparent logic)
- ✅ Hierarchical grouping (parent → sub-themes)
- ✅ Emerging vs recurring (badges + trend indicators)
- ✅ Clear takeaway from charts (trend over time)

---

### **4. Actions (Tracking & Prioritization)**

**Purpose:** Proposed action list. Manual prioritization by management. Status visibility.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Actions                                 │
│ Track progress on proposed improvements │
├─────────────────────────────────────────┤
│  [+ New Action]  [Filter: Status ▼]     │
│                                         │
│  High Priority                          │
│  ┌─────────────────────────────────────┐│
│  │ Redesign mobile auth flow           ││
│  │ Linked: Authentication (54 mentions)││
│  │ Owner: Product Team | Due: Feb 28   ││
│  │ Status: [In Progress ▼]            ││
│  │ [View Details →]                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  Medium Priority                        │
│  ┌─────────────────────────────────────┐│
│  │ Improve search performance          ││
│  │ Linked: Search Feature (54)         ││
│  │ Owner: Engineering | Due: Mar 15    ││
│  │ Status: [Proposed ▼]                ││
│  └─────────────────────────────────────┘│
│                                         │
│  Low Priority                           │
│  ...                                    │
└─────────────────────────────────────────┘
```

**Features:**
- **Action Cards** (grouped by priority)
  - Title (editable)
  - Description (editable)
  - Linked themes (with mention counts)
  - Owner (department or person)
  - Status (Proposed → Approved → In Progress → Completed → Blocked)
  - Priority (High, Medium, Low) - draggable to reorder
  - Due date
  - Progress indicator (if applicable)

- **Status Workflow**
  ```
  Proposed → Approved → In Progress → Completed
              ↓
           Blocked
  ```

- **Click Action → Detail View**
  - Full description
  - All linked themes (with feedback quotes)
  - Owner assignment
  - Timeline (created, approved, started, completed)
  - Comments/notes
  - Status change history (audit trail)

- **Manual Prioritization**
  - Drag-and-drop to reorder within priority groups
  - Move between priority groups (High ↔ Medium ↔ Low)
  - Management can override suggested priorities

- **Kanban Board View (Alternative)**
  ```
  ┌─────────┬──────────┬───────────┬──────────┐
  │Proposed │ Approved │In Progress│Completed │
  ├─────────┼──────────┼───────────┼──────────┤
  │ Action 1│ Action 2 │ Action 3  │ Action 4 │
  │ Action 5│          │           │ Action 6 │
  └─────────┴──────────┴───────────┴──────────┘
  ```

**Design Principles Applied:**
- ✅ Status always visible (no clicking required)
- ✅ Manual prioritization (not automated)
- ✅ Advisory system (suggests, doesn't decide)
- ✅ Clear ownership (who is responsible)

---

### **5. Data Import (Settings)**

**Purpose:** Unified feedback ingestion from multiple sources.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Data Import                             │
│ Import feedback from various sources    │
├─────────────────────────────────────────┤
│  Supported Sources:                     │
│  ☑ Survey (CSV upload)                  │
│  ☑ Interview Notes (paste text)         │
│  ☑ CX Log (API integration)             │
│  ☑ Manual Entry                         │
│                                         │
│  [+ New Import]                         │
│                                         │
│  Recent Imports:                        │
│  ┌─────────────────────────────────────┐│
│  │ Survey_Q1_2026.csv                  ││
│  │ 14 items imported | May 14, 2025    ││
│  │ Status: ✓ Processed                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ CX_Interviews_Week20.txt            ││
│  │ 8 items imported | May 13, 2025     ││
│  │ Status: ✓ Processed                 ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Features:**
- **Upload Interface**
  - CSV upload (with column mapping)
  - Paste text (auto-detects format)
  - API integration setup
  - Manual entry form

- **Column Mapping**
  - Map source columns to schema fields
  - Save mapping templates for repeated imports

- **Validation**
  - Check required fields
  - Flag duplicates
  - Preview before import

- **Import History**
  - Date, source, count
  - Status (Processing, Completed, Failed)
  - View imported items
  - Rollback if needed

---

## 🎨 UI Design Principles (Applied)

### **1. Show Answers Before Controls**
- ✅ Overview page shows Top 10 immediately (no filtering needed)
- ✅ Key metrics visible at a glance
- ✅ Filters are secondary, not required

### **2. Default to Top 10 View**
- ✅ Overview is the landing page
- ✅ Top 10 themes shown by default
- ✅ "View All" is optional

### **3. One Screen = One Question**
- ✅ Overview: "What needs attention?"
- ✅ All Feedback: "What did customers say?"
- ✅ Themes: "What are the patterns?"
- ✅ Actions: "What are we doing about it?"

### **4. No Charts Without a Clear Takeaway**
- ✅ Horizontal bars show relative importance
- ✅ Trend arrows show direction (↗↘→)
- ✅ Timeline shows when new feedback arrived
- ✅ No decorative charts

### **5. Progress Always Visible Without Clicking**
- ✅ Status badges on every item
- ✅ Counts visible on all cards
- ✅ "Last sync" always shown
- ✅ No hidden information

---

## 🚀 MVP Feature Priority

### **Phase 1: Core Dashboard (MVP)**
- ✅ Overview page (Top 10 + key metrics)
- ✅ All Feedback (table view with filtering)
- ✅ Themes page (horizontal bars, mention counts)
- ✅ Manual data import (CSV upload)
- ✅ Basic status tracking

### **Phase 2: Actions & Collaboration**
- ✅ Actions page (full CRUD)
- ✅ Link themes to actions
- ✅ Status workflow
- ✅ Owner assignment
- ✅ Priority management

### **Phase 3: Advanced Analysis**
- ✅ Hierarchical themes (parent → sub-theme)
- ✅ Emerging vs recurring detection
- ✅ Trend analysis over time
- ✅ Sentiment tagging
- ✅ Cross-theme insights

### **Phase 4: Automation**
- ✅ API integrations for auto-import
- ✅ Alerts for sudden spikes
- ✅ Suggested theme assignments (AI-assisted)
- ✅ Exportable reports (PDF/CSV)

---

## 🔐 Security & Compliance

### **Role-Based Access**
- **Viewer** - Can see all data, no editing
- **Contributor** - Can add feedback, comment
- **Manager** - Can create actions, assign priorities
- **Admin** - Full access, settings, import

### **Data Immutability**
- Original quotes **never** altered
- All changes tracked in audit log
- Version history for actions/themes

### **Privacy**
- Interview data anonymized if needed
- PII flagged and protected
- Export controls based on role

---

## 📊 Success Metrics

### **For Product Team**
- Time to identify top issues: < 5 minutes
- Feedback reviewed per week: 100%
- Time from feedback to action: < 2 weeks

### **For Management**
- Confidence in prioritization decisions: High
- Cross-team alignment: Improved
- Visibility into progress: 100%

### **For Engineering**
- Clarity on user impact: High
- Time wasted on low-priority issues: Reduced
- Feedback loop: < 1 sprint

---

This structure supports the masterplan's mission: **Turn scattered feedback into a single source of truth, so teams align and real issues get fixed.**
