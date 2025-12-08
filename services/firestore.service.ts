// ============================================
// FIRESTORE SERVICE - CRUD OPERATIONS
// ============================================

import { calculateProgress, initializeProgress } from '@/data/questionnaireParser';
import { Admin, Appointment, AppointmentStatus, Broadcast, Chat, ChatMessage, COLLECTIONS, DeviceStatus, DoctorVisit, DoctorVisitStatus, ExerciseLog, Feedback, FeedbackCategory, FeedbackStatus, FoodLog, GlobalSettings, Notification, NurseVisit, NursingDepartmentVisit, NursingVisitStatus, QuestionnaireAnswer, QuestionnaireLanguage, QuestionnaireProgress, StepEntry, SupportRequest, SupportRequestStatus, User, UserDevice, WeightLog } from '@/types/firebase.types';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
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

// Format date as YYYY-MM-DD in LOCAL timezone (not UTC)
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  // Get admin by phone number
  async getByPhone(phone: string): Promise<Admin | null> {
    const adminsRef = collection(db, COLLECTIONS.ADMINS);
    const q = query(adminsRef, where('phone', '==', phone), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() } as Admin;
  },

  // Find admin by credential (email or phone)
  async findByCredential(credential: string): Promise<Admin | null> {
    // Try email first
    if (credential.includes('@')) {
      return this.getByEmail(credential.toLowerCase());
    }
    // Try phone
    return this.getByPhone(credential);
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
// COUPLE OPERATIONS (User Onboarding)
// ============================================

// Generate random 8-character password
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const coupleService = {
  // Get next couple ID (auto-increment)
  async getNextCoupleId(): Promise<string> {
    try {
      const couplesRef = collection(db, COLLECTIONS.COUPLES);
      const snapshot = await getDocs(couplesRef);
      
      if (snapshot.empty) {
        return 'C_001';
      }
      
      // Find the highest ID number
      let maxIdNum = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.coupleId) {
          const idNum = parseInt(data.coupleId.split('_')[1]) || 0;
          if (idNum > maxIdNum) maxIdNum = idNum;
        }
      });
      
      return `C_${String(maxIdNum + 1).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error getting next couple ID:', error);
      return 'C_001';
    }
  },

  // Create new couple (enrollment)
  async create(data: {
    coupleId: string;
    enrollmentDate: string;
    enrolledBy: string;
    enrolledByName?: string;
    male: { name: string; email?: string; phone?: string; age?: number };
    female: { name: string; email?: string; phone?: string; age?: number };
  }): Promise<{ coupleId: string; maleTempPassword: string; femaleTempPassword: string }> {
    const maleTempPassword = generateTempPassword();
    const femaleTempPassword = generateTempPassword();
    
    // Build male user object - only include non-empty values
    const maleData: Record<string, any> = {
      id: `${data.coupleId}_M`,
      name: data.male.name,
      status: 'pending' as const,
      isPasswordReset: false,
      isPinSet: false,
      tempPassword: maleTempPassword,
    };
    if (data.male.email) maleData.email = data.male.email;
    if (data.male.phone) maleData.phone = data.male.phone;
    if (data.male.age) maleData.age = data.male.age;

    // Build female user object - only include non-empty values
    const femaleData: Record<string, any> = {
      id: `${data.coupleId}_F`,
      name: data.female.name,
      status: 'pending' as const,
      isPasswordReset: false,
      isPinSet: false,
      tempPassword: femaleTempPassword,
    };
    if (data.female.email) femaleData.email = data.female.email;
    if (data.female.phone) femaleData.phone = data.female.phone;
    if (data.female.age) femaleData.age = data.female.age;
    
    const coupleData: Record<string, any> = {
      id: data.coupleId,
      coupleId: data.coupleId,
      enrollmentDate: data.enrollmentDate,
      enrolledBy: data.enrolledBy,
      status: 'active' as const,
      male: maleData,
      female: femaleData,
      createdAt: now(),
      updatedAt: now(),
    };
    
    // Add enrolledByName if provided
    if (data.enrolledByName) {
      coupleData.enrolledByName = data.enrolledByName;
    }
    
    const coupleRef = doc(db, COLLECTIONS.COUPLES, data.coupleId);
    await setDoc(coupleRef, coupleData);
    
    return { 
      coupleId: data.coupleId, 
      maleTempPassword, 
      femaleTempPassword 
    };
  },

  // Get couple by ID
  async get(coupleId: string): Promise<any | null> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const snapshot = await getDoc(coupleRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  // Get all couples
  async getAll(): Promise<any[]> {
    const couplesRef = collection(db, COLLECTIONS.COUPLES);
    const snapshot = await getDocs(couplesRef);
    const couples = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort client-side by coupleId descending
    couples.sort((a: any, b: any) => {
      if (!a.coupleId || !b.coupleId) return 0;
      return b.coupleId.localeCompare(a.coupleId);
    });
    return couples;
  },

  // Subscribe to couples list (real-time)
  subscribe(callback: (couples: any[]) => void, onError?: (error: Error) => void): Unsubscribe {
    try {
      const couplesRef = collection(db, COLLECTIONS.COUPLES);
      // Note: Simple query without orderBy to avoid index requirements
      return onSnapshot(couplesRef, 
        (snapshot) => {
          // Empty collection is valid - not an error
          const couples = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            // Filter out malformed couples without male/female data
            .filter((couple: any) => {
              return couple && 
                     couple.coupleId && 
                     couple.male && 
                     couple.female &&
                     typeof couple.male === 'object' &&
                     typeof couple.female === 'object';
            });
          // Sort client-side by coupleId (C_001, C_002, etc.)
          couples.sort((a: any, b: any) => {
            if (!a.coupleId || !b.coupleId) return 0;
            return b.coupleId.localeCompare(a.coupleId); // Descending order (newest first)
          });
          callback(couples);
        },
        (error) => {
          // Log for debugging
          console.error('Couples subscription error:', error);
          
          // Call error handler only for actual errors (permission, network, etc.)
          if (onError) {
            onError(error);
          }
          
          // Return empty array so UI can still render
          callback([]);
        }
      );
    } catch (error) {
      console.error('Failed to setup couples subscription:', error);
      // Return empty array and call error handler
      callback([]);
      if (onError && error instanceof Error) {
        onError(error);
      }
      // Return a no-op unsubscribe function
      return () => {};
    }
  },

  // Find couple by login credential (coupleId, userId, phone, or email)
  async findByCredential(credential: string): Promise<{ couple: any; gender: 'male' | 'female' | 'both' } | null> {
    const couplesRef = collection(db, COLLECTIONS.COUPLES);
    
    // First check if credential is a Couple ID (e.g., C_001)
    if (credential.match(/^C_\d+$/i)) {
      const coupleDoc = await getDoc(doc(db, COLLECTIONS.COUPLES, credential.toUpperCase()));
      if (coupleDoc.exists()) {
        return { couple: { id: coupleDoc.id, ...coupleDoc.data() }, gender: 'both' };
      }
      return null;
    }
    
    // Otherwise search by user credentials
    const snapshot = await getDocs(couplesRef);
    
    for (const docSnap of snapshot.docs) {
      const couple = { id: docSnap.id, ...docSnap.data() } as any;
      
      // Check if credential matches male
      const matchesMale = 
        couple.male.id === credential ||
        couple.male.phone === credential ||
        couple.male.email?.toLowerCase() === credential.toLowerCase();
      
      // Check if credential matches female
      const matchesFemale = 
        couple.female.id === credential ||
        couple.female.phone === credential ||
        couple.female.email?.toLowerCase() === credential.toLowerCase();
      
      if (matchesMale && matchesFemale) {
        // Shared credential - need to show profile picker
        return { couple, gender: 'both' };
      } else if (matchesMale) {
        return { couple, gender: 'male' };
      } else if (matchesFemale) {
        return { couple, gender: 'female' };
      }
    }
    
    return null;
  },

  // Verify password (temp or user's own)
  async verifyPassword(coupleId: string, gender: 'male' | 'female', password: string): Promise<boolean> {
    const couple = await this.get(coupleId);
    if (!couple) return false;
    
    const user = couple[gender];
    
    // Check if user has reset password - use their own password
    if (user.isPasswordReset && user.password) {
      return user.password === password;
    }
    
    // Check individual temp password (stored per user)
    return user.tempPassword === password;
  },

  // Reset password for user (clears temp password)
  async resetPassword(coupleId: string, gender: 'male' | 'female', newPassword: string): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.password`]: newPassword,
      [`${gender}.isPasswordReset`]: true,
      [`${gender}.tempPassword`]: null, // Clear temp password after reset
      [`${gender}.status`]: 'active',
      updatedAt: now(),
    });
  },

  // Set PIN for user
  async setPin(coupleId: string, gender: 'male' | 'female', pin: string): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.pin`]: pin,
      [`${gender}.isPinSet`]: true,
      updatedAt: now(),
    });
  },

  // Verify PIN
  async verifyPin(coupleId: string, gender: 'male' | 'female', pin: string): Promise<boolean> {
    const couple = await this.get(coupleId);
    if (!couple) return false;
    return couple[gender].pin === pin;
  },

  // Force reset PIN (admin action)
  async forceResetPin(coupleId: string, gender: 'male' | 'female'): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.pin`]: '',
      [`${gender}.isPinSet`]: false,
      updatedAt: now(),
    });
  },

  // Update last login
  async updateLastLogin(coupleId: string, gender: 'male' | 'female'): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.lastLoginAt`]: now(),
      updatedAt: now(),
    });
  },

  // Update couple status
  async updateStatus(coupleId: string, status: 'active' | 'inactive'): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      status,
      updatedAt: now(),
    });
  },

  // Update user status (male/female)
  async updateUserStatus(coupleId: string, gender: 'male' | 'female', status: 'active' | 'inactive' | 'pending'): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.status`]: status,
      updatedAt: now(),
    });
  },

  // Update user details
  async updateUser(coupleId: string, gender: 'male' | 'female', data: {
    name?: string;
    email?: string;
    phone?: string;
    age?: number;
    weight?: number;
    height?: number;
  }): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const updateData: any = { updatedAt: now() };
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[`${gender}.${key}`] = value;
      }
    });
    
    // Calculate BMI if both weight and height are provided
    if (data.weight && data.height) {
      const heightInMeters = data.height / 100;
      updateData[`${gender}.bmi`] = Math.round((data.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    
    await updateDoc(coupleRef, updateData);
  },

  // Update specific user field (for personal info edits)
  async updateUserField(coupleId: string, gender: 'male' | 'female', data: Record<string, any>): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    
    // Handle data - use deleteField() for null values to actually remove from Firestore
    const cleanData: Record<string, any> = { updatedAt: now() };
    Object.entries(data).forEach(([key, value]) => {
      if (value === null) {
        // Use deleteField() to remove the field from Firestore
        cleanData[key] = deleteField();
      } else if (value !== undefined && value !== '') {
        cleanData[key] = value;
      }
    });
    
    await updateDoc(coupleRef, cleanData);
  },

  // Update user profile with Firestore-safe data (no null values)
  async updateProfile(coupleId: string, gender: 'male' | 'female', profileData: {
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    height?: number;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
  }): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const updateData: Record<string, any> = { updatedAt: now() };
    
    // Only add non-empty values
    if (profileData.email) {
      updateData[`${gender}.email`] = profileData.email;
    }
    if (profileData.phone) {
      updateData[`${gender}.phone`] = profileData.phone;
    }
    if (profileData.dateOfBirth) {
      updateData[`${gender}.dateOfBirth`] = profileData.dateOfBirth;
    }
    if (profileData.height && profileData.height > 0) {
      updateData[`${gender}.height`] = profileData.height;
    }
    if (profileData.address) {
      // Clean address object - remove empty values
      const cleanAddress: Record<string, string> = {};
      Object.entries(profileData.address).forEach(([key, value]) => {
        if (value && value.trim()) {
          cleanAddress[key] = value.trim();
        }
      });
      if (Object.keys(cleanAddress).length > 0) {
        updateData[`${gender}.address`] = cleanAddress;
      }
    }
    
    await updateDoc(coupleRef, updateData);
  },

  // Force password reset for user
  async forcePasswordReset(coupleId: string, gender: 'male' | 'female'): Promise<string> {
    const newTempPassword = generateTempPassword();
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await updateDoc(coupleRef, {
      [`${gender}.password`]: '',
      [`${gender}.isPasswordReset`]: false,
      [`${gender}.tempPassword`]: newTempPassword, // Store at user level, not couple level
      [`${gender}.status`]: 'pending', // Reset status to pending
      updatedAt: now(),
    });
    return newTempPassword;
  },

  // Delete couple
  async delete(coupleId: string): Promise<void> {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    await deleteDoc(coupleRef);
  },

  // ============================================
  // STREAK & GOALS TRACKING
  // ============================================

  // Update streak when user logs something (weight, food, exercise, steps)
  async updateStreak(coupleId: string, gender: 'male' | 'female'): Promise<{ currentStreak: number; isNewStreak: boolean }> {
    try {
      const couple = await this.get(coupleId);
      if (!couple) return { currentStreak: 0, isNewStreak: false };

      const user = couple[gender];
      const today = formatDateString(new Date());
      const lastLogDate = user.lastLogDate || '';
      const currentStreak = user.currentStreak || 0;
      const longestStreak = user.longestStreak || 0;

      let newStreak = currentStreak;
      let isNewStreak = false;

      if (lastLogDate === today) {
        // Already logged today, no change
        return { currentStreak: newStreak, isNewStreak: false };
      }

      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateString(yesterday);

      if (lastLogDate === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = currentStreak + 1;
        isNewStreak = true;
      } else if (!lastLogDate) {
        // First log ever - start streak at 1
        newStreak = 1;
        isNewStreak = true;
      } else {
        // Streak broken - reset to 1
        newStreak = 1;
        isNewStreak = true;
      }

      // Update user with new streak data
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const updateData: Record<string, any> = {
        [`${gender}.currentStreak`]: newStreak,
        [`${gender}.lastLogDate`]: today,
        updatedAt: now(),
      };

      // Update longest streak if current is higher
      if (newStreak > longestStreak) {
        updateData[`${gender}.longestStreak`] = newStreak;
      }

      await updateDoc(coupleRef, updateData);
      return { currentStreak: newStreak, isNewStreak };
    } catch (error) {
      console.error('Error updating streak:', error);
      return { currentStreak: 0, isNewStreak: false };
    }
  },

  // Check and fix streak if user missed a day (call on app open)
  async checkAndUpdateStreak(coupleId: string, gender: 'male' | 'female'): Promise<number> {
    try {
      const couple = await this.get(coupleId);
      if (!couple) return 0;

      const user = couple[gender];
      const today = new Date().toISOString().split('T')[0];
      const lastLogDate = user.lastLogDate || '';
      const currentStreak = user.currentStreak || 0;

      // If already checked today, return current streak
      if (lastLogDate === today) {
        return currentStreak;
      }

      // Calculate yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // If last log was yesterday, streak is still valid (waiting for today's log)
      if (lastLogDate === yesterdayStr) {
        return currentStreak;
      }

      // Streak is broken - reset to 0
      if (currentStreak > 0 && lastLogDate && lastLogDate !== today && lastLogDate !== yesterdayStr) {
        const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
        await updateDoc(coupleRef, {
          [`${gender}.currentStreak`]: 0,
          updatedAt: now(),
        });
        return 0;
      }

      return currentStreak;
    } catch (error) {
      console.error('Error checking streak:', error);
      return 0;
    }
  },

  // Increment weekly goals achieved
  async incrementWeeklyGoals(coupleId: string, gender: 'male' | 'female', count: number = 1): Promise<number> {
    try {
      const couple = await this.get(coupleId);
      if (!couple) return 0;

      const user = couple[gender];
      const currentGoals = user.weeklyGoalsAchieved || 0;
      const newGoals = currentGoals + count;

      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      await updateDoc(coupleRef, {
        [`${gender}.weeklyGoalsAchieved`]: newGoals,
        updatedAt: now(),
      });

      return newGoals;
    } catch (error) {
      console.error('Error incrementing weekly goals:', error);
      return 0;
    }
  },

  // Get user stats (streak, goals, etc.)
  async getUserStats(coupleId: string, gender: 'male' | 'female'): Promise<{
    currentStreak: number;
    longestStreak: number;
    weeklyGoalsAchieved: number;
    lastLogDate: string;
    daysActive: number;
  }> {
    try {
      const couple = await this.get(coupleId);
      if (!couple) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          weeklyGoalsAchieved: 0,
          lastLogDate: '',
          daysActive: 0,
        };
      }

      const user = couple[gender];
      
      // Calculate days active from enrollment date
      let daysActive = 0;
      if (couple.enrollmentDate) {
        const enrollDate = new Date(couple.enrollmentDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - enrollDate.getTime());
        daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        weeklyGoalsAchieved: user.weeklyGoalsAchieved || 0,
        lastLogDate: user.lastLogDate || '',
        daysActive,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        weeklyGoalsAchieved: 0,
        lastLogDate: '',
        daysActive: 0,
      };
    }
  },

  // Initialize streak for user - checks if streak is still valid on app load
  async initializeStreak(coupleId: string, gender: 'male' | 'female'): Promise<{ currentStreak: number; longestStreak: number }> {
    try {
      const couple = await this.get(coupleId);
      if (!couple) return { currentStreak: 0, longestStreak: 0 };

      const user = couple[gender];
      const today = formatDateString(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateString(yesterday);

      const currentStreak = user.currentStreak || 0;
      const longestStreak = user.longestStreak || 0;
      const lastLogDate = user.lastLogDate || '';

      // If no lastLogDate, user hasn't logged yet - return 0
      if (!lastLogDate) {
        return { currentStreak: 0, longestStreak: 0 };
      }

      // If last log was today or yesterday, streak is valid
      if (lastLogDate === today || lastLogDate === yesterdayStr) {
        return { currentStreak, longestStreak };
      }

      // Streak is broken (last log was before yesterday) - reset to 0
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      await updateDoc(coupleRef, {
        [`${gender}.currentStreak`]: 0,
        updatedAt: now(),
      });

      return { currentStreak: 0, longestStreak };
    } catch (error) {
      console.error('Error initializing streak:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  },
};

// ============================================
// COUPLE WEIGHT LOG OPERATIONS
// Path: /couples/{coupleId}/weightLogs/{logId}
// ============================================

export interface CoupleWeightLog {
  id?: string;
  coupleId?: string;
  gender?: 'male' | 'female';
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  height?: number; // in cm
  waist?: number; // in cm
  bmi?: number;
  whtr?: number; // Waist-to-Height Ratio
  notes?: string;
  loggedAt?: Timestamp;
  createdAt?: Timestamp;
}

export const coupleWeightLogService = {
  // Add weight log for a couple member
  async add(coupleId: string, gender: 'male' | 'female', data: {
    weight: number;
    height?: number;
    waist?: number;
    bmi?: number;
    whtr?: number;
    notes?: string;
    date?: string;
  }): Promise<string> {
    try {
      // First verify the couple exists
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const coupleSnapshot = await getDoc(coupleRef);
      
      if (!coupleSnapshot.exists()) {
        throw new Error(`Couple ${coupleId} not found`);
      }

      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
      const date = data.date || formatDateString(new Date());
      
      // Calculate BMI if height is provided and not already provided
      let bmi = data.bmi;
      if (!bmi && data.height && data.height > 0) {
        const heightInMeters = data.height / 100;
        bmi = Math.round((data.weight / (heightInMeters * heightInMeters)) * 10) / 10;
      }

      // Calculate WHtR if waist and height are provided and not already provided
      let whtr = data.whtr;
      if (!whtr && data.waist && data.height && data.height > 0) {
        whtr = Math.round((data.waist / data.height) * 100) / 100;
      }
      
      // Add the weight log to subcollection
      const docRef = await addDoc(logsRef, {
        coupleId,
        gender,
        date,
        weight: data.weight,
        height: data.height || null,
        waist: data.waist || null,
        bmi: bmi || null,
        whtr: whtr || null,
        notes: data.notes || null,
        loggedAt: now(),
        createdAt: now(),
      });
      
      // Also update the current weight in the couple document
      const updateData: Record<string, any> = {
        [`${gender}.weight`]: data.weight,
        updatedAt: now(),
      };
      if (data.height) {
        updateData[`${gender}.height`] = data.height;
      }
      if (bmi) {
        updateData[`${gender}.bmi`] = bmi;
      }
      await updateDoc(coupleRef, updateData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding weight log:', error);
      throw error;
    }
  },

  // Get all weight logs for a couple member
  async getAll(coupleId: string, gender: 'male' | 'female', limitCount: number = 30): Promise<CoupleWeightLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
      // Simple query - filter by gender client-side to avoid composite index requirement
      const q = query(logsRef, orderBy('date', 'desc'), limit(limitCount * 2));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleWeightLog))
        .filter(log => log.gender === gender)
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error getting weight logs:', error);
      return [];
    }
  },

  // Get all weight logs for both members (for admin)
  async getAllForCouple(coupleId: string, limitCount: number = 60): Promise<CoupleWeightLog[]> {
    const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
    const q = query(logsRef, orderBy('date', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleWeightLog));
  },

  // Get latest weight log for a member
  async getLatest(coupleId: string, gender: 'male' | 'female'): Promise<CoupleWeightLog | null> {
    const logs = await this.getAll(coupleId, gender, 1);
    return logs[0] || null;
  },

  // Get weight logs for a date range
  async getByDateRange(coupleId: string, gender: 'male' | 'female', startDate: string, endDate: string): Promise<CoupleWeightLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
      // Simple query - filter by gender client-side to avoid composite index requirement
      const q = query(
        logsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleWeightLog))
        .filter(log => log.gender === gender);
    } catch (error) {
      console.error('Error getting weight logs by date range:', error);
      return [];
    }
  },

  // Delete weight log
  async delete(coupleId: string, logId: string): Promise<void> {
    const logRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs', logId);
    await deleteDoc(logRef);
  },

  // Subscribe to weight logs (real-time)
  subscribe(coupleId: string, gender: 'male' | 'female', callback: (logs: CoupleWeightLog[]) => void): Unsubscribe {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
      // Simple query - filter by gender client-side to avoid composite index requirement
      const q = query(logsRef, orderBy('date', 'desc'), limit(60));
      return onSnapshot(q, 
        (snapshot) => {
          const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleWeightLog));
          const filteredLogs = allLogs.filter(log => log.gender === gender).slice(0, 30);
          callback(filteredLogs);
        },
        (error) => {
          console.error('Weight logs subscription error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Failed to setup weight logs subscription:', error);
      callback([]);
      return () => {};
    }
  },
};

// ============================================
// COUPLE STEPS OPERATIONS
// ============================================

export interface CoupleStepEntry {
  id: string;
  coupleId: string;
  gender: 'male' | 'female';
  date: string; // YYYY-MM-DD format
  stepCount: number;
  proofImageUrl?: string;
  proofType?: 'camera' | 'gallery';
  source: 'manual' | 'device';
  aiValidated?: boolean;
  aiExtractedCount?: number | null;
  aiConfidence?: 'high' | 'medium' | 'low' | null;
  loggedAt?: Timestamp;
  createdAt?: Timestamp;
}

export const coupleStepsService = {
  // Add step entry for a couple member
  async add(coupleId: string, gender: 'male' | 'female', data: {
    stepCount: number;
    proofImageUrl?: string;
    proofType?: 'camera' | 'gallery';
    source?: 'manual' | 'device';
    date?: string;
    aiValidated?: boolean;
    aiExtractedCount?: number | null;
    aiConfidence?: 'high' | 'medium' | 'low' | null;
  }): Promise<string> {
    try {
      // Verify the couple exists
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const coupleSnapshot = await getDoc(coupleRef);
      
      if (!coupleSnapshot.exists()) {
        throw new Error(`Couple ${coupleId} not found`);
      }

      const stepsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'steps');
      const date = data.date || formatDateString(new Date());
      
      const docRef = await addDoc(stepsRef, {
        coupleId,
        gender,
        date,
        stepCount: data.stepCount,
        proofImageUrl: data.proofImageUrl || null,
        proofType: data.proofType || null,
        source: data.source || 'manual',
        aiValidated: data.aiValidated || false,
        aiExtractedCount: data.aiExtractedCount || null,
        aiConfidence: data.aiConfidence || null,
        loggedAt: now(),
        createdAt: now(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding step entry:', error);
      throw error;
    }
  },

  // Get all step entries for a date
  async getByDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<CoupleStepEntry[]> {
    try {
      const stepsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'steps');
      // Query by date and gender
      const q = query(stepsRef, where('date', '==', date), where('gender', '==', gender));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleStepEntry));
      // Sort client-side by createdAt (most recent first)
      return entries.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting step entries:', error);
      return [];
    }
  },

  // Get total steps for a date
  async getTotalForDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<number> {
    const entries = await this.getByDate(coupleId, gender, date);
    return entries.reduce((total, entry) => total + entry.stepCount, 0);
  },

  // Get step entries for date range (for history/progress)
  async getByDateRange(coupleId: string, gender: 'male' | 'female', startDate: string, endDate: string): Promise<CoupleStepEntry[]> {
    try {
      const stepsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'steps');
      // Query by gender only, then filter by date client-side to avoid composite index issues
      const q = query(
        stepsRef,
        where('gender', '==', gender)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleStepEntry))
        .filter(entry => entry.date >= startDate && entry.date <= endDate);
      // Sort client-side by date (most recent first)
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting step entries by date range:', error);
      return [];
    }
  },

  // Delete step entry
  async delete(coupleId: string, stepId: string): Promise<void> {
    try {
      const stepRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'steps', stepId);
      await deleteDoc(stepRef);
    } catch (error) {
      console.error('Error deleting step entry:', error);
      throw error;
    }
  },

  // Subscribe to today's steps (real-time)
  subscribeToday(coupleId: string, gender: 'male' | 'female', callback: (entries: CoupleStepEntry[]) => void): Unsubscribe {
    try {
      const today = formatDateString(new Date());
      const stepsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'steps');
      const q = query(stepsRef, where('date', '==', today), orderBy('loggedAt', 'desc'));
      
      return onSnapshot(q, 
        (snapshot) => {
          const entries = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as CoupleStepEntry))
            .filter(entry => entry.gender === gender);
          callback(entries);
        },
        (error) => {
          console.error('Steps subscription error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Failed to setup steps subscription:', error);
      callback([]);
      return () => {};
    }
  },
};

// ============================================
// COUPLE EXERCISE LOG OPERATIONS
// ============================================

export interface CoupleExerciseLog {
  id: string;
  coupleId: string;
  gender: 'male' | 'female';
  date: string; // YYYY-MM-DD format
  exerciseType: string; // 'couple-walking', 'high-knees', 'yoga', etc.
  exerciseName: string;
  nameTamil: string;
  duration: number; // in minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  caloriesPerMinute: number;
  caloriesBurned: number;
  perceivedExertion: number; // 1-10
  steps?: number; // For walking exercises
  partnerParticipated: boolean;
  notes?: string;
  loggedAt?: Timestamp;
  createdAt?: Timestamp;
}

export const coupleExerciseService = {
  // Add exercise log for a couple member
  async add(coupleId: string, gender: 'male' | 'female', data: {
    exerciseType: string;
    exerciseName: string;
    nameTamil: string;
    duration: number;
    intensity: 'light' | 'moderate' | 'vigorous';
    caloriesPerMinute: number;
    caloriesBurned: number;
    perceivedExertion: number;
    steps?: number;
    partnerParticipated: boolean;
    notes?: string;
    date?: string;
  }): Promise<string> {
    try {
      // Verify the couple exists
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const coupleSnapshot = await getDoc(coupleRef);
      
      if (!coupleSnapshot.exists()) {
        throw new Error(`Couple ${coupleId} not found`);
      }

      const exerciseRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs');
      const date = data.date || formatDateString(new Date());
      
      const docRef = await addDoc(exerciseRef, {
        coupleId,
        gender,
        date,
        exerciseType: data.exerciseType,
        exerciseName: data.exerciseName,
        nameTamil: data.nameTamil,
        duration: data.duration,
        intensity: data.intensity,
        caloriesPerMinute: data.caloriesPerMinute,
        caloriesBurned: data.caloriesBurned,
        perceivedExertion: data.perceivedExertion,
        steps: data.steps || null,
        partnerParticipated: data.partnerParticipated,
        notes: data.notes || null,
        loggedAt: now(),
        createdAt: now(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding exercise log:', error);
      throw error;
    }
  },

  // Get exercise logs for a date
  async getByDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<CoupleExerciseLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs');
      const q = query(logsRef, where('date', '==', date), where('gender', '==', gender));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleExerciseLog));
      return entries.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting exercise logs:', error);
      return [];
    }
  },

  // Get all exercise logs for a date (both genders)
  async getAllByDate(coupleId: string, date: string): Promise<CoupleExerciseLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs');
      const q = query(logsRef, where('date', '==', date));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleExerciseLog));
      return entries.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting all exercise logs:', error);
      return [];
    }
  },

  // Get exercise logs by date range
  async getByDateRange(coupleId: string, gender: 'male' | 'female', startDate: string, endDate: string): Promise<CoupleExerciseLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs');
      const q = query(logsRef, where('gender', '==', gender));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleExerciseLog))
        .filter(entry => entry.date >= startDate && entry.date <= endDate);
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting exercise logs by date range:', error);
      return [];
    }
  },

  // Get totals for a date
  async getTotalsForDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<{ duration: number; calories: number; count: number }> {
    const entries = await this.getByDate(coupleId, gender, date);
    return {
      duration: entries.reduce((sum, e) => sum + e.duration, 0),
      calories: entries.reduce((sum, e) => sum + e.caloriesBurned, 0),
      count: entries.length,
    };
  },

  // Get exercise logs by type for a date range (for goal tracking)
  async getByTypeAndDateRange(coupleId: string, gender: 'male' | 'female', exerciseType: string, startDate: string, endDate: string): Promise<CoupleExerciseLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs');
      const q = query(logsRef, where('gender', '==', gender), where('exerciseType', '==', exerciseType));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleExerciseLog))
        .filter(entry => entry.date >= startDate && entry.date <= endDate);
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting exercise logs by type:', error);
      return [];
    }
  },

  // Delete exercise log
  async delete(coupleId: string, logId: string): Promise<void> {
    try {
      const logRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'exerciseLogs', logId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error('Error deleting exercise log:', error);
      throw error;
    }
  },
};

// ============================================
// COUPLE FOOD LOG OPERATIONS
// ============================================

export interface CoupleFoodLogItem {
  foodId: string;
  name: string;
  nameTamil: string;
  quantity: number;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CoupleFoodLog {
  id: string;
  coupleId: string;
  gender: 'male' | 'female';
  date: string; // YYYY-MM-DD format
  mealType: string; // 'early-morning', 'breakfast', 'lunch', etc.
  mealLabel: string; // Display label
  foods: CoupleFoodLogItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalGrams: number;
  loggedAt?: Timestamp;
  createdAt?: Timestamp;
}

export const coupleFoodLogService = {
  // Add food log for a couple member
  async add(coupleId: string, gender: 'male' | 'female', data: {
    mealType: string;
    mealLabel: string;
    foods: CoupleFoodLogItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalGrams: number;
    date?: string;
  }): Promise<string> {
    try {
      // Verify the couple exists
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const coupleSnapshot = await getDoc(coupleRef);
      
      if (!coupleSnapshot.exists()) {
        throw new Error(`Couple ${coupleId} not found`);
      }

      const foodLogsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'foodLogs');
      const date = data.date || formatDateString(new Date());
      
      const docRef = await addDoc(foodLogsRef, {
        coupleId,
        gender,
        date,
        mealType: data.mealType,
        mealLabel: data.mealLabel,
        foods: data.foods,
        totalCalories: data.totalCalories,
        totalProtein: data.totalProtein,
        totalCarbs: data.totalCarbs,
        totalFat: data.totalFat,
        totalGrams: data.totalGrams,
        loggedAt: now(),
        createdAt: now(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding food log:', error);
      throw error;
    }
  },

  // Get food logs for a date
  async getByDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<CoupleFoodLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'foodLogs');
      const q = query(logsRef, where('date', '==', date), where('gender', '==', gender));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleFoodLog));
      return entries.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting food logs:', error);
      return [];
    }
  },

  // Get all food logs for a date (both genders)
  async getAllByDate(coupleId: string, date: string): Promise<CoupleFoodLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'foodLogs');
      const q = query(logsRef, where('date', '==', date));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleFoodLog));
      return entries.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting all food logs:', error);
      return [];
    }
  },

  // Get food logs by date range
  async getByDateRange(coupleId: string, gender: 'male' | 'female', startDate: string, endDate: string): Promise<CoupleFoodLog[]> {
    try {
      const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'foodLogs');
      const q = query(logsRef, where('gender', '==', gender));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CoupleFoodLog))
        .filter(entry => entry.date >= startDate && entry.date <= endDate);
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting food logs by date range:', error);
      return [];
    }
  },

  // Get totals for a date
  async getTotalsForDate(coupleId: string, gender: 'male' | 'female', date: string): Promise<{ 
    calories: number; 
    protein: number; 
    carbs: number; 
    fat: number;
    grams: number;
    mealCount: number;
  }> {
    const entries = await this.getByDate(coupleId, gender, date);
    return {
      calories: entries.reduce((sum, e) => sum + e.totalCalories, 0),
      protein: entries.reduce((sum, e) => sum + e.totalProtein, 0),
      carbs: entries.reduce((sum, e) => sum + e.totalCarbs, 0),
      fat: entries.reduce((sum, e) => sum + e.totalFat, 0),
      grams: entries.reduce((sum, e) => sum + e.totalGrams, 0),
      mealCount: entries.length,
    };
  },

  // Delete food log
  async delete(coupleId: string, logId: string): Promise<void> {
    try {
      const logRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'foodLogs', logId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error('Error deleting food log:', error);
      throw error;
    }
  },
};

// ============================================
// DIET PLAN OPERATIONS (Admin managed recommendations)
// Path: /couples/{coupleId}/dietPlan
// ============================================

export interface DietPlanFood {
  id: string;
  name: string;
  nameTamil: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: string;
  quantity?: string;
  servingIndex?: number;
  servingCount?: number;
}

export interface DietPlan {
  id: string;
  coupleId: string;
  breakfast: DietPlanFood[];
  lunch: DietPlanFood[];
  dinner: DietPlanFood[];
  snacks?: DietPlanFood[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const dietPlanService = {
  // Save or update diet plan for a couple
  async save(coupleId: string, data: {
    breakfast: DietPlanFood[];
    lunch: DietPlanFood[];
    dinner: DietPlanFood[];
    snacks?: DietPlanFood[];
    notes?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<void> {
    try {
      const dietPlanRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'dietPlan', 'current');
      
      await setDoc(dietPlanRef, {
        coupleId,
        breakfast: data.breakfast,
        lunch: data.lunch,
        dinner: data.dinner,
        snacks: data.snacks || [],
        notes: data.notes || '',
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
        updatedAt: now(),
      }, { merge: true });
      
      // Set createdAt only if it's a new document
      const docSnap = await getDoc(dietPlanRef);
      if (docSnap.exists() && !docSnap.data().createdAt) {
        await updateDoc(dietPlanRef, { createdAt: now() });
      }
    } catch (error) {
      console.error('Error saving diet plan:', error);
      throw error;
    }
  },

  // Get diet plan for a couple
  async get(coupleId: string): Promise<DietPlan | null> {
    try {
      const dietPlanRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'dietPlan', 'current');
      const docSnap = await getDoc(dietPlanRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DietPlan;
      }
      return null;
    } catch (error) {
      console.error('Error getting diet plan:', error);
      return null;
    }
  },

  // Subscribe to diet plan changes (real-time)
  subscribe(coupleId: string, callback: (dietPlan: DietPlan | null) => void): Unsubscribe {
    const dietPlanRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'dietPlan', 'current');
    return onSnapshot(dietPlanRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as DietPlan);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error subscribing to diet plan:', error);
        callback(null);
      }
    );
  },

  // Delete diet plan
  async delete(coupleId: string): Promise<void> {
    try {
      const dietPlanRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'dietPlan', 'current');
      await deleteDoc(dietPlanRef);
    } catch (error) {
      console.error('Error deleting diet plan:', error);
      throw error;
    }
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

  // Get all requests (for admin)
  async getAll(): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    const q = query(requestsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
  },

  // Get requests for user
  async getByUser(userId: string): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    // Only filter by userId, sort in JavaScript to avoid composite index requirement
    const q = query(requestsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
    // Sort by createdAt descending (newest first)
    return requests.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  },

  // Get all pending requests (for admin)
  async getPending(): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    // Only filter by status, sort in JavaScript to avoid composite index requirement
    const q = query(requestsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
    // Sort by createdAt ascending (oldest first - FIFO)
    return requests.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  },

  // Update request status
  async updateStatus(requestId: string, status: SupportRequestStatus, assignedTo?: string, assignedName?: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.SUPPORT_REQUESTS, requestId);
    const updateData: any = {
      status,
      updatedAt: now(),
    };
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (assignedName) updateData.assignedName = assignedName;
    if (status === 'completed') updateData.resolvedAt = now();
    
    await updateDoc(requestRef, updateData);
  },

  // Send video URL to user
  async sendVideoUrl(requestId: string, videoUrl: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.SUPPORT_REQUESTS, requestId);
    await updateDoc(requestRef, {
      videoUrl,
      videoUrlSentAt: now(),
      status: 'in-progress',
      updatedAt: now(),
    });
  },

  // Get requests by couple ID (for user to see their requests)
  async getByCoupleId(coupleId: string): Promise<SupportRequest[]> {
    const requestsRef = collection(db, COLLECTIONS.SUPPORT_REQUESTS);
    // Only filter by coupleId, sort in JavaScript to avoid composite index requirement
    const q = query(requestsRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportRequest));
    // Sort by createdAt descending (newest first)
    return requests.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  },

  // Cancel request (by user or admin)
  async cancelRequest(requestId: string, cancelledBy: 'user' | 'admin', cancelReason?: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.SUPPORT_REQUESTS, requestId);
    const updateData: any = {
      status: 'cancelled',
      cancelledBy,
      updatedAt: now(),
    };
    if (cancelReason) updateData.cancelReason = cancelReason;
    await updateDoc(requestRef, updateData);
  },

  // Delete request permanently (for completed/cancelled requests)
  async delete(requestId: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.SUPPORT_REQUESTS, requestId);
    await deleteDoc(requestRef);
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
// GLOBAL SETTINGS OPERATIONS (Admin managed)
// Path: /settings/globalSettings
// ============================================

const DEFAULT_GLOBAL_SETTINGS: Omit<GlobalSettings, 'updatedAt'> = {
  dailySteps: 7000,
  coupleWalkingMinutes: 60,
  highKneesMinutes: 30,
  dailyCaloriesBurnt: 200,
  weeklySteps: 49000,
  weeklyCoupleWalkingMinutes: 420,
  weeklyHighKneesMinutes: 210,
  dataCollectionPeriods: {
    dietLogging: {
      startDate: '',
      endDate: '',
    },
    exerciseFrequency: {
      frequency: 'daily',
      startDate: '',
    },
    weightTracking: {
      frequency: 'weekly',
      reminderEnabled: true,
    },
  },
};

export const globalSettingsService = {
  // Get global settings
  async get(): Promise<GlobalSettings> {
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'globalSettings');
      const snapshot = await getDoc(settingsRef);
      
      if (snapshot.exists()) {
        return snapshot.data() as GlobalSettings;
      }
      
      // Return default settings if document doesn't exist
      return {
        ...DEFAULT_GLOBAL_SETTINGS,
        updatedAt: now(),
      } as GlobalSettings;
    } catch (error) {
      console.error('Error getting global settings:', error);
      return {
        ...DEFAULT_GLOBAL_SETTINGS,
        updatedAt: now(),
      } as GlobalSettings;
    }
  },

  // Update global settings
  async update(data: Partial<GlobalSettings>, adminId?: string): Promise<void> {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'globalSettings');
    
    // Calculate weekly goals if daily goals are updated
    const updateData: Partial<GlobalSettings> = {
      ...data,
      updatedAt: now(),
    };
    
    if (adminId) {
      updateData.updatedBy = adminId;
    }
    
    // Auto-calculate weekly goals
    if (data.dailySteps !== undefined) {
      updateData.weeklySteps = data.dailySteps * 7;
    }
    if (data.coupleWalkingMinutes !== undefined) {
      updateData.weeklyCoupleWalkingMinutes = data.coupleWalkingMinutes * 7;
    }
    if (data.highKneesMinutes !== undefined) {
      updateData.weeklyHighKneesMinutes = data.highKneesMinutes * 7;
    }
    
    await setDoc(settingsRef, updateData, { merge: true });
  },

  // Save all goals at once
  async saveGoals(goals: {
    dailySteps: number;
    coupleWalkingMinutes: number;
    highKneesMinutes: number;
    dailyCaloriesBurnt: number;
  }, adminId?: string): Promise<void> {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'globalSettings');
    
    const updateData: Partial<GlobalSettings> = {
      dailySteps: goals.dailySteps,
      coupleWalkingMinutes: goals.coupleWalkingMinutes,
      highKneesMinutes: goals.highKneesMinutes,
      dailyCaloriesBurnt: goals.dailyCaloriesBurnt,
      weeklySteps: goals.dailySteps * 7,
      weeklyCoupleWalkingMinutes: goals.coupleWalkingMinutes * 7,
      weeklyHighKneesMinutes: goals.highKneesMinutes * 7,
      updatedAt: now(),
    };
    
    if (adminId) {
      updateData.updatedBy = adminId;
    }
    
    await setDoc(settingsRef, updateData, { merge: true });
  },

  // Subscribe to settings changes (real-time)
  subscribe(callback: (settings: GlobalSettings) => void): Unsubscribe {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'globalSettings');
    return onSnapshot(settingsRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as GlobalSettings);
        } else {
          callback({
            ...DEFAULT_GLOBAL_SETTINGS,
            updatedAt: now(),
          } as GlobalSettings);
        }
      },
      (error) => {
        console.error('Global settings subscription error:', error);
        callback({
          ...DEFAULT_GLOBAL_SETTINGS,
          updatedAt: now(),
        } as GlobalSettings);
      }
    );
  },
};

// ============================================
// DOCTOR VISIT SERVICE (User logs doctor visits)
// Path: /couples/{coupleId}/doctorVisits/{visitId}
// ============================================

export const doctorVisitService = {
  // Add a doctor visit (logged by user)
  async add(coupleId: string, gender: 'male' | 'female', data: {
    date: string;
    time: string;
    doctorName?: string;
    purpose?: string;
    location?: string;
    notes?: string;
    loggedBy: string;
  }): Promise<string> {
    try {
      const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS);
      const docRef = await addDoc(visitsRef, {
        coupleId,
        gender,
        date: data.date,
        time: data.time,
        doctorName: data.doctorName || null,
        purpose: data.purpose || null,
        location: data.location || null,
        notes: data.notes || null,
        loggedBy: data.loggedBy,
        status: 'upcoming' as DoctorVisitStatus,
        loggedAt: now(),
        createdAt: now(),
        updatedAt: now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding doctor visit:', error);
      throw error;
    }
  },

  // Get all doctor visits for a couple member
  // Uses simple query without composite index requirement
  async getAll(coupleId: string, gender: 'male' | 'female'): Promise<DoctorVisit[]> {
    try {
      const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS);
      // Simple query - fetch all, then filter and sort client-side to avoid index requirement
      const snapshot = await getDocs(visitsRef);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as DoctorVisit))
        .filter(v => v.gender === gender)
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting doctor visits:', error);
      return [];
    }
  },

  // Get all doctor visits for a couple (both members) - for admin
  // Uses simple query to avoid index requirement
  async getAllForCouple(coupleId: string): Promise<DoctorVisit[]> {
    try {
      const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS);
      const snapshot = await getDocs(visitsRef);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as DoctorVisit))
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting all doctor visits for couple:', error);
      return [];
    }
  },

  // Get upcoming doctor visits
  async getUpcoming(coupleId: string, gender: 'male' | 'female'): Promise<DoctorVisit[]> {
    const today = formatDateString(new Date());
    const visits = await this.getAll(coupleId, gender);
    return visits.filter(v => v.date >= today && v.status === 'upcoming');
  },

  // Update doctor visit status
  async updateStatus(coupleId: string, visitId: string, status: DoctorVisitStatus): Promise<void> {
    try {
      const visitRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS, visitId);
      await updateDoc(visitRef, {
        status,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error updating doctor visit status:', error);
      throw error;
    }
  },

  // Delete doctor visit
  async delete(coupleId: string, visitId: string): Promise<void> {
    try {
      const visitRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS, visitId);
      await deleteDoc(visitRef);
    } catch (error) {
      console.error('Error deleting doctor visit:', error);
      throw error;
    }
  },
};

// ============================================
// NURSING DEPARTMENT VISIT SERVICE (Admin schedules visits)
// Path: /couples/{coupleId}/nursingVisits/{visitId}
// ============================================

export const nursingVisitService = {
  // Schedule a nursing department visit (by admin)
  async schedule(coupleId: string, data: {
    coupleName: string;
    date: string;
    time: string;
    visitNumber?: number;
    departmentName?: string;
    assignedNurse?: string;
    location?: string;
    purpose?: string;
    notes?: string;
    scheduledBy: string;
    scheduledByName?: string;
    linkedDoctorVisitId?: string;
    linkedDoctorVisitDate?: string;
  }): Promise<string> {
    try {
      const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS);
      const docRef = await addDoc(visitsRef, {
        coupleId,
        coupleName: data.coupleName,
        date: data.date,
        time: data.time,
        visitNumber: data.visitNumber || null,
        departmentName: data.departmentName || 'Nursing Department',
        assignedNurse: data.assignedNurse || null,
        location: data.location || null,
        purpose: data.purpose || null,
        notes: data.notes || null,
        status: 'scheduled' as NursingVisitStatus,
        scheduledBy: data.scheduledBy,
        scheduledByName: data.scheduledByName || null,
        linkedDoctorVisitId: data.linkedDoctorVisitId || null,
        linkedDoctorVisitDate: data.linkedDoctorVisitDate || null,
        createdAt: now(),
        updatedAt: now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error scheduling nursing visit:', error);
      throw error;
    }
  },

  // Get all nursing visits for a couple
  async getAll(coupleId: string): Promise<NursingDepartmentVisit[]> {
    try {
      const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS);
      const q = query(visitsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingDepartmentVisit));
    } catch (error) {
      console.error('Error getting nursing visits:', error);
      // Fallback without ordering
      try {
        const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS);
        const snapshot = await getDocs(visitsRef);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as NursingDepartmentVisit))
          .sort((a, b) => b.date.localeCompare(a.date));
      } catch (err) {
        return [];
      }
    }
  },

  // Get upcoming nursing visits for a couple (for user dashboard)
  async getUpcoming(coupleId: string): Promise<NursingDepartmentVisit[]> {
    const today = formatDateString(new Date());
    const visits = await this.getAll(coupleId);
    return visits
      .filter(v => v.date >= today && (v.status === 'scheduled' || v.status === 'confirmed'))
      .sort((a, b) => a.date.localeCompare(b.date)); // Ascending for upcoming
  },

  // Get next nursing visit (for dashboard display)
  async getNext(coupleId: string): Promise<NursingDepartmentVisit | null> {
    const upcoming = await this.getUpcoming(coupleId);
    return upcoming.length > 0 ? upcoming[0] : null;
  },

  // Update nursing visit status
  async updateStatus(coupleId: string, visitId: string, status: NursingVisitStatus, completionNotes?: string): Promise<void> {
    try {
      const visitRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS, visitId);
      const updateData: Record<string, any> = {
        status,
        updatedAt: now(),
      };
      if (status === 'completed') {
        updateData.completedAt = now();
        if (completionNotes) {
          updateData.completionNotes = completionNotes;
        }
      }
      await updateDoc(visitRef, updateData);
    } catch (error) {
      console.error('Error updating nursing visit status:', error);
      throw error;
    }
  },

  // Update nursing visit details
  async update(coupleId: string, visitId: string, data: Partial<NursingDepartmentVisit>): Promise<void> {
    try {
      const visitRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS, visitId);
      await updateDoc(visitRef, {
        ...data,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error updating nursing visit:', error);
      throw error;
    }
  },

  // Delete nursing visit
  async delete(coupleId: string, visitId: string): Promise<void> {
    try {
      const visitRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS, visitId);
      await deleteDoc(visitRef);
    } catch (error) {
      console.error('Error deleting nursing visit:', error);
      throw error;
    }
  },

  // Get all nursing visits across all couples (for admin) - requires fetching all couples first
  async getAllForAdmin(limitCount: number = 100): Promise<(NursingDepartmentVisit & { coupleId: string })[]> {
    try {
      // Get all active couples first
      const couplesRef = collection(db, COLLECTIONS.COUPLES);
      const couplesSnapshot = await getDocs(query(couplesRef, where('status', '==', 'active'), limit(limitCount)));
      
      const allVisits: (NursingDepartmentVisit & { coupleId: string })[] = [];
      
      // Fetch nursing visits for each couple
      for (const coupleDoc of couplesSnapshot.docs) {
        const coupleId = coupleDoc.id;
        const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.NURSING_VISITS);
        const visitsSnapshot = await getDocs(visitsRef);
        
        visitsSnapshot.docs.forEach(visitDoc => {
          allVisits.push({
            id: visitDoc.id,
            coupleId,
            ...visitDoc.data(),
          } as NursingDepartmentVisit & { coupleId: string });
        });
      }
      
      // Sort by date descending
      return allVisits.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting all nursing visits for admin:', error);
      return [];
    }
  },

  // Get all doctor visits across all couples (for admin view)
  async getAllDoctorVisitsForAdmin(limitCount: number = 100): Promise<(DoctorVisit & { coupleId: string })[]> {
    try {
      // Get all active couples first
      const couplesRef = collection(db, COLLECTIONS.COUPLES);
      const couplesSnapshot = await getDocs(query(couplesRef, where('status', '==', 'active'), limit(limitCount)));
      
      const allVisits: (DoctorVisit & { coupleId: string })[] = [];
      
      // Fetch doctor visits for each couple
      for (const coupleDoc of couplesSnapshot.docs) {
        const coupleId = coupleDoc.id;
        const visitsRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DOCTOR_VISITS);
        const visitsSnapshot = await getDocs(visitsRef);
        
        visitsSnapshot.docs.forEach(visitDoc => {
          allVisits.push({
            id: visitDoc.id,
            coupleId,
            ...visitDoc.data(),
          } as DoctorVisit & { coupleId: string });
        });
      }
      
      // Sort by date descending
      return allVisits.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error getting all doctor visits for admin:', error);
      return [];
    }
  },
};

// ============================================
// BROADCAST SERVICE
// ============================================

export const broadcastService = {
  // Create a new broadcast
  async create(data: Omit<Broadcast, 'id' | 'createdAt' | 'sentAt'>): Promise<string> {
    try {
      const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
      const docRef = await addDoc(broadcastRef, {
        ...data,
        createdAt: now(),
        status: 'sent',
        sentAt: now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating broadcast:', error);
      throw error;
    }
  },

  // Get all broadcasts (newest first)
  async getAll(limitCount: number = 50): Promise<Broadcast[]> {
    try {
      const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
      const q = query(broadcastRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Broadcast[];
    } catch (error) {
      console.error('Error getting broadcasts:', error);
      return [];
    }
  },

  // Get recent broadcasts (for user notifications - last 7 days)
  // Uses simple query and filters client-side to avoid composite index requirement
  async getRecent(days: number = 7): Promise<Broadcast[]> {
    try {
      const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Simple query - filter by status only, then filter by date client-side
      const q = query(
        broadcastRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const broadcasts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Broadcast[];
      
      // Filter client-side for sent status and recent date
      return broadcasts.filter(b => {
        if (b.status !== 'sent') return false;
        // Use sentAt if available, otherwise fallback to createdAt
        const timestamp = b.sentAt || b.createdAt;
        if (!timestamp) return false;
        const sentAt = timestamp.toDate ? timestamp.toDate() : new Date(timestamp as any);
        return sentAt >= cutoffDate;
      }).slice(0, 20);
    } catch (error) {
      console.error('Error getting recent broadcasts:', error);
      return [];
    }
  },

  // Get a single broadcast by ID
  async get(broadcastId: string): Promise<Broadcast | null> {
    try {
      const broadcastRef = doc(db, COLLECTIONS.BROADCASTS, broadcastId);
      const snapshot = await getDoc(broadcastRef);
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Broadcast : null;
    } catch (error) {
      console.error('Error getting broadcast:', error);
      return null;
    }
  },

  // Delete a broadcast
  async delete(broadcastId: string): Promise<void> {
    try {
      const broadcastRef = doc(db, COLLECTIONS.BROADCASTS, broadcastId);
      await deleteDoc(broadcastRef);
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      throw error;
    }
  },

  // Update a broadcast (edit title, message, expiry)
  async update(broadcastId: string, data: { title?: string; message?: string; expiresAt?: Timestamp | null; priority?: 'normal' | 'important' | 'urgent' }): Promise<void> {
    try {
      const broadcastRef = doc(db, COLLECTIONS.BROADCASTS, broadcastId);
      await updateDoc(broadcastRef, {
        ...data,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error updating broadcast:', error);
      throw error;
    }
  },

  // Clear all broadcasts (delete all)
  async clearAll(): Promise<void> {
    try {
      const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
      const snapshot = await getDocs(broadcastRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error clearing all broadcasts:', error);
      throw error;
    }
  },

  // Get active broadcasts (not expired, for user view)
  async getActive(): Promise<Broadcast[]> {
    try {
      const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
      const q = query(
        broadcastRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const broadcasts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Broadcast[];
      
      // Filter out expired broadcasts client-side
      const now = new Date();
      return broadcasts.filter(b => {
        if (b.status !== 'sent') return false;
        // Check if expired
        if (b.expiresAt) {
          const expiryDate = b.expiresAt.toDate ? b.expiresAt.toDate() : new Date(b.expiresAt as any);
          if (expiryDate < now) return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Error getting active broadcasts:', error);
      return [];
    }
  },

  // Subscribe to broadcasts in real-time
  // Uses simple query to avoid composite index requirement
  subscribeToRecent(days: number = 7, callback: (broadcasts: Broadcast[]) => void): Unsubscribe {
    const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
    
    const q = query(
      broadcastRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const broadcasts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Broadcast[];
      
      // Filter client-side
      const filtered = broadcasts.filter(b => {
        if (b.status !== 'sent') return false;
        // Use sentAt if available, otherwise fallback to createdAt
        const timestamp = b.sentAt || b.createdAt;
        if (!timestamp) return false;
        const sentAt = timestamp.toDate ? timestamp.toDate() : new Date(timestamp as any);
        return sentAt >= cutoffDate;
      }).slice(0, 20);
      
      callback(filtered);
    });
  },
};

// ============================================
// SUPPORT CHAT SERVICE
// Real-time chat between users and admins
// ============================================

export const chatService = {
  // Create or get existing chat for a user
  async getOrCreate(userId: string, userName: string, coupleId: string, gender: 'male' | 'female'): Promise<Chat> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      const chatSnapshot = await getDoc(chatRef);
      
      if (chatSnapshot.exists()) {
        return { id: chatSnapshot.id, ...chatSnapshot.data() } as Chat;
      }
      
      // Create new chat
      const newChat: Omit<Chat, 'id'> = {
        odAaByuserId: userId,
        odAaByuserName: userName,
        coupleId,
        gender,
        status: 'active',
        lastMessage: '',
        lastMessageAt: now(),
        lastMessageBy: 'user',
        unreadByUser: 0,
        unreadByAdmin: 0,
        typing: {
          user: false,
          admin: false,
        },
        createdAt: now(),
        updatedAt: now(),
      };
      
      await setDoc(chatRef, newChat);
      return { id: userId, ...newChat };
    } catch (error) {
      console.error('Error getting or creating chat:', error);
      throw error;
    }
  },

  // Get a chat by user ID
  async get(userId: string): Promise<Chat | null> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      const snapshot = await getDoc(chatRef);
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Chat : null;
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  },

  // Get all chats (for admin support inbox)
  async getAll(): Promise<Chat[]> {
    try {
      const chatsRef = collection(db, COLLECTIONS.CHATS);
      const q = query(chatsRef, orderBy('lastMessageAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
    } catch (error) {
      console.error('Error getting all chats:', error);
      return [];
    }
  },

  // Subscribe to all chats (for admin - real-time)
  subscribeToAll(callback: (chats: Chat[]) => void): Unsubscribe {
    const chatsRef = collection(db, COLLECTIONS.CHATS);
    const q = query(chatsRef, orderBy('lastMessageAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    }, (error) => {
      console.error('Chat subscription error:', error);
      callback([]);
    });
  },

  // Subscribe to a single chat (for real-time updates)
  subscribe(userId: string, callback: (chat: Chat | null) => void): Unsubscribe {
    const chatRef = doc(db, COLLECTIONS.CHATS, userId);
    return onSnapshot(chatRef, (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Chat : null);
    }, (error) => {
      console.error('Chat subscription error:', error);
      callback(null);
    });
  },

  // Update chat status (active/resolved)
  async updateStatus(userId: string, status: 'active' | 'resolved'): Promise<void> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      await updateDoc(chatRef, {
        status,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error updating chat status:', error);
      throw error;
    }
  },

  // Set typing indicator
  async setTyping(userId: string, isTyping: boolean, senderType: 'user' | 'admin'): Promise<void> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      await updateDoc(chatRef, {
        [`typing.${senderType}`]: isTyping,
      });
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  },

  // Mark messages as read (by user or admin)
  async markAsRead(userId: string, readerType: 'user' | 'admin'): Promise<void> {
    try {
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      const field = readerType === 'user' ? 'unreadByUser' : 'unreadByAdmin';
      await updateDoc(chatRef, {
        [field]: 0,
        updatedAt: now(),
      });
      
      // Also mark individual messages as read
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const otherType = readerType === 'user' ? 'admin' : 'user';
      const q = query(messagesRef, where('senderType', '==', otherType), where('readAt', '==', null));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { readAt: now() });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  // Delete chat (and all messages) - cleanup after 7 days
  async delete(userId: string): Promise<void> {
    try {
      // First delete all messages in the subcollection
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const snapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Then delete the chat document
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      await deleteDoc(chatRef);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },

  // ============================================
  // MESSAGE OPERATIONS
  // ============================================

  // Send a message
  async sendMessage(
    userId: string,
    data: {
      senderId: string;
      senderName: string;
      senderType: 'user' | 'admin';
      message: string;
      messageType?: 'text' | 'image' | 'file';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
    }
  ): Promise<string> {
    try {
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const docRef = await addDoc(messagesRef, {
        chatId: userId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderType: data.senderType,
        message: data.message,
        messageType: data.messageType || 'text',
        mediaUrl: data.mediaUrl || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        readAt: null,
        createdAt: now(),
        deletedByUser: false,
        deletedByAdmin: false,
      });
      
      // Update chat document with last message info
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      const unreadField = data.senderType === 'user' ? 'unreadByAdmin' : 'unreadByUser';
      
      // Use atomic increment for unread count
      await updateDoc(chatRef, {
        lastMessage: data.message.substring(0, 100),
        lastMessageAt: now(),
        lastMessageBy: data.senderType,
        [unreadField]: increment(1),
        updatedAt: now(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a chat (with 7-day filter)
  async getMessages(userId: string, limitCount: number = 100): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const q = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      // Filter for messages within last 7 days
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .filter(msg => {
          const createdAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt as any);
          return createdAt >= sevenDaysAgo;
        });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  // Subscribe to messages (real-time)
  subscribeToMessages(userId: string, callback: (messages: ChatMessage[]) => void): Unsubscribe {
    const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(200));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .filter(msg => {
          const createdAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt as any);
          return createdAt >= sevenDaysAgo;
        });
      callback(messages);
    }, (error) => {
      console.error('Messages subscription error:', error);
      callback([]);
    });
  },

  // Delete a message (soft delete for the specific user)
  async deleteMessage(userId: string, messageId: string, deletedBy: 'user' | 'admin'): Promise<void> {
    try {
      const messageRef = doc(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES, messageId);
      const field = deletedBy === 'user' ? 'deletedByUser' : 'deletedByAdmin';
      await updateDoc(messageRef, {
        [field]: true,
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Hard delete a message (permanently remove)
  async hardDeleteMessage(userId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES, messageId);
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Error hard deleting message:', error);
      throw error;
    }
  },

  // Cleanup old messages (delete messages older than 7 days)
  // This should be called periodically or on app open
  async cleanupOldMessages(userId: string): Promise<number> {
    try {
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const snapshot = await getDocs(messagesRef);
      
      let deletedCount = 0;
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        if (createdAt < sevenDaysAgo) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
      return 0;
    }
  },

  // Clear all messages in a chat (for both user and admin)
  async clearAllMessages(userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, COLLECTIONS.CHATS, userId, COLLECTIONS.CHAT_MESSAGES);
      const snapshot = await getDocs(messagesRef);
      
      if (snapshot.docs.length === 0) return;
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Reset the chat's last message info
      const chatRef = doc(db, COLLECTIONS.CHATS, userId);
      await updateDoc(chatRef, {
        lastMessage: '',
        lastMessageAt: now(),
        unreadByUser: 0,
        unreadByAdmin: 0,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error clearing all messages:', error);
      throw error;
    }
  },

  // Get total unread count for admin (across all chats)
  async getTotalUnreadForAdmin(): Promise<number> {
    try {
      const chats = await this.getAll();
      return chats.reduce((total, chat) => total + (chat.unreadByAdmin || 0), 0);
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return 0;
    }
  },
};

// ============================================
// QUESTIONNAIRE SERVICE
// Path: /couples/{coupleId}/questionnaire/{gender}
// ============================================

export const questionnaireService = {
  /**
   * Get questionnaire progress for a user
   */
  async getProgress(
    coupleId: string,
    gender: 'male' | 'female'
  ): Promise<QuestionnaireProgress | null> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as QuestionnaireProgress;
      }
      return null;
    } catch (error) {
      console.error('Error getting questionnaire progress:', error);
      return null;
    }
  },

  /**
   * Start a new questionnaire (or reset if changing language)
   */
  async startQuestionnaire(
    coupleId: string,
    gender: 'male' | 'female',
    language: QuestionnaireLanguage
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      const initialProgress = initializeProgress(language, gender);

      const newProgress: Omit<QuestionnaireProgress, 'id'> = {
        coupleId,
        gender,
        language,
        answers: {},
        progress: initialProgress,
        currentPosition: {
          partIndex: 0,
          sectionIndex: 0,
          questionIndex: 0,
        },
        status: 'in-progress',
        isComplete: false,
        startedAt: now(),
        lastUpdatedAt: now(),
        createdAt: now(),
      };

      await setDoc(docRef, newProgress);

      // Update couple document to track questionnaire status
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      await updateDoc(coupleRef, {
        [`${gender}.questionnaireStarted`]: true,
        [`${gender}.questionnaireLanguage`]: language,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error starting questionnaire:', error);
      throw error;
    }
  },

  /**
   * Save an answer to a question
   */
  async saveAnswer(
    coupleId: string,
    gender: 'male' | 'female',
    answer: QuestionnaireAnswer
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);

      // Get current progress to recalculate
      const currentProgress = await this.getProgress(coupleId, gender);
      if (!currentProgress) {
        throw new Error('Questionnaire not started');
      }

      // Add the new answer
      const updatedAnswers = {
        ...currentProgress.answers,
        [answer.questionId]: answer,
      };

      // Recalculate progress
      const answeredIds = Object.keys(updatedAnswers);
      const newProgress = calculateProgress(
        currentProgress.language,
        gender,
        answeredIds
      );

      await updateDoc(docRef, {
        [`answers.${answer.questionId}`]: answer,
        progress: newProgress,
        lastUpdatedAt: now(),
      });
    } catch (error) {
      console.error('Error saving questionnaire answer:', error);
      throw error;
    }
  },

  /**
   * Update current position (for resume functionality)
   */
  async updatePosition(
    coupleId: string,
    gender: 'male' | 'female',
    position: { partIndex: number; sectionIndex: number; questionIndex: number }
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      await updateDoc(docRef, {
        currentPosition: position,
        lastUpdatedAt: now(),
      });
    } catch (error) {
      console.error('Error updating questionnaire position:', error);
      throw error;
    }
  },

  /**
   * Complete the questionnaire
   */
  async completeQuestionnaire(
    coupleId: string,
    gender: 'male' | 'female'
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      await updateDoc(docRef, {
        status: 'completed',
        isComplete: true,
        completedAt: now(),
        lastUpdatedAt: now(),
      });

      // Update couple document
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      await updateDoc(coupleRef, {
        [`${gender}.questionnaireCompleted`]: true,
        [`${gender}.questionnaireCompletedAt`]: now(),
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error completing questionnaire:', error);
      throw error;
    }
  },

  /**
   * Reset questionnaire (when user wants to change language)
   */
  async resetQuestionnaire(
    coupleId: string,
    gender: 'male' | 'female'
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      await deleteDoc(docRef);

      // Update couple document
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      await updateDoc(coupleRef, {
        [`${gender}.questionnaireStarted`]: false,
        [`${gender}.questionnaireCompleted`]: false,
        [`${gender}.questionnaireLanguage`]: null,
        [`${gender}.questionnaireCompletedAt`]: null,
        updatedAt: now(),
      });
    } catch (error) {
      console.error('Error resetting questionnaire:', error);
      throw error;
    }
  },

  /**
   * Subscribe to questionnaire progress changes (real-time)
   */
  subscribeProgress(
    coupleId: string,
    gender: 'male' | 'female',
    callback: (progress: QuestionnaireProgress | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'questionnaire', gender);
      return onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as QuestionnaireProgress);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Questionnaire subscription error:', error);
          callback(null);
        }
      );
    } catch (error) {
      console.error('Failed to setup questionnaire subscription:', error);
      callback(null);
      return () => {};
    }
  },

  /**
   * Get all questionnaire responses for admin view
   */
  async getAllResponses(): Promise<
    Array<{
      coupleId: string;
      gender: 'male' | 'female';
      progress: QuestionnaireProgress;
      coupleName?: string;
    }>
  > {
    try {
      const couplesRef = collection(db, COLLECTIONS.COUPLES);
      const couplesSnap = await getDocs(couplesRef);
      const responses: Array<any> = [];

      for (const coupleDoc of couplesSnap.docs) {
        const coupleData = coupleDoc.data();
        const coupleId = coupleDoc.id;

        // Check male questionnaire
        const maleProgress = await this.getProgress(coupleId, 'male');
        if (maleProgress) {
          responses.push({
            coupleId,
            gender: 'male' as const,
            progress: maleProgress,
            coupleName: coupleData.male?.name || 'Unknown',
          });
        }

        // Check female questionnaire
        const femaleProgress = await this.getProgress(coupleId, 'female');
        if (femaleProgress) {
          responses.push({
            coupleId,
            gender: 'female' as const,
            progress: femaleProgress,
            coupleName: coupleData.female?.name || 'Unknown',
          });
        }
      }

      // Sort by last updated
      responses.sort((a, b) => {
        const aTime = a.progress.lastUpdatedAt?.toDate?.()?.getTime() || 0;
        const bTime = b.progress.lastUpdatedAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      return responses;
    } catch (error) {
      console.error('Error getting all questionnaire responses:', error);
      return [];
    }
  },

  /**
   * Get completed questionnaire responses only (for admin filtering)
   */
  async getCompletedResponses(): Promise<
    Array<{
      coupleId: string;
      gender: 'male' | 'female';
      progress: QuestionnaireProgress;
      coupleName?: string;
    }>
  > {
    const allResponses = await this.getAllResponses();
    return allResponses.filter((r) => r.progress.isComplete);
  },

  /**
   * Get in-progress questionnaire responses only (for admin filtering)
   */
  async getInProgressResponses(): Promise<
    Array<{
      coupleId: string;
      gender: 'male' | 'female';
      progress: QuestionnaireProgress;
      coupleName?: string;
    }>
  > {
    const allResponses = await this.getAllResponses();
    return allResponses.filter((r) => !r.progress.isComplete);
  },

  /**
   * Get questionnaire summary for a specific user (for profile display)
   */
  async getQuestionnaireStatus(
    coupleId: string,
    gender: 'male' | 'female'
  ): Promise<{
    hasStarted: boolean;
    isComplete: boolean;
    percentComplete: number;
    language?: QuestionnaireLanguage;
    answeredCount: number;
    totalCount: number;
    sectionProgress: Array<{
      sectionTitle: string;
      answered: number;
      total: number;
      isComplete: boolean;
    }>;
  }> {
    try {
      const progress = await this.getProgress(coupleId, gender);

      if (!progress) {
        return {
          hasStarted: false,
          isComplete: false,
          percentComplete: 0,
          answeredCount: 0,
          totalCount: 0,
          sectionProgress: [],
        };
      }

      const sectionProgress: Array<any> = [];
      progress.progress.parts.forEach((part) => {
        part.sections.forEach((section) => {
          sectionProgress.push({
            sectionTitle: section.sectionTitle,
            answered: section.answeredQuestions,
            total: section.totalQuestions,
            isComplete: section.isComplete,
          });
        });
      });

      return {
        hasStarted: true,
        isComplete: progress.isComplete,
        percentComplete: progress.progress.percentComplete,
        language: progress.language,
        answeredCount: progress.progress.answeredQuestions,
        totalCount: progress.progress.totalQuestions,
        sectionProgress,
      };
    } catch (error) {
      console.error('Error getting questionnaire status:', error);
      return {
        hasStarted: false,
        isComplete: false,
        percentComplete: 0,
        answeredCount: 0,
        totalCount: 0,
        sectionProgress: [],
      };
    }
  },
};

// ============================================
// FEEDBACK SERVICE
// ============================================

export const feedbackService = {
  // Submit feedback from user
  async submit(data: {
    coupleId: string;
    coupleName: string;
    userId: string;
    userName: string;
    userEmail: string;
    userGender: 'male' | 'female';
    category: FeedbackCategory;
    rating: number;
    message: string;
  }): Promise<string> {
    const feedbackRef = collection(db, COLLECTIONS.FEEDBACKS);
    const docRef = await addDoc(feedbackRef, {
      ...data,
      status: 'pending' as FeedbackStatus,
      createdAt: now(),
      updatedAt: now(),
    });
    
    // Update the document with its ID
    await updateDoc(docRef, { id: docRef.id });
    
    return docRef.id;
  },

  // Get all feedbacks (for admin)
  async getAll(): Promise<Feedback[]> {
    const feedbackRef = collection(db, COLLECTIONS.FEEDBACKS);
    const q = query(feedbackRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Feedback);
  },

  // Get pending feedbacks count (for admin badge)
  async getPendingCount(): Promise<number> {
    const feedbackRef = collection(db, COLLECTIONS.FEEDBACKS);
    const q = query(feedbackRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Get feedbacks by status
  async getByStatus(status: FeedbackStatus): Promise<Feedback[]> {
    const feedbackRef = collection(db, COLLECTIONS.FEEDBACKS);
    const q = query(
      feedbackRef, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Feedback);
  },

  // Update feedback status (admin)
  async updateStatus(
    feedbackId: string, 
    status: FeedbackStatus, 
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<void> {
    const feedbackRef = doc(db, COLLECTIONS.FEEDBACKS, feedbackId);
    const updateData: Record<string, any> = {
      status,
      updatedAt: now(),
    };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }
    
    if (status === 'resolved' && resolvedBy) {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = now();
    }
    
    await updateDoc(feedbackRef, updateData);
  },

  // Subscribe to feedbacks (real-time)
  subscribeToFeedbacks(
    callback: (feedbacks: Feedback[]) => void,
    statusFilter?: FeedbackStatus
  ): Unsubscribe {
    const feedbackRef = collection(db, COLLECTIONS.FEEDBACKS);
    let q;
    
    if (statusFilter) {
      q = query(
        feedbackRef,
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(feedbackRef, orderBy('createdAt', 'desc'));
    }
    
    return onSnapshot(q, (snapshot) => {
      const feedbacks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Feedback);
      callback(feedbacks);
    });
  },

  // Delete feedback
  async delete(feedbackId: string): Promise<void> {
    const feedbackRef = doc(db, COLLECTIONS.FEEDBACKS, feedbackId);
    await deleteDoc(feedbackRef);
  },
};

// ============================================
// DEVICE SERVICE - User Device Management
// Path: /couples/{coupleId}/devices/{deviceId}
// ============================================

export const deviceService = {
  // Generate a unique device session token
  generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },

  // Register or update device when user logs in
  async registerDevice(
    coupleId: string, 
    gender: 'male' | 'female',
    deviceInfo: Omit<UserDevice, 'id' | 'firstLoginAt' | 'lastActiveAt' | 'status' | 'isCurrentDevice' | 'coupleId' | 'userGender'>
  ): Promise<{ deviceId: string; sessionToken: string }> {
    const devicesRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'devices');
    const sessionToken = this.generateSessionToken();
    
    try {
      // Get all devices for this user and find if this device exists
      const userDevicesQuery = query(devicesRef, where('userGender', '==', gender));
      const userDevices = await getDocs(userDevicesQuery);
      
      // Find existing device by matching device name and os
      let existingDevice: any = null;
      userDevices.docs.forEach(deviceDoc => {
        const data = deviceDoc.data();
        if (data.deviceName === deviceInfo.deviceName && data.os === deviceInfo.os) {
          existingDevice = { id: deviceDoc.id, ref: deviceDoc.ref, data };
        }
      });
      
      if (existingDevice) {
        // Update existing device
        await updateDoc(existingDevice.ref, {
          ...deviceInfo,
          sessionToken,
          status: 'active' as DeviceStatus,
          isCurrentDevice: true,
          lastActiveAt: now(),
        });
        
        // Mark other devices of this user as not current
        const batch = writeBatch(db);
        userDevices.docs.forEach(deviceDoc => {
          if (deviceDoc.id !== existingDevice.id) {
            batch.update(deviceDoc.ref, { isCurrentDevice: false });
          }
        });
        if (userDevices.docs.length > 1) {
          await batch.commit();
        }
        
        return { deviceId: existingDevice.id, sessionToken };
      } else {
        // Create new device entry
        const newDevice: Omit<UserDevice, 'id'> = {
          ...deviceInfo,
          sessionToken,
          status: 'active',
          isCurrentDevice: true,
          firstLoginAt: now(),
          lastActiveAt: now(),
          coupleId,
          userGender: gender,
        };
        
        const docRef = await addDoc(devicesRef, newDevice);
        
        // Mark other devices of this user as not current
        const batch = writeBatch(db);
        userDevices.docs.forEach(deviceDoc => {
          batch.update(deviceDoc.ref, { isCurrentDevice: false });
        });
        if (userDevices.docs.length > 0) {
          await batch.commit();
        }
        
        return { deviceId: docRef.id, sessionToken };
      }
    } catch (error) {
      console.error('Error in registerDevice:', error);
      // If query fails (e.g., no index), try simple add
      const newDevice: Omit<UserDevice, 'id'> = {
        ...deviceInfo,
        sessionToken,
        status: 'active',
        isCurrentDevice: true,
        firstLoginAt: now(),
        lastActiveAt: now(),
        coupleId,
        userGender: gender,
      };
      
      const docRef = await addDoc(devicesRef, newDevice);
      return { deviceId: docRef.id, sessionToken };
    }
  },

  // Get all devices for a user (filtered by gender)
  async getDevices(coupleId: string, gender: 'male' | 'female'): Promise<UserDevice[]> {
    const devicesRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'devices');
    const q = query(devicesRef, where('userGender', '==', gender));
    const snapshot = await getDocs(q);
    const devices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserDevice);
    // Sort by lastActiveAt descending in JavaScript to avoid composite index requirement
    return devices.sort((a, b) => {
      const aTime = a.lastActiveAt?.toMillis?.() || 0;
      const bTime = b.lastActiveAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  },

  // Update device last active time
  async updateLastActive(coupleId: string, gender: 'male' | 'female', deviceId: string): Promise<void> {
    const deviceRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'devices', deviceId);
    await updateDoc(deviceRef, {
      lastActiveAt: now(),
      status: 'active' as DeviceStatus,
    });
  },

  // Logout a specific device (remote logout)
  async logoutDevice(coupleId: string, gender: 'male' | 'female', deviceId: string): Promise<void> {
    const deviceRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'devices', deviceId);
    await updateDoc(deviceRef, {
      status: 'logged_out' as DeviceStatus,
      isCurrentDevice: false,
      sessionToken: null,
      loggedOutAt: now(),
    });
  },

  // Logout all other devices (keep only current)
  async logoutAllOtherDevices(coupleId: string, gender: 'male' | 'female', currentDeviceId: string): Promise<number> {
    const devicesRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'devices');
    const q = query(devicesRef, where('userGender', '==', gender));
    const snapshot = await getDocs(q);
    
    let count = 0;
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(deviceDoc => {
      if (deviceDoc.id !== currentDeviceId && deviceDoc.data().status === 'active') {
        batch.update(deviceDoc.ref, {
          status: 'logged_out' as DeviceStatus,
          isCurrentDevice: false,
          sessionToken: null,
          loggedOutAt: now(),
        });
        count++;
      }
    });
    
    await batch.commit();
    return count;
  },

  // Remove a device entry completely
  async removeDevice(coupleId: string, gender: 'male' | 'female', deviceId: string): Promise<void> {
    const deviceRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'devices', deviceId);
    await deleteDoc(deviceRef);
  },

  // Subscribe to devices for real-time updates
  subscribeToDevices(
    coupleId: string, 
    gender: 'male' | 'female', 
    callback: (devices: UserDevice[]) => void
  ): Unsubscribe {
    const devicesRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'devices');
    const q = query(devicesRef, where('userGender', '==', gender));
    
    return onSnapshot(q, (snapshot) => {
      const devices = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserDevice);
      // Sort by lastActiveAt descending
      devices.sort((a, b) => {
        const aTime = a.lastActiveAt?.toMillis?.() || 0;
        const bTime = b.lastActiveAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      callback(devices);
    });
  },

  // Check if session is still valid (for auth guard)
  async validateSession(
    coupleId: string, 
    gender: 'male' | 'female', 
    deviceId: string, 
    sessionToken: string
  ): Promise<boolean> {
    const deviceRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'devices', deviceId);
    const deviceDoc = await getDoc(deviceRef);
    
    if (!deviceDoc.exists()) return false;
    
    const device = deviceDoc.data() as UserDevice;
    return device.sessionToken === sessionToken && device.status === 'active';
  },

  // Subscribe to current device status for real-time logout detection
  subscribeToDeviceStatus(
    coupleId: string,
    gender: 'male' | 'female',
    deviceId: string,
    onLoggedOut: () => void
  ): Unsubscribe {
    const deviceRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'devices', deviceId);
    let isFirstSnapshot = true;
    let previousStatus: string | null = null;
    
    return onSnapshot(deviceRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Device was deleted - only trigger if not first snapshot
        if (!isFirstSnapshot) {
          onLoggedOut();
        }
        isFirstSnapshot = false;
        return;
      }
      
      const device = snapshot.data() as UserDevice;
      const currentStatus = device.status;
      
      // Only trigger if status CHANGED to logged_out (not on initial load)
      if (!isFirstSnapshot && previousStatus === 'active' && currentStatus === 'logged_out') {
        onLoggedOut();
      }
      
      previousStatus = currentStatus;
      isFirstSnapshot = false;
    });
  },
};

// ============================================
// EXPORT ALL SERVICES
// ============================================

export const firestoreServices = {
  user: userService,
  steps: stepsService,
  coupleSteps: coupleStepsService,
  foodLog: foodLogService,
  weightLog: weightLogService,
  coupleWeightLog: coupleWeightLogService,
  exerciseLog: exerciseLogService,
  coupleExercise: coupleExerciseService,
  coupleFoodLog: coupleFoodLogService,
  dietPlan: dietPlanService,
  appointment: appointmentService,
  admin: adminService,
  nurseVisit: nurseVisitService,
  supportRequest: supportRequestService,
  notification: notificationService,
  doctorVisit: doctorVisitService,
  nursingVisit: nursingVisitService,
  broadcast: broadcastService,
  chat: chatService,
  questionnaire: questionnaireService,
  feedback: feedbackService,
  device: deviceService,
};

export default firestoreServices;
