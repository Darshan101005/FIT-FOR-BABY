// ============================================
// FIRESTORE SERVICE - CRUD OPERATIONS
// ============================================

import { Admin, Appointment, AppointmentStatus, COLLECTIONS, ExerciseLog, FoodLog, GlobalSettings, Notification, NurseVisit, StepEntry, SupportRequest, SupportRequestStatus, User, WeightLog } from '@/types/firebase.types';
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
          const couples = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    
    // Filter out null/undefined values
    const cleanData: Record<string, any> = { updatedAt: now() };
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
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
    const logsRef = collection(db, COLLECTIONS.COUPLES, coupleId, 'weightLogs');
    const q = query(
      logsRef,
      where('gender', '==', gender),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoupleWeightLog));
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
};

export default firestoreServices;
