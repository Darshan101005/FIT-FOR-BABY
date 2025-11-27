Here is the fully integrated Fit for Baby - Complete Admin Web Portal Specification.

This version combines your original README requirements, the specific ID naming convention (_M / _F), and the new navigation structure for the Admin Home Page.

Fit for Baby - Complete Admin Web Portal Specification
1. ADMIN HOME PAGE (DASHBOARD)
Overview: The central landing page designed for rapid access to the four core nursing research functions.

1.1. Quick Action Navigation (Top Section)
Four prominent cards/buttons for immediate workflow access:

[+ Add New Users]

Function: Opens the "Enrollment Wizard".

Goal: Register a new couple into the study immediately.

[View Existing Users]

Function: Navigates to the searchable User Directory.

Goal: Manage profiles, reset passwords, or view specific couple details.

[Upload Daily Task]

Function: Navigates to the Task & Goal Configuration module.

Goal: Assign step goals, diet plans, or upload exercise videos for the day/week.

[Task Completion Status]

Function: Navigates to the Real-Time Compliance Monitor.

Goal: See who has (and hasn't) completed their logs for the day.

1.2. Dashboard Widgets (Bottom Section)
Today's Compliance Snapshot: A pie chart showing the % of the cohort that has completed all daily logs.

"At Risk" Alerts: A list of couples who haven't logged data for >48 hours.

2. USER MANAGEMENT MODULE
2.1. Add New Users (Enrollment Flow)
Trigger: Click [+ Add New Users] on Dashboard.

Step 1: Couple Profile

Couple ID: Auto-generated system ID (Format: C_001, C_002, etc.).

Enrollment Date: Date Picker.

Study Group: Dropdown (Study Group vs. Control Group).

Step 2: Individual Accounts

Male Account:

ID: Auto-generated as [CoupleID]_M (e.g., C_001_M).

Details: Name, Email, Phone.

Password: Auto-generate temp password (Force Reset enabled).

Female Account:

ID: Auto-generated as [CoupleID]_F (e.g., C_001_F).

Details: Name, Email, Phone.

Password: Auto-generate temp password (Force Reset enabled).

2.2. Existing Users Directory
Trigger: Click [View Existing Users] on Dashboard.

Interface:

Search/Filter: Search by Name, Couple ID (C_001), or Phone.

Expandable Table:

Row: Couple C_001 (Status: Active | Group: Study)

Sub-Row (Male): C_001_M | [Edit Profile] | [Reset Password] | [Deactivate]

Sub-Row (Female): C_001_F | [Edit Profile] | [Reset Password] | [Deactivate]

3. TASK & GOAL MANAGEMENT MODULE
3.1. Upload Daily Task
Trigger: Click [Upload Daily Task] on Dashboard.

Configuration Interface:

Task Category:

Global Goal: Update Step Target (e.g., Change from 7,000 to 8,000).

Content Upload: Upload Exercise Video (MP4) or Diet Chart (PDF).

Instruction: Text-based broadcast (e.g., "Remember to log fasting weight tomorrow").

Target Audience:

All Users: Apply to everyone.

Group Specific: Study Group Only / Control Group Only.

Couple Specific: Select specific Couple IDs.

Timing:

Date: "Set for Today" or "Schedule for [Date]".

3.2. Study Configuration (Global Settings)
Default Goals:

Steps: 3,000 / 7,000 / 10,000 progression.

Exercise: 270 mins/week.

Walking: 60 mins x 3 days.

High Knees: 30 mins x 3 days.

Data Collection Periods: Set "Active Diet Logging" windows (e.g., Start: Nov 1st, End: Nov 5th).

4. MONITORING & REPORTING MODULE
4.1. Task Completion Status
Trigger: Click [Task Completion Status] on Dashboard.

Visual Grid (Daily Log View):

Filters: Date Selector (Default: Today).

The Grid:

Rows: Couple IDs.

Columns: Male Steps | Female Steps | Male Diet | Female Diet | Exercise | Weight.

Status Indicators:

✅ Green Check: Target Met / Logged.

⚠️ Yellow Warning: Partially Logged (e.g., Steps < 50% of target).

❌ Red Cross: Not Logged.

⚪ Grey: Not applicable for today.

4.2. Data Export
Actions: [Export to CSV] | [Export to Excel].

Content: Full dump of user logs with timestamps (Food entries, Step counts from FitPro, Exercise minutes).

5. COMMUNICATION MODULE
Accessible via Sidebar or "At Risk" Alerts.

5.1. Nursing Support Chat
Inbox: View messages from volunteers.

Thread: View chat history by Couple ID.

Features: Attach files, Send "Counselling Appointment" invites.

5.2. Broadcast Messages
Function: Send push notifications to all users (e.g., "Server maintenance tonight" or "New Diet Plan Available").

6. SYSTEM ADMIN (Super Admin Only)
Manage Admins: Add/Remove Nursing Researchers.

Database: Backup/Restore functionality.