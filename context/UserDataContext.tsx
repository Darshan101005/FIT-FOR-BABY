import {
    broadcastService,
    chatService,
    coupleExerciseService,
    coupleFoodLogService,
    coupleService,
    coupleStepsService,
    CoupleWeightLog,
    coupleWeightLogService,
    doctorVisitService,
    formatDateString,
    globalSettingsService,
    nursingVisitService,
    questionnaireService
} from '@/services/firestore.service';
import {
    Broadcast,
    Chat,
    DoctorVisit,
    GlobalSettings,
    NursingDepartmentVisit,
    QuestionnaireProgress
} from '@/types/firebase.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UserInfo {
  coupleId: string;
  userId: string;
  userGender: 'male' | 'female';
  gender: 'male' | 'female'; // alias for userGender
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  weight: number;
  height: number;
  partnerName: string;
  partnerUserId: string;
  partnerId: string; // alias for partnerUserId
  partnerGender: 'male' | 'female';
  joinedAt: Date | null;
  pushNotificationsEnabled?: boolean;
  id?: string; // alias for userId
}

interface DailyData {
  steps: number;
  exerciseMinutes: number;
  exerciseCalories: number;
  foodLogCount: number;
}

interface WeeklyStats {
  totalSteps: number;
  totalExerciseMinutes: number;
  totalCalories: number;
  coupleWalkingMinutes: number;
  highKneesMinutes: number;
  daysLogged: number;
}

interface UserDataContextType {
  // Loading states
  isInitialLoading: boolean;
  isLoading: boolean; // alias for isInitialLoading
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  isInitialized: boolean; // alias for hasLoadedOnce
  
  // User info
  userInfo: UserInfo | null;
  
  // Global settings
  globalSettings: GlobalSettings | null;
  
  // Daily data cache (keyed by date string YYYY-MM-DD)
  dailyDataCache: { [dateString: string]: DailyData };
  
  // Weekly stats
  weeklyStats: WeeklyStats;
  
  // Weight history
  weightHistory: CoupleWeightLog[];
  
  // Appointments
  doctorVisits: DoctorVisit[];
  nursingVisits: NursingDepartmentVisit[];
  
  // Messages
  broadcasts: Broadcast[];
  reminders: Broadcast[];
  nursingChat: Chat | null;
  unreadBroadcastCount: number;
  chatUnreadCount: number;
  
  // Questionnaire
  questionnaireProgress: QuestionnaireProgress | null;
  questionnaire: QuestionnaireProgress | null; // alias
  
  // Streak data
  streakData: { currentStreak: number; longestStreak: number };
  streak: number; // alias for streakData.currentStreak
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshDailyData: (dateString?: string) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshDoctorVisits: () => Promise<void>; // alias for refreshAppointments
  refreshNursingVisits: () => Promise<void>; // alias for refreshAppointments
  refreshMessages: () => Promise<void>;
  refreshWeightHistory: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  getDailyData: (dateString: string) => DailyData;
  markBroadcastsAsRead: () => Promise<void>;
  
  // Setters for optimistic updates
  updateDailyData: (dateString: string, data: Partial<DailyData>) => void;
  addDoctorVisit: (visit: DoctorVisit) => void;
  updateDoctorVisit: (visitId: string, updates: Partial<DoctorVisit>) => void;
  deleteDoctorVisit: (visitId: string) => void;
  
  // Reminder actions
  dismissReminder: (reminderId: string) => void;
  clearAllReminders: () => void;
}

const defaultDailyData: DailyData = {
  steps: 0,
  exerciseMinutes: 0,
  exerciseCalories: 0,
  foodLogCount: 0,
};

const defaultWeeklyStats: WeeklyStats = {
  totalSteps: 0,
  totalExerciseMinutes: 0,
  totalCalories: 0,
  coupleWalkingMinutes: 0,
  highKneesMinutes: 0,
  daysLogged: 0,
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // User info
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // Global settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  
  // Daily data cache
  const [dailyDataCache, setDailyDataCache] = useState<{ [dateString: string]: DailyData }>({});
  
  // Weekly stats
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(defaultWeeklyStats);
  
  // Weight history
  const [weightHistory, setWeightHistory] = useState<CoupleWeightLog[]>([]);
  
  // Appointments
  const [doctorVisits, setDoctorVisits] = useState<DoctorVisit[]>([]);
  const [nursingVisits, setNursingVisits] = useState<NursingDepartmentVisit[]>([]);
  
  // Messages
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [reminders, setReminders] = useState<Broadcast[]>([]);
  const [nursingChat, setNursingChat] = useState<Chat | null>(null);
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  
  // Questionnaire
  const [questionnaireProgress, setQuestionnaireProgress] = useState<QuestionnaireProgress | null>(null);
  
  // Streak data
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  
  // Refs for cleanup
  const chatUnsubscribeRef = useRef<(() => void) | null>(null);
  const broadcastUnsubscribeRef = useRef<(() => void) | null>(null);
  
  // Dismissed reminder IDs - use both state and ref to avoid stale closure issues
  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>([]);
  const dismissedReminderIdsRef = useRef<string[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    dismissedReminderIdsRef.current = dismissedReminderIds;
  }, [dismissedReminderIds]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getDateStringsForRange = (days: number): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(formatDateString(date));
    }
    return dates;
  };

  // ============================================
  // DATA LOADING FUNCTIONS
  // ============================================

  const loadUserInfo = async (): Promise<UserInfo | null> => {
    try {
      const [coupleId, userGender, userName, userId] = await Promise.all([
        AsyncStorage.getItem('coupleId'),
        AsyncStorage.getItem('userGender'),
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userId'),
      ]);

      if (!coupleId || !userGender) return null;

      const couple = await coupleService.get(coupleId);
      if (!couple) return null;

      const user = couple[userGender as 'male' | 'female'];
      const partner = couple[userGender === 'male' ? 'female' : 'male'];

      return {
        coupleId,
        userId: userId || user.id,
        id: userId || user.id, // alias
        userGender: userGender as 'male' | 'female',
        gender: userGender as 'male' | 'female', // alias
        name: user.name || userName || 'User',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || null,
        weight: user.weight || 60,
        height: user.height || 165,
        partnerName: partner.name || 'Partner',
        partnerUserId: partner.id,
        partnerId: partner.id, // alias
        partnerGender: userGender === 'male' ? 'female' : 'male',
        joinedAt: couple.createdAt?.toDate ? couple.createdAt.toDate() : null,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
      };
    } catch (error) {
      console.error('Error loading user info:', error);
      return null;
    }
  };

  const loadDailyDataForDate = async (
    coupleId: string, 
    gender: 'male' | 'female', 
    dateString: string
  ): Promise<DailyData> => {
    try {
      const [totalSteps, exerciseTotals, foodLogs] = await Promise.all([
        coupleStepsService.getTotalForDate(coupleId, gender, dateString),
        coupleExerciseService.getTotalsForDate(coupleId, gender, dateString),
        coupleFoodLogService.getByDate(coupleId, gender, dateString),
      ]);

      return {
        steps: totalSteps,
        exerciseMinutes: exerciseTotals.duration,
        exerciseCalories: exerciseTotals.calories,
        foodLogCount: foodLogs.length,
      };
    } catch (error) {
      console.error(`Error loading daily data for ${dateString}:`, error);
      return defaultDailyData;
    }
  };

  const loadWeeklyStats = async (coupleId: string, gender: 'male' | 'female'): Promise<WeeklyStats> => {
    try {
      const dates = getDateStringsForRange(7);
      let totalSteps = 0;
      let totalExerciseMinutes = 0;
      let totalCalories = 0;
      let coupleWalkingMinutes = 0;
      let highKneesMinutes = 0;
      let daysLogged = 0;

      for (const dateString of dates) {
        const [steps, exerciseTotals] = await Promise.all([
          coupleStepsService.getTotalForDate(coupleId, gender, dateString),
          coupleExerciseService.getTotalsForDate(coupleId, gender, dateString),
        ]);

        totalSteps += steps;
        totalExerciseMinutes += exerciseTotals.duration;
        totalCalories += exerciseTotals.calories;
        // Note: coupleWalkingMinutes and highKneesMinutes would need separate tracking
        
        if (steps > 0 || exerciseTotals.duration > 0) {
          daysLogged++;
        }
      }

      return {
        totalSteps,
        totalExerciseMinutes,
        totalCalories,
        coupleWalkingMinutes,
        highKneesMinutes,
        daysLogged,
      };
    } catch (error) {
      console.error('Error loading weekly stats:', error);
      return defaultWeeklyStats;
    }
  };

  const loadAppointments = async (coupleId: string, gender: 'male' | 'female') => {
    try {
      const [doctor, nursing] = await Promise.all([
        doctorVisitService.getAll(coupleId, gender),
        nursingVisitService.getAll(coupleId),
      ]);
      return { doctorVisits: doctor, nursingVisits: nursing };
    } catch (error) {
      console.error('Error loading appointments:', error);
      return { doctorVisits: [], nursingVisits: [] };
    }
  };

  const loadMessages = async (coupleId: string, gender: 'male' | 'female') => {
    try {
      // Use user-specific key for dismissed reminders
      const dismissedKey = `@fitforbaby_dismissed_reminders_${coupleId}_${gender}`;
      const [activeBroadcasts, dismissedJson] = await Promise.all([
        broadcastService.getActive(),
        AsyncStorage.getItem(dismissedKey),
      ]);

      const dismissedIds = dismissedJson ? JSON.parse(dismissedJson) : [];
      setDismissedReminderIds(dismissedIds);
      dismissedReminderIdsRef.current = dismissedIds;

      // Separate reminders and broadcasts
      const remindersList = activeBroadcasts.filter(b => 
        (b.type === 'reminder' || b.type === undefined) && !dismissedIds.includes(b.id)
      );
      const broadcastsList = activeBroadcasts.filter(b => b.type === 'broadcast');

      // Calculate unread broadcasts
      const lastReadStr = await AsyncStorage.getItem('broadcasts_last_read_timestamp');
      const lastReadTime = lastReadStr ? parseInt(lastReadStr) : 0;
      const unreadCount = broadcastsList.filter(b => {
        const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt as any);
        return createdAt.getTime() > lastReadTime;
      }).length;

      return { 
        broadcasts: broadcastsList, 
        reminders: remindersList, 
        unreadBroadcastCount: unreadCount 
      };
    } catch (error) {
      console.error('Error loading messages:', error);
      return { broadcasts: [], reminders: [], unreadBroadcastCount: 0 };
    }
  };

  const loadWeightHistory = async (coupleId: string, gender: 'male' | 'female') => {
    try {
      const history = await coupleWeightLogService.getAll(coupleId, gender, 30);
      return history;
    } catch (error) {
      console.error('Error loading weight history:', error);
      return [];
    }
  };

  const loadQuestionnaire = async (coupleId: string, gender: 'male' | 'female') => {
    try {
      const progress = await questionnaireService.getProgress(coupleId, gender);
      return progress;
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      return null;
    }
  };

  const loadStreak = async (coupleId: string, gender: 'male' | 'female') => {
    try {
      const streak = await coupleService.initializeStreak(coupleId, gender);
      return streak;
    } catch (error) {
      console.error('Error loading streak:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  };

  // ============================================
  // SETUP REAL-TIME LISTENERS
  // ============================================

  const setupRealtimeListeners = (coupleId: string, gender: 'male' | 'female') => {
    // Clean up existing listeners
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
    }
    if (broadcastUnsubscribeRef.current) {
      broadcastUnsubscribeRef.current();
    }

    // Subscribe to chat for real-time updates
    const odAaByuserId = `${coupleId}_${gender === 'male' ? 'M' : 'F'}`;
    chatUnsubscribeRef.current = chatService.subscribe(odAaByuserId, (chat) => {
      setNursingChat(chat);
      setChatUnreadCount(chat?.unreadByUser || 0);
    });

    // Subscribe to broadcasts for real-time updates - use ref to avoid stale closure
    broadcastUnsubscribeRef.current = broadcastService.subscribeToRecent(7, (allBroadcasts) => {
      const currentDismissed = dismissedReminderIdsRef.current;
      const remindersList = allBroadcasts.filter(b => 
        (b.type === 'reminder' || b.type === undefined) && !currentDismissed.includes(b.id)
      );
      const broadcastsList = allBroadcasts.filter(b => b.type === 'broadcast');
      
      setReminders(remindersList);
      setBroadcasts(broadcastsList);
    });
  };

  // ============================================
  // MAIN LOAD FUNCTION
  // ============================================

  const loadAllData = useCallback(async (showLoading: boolean = true) => {
    if (showLoading && !hasLoadedOnce) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Load user info first
      const user = await loadUserInfo();
      if (!user) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        return;
      }
      setUserInfo(user);

      // CRITICAL: Load dismissed reminder IDs FIRST before anything else
      // This ensures real-time listeners will have the correct filter
      const dismissedKey = `@fitforbaby_dismissed_reminders_${user.coupleId}_${user.userGender}`;
      const dismissedJson = await AsyncStorage.getItem(dismissedKey);
      const dismissedIds = dismissedJson ? JSON.parse(dismissedJson) : [];
      setDismissedReminderIds(dismissedIds);
      dismissedReminderIdsRef.current = dismissedIds;

      // Load global settings
      const settings = await globalSettingsService.get();
      setGlobalSettings(settings);

      // Load data for the past 7 days (for home page date selector)
      const dateStrings = getDateStringsForRange(7);
      const dailyDataPromises = dateStrings.map(dateString => 
        loadDailyDataForDate(user.coupleId, user.userGender, dateString)
          .then(data => ({ dateString, data }))
      );

      // Load all data in parallel
      const [
        dailyDataResults,
        weeklyStatsResult,
        appointmentsResult,
        messagesResult,
        weightHistoryResult,
        questionnaireResult,
        streakResult,
      ] = await Promise.all([
        Promise.all(dailyDataPromises),
        loadWeeklyStats(user.coupleId, user.userGender),
        loadAppointments(user.coupleId, user.userGender),
        loadMessages(user.coupleId, user.userGender),
        loadWeightHistory(user.coupleId, user.userGender),
        loadQuestionnaire(user.coupleId, user.userGender),
        loadStreak(user.coupleId, user.userGender),
      ]);

      // Update daily data cache
      const newDailyDataCache: { [key: string]: DailyData } = {};
      dailyDataResults.forEach((result: { dateString: string; data: DailyData }) => {
        newDailyDataCache[result.dateString] = result.data;
      });
      setDailyDataCache(newDailyDataCache);

      // Update all state
      setWeeklyStats(weeklyStatsResult);
      setDoctorVisits(appointmentsResult.doctorVisits);
      setNursingVisits(appointmentsResult.nursingVisits);
      setBroadcasts(messagesResult.broadcasts);
      setReminders(messagesResult.reminders);
      setUnreadBroadcastCount(messagesResult.unreadBroadcastCount);
      setWeightHistory(weightHistoryResult);
      setQuestionnaireProgress(questionnaireResult);
      setStreakData(streakResult);

      // Setup real-time listeners AFTER dismissed IDs are loaded
      setupRealtimeListeners(user.coupleId, user.userGender);

      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Error loading all data:', error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, dismissedReminderIds]);

  // ============================================
  // REFRESH FUNCTIONS
  // ============================================

  const refreshAll = useCallback(async () => {
    await loadAllData(false);
  }, [loadAllData]);

  const refreshDailyData = useCallback(async (dateString?: string) => {
    if (!userInfo) return;
    
    const targetDate = dateString || formatDateString(new Date());
    const data = await loadDailyDataForDate(userInfo.coupleId, userInfo.userGender, targetDate);
    
    setDailyDataCache(prev => ({
      ...prev,
      [targetDate]: data,
    }));

    // Also refresh weekly stats if it's within the last 7 days
    const weeklyStatsResult = await loadWeeklyStats(userInfo.coupleId, userInfo.userGender);
    setWeeklyStats(weeklyStatsResult);

    // Refresh streak
    const streakResult = await loadStreak(userInfo.coupleId, userInfo.userGender);
    setStreakData(streakResult);
  }, [userInfo]);

  const refreshAppointments = useCallback(async () => {
    if (!userInfo) return;
    const result = await loadAppointments(userInfo.coupleId, userInfo.userGender);
    setDoctorVisits(result.doctorVisits);
    setNursingVisits(result.nursingVisits);
  }, [userInfo]);

  const refreshMessages = useCallback(async () => {
    if (!userInfo) return;
    const result = await loadMessages(userInfo.coupleId, userInfo.userGender);
    setBroadcasts(result.broadcasts);
    setReminders(result.reminders);
    setUnreadBroadcastCount(result.unreadBroadcastCount);
  }, [userInfo]);

  const refreshWeightHistory = useCallback(async () => {
    if (!userInfo) return;
    const result = await loadWeightHistory(userInfo.coupleId, userInfo.userGender);
    setWeightHistory(result);
  }, [userInfo]);

  const refreshUserInfo = useCallback(async () => {
    const user = await loadUserInfo();
    if (user) {
      setUserInfo(user);
    }
  }, []);

  // ============================================
  // GETTERS
  // ============================================

  const getDailyData = useCallback((dateString: string): DailyData => {
    return dailyDataCache[dateString] || defaultDailyData;
  }, [dailyDataCache]);

  const markBroadcastsAsRead = useCallback(async () => {
    if (unreadBroadcastCount > 0) {
      await AsyncStorage.setItem('broadcasts_last_read_timestamp', Date.now().toString());
      setUnreadBroadcastCount(0);
    }
  }, [unreadBroadcastCount]);

  // ============================================
  // OPTIMISTIC UPDATE FUNCTIONS
  // ============================================

  const updateDailyData = useCallback((dateString: string, data: Partial<DailyData>) => {
    setDailyDataCache(prev => ({
      ...prev,
      [dateString]: {
        ...defaultDailyData,
        ...prev[dateString],
        ...data,
      },
    }));
  }, []);

  const addDoctorVisit = useCallback((visit: DoctorVisit) => {
    setDoctorVisits(prev => [visit, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const updateDoctorVisit = useCallback((visitId: string, updates: Partial<DoctorVisit>) => {
    setDoctorVisits(prev => prev.map(v => 
      v.id === visitId ? { ...v, ...updates } : v
    ));
  }, []);

  const deleteDoctorVisit = useCallback((visitId: string) => {
    setDoctorVisits(prev => prev.filter(v => v.id !== visitId));
  }, []);

  // ============================================
  // REMINDER DISMISS FUNCTIONS
  // ============================================

  const dismissReminder = useCallback(async (reminderId: string) => {
    if (!userInfo) return;
    
    // Add to dismissed list
    const updated = [...dismissedReminderIdsRef.current, reminderId];
    setDismissedReminderIds(updated);
    dismissedReminderIdsRef.current = updated;
    
    // Persist to AsyncStorage with user-specific key
    const dismissedKey = `@fitforbaby_dismissed_reminders_${userInfo.coupleId}_${userInfo.userGender}`;
    await AsyncStorage.setItem(dismissedKey, JSON.stringify(updated));
    
    // Also update the reminders list to remove the dismissed one immediately
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  }, [userInfo]);

  const clearAllReminders = useCallback(async () => {
    if (!userInfo) return;
    
    // Get all reminder IDs
    const allReminderIds = reminders.map(r => r.id).filter((id): id is string => !!id);
    
    // Add them all to dismissed list
    const updated = [...new Set([...dismissedReminderIdsRef.current, ...allReminderIds])];
    setDismissedReminderIds(updated);
    dismissedReminderIdsRef.current = updated;
    
    // Persist to AsyncStorage with user-specific key
    const dismissedKey = `@fitforbaby_dismissed_reminders_${userInfo.coupleId}_${userInfo.userGender}`;
    await AsyncStorage.setItem(dismissedKey, JSON.stringify(updated));
    
    // Clear the reminders list immediately
    setReminders([]);
  }, [userInfo, reminders]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial load
  useEffect(() => {
    loadAllData(true);
    
    // Cleanup on unmount
    return () => {
      if (chatUnsubscribeRef.current) {
        chatUnsubscribeRef.current();
      }
      if (broadcastUnsubscribeRef.current) {
        broadcastUnsubscribeRef.current();
      }
    };
  }, []);

  // Check for user changes (e.g., profile switching)
  // This handles the case where a different user logs in while the provider is still mounted
  useEffect(() => {
    const checkUserChange = async () => {
      const currentCoupleId = await AsyncStorage.getItem('coupleId');
      const currentGender = await AsyncStorage.getItem('userGender');
      
      // If user data in AsyncStorage doesn't match current userInfo, reload
      if (userInfo && (userInfo.coupleId !== currentCoupleId || userInfo.userGender !== currentGender)) {
        console.log('User changed, reloading data...');
        loadAllData(true);
      }
    };
    
    // Check periodically (when component re-renders) - not too aggressively
    if (hasLoadedOnce) {
      checkUserChange();
    }
  }, [hasLoadedOnce, userInfo]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: UserDataContextType = {
    // Loading states
    isInitialLoading,
    isLoading: isInitialLoading, // alias
    isRefreshing,
    hasLoadedOnce,
    isInitialized: hasLoadedOnce, // alias
    
    // User data
    userInfo,
    globalSettings,
    dailyDataCache,
    weeklyStats,
    weightHistory,
    
    // Appointments
    doctorVisits,
    nursingVisits,
    
    // Messages
    broadcasts,
    reminders,
    nursingChat,
    unreadBroadcastCount,
    chatUnreadCount,
    
    // Questionnaire
    questionnaireProgress,
    questionnaire: questionnaireProgress, // alias
    
    // Streak
    streakData,
    streak: streakData.currentStreak, // alias
    
    // Actions
    refreshAll,
    refreshDailyData,
    refreshAppointments,
    refreshDoctorVisits: refreshAppointments, // alias
    refreshNursingVisits: refreshAppointments, // alias
    refreshMessages,
    refreshWeightHistory,
    refreshUserInfo,
    getDailyData,
    markBroadcastsAsRead,
    
    // Optimistic updates
    updateDailyData,
    addDoctorVisit,
    updateDoctorVisit,
    deleteDoctorVisit,
    
    // Reminder actions
    dismissReminder,
    clearAllReminders,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

export default UserDataContext;
