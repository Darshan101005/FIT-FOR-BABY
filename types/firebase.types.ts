// ============================================
// FIT FOR BABY - COMPLETE FIRESTORE SCHEMA
// TypeScript Types & Interfaces
// ============================================

import { Timestamp } from 'firebase/firestore';

// ============================================
// COMMON TYPES
// ============================================

export type UserRole = 'user' | 'admin' | 'superadmin';
export type Gender = 'male' | 'female' | 'other';
export type PregnancyTrimester = 'first' | 'second' | 'third';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous';
export type AppointmentType = 'doctor' | 'nurse' | 'counsellor';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'missed';
export type SupportRequestType = 'call' | 'video';
export type SupportRequestStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type NotificationType = 'reminder' | 'appointment' | 'message' | 'achievement' | 'system';
export type ConnectionStatus = 'pending' | 'connected' | 'disconnected';

// ============================================
// USER COLLECTION
// Path: /users/{userId}
// ============================================

export interface User {
  // Basic Info
  uid: string;
  email: string;
  phone: string;
  role: UserRole;
  
  // Profile
  firstName: string;
  lastName: string;
  displayName: string;
  profilePicture?: string; // Storage URL
  dateOfBirth?: Timestamp;
  gender?: Gender;
  
  // Pregnancy Info
  pregnancyStartDate?: Timestamp;
  expectedDueDate?: Timestamp;
  currentTrimester?: PregnancyTrimester;
  weeksPregnant?: number;
  
  // Physical Stats
  height?: number; // in cm
  prePregnancyWeight?: number; // in kg
  currentWeight?: number; // in kg
  bloodType?: string;
  
  // Health Goals
  dailyStepGoal: number;
  weeklyStepGoal: number;
  dailyCalorieGoal: number;
  targetWeight?: number;
  
  // App Settings
  pinEnabled: boolean;
  pinHash?: string;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  
  // Partner Connection
  partnerId?: string;
  partnerConnectionCode?: string;
  partnerConnectionCodeExpiry?: Timestamp;
  
  // Questionnaire
  questionnaireCompleted: boolean;
  questionnaireCompletedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
  deviceTokens?: string[]; // For push notifications
}

// ============================================
// STEPS SUBCOLLECTION
// Path: /users/{userId}/steps/{stepId}
// ============================================

export interface StepEntry {
  id: string;
  userId: string;
  
  // Step Data
  date: string; // YYYY-MM-DD format for easy querying
  stepCount: number;
  
  // Proof (optional)
  proofImageUrl?: string;
  proofType?: 'camera' | 'gallery';
  
  // Source
  source: 'manual' | 'device' | 'healthkit' | 'googlefit';
  
  // Timestamps
  loggedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Daily aggregated steps (for quick access)
export interface DailyStepsSummary {
  id: string; // Same as date: YYYY-MM-DD
  userId: string;
  date: string;
  totalSteps: number;
  goalMet: boolean;
  entries: number; // Count of individual entries
  lastUpdated: Timestamp;
}

// ============================================
// FOOD LOGS SUBCOLLECTION
// Path: /users/{userId}/foodLogs/{logId}
// ============================================

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string; // 'g', 'ml', 'piece', 'cup', etc.
  calories: number;
  protein?: number; // in grams
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface FoodLog {
  id: string;
  userId: string;
  
  // Log Data
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foods: FoodItem[];
  
  // Totals
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  
  // Optional
  notes?: string;
  imageUrl?: string;
  
  // Timestamps
  loggedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Daily food summary
export interface DailyFoodSummary {
  id: string; // Same as date
  userId: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsLogged: number;
  goalMet: boolean;
  lastUpdated: Timestamp;
}

// ============================================
// WEIGHT LOGS SUBCOLLECTION
// Path: /users/{userId}/weightLogs/{logId}
// ============================================

export interface WeightLog {
  id: string;
  userId: string;
  
  // Weight Data
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  
  // Calculated
  bmi?: number;
  weightChange?: number; // Change from previous entry
  
  // Optional
  notes?: string;
  
  // Timestamps
  loggedAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// EXERCISE LOGS SUBCOLLECTION
// Path: /users/{userId}/exerciseLogs/{logId}
// ============================================

export interface ExerciseLog {
  id: string;
  userId: string;
  
  // Exercise Data
  date: string; // YYYY-MM-DD
  exerciseType: string; // 'walking', 'yoga', 'swimming', etc.
  duration: number; // in minutes
  intensity: ExerciseIntensity;
  
  // Calculated
  caloriesBurned?: number;
  
  // Optional
  notes?: string;
  proofImageUrl?: string;
  
  // Timestamps
  loggedAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// APPOINTMENTS SUBCOLLECTION
// Path: /users/{userId}/appointments/{appointmentId}
// ============================================

export interface Appointment {
  id: string;
  userId: string;
  
  // Appointment Details
  type: AppointmentType;
  date: Timestamp;
  time: string; // "10:00 AM"
  
  // Provider Info
  providerName?: string; // Doctor/Nurse/Counsellor name
  providerId?: string;
  location?: string;
  
  // Purpose
  purpose?: string;
  notes?: string;
  
  // Status
  status: AppointmentStatus;
  
  // Reminders
  reminderSent: boolean;
  reminderTime?: Timestamp;
  
  // For nurse visits (auto-scheduled)
  isAutoScheduled: boolean;
  visitNumber?: number; // For nurse visits (1, 2, 3...)
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// ============================================
// MESSAGES SUBCOLLECTION
// Path: /users/{userId}/messages/{messageId}
// ============================================

export interface Message {
  id: string;
  
  // Participants
  userId: string; // User who owns this message
  senderId: string;
  senderType: 'user' | 'admin' | 'support' | 'system';
  senderName: string;
  
  // Conversation
  conversationId: string; // Group messages by conversation
  threadId?: string; // For reply threads
  
  // Content
  text: string;
  attachments?: MessageAttachment[];
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;
  
  // Timestamps
  sentAt: Timestamp;
  createdAt: Timestamp;
}

export interface MessageAttachment {
  type: 'image' | 'document' | 'audio';
  url: string;
  name: string;
  size?: number;
}

// ============================================
// ADMINS COLLECTION
// Path: /admins/{adminId}
// ============================================

export interface Admin {
  uid: string;
  email: string;
  phone?: string;
  
  // Profile
  firstName: string;
  lastName: string;
  displayName: string;
  profilePicture?: string;
  
  // Role & Permissions - owner is the main account holder
  role: 'admin' | 'superadmin' | 'owner';
  permissions: AdminPermissions;
  
  // Department
  department?: string; // 'nursing', 'counselling', 'management'
  
  // Status
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  
  // Password (stored for small-scale project - superadmin reference only)
  password?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  
  // Created by (for audit)
  createdBy?: string;
}

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canViewReports: boolean;
  canSendNotifications: boolean;
  canManageAppointments: boolean;
  canAccessMonitoring: boolean;
  canManageContent: boolean;
}

// ============================================
// QUESTIONNAIRE RESPONSES COLLECTION
// Path: /questionnaireResponses/{responseId}
// ============================================

export interface QuestionnaireResponse {
  id: string;
  userId: string;
  
  // Response Data
  responses: QuestionResponse[];
  
  // Calculated Results
  riskLevel?: 'low' | 'medium' | 'high';
  recommendations?: string[];
  
  // Status
  isComplete: boolean;
  
  // Timestamps
  startedAt: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface QuestionResponse {
  questionId: string;
  questionText: string;
  answer: string | string[] | number | boolean;
  category: string;
}

// ============================================
// NURSE VISITS COLLECTION
// Path: /nurseVisits/{visitId}
// ============================================

export interface NurseVisit {
  id: string;
  
  // User Info
  userId: string;
  userName: string;
  userPhone: string;
  
  // Visit Details
  visitNumber: number;
  scheduledDate: Timestamp;
  scheduledTime: string;
  
  // Nurse Assignment
  nurseId?: string;
  nurseName: string;
  
  // Status
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed';
  
  // Notes (filled after visit)
  visitNotes?: string;
  healthObservations?: string;
  recommendations?: string;
  
  // Vitals recorded during visit
  vitalsRecorded?: {
    weight?: number;
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// ============================================
// SUPPORT REQUESTS COLLECTION
// Path: /supportRequests/{requestId}
// ============================================

export interface SupportRequest {
  id: string;
  
  // User Info
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  
  // Couple Info (for admin context)
  coupleId?: string;
  coupleName?: string;
  userGender?: 'male' | 'female';
  
  // Request Details
  type: SupportRequestType;
  reason?: string;
  preferredTime?: string;
  editedPhone?: string; // User-edited phone number if different from profile
  
  // Video Call
  videoUrl?: string; // Jitsi meet URL sent by admin
  videoUrlSentAt?: Timestamp;
  
  // Status
  status: SupportRequestStatus;
  
  // Cancellation
  cancelledBy?: 'user' | 'admin';
  cancelReason?: string;
  
  // Assignment
  assignedTo?: string; // Admin/Support staff ID
  assignedName?: string;
  
  // Resolution
  notes?: string;
  resolvedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// NOTIFICATIONS COLLECTION
// Path: /notifications/{notificationId}
// ============================================

export interface Notification {
  id: string;
  
  // Target
  userId: string;
  
  // Content
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>; // Additional data for deep linking
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;
  
  // Push notification
  pushSent: boolean;
  pushSentAt?: Timestamp;
  
  // Scheduling
  scheduledFor?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  createdBy?: string; // Admin who created it
}

// ============================================
// PARTNER CONNECTIONS COLLECTION
// Path: /partnerConnections/{connectionId}
// ============================================

export interface PartnerConnection {
  id: string;
  
  // Users
  userId: string; // Primary user (pregnant mother)
  partnerId: string; // Partner
  
  // Connection Details
  connectionCode: string;
  status: ConnectionStatus;
  
  // Permissions
  partnerCanView: {
    steps: boolean;
    food: boolean;
    weight: boolean;
    appointments: boolean;
    progress: boolean;
  };
  
  // Timestamps
  requestedAt: Timestamp;
  connectedAt?: Timestamp;
  disconnectedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// APP SETTINGS COLLECTION (Admin managed)
// Path: /settings/{settingId}
// ============================================

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: Timestamp;
  updatedBy?: string;
}

// Example settings:
// - nurse_visit_interval_days: 28
// - default_step_goal: 8000
// - default_calorie_goal: 2200
// - app_version_required: "1.0.0"
// - maintenance_mode: false

// ============================================
// GLOBAL SETTINGS (Admin managed goals)
// Path: /settings/globalSettings
// ============================================

export interface GlobalSettings {
  // Exercise Goals (applies to both male and female)
  dailySteps: number; // Default: 7000 steps
  coupleWalkingMinutes: number; // Default: 60 mins/session
  highKneesMinutes: number; // Default: 30 mins/session
  dailyCaloriesBurnt: number; // Default: 200 kcal
  
  // Calculated weekly goals (daily * 7)
  weeklySteps: number;
  weeklyCoupleWalkingMinutes: number;
  weeklyHighKneesMinutes: number;
  
  // Data Collection Periods (optional)
  dataCollectionPeriods?: {
    dietLogging?: {
      startDate: string; // YYYY-MM-DD
      endDate: string;
    };
    exerciseFrequency?: {
      frequency: string; // 'daily', 'weekly'
      startDate: string;
    };
    weightTracking?: {
      frequency: string; // 'daily', 'weekly', 'monthly'
      reminderEnabled: boolean;
    };
  };
  
  // Timestamps
  updatedAt: Timestamp;
  updatedBy?: string; // Admin UID who updated
}

// ============================================
// DOCTOR VISITS COLLECTION (Logged by Users)
// Path: /couples/{coupleId}/doctorVisits/{visitId}
// ============================================

export type DoctorVisitStatus = 'upcoming' | 'completed' | 'cancelled';

export interface DoctorVisit {
  id: string;
  
  // Couple & User Info
  coupleId: string;
  gender: 'male' | 'female'; // Who logged this visit
  loggedBy: string; // User name who logged
  
  // Visit Details
  date: string; // YYYY-MM-DD
  time: string; // "10:00 AM"
  doctorName?: string;
  purpose?: string;
  location?: string;
  
  // Status
  status: DoctorVisitStatus;
  
  // Notes
  notes?: string;
  
  // Timestamps
  loggedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// NURSING DEPARTMENT VISITS COLLECTION (Scheduled by Admin)
// Path: /couples/{coupleId}/nursingVisits/{visitId}
// ============================================

export type NursingVisitStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed';

export interface NursingDepartmentVisit {
  id: string;
  
  // Couple Info
  coupleId: string;
  coupleName: string; // "Male Name & Female Name"
  
  // Visit Details
  date: string; // YYYY-MM-DD
  time: string; // "10:00 AM"
  visitNumber?: number; // Visit #1, #2, etc.
  
  // Department Assignment
  departmentName?: string; // e.g., "Nursing Department"
  assignedNurse?: string;
  location?: string;
  
  // Status
  status: NursingVisitStatus;
  
  // Purpose & Notes
  purpose?: string;
  notes?: string;
  
  // Admin who scheduled
  scheduledBy: string; // Admin UID
  scheduledByName?: string;
  
  // Completion details (filled after visit)
  completedAt?: Timestamp;
  completionNotes?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// FAQ COLLECTION
// Path: /faqs/{faqId}
// ============================================

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string; // 'general', 'health', 'app', 'appointments'
  order: number; // For sorting
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// COLLECTION PATHS (for reference)
// ============================================

export const COLLECTIONS = {
  USERS: 'users',
  ADMINS: 'admins',
  COUPLES: 'couples',
  QUESTIONNAIRE_RESPONSES: 'questionnaireResponses',
  NURSE_VISITS: 'nurseVisits',
  SUPPORT_REQUESTS: 'supportRequests',
  NOTIFICATIONS: 'notifications',
  PARTNER_CONNECTIONS: 'partnerConnections',
  SETTINGS: 'settings',
  FAQS: 'faqs',
  BROADCASTS: 'broadcasts',
  
  // Subcollections (under users)
  STEPS: 'steps',
  FOOD_LOGS: 'foodLogs',
  WEIGHT_LOGS: 'weightLogs',
  EXERCISE_LOGS: 'exerciseLogs',
  APPOINTMENTS: 'appointments',
  MESSAGES: 'messages',
  
  // Subcollections (under couples)
  DOCTOR_VISITS: 'doctorVisits',
  NURSING_VISITS: 'nursingVisits',
} as const;

// ============================================
// BROADCAST MESSAGE
// Path: /broadcasts/{broadcastId}
// ============================================

export type BroadcastStatus = 'draft' | 'sent' | 'scheduled';
export type BroadcastPriority = 'normal' | 'important' | 'urgent';

export interface Broadcast {
  id: string;
  
  // Content (limited to push notification standards)
  title: string; // Max 50 chars
  message: string; // Max 178 chars (standard push notification limit)
  
  // Metadata
  priority: BroadcastPriority;
  status: BroadcastStatus;
  
  // Sender info
  sentBy: string; // Admin ID
  sentByName: string; // Admin name
  
  // Timestamps
  createdAt: Timestamp;
  sentAt?: Timestamp;
  scheduledFor?: Timestamp;
  expiresAt?: Timestamp; // Optional expiry date - broadcast auto-hides after this
  updatedAt?: Timestamp; // For edit tracking
  
  // Stats
  totalRecipients?: number;
  readCount?: number;
}

// ============================================
// COUPLES COLLECTION (User Onboarding)
// Path: /couples/{coupleId}
// ============================================

export type CoupleUserStatus = 'pending' | 'active' | 'inactive';

export interface CoupleUser {
  id: string; // C_001_M or C_001_F
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  dateOfBirth?: string; // YYYY-MM-DD
  
  // Physical Stats (entered later by user)
  weight?: number;
  height?: number;
  bmi?: number;
  
  // Address (India-specific)
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  
  // Authentication (Firestore-based, no Firebase Auth)
  tempPassword?: string; // Initial 8-char password, cleared after reset
  password?: string; // User's password after reset
  pin?: string; // 4-digit PIN
  
  // Status flags
  status: CoupleUserStatus;
  isPasswordReset: boolean; // Has user reset their temp password?
  isPinSet: boolean; // Has user set their 4-digit PIN?
  
  // App Settings
  pushNotificationsEnabled?: boolean; // Default true
  
  // Timestamps
  lastLoginAt?: Timestamp;
  lastActive?: string; // For display purposes
}

export interface Couple {
  id: string; // Document ID (same as coupleId)
  coupleId: string; // C_001, C_002, etc.
  
  // Enrollment
  enrollmentDate: string; // YYYY-MM-DD
  enrolledBy: string; // Admin UID who enrolled
  enrolledByName?: string; // Admin name for display
  
  // Status
  status: 'active' | 'inactive';
  
  // Member details (each has their own tempPassword)
  male: CoupleUser;
  female: CoupleUser;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// STORAGE PATHS (for reference)
// ============================================

export const STORAGE_PATHS = {
  PROFILE_PICTURES: 'profilePictures', // /profilePictures/{userId}/{filename}
  STEP_PROOFS: 'stepProofs',           // /stepProofs/{userId}/{filename}
  FOOD_IMAGES: 'foodImages',           // /foodImages/{userId}/{filename}
  EXERCISE_PROOFS: 'exerciseProofs',   // /exerciseProofs/{userId}/{filename}
  MESSAGE_ATTACHMENTS: 'messageAttachments', // /messageAttachments/{conversationId}/{filename}
  ADMIN_UPLOADS: 'adminUploads',       // /adminUploads/{filename}
} as const;
