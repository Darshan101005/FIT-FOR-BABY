# FIT FOR BABY - Firebase Database Schema

## Overview

This document describes the complete Firebase database structure for the Fit for Baby application.

---

## 🔥 Firebase Services Used

| Service | Purpose |
|---------|---------|
| **Authentication** | User/Admin login, OTP, password reset |
| **Firestore** | All application data |
| **Storage** | Images (profile, step proofs, food photos) |

---

## 📊 Firestore Collections

### 1. Users Collection
**Path:** `/users/{userId}`

Stores all user (pregnant mothers) information.

```typescript
{
  uid: string,              // Firebase Auth UID
  email: string,
  phone: string,
  role: 'user',
  
  // Profile
  firstName: string,
  lastName: string,
  displayName: string,
  profilePicture?: string,  // Storage URL
  dateOfBirth?: Timestamp,
  gender?: 'male' | 'female' | 'other',
  
  // Pregnancy Info
  pregnancyStartDate?: Timestamp,
  expectedDueDate?: Timestamp,
  currentTrimester?: 'first' | 'second' | 'third',
  weeksPregnant?: number,
  
  // Physical Stats
  height?: number,          // cm
  prePregnancyWeight?: number,  // kg
  currentWeight?: number,   // kg
  bloodType?: string,
  
  // Goals
  dailyStepGoal: number,    // default: 8000
  weeklyStepGoal: number,   // default: 56000
  dailyCalorieGoal: number, // default: 2200
  
  // Settings
  pinEnabled: boolean,
  pinHash?: string,
  notificationsEnabled: boolean,
  darkModeEnabled: boolean,
  
  // Partner
  partnerId?: string,
  partnerConnectionCode?: string,
  
  // Status
  questionnaireCompleted: boolean,
  isActive: boolean,
  isVerified: boolean,
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt?: Timestamp
}
```

#### User Subcollections:

##### 1.1 Steps (`/users/{userId}/steps/{stepId}`)
```typescript
{
  date: string,           // "YYYY-MM-DD"
  stepCount: number,
  proofImageUrl?: string,
  source: 'manual' | 'device',
  loggedAt: Timestamp,
  createdAt: Timestamp
}
```

##### 1.2 Food Logs (`/users/{userId}/foodLogs/{logId}`)
```typescript
{
  date: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  foods: [{
    name: string,
    quantity: number,
    unit: string,
    calories: number,
    protein?: number,
    carbs?: number,
    fat?: number
  }],
  totalCalories: number,
  notes?: string,
  imageUrl?: string,
  loggedAt: Timestamp
}
```

##### 1.3 Weight Logs (`/users/{userId}/weightLogs/{logId}`)
```typescript
{
  date: string,
  weight: number,         // kg
  bmi?: number,
  weightChange?: number,
  notes?: string,
  loggedAt: Timestamp
}
```

##### 1.4 Exercise Logs (`/users/{userId}/exerciseLogs/{logId}`)
```typescript
{
  date: string,
  exerciseType: string,
  duration: number,       // minutes
  intensity: 'light' | 'moderate' | 'vigorous',
  caloriesBurned?: number,
  notes?: string,
  loggedAt: Timestamp
}
```

##### 1.5 Appointments (`/users/{userId}/appointments/{appointmentId}`)
```typescript
{
  type: 'doctor' | 'nurse' | 'counsellor',
  date: Timestamp,
  time: string,
  providerName?: string,
  location?: string,
  purpose?: string,
  status: 'scheduled' | 'completed' | 'cancelled',
  isAutoScheduled: boolean,
  visitNumber?: number,
  createdAt: Timestamp
}
```

##### 1.6 Messages (`/users/{userId}/messages/{messageId}`)
```typescript
{
  conversationId: string,
  senderId: string,
  senderType: 'user' | 'admin' | 'support',
  senderName: string,
  text: string,
  attachments?: [{
    type: 'image' | 'document',
    url: string,
    name: string
  }],
  isRead: boolean,
  sentAt: Timestamp
}
```

---

### 2. Admins Collection
**Path:** `/admins/{adminId}`

```typescript
{
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  displayName: string,
  role: 'admin' | 'superadmin',
  permissions: {
    canManageUsers: boolean,
    canManageAdmins: boolean,
    canViewReports: boolean,
    canSendNotifications: boolean,
    canManageAppointments: boolean,
    canAccessMonitoring: boolean
  },
  department?: string,
  isActive: boolean,
  createdAt: Timestamp,
  createdBy?: string
}
```

---

### 3. Nurse Visits Collection
**Path:** `/nurseVisits/{visitId}`

Auto-scheduled every 28 days.

```typescript
{
  userId: string,
  userName: string,
  userPhone: string,
  visitNumber: number,
  scheduledDate: Timestamp,
  scheduledTime: string,
  nurseId?: string,
  nurseName: string,
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled',
  visitNotes?: string,
  healthObservations?: string,
  vitalsRecorded?: {
    weight?: number,
    bloodPressure?: string,
    heartRate?: number
  },
  createdAt: Timestamp
}
```

---

### 4. Support Requests Collection
**Path:** `/supportRequests/{requestId}`

```typescript
{
  userId: string,
  userName: string,
  userPhone: string,
  type: 'call' | 'video',
  reason?: string,
  status: 'pending' | 'in-progress' | 'completed',
  assignedTo?: string,
  assignedName?: string,
  notes?: string,
  createdAt: Timestamp,
  resolvedAt?: Timestamp
}
```

---

### 5. Notifications Collection
**Path:** `/notifications/{notificationId}`

```typescript
{
  userId: string,
  type: 'reminder' | 'appointment' | 'message' | 'achievement',
  title: string,
  body: string,
  data?: object,
  isRead: boolean,
  readAt?: Timestamp,
  pushSent: boolean,
  createdAt: Timestamp
}
```

---

### 6. Questionnaire Responses Collection
**Path:** `/questionnaireResponses/{responseId}`

```typescript
{
  userId: string,
  responses: [{
    questionId: string,
    questionText: string,
    answer: string | string[] | number,
    category: string
  }],
  riskLevel?: 'low' | 'medium' | 'high',
  recommendations?: string[],
  isComplete: boolean,
  completedAt?: Timestamp
}
```

---

### 7. Partner Connections Collection
**Path:** `/partnerConnections/{connectionId}`

```typescript
{
  userId: string,           // Pregnant mother
  partnerId: string,        // Partner
  connectionCode: string,
  status: 'pending' | 'connected' | 'disconnected',
  partnerCanView: {
    steps: boolean,
    food: boolean,
    weight: boolean,
    appointments: boolean,
    progress: boolean
  },
  connectedAt?: Timestamp
}
```

---

### 8. Settings Collection (Admin Managed)
**Path:** `/settings/{settingId}`

```typescript
{
  key: string,
  value: any,
  description?: string,
  updatedAt: Timestamp,
  updatedBy?: string
}
```

Example settings:
- `nurse_visit_interval_days`: 28
- `default_step_goal`: 8000
- `default_calorie_goal`: 2200

---

### 9. FAQs Collection
**Path:** `/faqs/{faqId}`

```typescript
{
  question: string,
  answer: string,
  category: string,
  order: number,
  isActive: boolean
}
```

---

## 📁 Storage Structure

```
/profilePictures/{userId}/{filename}
/stepProofs/{userId}/{filename}
/foodImages/{userId}/{filename}
/exerciseProofs/{userId}/{filename}
/messageAttachments/{conversationId}/{filename}
/adminUploads/{filename}
```

---

## 🔒 Security Rules Summary

| Collection | Read | Write |
|------------|------|-------|
| users | Owner + Admin | Owner + Admin |
| users/subcollections | Owner + Admin | Owner + Admin |
| admins | Authenticated | Admin only |
| nurseVisits | Authenticated | Admin only |
| supportRequests | Owner + Admin | Create: Auth, Update: Admin |
| notifications | Owner + Admin | Create: Admin, Update: Owner |
| faqs | Public | Admin only |

---

## 🚀 Emulator Commands

```bash
# Start emulators
npm run emulators

# Start with data persistence
npm run emulators:import

# Deploy rules to production
npm run deploy:rules

# Deploy indexes
npm run deploy:indexes
```

---

## 📝 Notes

1. **Date Format**: Use `YYYY-MM-DD` string for date fields that need querying
2. **Timestamps**: Use Firestore `Timestamp` for datetime fields
3. **IDs**: Firebase auto-generates document IDs, stored in `id` field
4. **Soft Delete**: Use `isActive: false` instead of deleting documents
5. **Subcollections**: User-specific data stored in subcollections for better security rules
