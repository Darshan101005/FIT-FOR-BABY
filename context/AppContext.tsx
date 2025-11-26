import React, { createContext, useContext, useState, ReactNode } from 'react';

// User Types
export interface User {
  id: string;
  coupleId: string;
  email: string;
  phone: string;
  name: string;
  gender: 'male' | 'female';
  role: 'user' | 'admin' | 'superadmin';
  profileImage?: string;
  isFirstLogin: boolean;
  questionnaireCompleted: boolean;
  questionnaireProgress: number;
  createdAt: Date;
  lastActive: Date;
}

// Questionnaire Types
export interface QuestionnaireAnswer {
  questionId: string;
  answer: string | string[] | number | boolean;
  answeredAt: Date;
}

export interface QuestionnaireProgress {
  currentSection: number;
  currentQuestion: number;
  totalSections: number;
  totalQuestions: number;
  answers: QuestionnaireAnswer[];
  startedAt: Date;
  lastUpdatedAt: Date;
  isCompleted: boolean;
  canResume: boolean;
}

// Diet Logging Types
export interface FoodItem {
  id: string;
  name: string;
  nameInTamil?: string;
  category: 'south-indian' | 'north-indian' | 'international' | 'beverages' | 'snacks' | 'custom';
  subCategory: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultServingSize: number;
  servingUnit: string;
  image?: string;
}

export interface MealEntry {
  id: string;
  userId: string;
  date: Date;
  mealTime: 'early-morning' | 'breakfast' | 'brunch' | 'lunch' | 'evening-snacks' | 'dinner' | 'bedtime';
  foods: {
    foodItem: FoodItem;
    quantity: number;
    unit: 'full' | 'half' | 'quarter' | 'cup' | 'pieces' | 'ml';
    customCalories?: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
}

// Exercise Types
export interface ExerciseEntry {
  id: string;
  userId: string;
  date: Date;
  type: 'couple-walking' | 'high-knees' | 'yoga' | 'strength' | 'swimming' | 'cycling' | 'other';
  duration: number; // in minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  steps?: number;
  caloriesBurned?: number;
  partnerParticipated?: boolean;
  perceivedExertion?: number; // 1-10
  notes?: string;
}

export interface StepCount {
  id: string;
  userId: string;
  date: Date;
  steps: number;
  source: 'manual' | 'fitpro' | 'device';
  syncedAt?: Date;
}

// Weight & Measurements Types
export interface WeightEntry {
  id: string;
  userId: string;
  date: Date;
  weight: number; // in kg
  context?: 'fasting' | 'after-meal' | 'evening' | 'other';
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  waistCircumference?: number; // in cm
  hipCircumference?: number; // in cm
  height?: number; // in cm
  bmi?: number;
  whtr?: number;
}

// Appointment Types
export interface Appointment {
  id: string;
  userId: string;
  coupleId: string;
  date: Date;
  time: string;
  type: 'doctor' | 'nursing' | 'research' | 'support';
  location: string;
  purpose: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  reminderEnabled: boolean;
  notes?: string;
  followUpDate?: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'broadcast' | 'achievement' | 'study-update' | 'system';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: {
    type: 'image' | 'document';
    url: string;
    name: string;
  }[];
}

// Goals Types
export interface DailyGoals {
  stepCount: number;
  exerciseMinutes: number;
  waterIntake: number;
  mealsToLog: number;
}

export interface WeeklyGoals {
  totalExerciseMinutes: number;
  coupleWalkingMinutes: number;
  coupleWalkingDays: number;
  highKneesMinutes: number;
  highKneesDays: number;
  weightLossPercentage: number;
}

// Settings Types
export interface UserSettings {
  language: 'english' | 'tamil';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    mealReminders: boolean;
    exerciseReminders: boolean;
    appointmentReminders: boolean;
  };
  privacy: {
    shareDataWithResearch: boolean;
    showProfileToPartner: boolean;
  };
}

// Context State
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  questionnaireProgress: QuestionnaireProgress | null;
  dailyGoals: DailyGoals;
  weeklyGoals: WeeklyGoals;
  settings: UserSettings;
  notifications: Notification[];
  unreadNotificationCount: number;
}

interface AppContextType extends AppState {
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  updateQuestionnaireProgress: (progress: QuestionnaireProgress) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  logout: () => void;
}

const defaultDailyGoals: DailyGoals = {
  stepCount: 7000,
  exerciseMinutes: 45,
  waterIntake: 8,
  mealsToLog: 7,
};

const defaultWeeklyGoals: WeeklyGoals = {
  totalExerciseMinutes: 270,
  coupleWalkingMinutes: 180,
  coupleWalkingDays: 3,
  highKneesMinutes: 90,
  highKneesDays: 3,
  weightLossPercentage: 5,
};

const defaultSettings: UserSettings = {
  language: 'english',
  theme: 'light',
  notifications: {
    push: true,
    email: true,
    sms: false,
    mealReminders: true,
    exerciseReminders: true,
    appointmentReminders: true,
  },
  privacy: {
    shareDataWithResearch: true,
    showProfileToPartner: true,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionnaireProgress, setQuestionnaireProgress] = useState<QuestionnaireProgress | null>(null);
  const [dailyGoals] = useState<DailyGoals>(defaultDailyGoals);
  const [weeklyGoals] = useState<WeeklyGoals>(defaultWeeklyGoals);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const updateQuestionnaireProgress = (progress: QuestionnaireProgress) => {
    setQuestionnaireProgress(progress);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setQuestionnaireProgress(null);
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        questionnaireProgress,
        dailyGoals,
        weeklyGoals,
        settings,
        notifications,
        unreadNotificationCount,
        setUser,
        setIsAuthenticated,
        setIsLoading,
        updateQuestionnaireProgress,
        updateSettings,
        addNotification,
        markNotificationRead,
        clearNotifications,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
