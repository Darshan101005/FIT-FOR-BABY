# Fit for Baby - Project Documentation

## Complete Application Specification

### 1. PROJECT OVERVIEW
#### 1.1. Application Purpose
- **Primary Goal**: Mobile application for couples undergoing fertility treatment with obesity
- **Research Context**: Nursing department study tracking lifestyle interventions
- **Target Users**: Volunteer couples from embedded hospital, nursing researchers
#### 1.2. Technical Stack
- **Frontend**: React Native (Expo)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **APIs**: FitPro API for step count integration
- **Platforms**: iOS, Android, Mobile Web, Responsive Desktop
- **Languages**: English, Tamil

### 2. USER ROLES & PERMISSIONS
#### 2.1. Super Admin
- Create/delete Admin accounts
- Access all system features
- Set global application parameters
- View system analytics and usage reports
- Backup and restore database
#### 2.2. Admin (Nursing Researchers)
**User Management:**
- Enroll new couples with unique Couple ID
- Create individual Male/Female accounts under same couple
- Set temporary passwords with "Force Reset" flag
- Deactivate/reactivate user accounts
- Reset passwords via email OTP
- View all user profiles and edit basic information
**Study Configuration:**
- Set global goals applicable to all users:
  - Daily step count target (e.g., 3000, 7000, 10000 steps)
  - Weekly exercise minutes (e.g., 270 minutes total)
  - Couple walking duration (60 minutes, 3 days/week)
  - High knees exercise (30 minutes, 3 days/week)
- Define data collection periods per module:
  - Diet logging: Specify number of days (e.g., 5 days)
  - Exercise logging: Continuous or specific period
  - Weight tracking: Frequency (weekly, monthly)
**Monitoring & Reporting:**
- View all couples in expandable list format
- See individual male/female data separately
- Monitor compliance with goals (real-time tracking)
- Export data to CSV/Excel formats:
  - All user data with timestamps
  - Filter by date range, couple, specific metrics
- Send global broadcast notifications/reminders
#### 2.3. Male/Female Users (Volunteer Couples)
**Individual Accounts:**
- Separate login credentials for privacy
- Shared couple identity with individual data tracking
- Profile switching with password re-authentication
- Personal dashboards with shared couple overview

### 3. AUTHENTICATION & ONBOARDING
#### 3.1. Registration Flow
**Admin-Side Enrollment:**
1. Admin creates couple profile with:
   - Couple ID (auto-generated: C_001, C_002, etc.)
   - Enrollment date
   - Study group assignment (Study/Control)
2. Create individual accounts:
   - Male User: M_[CoupleID] (e.g., M_C001)
   - Female User: F_[CoupleID] (e.g., F_C001)
   - Personal email addresses (single or separate)
   - Phone numbers (individual)
   - Temporary passwords
   - "Force password reset" flag enabled
**User First Login:**
1. Enter provided credentials (email/phone + temp password)
2. Mandatory password reset with security requirements
3. Forced one-time comprehensive questionnaire
#### 3.2. Login System
**Credentials:**
- Login ID: Email or Phone Number (user choice)
- Password: User-set after initial reset
- "Remember me" option for convenience
**Security Features:**
- Forgot password flow with email OTP
- Session timeout after 30 minutes inactivity
- Automatic logout on app background/close
- Secure profile switching with password re-entry

### 4. COMPREHENSIVE QUESTIONNAIRE SYSTEM
#### 4.1. Implementation Details
**Technical:**
- JSON-based question bank (English & Tamil)
- Progress saving with resume capability
- Completion percentage tracking
- One-time mandatory completion
- Cannot skip or postpone
**Question Categories:**
**Demographic Information:**
- Personal details (name, age, contact)
- Education, occupation, income level
- Address and location details
**Medical History:**
- Type of infertility (Primary/Secondary)
- Duration of infertility attempts
- Previous treatments and outcomes
- Existing medical conditions
- Current medications
- Family medical history
**Anthropometric Baseline:**
- Height (cm/ft-in)
- Current weight (kg/lbs)
- Waist circumference
- Hip circumference
- Previous weight history
**Lifestyle Assessment:**
- Current physical activity level
- Dietary habits and preferences
- Sleep patterns and quality
- Stress levels and coping mechanisms
- Smoking, alcohol, substance use
**Fertility-Specific:**
- Menstrual cycle regularity (women)
- PCOS diagnosis or symptoms
- Sperm-related issues (men)
- Previous pregnancies/miscarriages
- Timing and frequency of intercourse

### 5. USER DASHBOARD - DETAILED SPECIFICATION
#### 5.1. Home Screen Layout
**Header Section:**
- Welcome message: "Hello, [Name]"
- Couple ID display
- Current date and time
- Notification bell with count indicator
- Profile picture/avatar placeholder
**Progress Overview Widget:**
- Today's completion status:
  - Steps: [current]/[target]
  - Exercises logged: [count]
  - Meals logged: [count]
  - Weight entries: [last entry date]
- Weekly progress bars for each metric
- Achievement badges for consistency
**Quick Action Buttons:**
- Large, accessible buttons:
  - "Log Food" (with meal icon)
  - "Log Exercise" (with dumbbell icon)
  - "Log Weight" (with scale icon)
  - "Log Appointment" (with calendar icon)
  - "View Progress" (with chart icon)
**Goal Tracking Cards:**
- Step Goal Card:
  - Circular progress bar
  - Current steps vs target
  - FitPro API sync status
  - Last sync timestamp
- Exercise Goal Card:
  - Weekly minute targets
  - Couple walking progress
  - High knees progress
  - Completion percentage
- Nutrition Goal Card:
  - Daily calorie target
  - Macronutrient balance
  - Water intake tracking
**Notification Center:**
- Admin broadcasts (priority highlighted)
- Personal reminders
- Study updates
- Achievement notifications
- Mark as read/clear all options
#### 5.2. Navigation Structure
**Bottom Navigation Bar:**
- Home (active dashboard)
- Logs (history view)
- Progress (charts & analytics)
- Messages (support chat)
- Profile (settings & account)
**Side Drawer Menu (Mobile):**
- All bottom nav items
- Additional options:
  - Switch Profile
  - Language Settings
  - Dark/Light Mode
  - Report Bug
  - Help & Support
  - Logout

### 6. DIET LOGGING MODULE - COMPLETE SPECIFICATION
#### 6.1. Meal Time Structure
**Daily Meal Framework:**
1. **Early Morning** (6:00 AM - 8:00 AM)
2. **Breakfast** (8:00 AM - 10:00 AM)
3. **Brunch** (10:00 AM - 11:30 AM)
4. **Lunch** (12:00 PM - 2:00 PM)
5. **Evening Snacks** (4:00 PM - 6:00 PM)
6. **Dinner** (7:00 PM - 9:00 PM)
7. **Bedtime** (9:00 PM - 11:00 PM)
#### 6.2. Food Database & Selection
**Cuisine Categories:**
**South Indian:**
- Breakfast Items:
  - Idli (per piece with sambar/chutney)
  - Dosa (plain, masala, ghee)
  - Pongal
  - Upma
  - Puttu
  - Appam
- Rice Items:
  - Plain rice
  - Lemon rice
  - Tamarind rice
  - Curd rice
  - Biryani
- Curries & Sides:
  - Sambar (cup)
  - Rasam (cup)
  - Various vegetable curries
  - Chicken curry
  - Fish curry
- Snacks:
  - Vada
  - Bonda
  - Bajji
  - Murukku
**North Indian:**
- Breads:
  - Roti/Chapati (per piece)
  - Paratha (plain, stuffed)
  - Naan
  - Kulcha
- Rice Dishes:
  - Plain rice
  - Pulao
  - Biryani
  - Fried rice
- Curries:
  - Dal (multiple types)
  - Paneer dishes
  - Chicken curry
  - Mutton curry
  - Vegetable dishes
- Snacks:
  - Samosa
  - Kachori
  - Pakora
  - Chaat items
**Beverages:**
- Tea (with/without sugar, milk)
- Coffee (filter, instant)
- Milk (full cream, toned, skim)
- Juices (fresh, packaged)
- Buttermilk/Lassi
- Water intake tracking
**International & Fusion:**
- Chinese dishes
- Continental items
- Fast food options
- Fusion cuisine
#### 6.3. Food Entry Interface
**Selection Flow:**
1. **Choose Meal Time** → Pre-populated with current time suggestion
2. **Select Cuisine Category** → South Indian/North Indian/International/etc.
3. **Choose Food Item** → Searchable dropdown with images
4. **Specify Quantity**:
   - Portion sizes: Full, Half, Quarter
   - Standard measures: Cups (1/4, 1/2, 1, etc.)
   - Milliliter equivalents (auto-calculated)
   - Pieces count (for items like idli, chapati)
5. **Custom Entry Option**:
   - Free text input for unlisted items
   - Manual calorie estimation
   - Save custom items for future use
**Nutrition Calculation:**
- Automatic calorie calculation from database
- Macronutrient breakdown (Carbs, Protein, Fat)
- Micronutrient estimation where available
- Running daily total display
- Weekly average calculation
#### 6.4. Data Collection Management
**Admin-Controlled Periods:**
- Configurable logging duration (e.g., 5 days, 7 days, continuous)
- Start/end dates for intensive tracking
- Notification when period begins/ends
- Automatic stop of reminders after period completion

### 7. EXERCISE TRACKING MODULE
#### 7.1. Step Count Integration
**FitPro API Implementation:**
- Automatic background step counting
- Daily step goal progress tracking
- Historical data visualization
- Sync status indicators
- Manual step entry fallback option
#### 7.2. Manual Exercise Logging
**Couple Walking:**
- Date and time selection
- Duration input (minutes)
- Intensity level (Light, Moderate, Vigorous)
- Notes field (weather, location, feelings)
- Partner participation confirmation
**High Knees (Aerobic Exercise):**
- Session date and time
- Duration completed
- Perceived exertion scale (1-10)
- Completion status (Full, Partial, Skipped)
- Notes for variations or modifications
**Other Exercise Types:**
- Yoga/Pranayama
- Strength training
- Swimming
- Cycling
- Custom exercise entries
#### 7.3. Goal Tracking & Compliance
**Weekly Targets:**
- Total exercise minutes: 270 minutes/week
- Couple walking: 180 minutes (3×60 minutes)
- High knees: 90 minutes (3×30 minutes)
- Progressive goal adjustment:
  - Week 1-2: 7,000 steps/day
  - Week 3-4: 7,500 steps/day
  - Week 5-6: 8,000 steps/day
  - Week 7+: 10,000 steps/day

### 8. WEIGHT & MEASUREMENTS MODULE
#### 8.1. Data Entry Interface
**Weekly Weight Tracking:**
- Weight input (kg/lbs with conversion)
- Date and time of measurement
- Measurement context (fasting, after meal, etc.)
- Progress from previous entry
- Goal weight indication
**Body Measurements:**
- Waist circumference
- Hip circumference
- Automatic WHtR calculation
- Monthly measurement reminders
**Auto-Calculated Metrics:**
- BMI calculation with category indication
- WHtR ratio with health risk assessment
- Weight change trends
- Progress toward 5% weight loss goal

### 9. COUNSELLING & APPOINTMENT MODULE
#### 9.1. Session Logging
**Appointment Scheduling:**
- Date and time selection
- Appointment type:
  - Doctor consultation
  - Nursing counselling
  - Research follow-up
  - Support session
- Location details (hospital, nursing college)
- Purpose of visit
- Reminder settings
**Session Completion:**
- Attendance confirmation
- Session notes (user perspective)
- Emotional state tracking
- Follow-up actions
- Next appointment scheduling
#### 9.2. Support System
**Nursing Team Access:**
- View upcoming appointments
- Schedule follow-up sessions
- Send session reminders
- Track attendance patterns

### 10. PROGRESS ANALYTICS & REPORTING
#### 10.1. User-Facing Analytics
**Dashboard Charts:**
- Step count trends (daily, weekly, monthly)
- Weight progress graph
- Exercise completion rates
- Nutrition intake patterns
- Goal achievement history
**Achievement System:**
- Consistency badges (7-day streak, etc.)
- Goal completion certificates
- Progress milestones
- Social sharing options (optional)
#### 10.2. Admin Analytics
**Compliance Monitoring:**
- Real-time participation rates
- Goal achievement percentages
- Data logging completeness
- User engagement metrics
**Export Capabilities:**
- Full dataset export (CSV, Excel)
- Filtered exports by date range, couples, metrics
- Automated scheduled reports
- Data visualization exports

### 11. NOTIFICATION & REMINDER SYSTEM
#### 11.1. Reminder Types
**User-Set Custom Reminders:**
- Meal logging reminders
- Exercise time alerts
- Weight measurement prompts
- Appointment notifications
- Custom personal reminders
**Admin Broadcasts:**
- Study updates and announcements
- Goal adjustments
- Data collection period notifications
- Important deadline reminders
- General encouragement messages
#### 11.2. Delivery Methods
- Push notifications
- In-app message center
- Email summaries (daily/weekly)
- SMS fallback for critical alerts

### 12. SUPPORT & COMMUNICATION SYSTEM
#### 12.1. In-App Chat Support
**Direct Messaging:**
- Real-time chat with nursing team
- File attachment capability (images, documents)
- Message read receipts
- Chat history preservation
- Emergency contact information
**Bug Reporting:**
- Screenshot capture and annotation
- Error log automatic attachment
- Priority level selection
- Follow-up tracking

### 13. SETTINGS & PREFERENCES
#### 13.1. Account Settings
**Profile Management:**
- View personal information (read-only)
- Change password functionality
- Update contact preferences
- Account deletion request
**Application Preferences:**
- Dark/Light mode toggle
- Notification preferences
- Data sync settings
- Language selection (English/Tamil)
**Privacy Controls:**
- Data sharing preferences
- Research participation consent
- Contact information visibility

### 14. TECHNICAL IMPLEMENTATION DETAILS
#### 14.1. API Integrations
**Firebase Services:**
- Authentication (email/password, OTP)
- Firestore (real-time data sync)
- Storage (file attachments)
- Cloud Messaging (push notifications)
- Analytics (usage tracking)

### 15. RESPONSIVE DESIGN SPECIFICATIONS
#### 15.1. Breakpoint Strategy
**Mobile First (320px - 768px):**
- Single column layouts
- Bottom navigation
- Collapsible sections
- Touch-optimized controls
**Tablet (768px - 1024px):**
- Two-column layouts where appropriate
- Enhanced navigation
- More detailed data visualizations
**Desktop (1024px+):**
- Multi-column dashboards
- Side navigation
- Advanced filtering and sorting
- Bulk operations capability
#### 15.2. Cross-Platform Consistency
- Unified design language across all platforms
- Platform-specific navigation patterns
- Consistent iconography and typography
- Adaptive component sizing

### 16. DATA VALIDATION & ERROR HANDLING
#### 16.1. Input Validation
**Range Checking:**
- Weight: 30-200 kg (with warnings for extreme values)
- Height: 100-250 cm
- Steps: 0-50,000 per day (with sanity checks)
- Exercise duration: 0-240 minutes per session
**Format Validation:**
- Email format verification
- Phone number formatting
- Date range validity
- Numerical input sanitization
#### 16.2. Error Recovery
- Auto-save draft functionality
- Offline data queuing
- Sync conflict resolution
- Data integrity checks

### 17. DEPLOYMENT & MAINTENANCE
#### 17.1. Release Strategy
- Staged rollout to user groups
- A/B testing for new features
- Backward compatibility maintenance
- User feedback incorporation process
#### 17.2. Monitoring & Analytics
- Usage pattern tracking
- Performance metrics monitoring
- Error rate tracking and alerting
- User satisfaction surveys

This comprehensive specification provides nano-scale details for every aspect of the Fit for Baby application, ensuring complete coverage of all features, user flows, and technical requirements for successful development and deployment.

## Q&A Summary

### PROJECT OVERVIEW
**Q:** What is this app for?  
**A:** Mobile app for couples undergoing fertility treatment to track health metrics for nursing department research. Volunteers use app daily, researchers monitor progress.

### USER ROLES
**Q:** How many user types?  
**A:** Three roles:  
- Super Admin: Create/delete admins  
- Admin (Nursing): Manage couples, set goals, view data  
- Male/Female Users: Volunteer couples with separate logins

### LOGIN SYSTEM
**Q:** How does login work?  
**A:**  
- Email/phone + password  
- First login: forced password reset  
- Profile switching with password lock  
- Forgot password via email OTP

### ONBOARDING
**Q:** What happens after signup?  
**A:** Mandatory one-time questionnaire (English/Tamil) - must complete 100%, can save progress.

### APP NAVIGATION
**Q:** What's the bottom navigation?  
**A:** 5 sections:  
1. Home - Dashboard with goals & quick actions  
2. Logs - History of all entries  
3. Progress - Charts & analytics  
4. Messages - Chat with nursing team  
5. Profile - Settings & account

### DIET TRACKING
**Q:** How does food logging work?  
**A:**  
- Meal times: Early morning, breakfast, brunch, lunch, evening snacks, dinner, bedtime  
- Food selection: South Indian, North Indian categories with dropdowns + manual entry  
- Quantity in cups/ml/pieces  
- Auto-calorie calculation

### EXERCISE TRACKING
**Q:** What exercises to track?  
**A:**  
- Couple Walking: 60 minutes, 3 days/week  
- High Knees: 30 minutes, 3 days/week  
- Step counting (manual/device)  
- All manual duration entries

### GOAL SETTING
**Q:** Who sets goals?  
**A:** Admin sets global goals:  
- Step counts (3000, 7000, 10000)  
- Exercise minutes (270 weekly)  
- Weight loss (5% in 12 weeks)  
- Data collection periods (e.g., 5 days diet logging)

### DATA COLLECTION
**Q:** What data is tracked?  
**A:** All from PDF forms:  
- Anthropometric (height, weight, waist, hip)  
- BMI/WHtR calculations  
- Nutrient intake  
- Exercise logs  
- Counselling appointments  
- Clinical data

### PRIVACY & SECURITY
**Q:** How is privacy handled?  
**A:**  
- Male/female separate logins  
- Individual data privacy  
- Profile switching with password  
- Admin cannot view passwords

### TECHNICAL
**Q:** What platforms?  
**A:** React Native (Expo) - mobile app, mobile web, responsive desktop  
**Q:** Backend?  
**A:** Firebase for auth, database, storage  
**Q:** Offline support?  
**A:** Yes, data syncs when back online

### ADMIN FEATURES
**Q:** What can admins do?  
**A:**  
- Enroll couples (create male/female accounts)  
- Set global goals and data periods  
- View all data in expandable lists  
- Export to Excel  
- Send broadcast notifications  
- Monitor compliance

### USER FEATURES
**Q:** What can users do?  
**A:**  
- Log daily: food, exercise, weight, appointments  
- View progress charts  
- Chat with nursing team  
- Set personal reminders  
- Switch profiles with password  
- Dark/light mode

### NOTIFICATIONS
**Q:** What notifications?  
**A:**  
- Admin broadcasts  
- Personal reminders  
- Goal achievements  
- Study updates

### SUPPORT
**Q:** Help features?  
**A:**  
- In-app chat with nursing team  
- Bug reporting  
- Language: English/Tamil  
- Report issues