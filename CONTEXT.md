# 📋 Employee Portal CRM — Full Feature Context

> **Tech Stack**: Next.js 15 (App Router) · Local JSON DB (migrating to MongoDB) · Vanilla CSS · Light/Dark Theme  
> **Target**: `d:\Employee Tracker`

---

## 🏗️ Architecture Overview

```
employee-portal/
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout with theme provider
│   ├── page.js                 # Redirect to /login
│   ├── globals.css             # Global styles + CSS variables
│   ├── login/                  # Login page
│   ├── forgot-password/        # Password reset flow
│   └── dashboard/              # Protected area (layout + pages)
│       ├── layout.js           # Sidebar + topbar layout
│       ├── page.js             # Dashboard home
│       ├── workspace/          # Lead Roster, Add Lead, Email, Proof
│       ├── forms/              # All 6 form types
│       ├── history/            # Submission history
│       ├── leaderboard/        # Team leaderboard
│       ├── attendance/         # Attendance calendar
│       ├── suggestions/        # Suggestions to admin
│       ├── tasks/              # Assigned tasks
│       └── settings/           # Settings page
├── components/                 # Reusable UI components
├── lib/                        # Utilities, DB helpers, auth
├── data/                       # JSON database files
└── public/                     # Static assets
```

---

## 🔐 1. Authentication

### Login Page (`/login`)
- Email + Password fields
- "Remember Me" checkbox (persists session)
- Show/Hide password toggle (eye icon)
- Form validation (email format, required fields)
- Error messages with shake animation
- Redirect to `/dashboard` on success
- **No registration** — accounts created by admin only

### Forgot Password (`/forgot-password`)
- Step 1: Enter email address
- Step 2: OTP verification (6-digit code)
- Step 3: Set new password (strength indicator)
- Success confirmation with auto-redirect

---

## 📌 2. Sidebar Navigation

| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Dashboard | `/dashboard` |
| 💼 | Workspace | `/dashboard/workspace` |
| 📋 | Forms | `/dashboard/forms` |
| 📜 | Submission History | `/dashboard/history` |
| 🏆 | Team Leaderboard | `/dashboard/leaderboard` |
| 📅 | Attendance Calendar | `/dashboard/attendance` |
| 💡 | Suggestions | `/dashboard/suggestions` |
| 📨 | Assigned Tasks | `/dashboard/tasks` |
| ⚙️ | Settings | `/dashboard/settings` |

**Sidebar Features:**
- Collapsible on mobile (hamburger menu)
- Active route highlighting with animated indicator
- User avatar + name at top
- Logout button at bottom
- Smooth slide-in/out animation
- Hover tooltips when collapsed

---

## 🏠 3. Dashboard Home

### Welcome Banner
- "Welcome back, {Name}" greeting
- Department & Role display
- Today's date (formatted)
- Account data info badge

### Quick Stat Cards (5 cards, animated counters)
| Stat | Icon |
|------|------|
| My Total Leads | 👥 |
| Tasks Pending | 📋 |
| Deals Closed This Month | 💰 |
| Today's Calls & Emails | 📞 |
| Attendance Streak | 🔥 |

### Recent Activity Feed
- Last 5 form submissions
- Last 3 lead updates
- Last assigned task
- Timestamp + type badge for each

### Quick Actions Bar *(Additional Feature)*
- ➕ Add Lead
- 📋 Submit DAR
- ✉️ Compose Email
- 📅 Mark Attendance

### Logout Button
- Confirmation modal before logout

---

## 💼 4. Workspace

### 4.1 Lead Roster (`/dashboard/workspace`)
**Lead Table Columns:**
- Sr No with collapsible toggle (▶/▼)
- Company Name
- Contact Person
- Phone & Email
- Service Interested
- Status Badge (New / Contacted / Qualified / Proposal / Closed / Lost)
- Last Activity Date

**Expanded Row (Collapsible Activity Logs):**
- Timestamp
- Activity Type (Call / Email / Meeting / Note)
- Description
- Smooth CSS transition (max-height + opacity animation)

**Search & Filter:**
- Search by name/company (debounced)
- Filter by status (multi-select)
- Filter by date range (date picker)

**Row Actions:**
- ✏️ Edit Lead
- 🗑️ Delete Lead (with confirmation)
- ✉️ Send Email
- 📎 Submit Proof of Work

### 4.2 Add Lead (`/dashboard/workspace/add`)
**Fields:**
- Company Name*
- Contact Person Name*
- Phone Number*
- Email Address*
- Company Address
- Services Interested In (multi-select)
- Source of Lead (dropdown: Website / Referral / Cold Call / Social Media / Event / Other)
- Initial Notes (textarea)
- Priority Level (Low / Medium / High / Hot)

**Validation:**
- Required fields check
- Email format validation
- Phone format validation
- Duplicate check (by email/phone)

### 4.3 Compose Email (`/dashboard/workspace/email`)
**Email Composer:**
- To: Select from leads (searchable dropdown)
- Subject line
- Rich text body (bold, italic, lists, links)
- File attachments

**Email Templates:**
- Follow-up Template
- Introduction Template
- Proposal Template
- Custom Save (save as new template)

**Sent Email Log:**
- Date, Recipient, Subject, Status
- Open/Read tracking indicators

### 4.4 Proof of Work (`/dashboard/workspace/proof`)
**Submit Proof:**
- Select Lead (searchable dropdown)
- Activity Type (Call / Email / Meeting / Demo / Site Visit)
- Description/Notes
- Upload Screenshots (image preview)
- Upload Documents (PDF, DOC)

**Proof History:**
- Date Submitted
- Lead Name
- Attachments (clickable)
- Admin Review Status (Pending / Approved / Rejected)

---

## 📋 5. Forms Hub

### 5.1 Daily Activity Report (DAR)
| Field | Type |
|-------|------|
| Date | Date picker |
| Total Calls Made | Number |
| Total Emails Sent | Number |
| Demos Conducted | Number |
| New Leads Generated | Number |
| Follow-ups Done | Number |
| Deals in Pipeline | Number |
| Revenue Generated Today | Currency |
| Key Highlights | Textarea |
| Challenges Faced | Textarea |
| Plan for Tomorrow | Textarea |

### 5.2 Lead Entry Form
| Field | Type |
|-------|------|
| Company Name | Text |
| Contact Person | Text |
| Designation | Text |
| Phone & Email | Text + Email |
| Company Size | Dropdown |
| Industry | Dropdown |
| Services Interested | Multi-select |
| Budget Range | Dropdown |
| Lead Source | Dropdown |
| Lead Priority | Radio (Low/Med/High/Hot) |
| Initial Notes | Textarea |

### 5.3 Deal Closure Form
| Field | Type |
|-------|------|
| Client / Company Name | Text |
| Deal Title | Text |
| Deal Value / Pricing | Currency |
| Contract Duration | Dropdown |
| Services Sold | Multi-select |
| Payment Terms | Dropdown |
| Closure Date | Date |
| POC Details | Text |
| Contract Upload | File |
| Notes / Special Terms | Textarea |

### 5.4 Client Follow-up Log
| Field | Type |
|-------|------|
| Client / Lead Name | Searchable dropdown |
| Follow-up Date & Time | DateTime |
| Mode | Radio (Call/Email/Visit) |
| Discussion Summary | Textarea |
| Client Response / Mood | Emoji select |
| Next Action Required | Text |
| Next Follow-up Date | Date |
| Attachments | File upload |

### 5.5 Expense Report
| Field | Type |
|-------|------|
| Expense Date | Date |
| Category | Dropdown (Travel/Food/Client Meeting/Other) |
| Amount | Currency |
| Currency | Dropdown |
| Description | Text |
| Receipt Upload | File (Image/PDF) |
| Approval Status | Badge (Pending/Approved/Rejected) |

### 5.6 Attendance Entry
| Field | Type |
|-------|------|
| Date | Date (auto today) |
| Login Time | Time |
| Logout Time | Time |
| Total Hours | Auto-calculated |
| Work Mode | Radio (Office/Remote/Hybrid) |
| Tasks Completed Today | Textarea |
| Notes | Textarea |

---

## 📜 6. Submission History

### History Table
- Date Submitted
- Form Type (with icon)
- Status Badge (Submitted / Reviewed / Flagged)
- View Details button

### Filters
- By Form Type (dropdown)
- By Date Range (date picker)
- By Status (multi-select)

### Detail View (Modal/Slide-over)
- Full submitted data (read-only)
- Admin comments
- Timestamps (submitted, reviewed)

---

## 🏆 7. Team Leaderboard

### Leaderboard Table
- Rank with Medal Icons (🥇🥈🥉)
- Employee Name + Avatar
- Deals Closed
- Calls Made
- Follow-ups Done
- Total Score
- Trend Arrow (↑ Up / ↓ Down / — Same)

### Time Period Toggle
- This Week
- This Month
- This Quarter
- All Time

### My Position
- Highlighted row in table
- Personal stats card
- Rank change indicator (+2, -1, etc.)

---

## 📅 8. Attendance Calendar

### Monthly Calendar Grid
**Legend:**
| Color | Status |
|-------|--------|
| 🟢 Green | Present |
| 🔴 Red | Absent |
| 🟡 Yellow | On Leave |
| 🟠 Orange | Half Day |
| ⚪ Gray | Weekend |

**Navigation:** ← Prev Month | Current Month Year | Next Month →

**Day Cell:**
- Color-coded background
- Click for detail popup
- Login/Logout time tooltip on hover

### Monthly Summary Cards
- Present Count
- Absent Count
- On Leave Count
- Half Day Count
- Weekend Count
- Total Working Days

### Login Hours Table
| Column | Description |
|--------|-------------|
| Date | Calendar date |
| Login Time | Clock-in time |
| Logout Time | Clock-out time |
| Total Hours | Calculated |
| Overtime | Flag if > 9hrs |

**Month Totals:**
- Total Hours Worked
- Average per Day
- Overtime Hours

---

## 💡 9. Suggestions to Admin

### Submit New Suggestion
- Title
- Category (Process / Tool / Policy / Other)
- Description (rich text)
- Priority (Low / Medium / High)
- Attachments (file upload)

### My Suggestions History
- Date Submitted
- Title
- Status (Pending / Reviewed / Approved / Rejected)
- Admin Reply (expandable)

---

## 📨 10. Assigned Tasks

### Task List
- Task Title
- Description
- Priority Badge (Low / Medium / High / Urgent)
- Deadline Date
- Assigned Date
- Attached Files from Admin (downloadable)

### Task Actions
- Mark as In Progress
- Submit Completion Proof (file + notes)
- Mark as Complete
- Request Extension
- Add Comments (threaded)

### Filter Tasks
- By Status (Pending / In Progress / Completed / Overdue)
- By Priority
- By Date Range

---

## ⚙️ 11. Settings

### Change Password
- Current Password field
- New Password field
- Confirm New Password field
- Password Strength Indicator (bar + text)
- Validation Rules display

### Edit Profile
- Display Name (editable)
- Phone Number (editable)
- Profile Photo Upload (with crop)
- Department (read-only)
- Role (read-only)
- Email (read-only)

### Notification Preferences
- Email Notifications (toggle)
- Task Reminders (toggle)
- Leaderboard Updates (toggle)
- Attendance Alerts (toggle)

### Theme
- Light Mode
- Dark Mode
- System Default

---

## ✨ Additional Features (Researched)

### 🔔 Smart Notification Center
- Bell icon in topbar with badge count
- Real-time notifications for:
  - New task assigned
  - Task deadline approaching
  - Admin feedback on submissions
  - Leaderboard rank change
- Mark as read / Mark all as read

### 📊 Analytics Mini-Charts
- Sparkline charts in dashboard stat cards
- Weekly trend visualization
- Performance comparison chart

### ⌨️ Keyboard Shortcuts
- `Ctrl+K` — Quick search / command palette
- `Ctrl+N` — New lead
- `Ctrl+D` — Submit DAR
- `Esc` — Close modals

### 📝 Quick Notes Widget
- Sticky notes on dashboard
- Auto-save drafts
- Pin important notes

### 🔍 Global Search
- Search across leads, tasks, submissions
- Instant results with categorized sections
- Recent searches

### 📱 Responsive Design Breakpoints
| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Sidebar hidden, hamburger menu |
| Tablet | 768-1024px | Collapsed sidebar (icons only) |
| Desktop | > 1024px | Full sidebar |

---

## 🎨 Design System

### Color Palette
**Light Mode:**
- Primary: `#0e7490` (Cyan-700)
- Secondary: `#06b6d4` (Cyan-400)
- Background: `#f8fafc`
- Surface: `#ffffff`
- Text: `#0f172a`

**Dark Mode:**
- Primary: `#22d3ee` (Cyan-300)
- Secondary: `#06b6d4` (Cyan-400)
- Background: `#0f172a`
- Surface: `#1e293b`
- Text: `#f1f5f9`

### Typography
- Font: Inter (Google Fonts)
- Headings: 600-700 weight
- Body: 400 weight

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

---

## 🗄️ Local DB Schema (JSON Files)

### `data/users.json`
```json
[{
  "id": "u1",
  "name": "John Doe",
  "email": "john@company.com",
  "password": "hashed",
  "department": "Sales",
  "role": "Sales Executive",
  "phone": "+1234567890",
  "avatar": "/avatars/john.jpg",
  "createdAt": "2025-01-15"
}]
```

### `data/leads.json`
```json
[{
  "id": "l1",
  "userId": "u1",
  "companyName": "Acme Corp",
  "contactPerson": "Jane Smith",
  "phone": "+1987654321",
  "email": "jane@acme.com",
  "address": "123 Business St",
  "servicesInterested": ["Web Dev", "SEO"],
  "source": "Referral",
  "notes": "Interested in Q2 project",
  "priority": "High",
  "status": "Qualified",
  "activities": [],
  "createdAt": "2025-03-01",
  "updatedAt": "2025-03-15"
}]
```

### `data/submissions.json`
### `data/tasks.json`
### `data/attendance.json`
### `data/suggestions.json`
### `data/emails.json`
### `data/proofs.json`
### `data/leaderboard.json`

---

## 🚀 Migration Path to MongoDB

1. Replace JSON file reads/writes with Mongoose models
2. Add MongoDB connection string to `.env.local`
3. Create Mongoose schemas matching JSON structure
4. Update API routes to use Mongoose queries
5. Add indexes for performance
6. Implement proper authentication with JWT + bcrypt
