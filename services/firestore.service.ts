// ============================================
// FIRESTORE SERVICE - CRUD OPERATIONS
// ============================================

import { Admin, Appointment, AppointmentStatus, COLLECTIONS, ExerciseLog, FoodLog, Notification, NurseVisit, StepEntry, SupportRequest, SupportRequestStatus, User, WeightLog } from '@/types/firebase.types';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// GENERIC HELPERS
// ============================================

// Generate a unique ID
export const generateId = (): string => {
  return doc(collection(db, 'temp')).id;
};

// Get current timestamp
export const now = (): Timestamp => Timestamp.now();

// Convert date to Firestore Timestamp
export const toTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);

// Convert Timestamp to Date
export const toDate = (timestamp: Timestamp): Date => timestamp.toDate();

// Format date as YYYY-MM-DD
export const formatDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ============================================
// USER OPERATIONS
// ============================================

export const userService = {
  // Create new user
  async create(userId: string, userData: Partial<User>): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userRef, {
      ...userData,
      uid: userId,
      createdAt: now(),
      updatedAt: now(),
      isActive: true,
      isVerified: false,
      questionnaireCompleted: false,
      dailyStepGoal: 8000,
      weeklyStepGoal: 56000,
      dailyCalorieGoal: 2200,
      pinEnabled: false,
      biometricEnabled: false,
      notificationsEnabled: true,
      darkModeEnabled: false,
    });
  },

  // Get user by ID
  async get(userId: string): Promise<User | null> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? (snapshot.data() as User) : null;
  },

  // Update user
  async update(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: now(),
    });
  },

  // Delete user (soft delete)
  async deactivate(userId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      isActive: false,
      updatedAt: now(),
    });
  },

  // Get all users (for admin)
  async getAll(limitCount: number = 50): Promise<User[]> {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', 'user'), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  },

  // Listen to user changes
  subscribe(userId: string, callback: (user: User | null) => void): Unsubscribe {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    return onSnapshot(userRef, (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as User) : null);
    });
  },
};

// ============================================
// STEPS OPERATIONS
// ============================================

export const stepsService = {
  // Add step entry
  async add(userId: string, data: Omit<StepEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const stepsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.STEPS);
    const docRef = await addDoc(stepsRef, {
      ...data,
      userId,
      createdAt: now(),
      updatedAt: now(),
    });
    return docRef.id;
  },

  // Get steps for a specific date
  async getByDate(userId: string, date: string): Promise<StepEntry[]> {
    const stepsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.STEPS);
    const q = query(stepsRef, where('date', '==', date), orderBy('loggedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StepEntry));
  },

  // Get steps for date range
  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<StepEntry[]> {
    const stepsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.STEPS);
    const q = query(
      stepsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StepEntry));
  },

  // Get total steps for a date
  async getTotalForDate(userId: string, date: string): Promise<number> {
    const entries = await this.getByDate(userId, date);
    return entries.reduce((total, entry) => total + entry.stepCount, 0);
  },

  // Delete step entry
  async delete(userId: string, stepId: string): Promise<void> {
    const stepRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.STEPS, stepId);
    await deleteDoc(stepRef);
  },

  // Listen to steps for today
  subscribeToday(userId: string, callback: (steps: StepEntry[]) => void): Unsubscribe {
    const today = formatDateString(new Date());
    const stepsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.STEPS);
    const q = query(stepsRef, where('date', '==', today), orderBy('loggedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StepEntry)));
    });
  },
};

// ============================================
// FOOD LOG OPERATIONS
// ============================================

export const foodLogService = {
  // Add food log
  async add(userId: string, data: Omit<FoodLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.FOOD_LOGS);
    const docRef = await addDoc(logsRef, {
      ...data,
      userId,
      createdAt: now(),
      updatedAt: now(),
    });
    return docRef.id;
  },

  // Get food logs for a date
  async getByDate(userId: string, date: string): Promise<FoodLog[]> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.FOOD_LOGS);
    const q = query(logsRef, where('date', '==', date), orderBy('loggedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
  },

  // Get total calories for a date
  async getTotalCaloriesForDate(userId: string, date: string): Promise<number> {
    const logs = await this.getByDate(userId, date);
    return logs.reduce((total, log) => total + log.totalCalories, 0);
  },

  // Update food log
  async update(userId: string, logId: string, data: Partial<FoodLog>): Promise<void> {
    const logRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.FOOD_LOGS, logId);
    await updateDoc(logRef, {
      ...data,
      updatedAt: now(),
    });
  },

  // Delete food log
  async delete(userId: string, logId: string): Promise<void> {
    const logRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.FOOD_LOGS, logId);
    await deleteDoc(logRef);
  },
};

// ============================================
// WEIGHT LOG OPERATIONS
// ============================================

export const weightLogService = {
  // Add weight log
  async add(userId: string, data: Omit<WeightLog, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.WEIGHT_LOGS);
    const docRef = await addDoc(logsRef, {
      ...data,
      userId,
      createdAt: now(),
    });
    return docRef.id;
  },

  // Get all weight logs (for chart)
  async getAll(userId: string, limitCount: number = 30): Promise<WeightLog[]> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.WEIGHT_LOGS);
    const q = query(logsRef, orderBy('date', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog));
  },

  // Get latest weight
  async getLatest(userId: string): Promise<WeightLog | null> {
    const logs = await this.getAll(userId, 1);
    return logs[0] || null;
  },

  // Delete weight log
  async delete(userId: string, logId: string): Promise<void> {
    const logRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.WEIGHT_LOGS, logId);
    await deleteDoc(logRef);
  },
};

// ============================================
// EXERCISE LOG OPERATIONS
// ============================================

export const exerciseLogService = {
  // Add exercise log
  async add(userId: string, data: Omit<ExerciseLog, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EXERCISE_LOGS);
    const docRef = await addDoc(logsRef, {
      ...data,
      userId,
      createdAt: now(),
    });
    return docRef.id;
  },

  // Get exercise logs for a date
  async getByDate(userId: string, date: string): Promise<ExerciseLog[]> {
    const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EXERCISE_LOGS);
    const q = query(logsRef, where('date', '==', date), orderBy('loggedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseLog));
  },

  // Delete exercise log
  async delete(userId: string, logId: string): Promise<void> {
    const logRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.EXERCISE_LOGS, logId);
    await deleteDoc(logRef);
  },
};

// ============================================
// APPOINTMENT OPERATIONS
// ============================================

export const appointmentService = {
  // Create appointment
  async create(userId: string, data: Omit<Appointment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const appointmentsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.APPOINTMENTS);
    const docRef = await addDoc(appointmentsRef, {
      ...data,
      userId,
      status: 'scheduled',
      reminderSent: false,
      isAutoScheduled: false,
      createdAt: now(),
      updatedAt: now(),
    });
    return docRef.id;
  },

  // Get all appointments for user
  async getAll(userId: string): Promise<Appointment[]> {
    const appointmentsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.APPOINTMENTS);
    const q = query(appointmentsRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
  },

  // Get upcoming appointments
  async getUpcoming(userId: string): Promise<Appointment[]> {
    const appointments = await this.getAll(userId);
    const now = new Date();
    return appointments.filter(apt => apt.date.toDate() >= now && apt.status === 'scheduled');
  },

  // Update appointment status
  async updateStatus(userId: string, appointmentId: string, status: AppointmentStatus): Promise<void> {
    const aptRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.APPOINTMENTS, appointmentId);
    await updateDoc(aptRef, {
      status,
      updatedAt: now(),
      ...(status === 'completed' ? { completedAt: now() } : {}),
    });
  },

  // Delete appointment
  async delete(userId: string, appointmentId: string): Promise<void> {
    const aptRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.APPOINTMENTS, appointmentId);
    await deleteDoc(aptRef);
  },

  // Subscribe to appointments
  subscribe(userId: string, callback: (appointments: Appointment[]) => void): Unsubscribe {
    const appointmentsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.APPOINTMENTS);
    const q = query(appointmentsRef, orderBy('date', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    });
  },
};

// ============================================
// ADMIN OPERATIONS
// ============================================

export const adminService = {
  // Get admin by ID
  async get(adminId: string): Promise<Admin | null> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    const snapshot = await getDoc(adminRef);
    return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as Admin) : null;
  },

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const admin = await this.get(userId);
    return admin !== null && admin.isActive;
  },

  // Get all admins
  async getAll(): Promise<Admin[]> {
    const adminsRef = collection(db, COLLECTIONS.ADMINS);
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Admin));
  },

  // Create admin
  async create(adminId: string, data: Omit<Admin, 'uid' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await setDoc(adminRef, {
      ...data,
      uid: adminId,
      createdAt: now(),
      updatedAt: now(),
    });
  },

  // Update admin
  async update(adminId: string, data: Partial<Admin>): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      ...data,
      updatedAt: now(),
    });
  },

  // Deactivate admin
  async deactivate(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      isActive: false,
      updatedAt: now(),
    });
  },

  // Activate admin
  async activate(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      isActive: true,
      updatedAt: now(),
    });
  },

  // Delete admin permanently
  async delete(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await deleteDoc(adminRef);
  },

  // Promote to superadmin
  async promoteToSuperAdmin(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      role: 'superadmin',
      updatedAt: now(),
    });
  },

  // Demote to regular admin
  async demoteToAdmin(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      role: 'admin',
      updatedAt: now(),
    });
  },

  // Get admin by email
  async getByEmail(email: string): Promise<Admin | null> {
    const adminsRef = collection(db, COLLECTIONS.ADMINS);
    const q = query(adminsRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() } as Admin;
  },

  // Subscribe to admins list (real-time updates)
  subscribe(callback: (admins: (Admin & { id: string })[]) => void): Unsubscribe {
    const adminsRef = collection(db, COLLECTIONS.ADMINS);
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as Admin & { id: string })));
    });
  },

  // Update last login
  async updateLastLogin(adminId: string): Promise<void> {
    const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
    await updateDoc(adminRef, {
      lastLoginAt: now(),
    });
  },
};

// ============================================
// NURSE VISITS OPERATIONS (Admin managed)
// ============================================

export const nurseVisitService = {
  // Create nurse visit
  async create(data: Omit<NurseVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const visitsRef = collection(db, COLLECTIONS.NURSE_VISITS);
    const docRef = await addDoc(visitsRef, {
      ...data,
      createdAt: now(),
      updatedAt: now(),
    });
    return docRef.id;
  },

  // Get visits for user
  async getByUser(userId: string): Promise<NurseVisit[]> {
    const visitsRef = collection(db, COLLECTIONS.NURSE_VISITS);
    const q = query(visitsRef, where('userId', '==', userId), orderBy('scheduledDate', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NurseVisit));
  },

  // Get all visits (for admin)
  async getAll(): Promise<NurseVisit[]> {
    const visitsRef = collection(db, COLLECTIONS.NURSE_VISITS);
    const q = query(visitsRef, orderBy('scheduledDate', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NurseVisit));
  },

  // Update visit
  async update(visitId: string, data: Partial<NurseVisit>): Promise<void> {
    const visitRef = doc(db, COLLECTIONS.NURSE_VISITS, visitId);
    await updateDoc(visitRef, {
      ...data,
      updatedAt: now(),
    });
  },

  // Complete visit with notes
  async complete(visitId: string, notes: { visitNotes?: string; healthObservations?: string; recommendations?: string; vitalsRecorded?: NurseVisit['vitalsRecorded'] }): Promise<void> {
    const visitRef = doc(db, COLLECTIONS.NURSE_VISITS, visitId);
    await updateDoc(visitRef, {
      ...notes,
      status: 'completed',
      completedAt: now(),
      updatedAt: now(),
    });
  },
};

// ============================================
// SUPPORT REQUESTS OPERATIONS
// ============================================

export const supportRequestService = {
  // Create support request
  async create(data: Omit<SupportRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    const docRef = await addDoc(requestsRef, {
      ...data,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    });
    return docRef.id;
  },

  // Get requests for user
  async getByUser(userId: string): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    const q = query(requestsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
  },

  // Get all pending requests (for admin)
  async getPending(): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    const q = query(requestsRef, where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
  },

  // Update request status
  async updateStatus(requestId: string, status: SupportRequestStatus, assignedTo?: string, assignedName?: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.SUPPORT_REQUESTS, requestId);
    await updateDoc(requestRef, {
      status,
      assignedTo,
      assignedName,
      updatedAt: now(),
      ...(status === 'completed' ? { resolvedAt: now() } : {}),
    });
  },
};

// ============================================
// NOTIFICATIONS OPERATIONS
// ============================================

export const notificationService = {
  // Create notification
  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const docRef = await addDoc(notificationsRef, {
      ...data,
      isRead: false,
      pushSent: false,
      createdAt: now(),
    });
    return docRef.id;
  },

  // Get notifications for user
  async getByUser(userId: string, limitCount: number = 50): Promise<Notification[]> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Mark as read
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: now(),
    });
  },

  // Mark all as read for user
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.getByUser(userId);
    const batch = writeBatch(db);
    
    notifications
      .filter(n => !n.isRead)
      .forEach(n => {
        const ref = doc(db, COLLECTIONS.NOTIFICATIONS, n.id);
        batch.update(ref, { isRead: true, readAt: now() });
      });
    
    await batch.commit();
  },

  // Subscribe to notifications
  subscribe(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });
  },
};

// ============================================
// EXPORT ALL SERVICES
// ============================================

export const firestoreServices = {
  user: userService,
  steps: stepsService,
  foodLog: foodLogService,
  weightLog: weightLogService,
  exerciseLog: exerciseLogService,
  appointment: appointmentService,
  admin: adminService,
  nurseVisit: nurseVisitService,
  supportRequest: supportRequestService,
  notification: notificationService,
};

export default firestoreServices;
