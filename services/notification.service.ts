// ============================================
// FCM Push Notification Service
// Handles push notification registration, permissions, and sending
// ============================================

import { COLLECTIONS } from '@/types/firebase.types';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

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
 * Call this when the user logs in or when needed
 * Note: Push tokens are not available in Expo Go SDK 53+, requires development build
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
    console.log('Push notifications are not fully supported on web via Expo');
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

    // Try to get the Expo push token
    // Note: This will fail in Expo Go SDK 53+ - requires development build
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                        Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('Project ID not found. Using default configuration.');
        // Try to get token without project ID for development
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        token = tokenResponse.data;
      } else {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        token = tokenResponse.data;
      }

      console.log('Push notification token:', token);
    } catch (tokenError: any) {
      // This is expected in Expo Go SDK 53+
      console.log('Could not get push token (expected in Expo Go SDK 53+):', tokenError.message);
      // Return null but don't throw - app should continue working
      return null;
    }

    // Android-specific: Set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#006dab',
      });

      // High priority channel for reminders
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        description: 'Daily log reminders and alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
        sound: 'default',
      });
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }

  return token;
}

/**
 * Save the push token to Firestore for a couple user
 */
export async function savePushTokenForUser(
  coupleId: string,
  gender: 'male' | 'female',
  token: string
): Promise<boolean> {
  try {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const coupleDoc = await getDoc(coupleRef);
    
    if (!coupleDoc.exists()) {
      console.error('Couple not found:', coupleId);
      return false;
    }

    // Get current device tokens
    const coupleData = coupleDoc.data();
    const userField = gender;
    const currentTokens = coupleData[userField]?.deviceTokens || [];

    // Only add if not already present
    if (!currentTokens.includes(token)) {
      await updateDoc(coupleRef, {
        [`${userField}.deviceTokens`]: arrayUnion(token),
        [`${userField}.pushNotificationsEnabled`]: true,
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
 * Always saves to Firestore, attempts push notification (may fail in Expo Go)
 */
export async function sendMissingLogsReminder(
  coupleIdsWithMissingLogs: string[],
  adminName: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    if (coupleIdsWithMissingLogs.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // ALWAYS create a broadcast record for in-app display first
    // This ensures users see the reminder even if push fails
    await createBroadcastRecord({
      title: 'Daily Log Reminder',
      message: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
      sentBy: 'system',
      sentByName: adminName,
      priority: 'important',
      type: 'reminder', // Reminders show on home page, not in messages
    });

    // Try to get device tokens for these couples
    const tokens = await getTokensForUsersWithMissingLogs(coupleIdsWithMissingLogs);

    // If no tokens, still return success since broadcast was saved
    if (tokens.length === 0) {
      console.log('No push tokens found, but broadcast saved to Firestore');
      return { 
        success: true, 
        sentCount: coupleIdsWithMissingLogs.length,
        error: 'Reminder saved! Push notifications unavailable (users will see it when they open the app).'
      };
    }

    // Try to send push notification (may fail in Expo Go SDK 53+)
    try {
      const result = await sendPushNotification(tokens, {
        title: '📋 Daily Log Reminder',
        body: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
        data: {
          type: 'missing_logs_reminder',
          screen: '/user/home',
        },
      });

      return { 
        success: true, 
        sentCount: tokens.length 
      };
    } catch (pushError) {
      // Push failed but broadcast is saved
      console.log('Push notification failed, but broadcast saved:', pushError);
      return { 
        success: true, 
        sentCount: coupleIdsWithMissingLogs.length,
        error: 'Reminder saved! Push notifications may not work in Expo Go.'
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
