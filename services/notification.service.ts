// ============================================
// FCM Push Notification Service
// Handles push notification registration, permissions, and sending
// Supports both Expo push tokens and native FCM tokens (EAS builds)
// ============================================

import { COLLECTIONS } from '@/types/firebase.types';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { db } from './firebase';

// Get Firebase Functions instance
const functions = getFunctions();

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
// TYPES
// ============================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface ReminderNotification {
  type: 'missing_logs' | 'general' | 'appointment' | 'broadcast';
  title: string;
  body: string;
  targetUsers?: string[]; // Array of user IDs (e.g., ['C_001_M', 'C_001_F'])
  sendToAll?: boolean; // Send to all active users
  priority?: 'default' | 'high';
}

// ============================================
// PERMISSION & TOKEN MANAGEMENT
// ============================================

/**
 * Request notification permissions and get the push token
 * For EAS builds: Gets native FCM token
 * For Expo Go: Gets Expo push token (limited functionality)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device for push notifications
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check if running on web
  if (Platform.OS === 'web') {
    console.log('Push notifications are not fully supported on web');
    return null;
  }

  try {
    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permission');
      return null;
    }

    // Android-specific: Set up notification channels FIRST
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#006dab',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        description: 'Daily log reminders and alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
        sound: 'default',
      });
    }

    // Try to get NATIVE FCM token first (for EAS builds)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
      console.log('Native FCM token obtained:', token?.substring(0, 20) + '...');
    } catch (nativeError: any) {
      console.log('Could not get native FCM token:', nativeError.message);
      
      // Fallback: Try Expo push token (for Expo Go)
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                          Constants.easConfig?.projectId;
        
        const tokenResponse = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        
        token = tokenResponse.data;
        console.log('Expo push token obtained:', token);
      } catch (expoError: any) {
        console.log('Could not get Expo push token:', expoError.message);
        return null;
      }
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }

  return token;
}

/**
 * Save the push token to Firestore for a couple user
 * Uses Cloud Function for FCM tokens, direct Firestore for Expo tokens
 */
export async function savePushTokenForUser(
  coupleId: string,
  gender: 'male' | 'female',
  token: string
): Promise<boolean> {
  try {
    // Check if it's a native FCM token (not Expo push token)
    const isNativeFCM = !token.startsWith('ExponentPushToken');
    
    if (isNativeFCM) {
      // Use Cloud Function to register FCM token
      try {
        const registerFCMToken = httpsCallable(functions, 'registerFCMToken');
        const result = await registerFCMToken({
          coupleId,
          gender,
          token,
          deviceInfo: {
            platform: Platform.OS,
            deviceName: Device.deviceName || 'Unknown Device',
            osVersion: Platform.Version?.toString() || 'Unknown',
          },
        });
        
        const data = result.data as { success: boolean; message: string };
        console.log('FCM token registration result:', data.message);
        return data.success;
      } catch (cloudError: any) {
        console.log('Cloud Function not available, falling back to direct Firestore:', cloudError.message);
        // Fall through to direct Firestore update
      }
    }

    // Direct Firestore update (for Expo tokens or Cloud Function fallback)
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const coupleDoc = await getDoc(coupleRef);
    
    if (!coupleDoc.exists()) {
      console.error('Couple not found:', coupleId);
      return false;
    }

    const coupleData = coupleDoc.data();
    const currentTokens = coupleData[gender]?.deviceTokens || [];

    // Only add if not already present
    if (!currentTokens.includes(token)) {
      await updateDoc(coupleRef, {
        [`${gender}.deviceTokens`]: arrayUnion(token),
        [`${gender}.pushNotificationsEnabled`]: true,
        updatedAt: Timestamp.now(),
      });
      console.log('Push token saved for user:', `${coupleId}_${gender}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

/**
 * Remove a push token when user logs out or disables notifications
 */
export async function removePushTokenForUser(
  coupleId: string,
  gender: 'male' | 'female',
  token: string
): Promise<boolean> {
  try {
    // Check if it's a native FCM token
    const isNativeFCM = !token.startsWith('ExponentPushToken');
    
    if (isNativeFCM) {
      // Try Cloud Function first
      try {
        const unregisterFCMToken = httpsCallable(functions, 'unregisterFCMToken');
        await unregisterFCMToken({ coupleId, gender, token });
        console.log('FCM token removed via Cloud Function');
        return true;
      } catch (cloudError: any) {
        console.log('Cloud Function not available, falling back to direct Firestore');
      }
    }

    // Direct Firestore update
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    
    await updateDoc(coupleRef, {
      [`${gender}.deviceTokens`]: arrayRemove(token),
      updatedAt: Timestamp.now(),
    });

    console.log('Push token removed for user:', `${coupleId}_${gender}`);
    return true;
  } catch (error) {
    console.error('Error removing push token:', error);
    return false;
  }
}

// ============================================
// NOTIFICATION LISTENERS
// ============================================

/**
 * Add listener for notifications received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user interacts with a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ============================================
// SENDING NOTIFICATIONS (via Expo Push API)
// ============================================

/**
 * Send push notification to specific tokens via Expo Push API
 * Note: For production with FCM, you should use Firebase Cloud Functions
 */
export async function sendPushNotification(
  expoPushTokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; results?: any[] }> {
  // Filter out empty tokens
  const validTokens = expoPushTokens.filter(token => token && token.length > 0);
  
  if (validTokens.length === 0) {
    console.log('No valid push tokens to send to');
    return { success: false };
  }

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    priority: 'high' as const,
    channelId: 'reminders',
  }));

  try {
    // Expo Push API endpoint
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    
    return { success: true, results: result.data };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false };
  }
}

/**
 * Get all device tokens for users with missing logs
 */
export async function getTokensForUsersWithMissingLogs(
  coupleIds: string[]
): Promise<string[]> {
  const tokens: string[] = [];

  try {
    for (const coupleId of coupleIds) {
      const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const coupleDoc = await getDoc(coupleRef);
      
      if (coupleDoc.exists()) {
        const data = coupleDoc.data();
        
        // Get tokens for both male and female
        if (data.male?.deviceTokens) {
          tokens.push(...data.male.deviceTokens);
        }
        if (data.female?.deviceTokens) {
          tokens.push(...data.female.deviceTokens);
        }
      }
    }
  } catch (error) {
    console.error('Error getting tokens for users:', error);
  }

  return [...new Set(tokens)]; // Remove duplicates
}

/**
 * Get all device tokens for all active couples
 */
export async function getAllActiveUserTokens(): Promise<string[]> {
  const tokens: string[] = [];

  try {
    const couplesRef = collection(db, COLLECTIONS.COUPLES);
    const activeQuery = query(couplesRef, where('status', '==', 'active'));
    const snapshot = await getDocs(activeQuery);

    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.male?.deviceTokens && data.male.pushNotificationsEnabled !== false) {
        tokens.push(...data.male.deviceTokens);
      }
      if (data.female?.deviceTokens && data.female.pushNotificationsEnabled !== false) {
        tokens.push(...data.female.deviceTokens);
      }
    });
  } catch (error) {
    console.error('Error getting all user tokens:', error);
  }

  return [...new Set(tokens)]; // Remove duplicates
}

// ============================================
// ADMIN REMINDER FUNCTIONS
// ============================================

/**
 * Send reminder to users with pending/missing logs
 * Called from admin panel "Send Reminder" button
 * Uses Cloud Function for FCM push notifications
 */
export async function sendMissingLogsReminder(
  coupleIdsWithMissingLogs: string[],
  adminName: string
): Promise<{ success: boolean; sentCount: number; pushSent?: number; error?: string }> {
  try {
    if (coupleIdsWithMissingLogs.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Try Cloud Function first (handles both Firestore save and FCM push)
    try {
      const sendReminder = httpsCallable(functions, 'sendMissingLogsReminder');
      const result = await sendReminder({
        coupleIds: coupleIdsWithMissingLogs,
        adminName: adminName,
      });

      const data = result.data as {
        success: boolean;
        notificationId?: string;
        sentCount?: number;
        pushSent?: number;
        pushFailed?: number;
        message?: string;
        error?: string;
      };

      return {
        success: data.success,
        sentCount: data.sentCount || coupleIdsWithMissingLogs.length,
        pushSent: data.pushSent || 0,
        error: data.message || data.error,
      };
    } catch (cloudError: any) {
      console.log('Cloud Function not deployed or error, falling back to local:', cloudError.message);
      
      // Fallback: Create broadcast record locally
      await createBroadcastRecord({
        title: 'Daily Log Reminder',
        message: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
        sentBy: 'system',
        sentByName: adminName,
        priority: 'important',
        type: 'reminder',
      });

      // Try Expo push as fallback
      const tokens = await getTokensForUsersWithMissingLogs(coupleIdsWithMissingLogs);
      
      if (tokens.length > 0) {
        try {
          await sendPushNotification(tokens, {
            title: '📋 Daily Log Reminder',
            body: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
            data: { type: 'reminder', screen: '/user/home' },
          });
        } catch (pushError) {
          console.log('Expo push failed:', pushError);
        }
      }

      return {
        success: true,
        sentCount: coupleIdsWithMissingLogs.length,
        error: 'Reminder saved! Deploy Cloud Functions for better push notification support.',
      };
    }
  } catch (error: any) {
    console.error('Error sending missing logs reminder:', error);
    return { success: false, sentCount: 0, error: error.message };
  }
}
/**
 * Send a custom broadcast/reminder to all users
 */
export async function sendBroadcastToAllUsers(
  title: string,
  message: string,
  adminId: string,
  adminName: string,
  priority: 'normal' | 'important' | 'urgent' = 'normal'
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // Get all active user tokens
    const tokens = await getAllActiveUserTokens();

    if (tokens.length === 0) {
      return { 
        success: false, 
        sentCount: 0, 
        error: 'No device tokens found for active users.' 
      };
    }

    // Send push notification
    const result = await sendPushNotification(tokens, {
      title: title,
      body: message,
      data: {
        type: 'broadcast',
        priority: priority,
        screen: '/user/home',
      },
    });

    // Create broadcast record for in-app display
    await createBroadcastRecord({
      title,
      message,
      sentBy: adminId,
      sentByName: adminName,
      priority,
      type: 'broadcast', // Broadcasts show in messages Announcements section
    });

    return { 
      success: result.success, 
      sentCount: tokens.length 
    };
  } catch (error: any) {
    console.error('Error sending broadcast:', error);
    return { success: false, sentCount: 0, error: error.message };
  }
}

/**
 * Create a broadcast record in Firestore for in-app display
 */
async function createBroadcastRecord(data: {
  title: string;
  message: string;
  sentBy: string;
  sentByName: string;
  priority: 'normal' | 'important' | 'urgent';
  type: 'reminder' | 'broadcast';
}): Promise<string | null> {
  try {
    const broadcastRef = collection(db, COLLECTIONS.BROADCASTS);
    const docRef = await addDoc(broadcastRef, {
      title: data.title,
      message: data.message,
      priority: data.priority,
      type: data.type, // 'reminder' for home page, 'broadcast' for messages
      status: 'sent',
      sentBy: data.sentBy,
      sentByName: data.sentByName,
      createdAt: Timestamp.now(),
      sentAt: Timestamp.now(),
      // Broadcast expires after 7 days
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating broadcast record:', error);
    return null;
  }
}

// ============================================
// LOCAL NOTIFICATIONS (for testing without FCM)
// ============================================

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds: number = 1
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ============================================
// BADGE MANAGEMENT
// ============================================

/**
 * Set the app badge number (iOS/Android)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// Export default notification service
export default {
  registerForPushNotificationsAsync,
  savePushTokenForUser,
  removePushTokenForUser,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  sendPushNotification,
  sendMissingLogsReminder,
  sendBroadcastToAllUsers,
  scheduleLocalNotification,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  setBadgeCount,
  clearBadge,
};
