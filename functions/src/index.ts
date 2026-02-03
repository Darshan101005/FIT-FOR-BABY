/**
 * Firebase Cloud Functions for Fit for Baby App
 * Handles push notifications via FCM for EAS builds
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================
// TYPES
// ============================================

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface CoupleUser {
  deviceTokens?: string[]; // FCM tokens
  expoPushTokens?: string[]; // Expo push tokens (legacy)
  pushNotificationsEnabled?: boolean;
  name?: string;
  id?: string;
}

interface Couple {
  coupleId: string;
  status: string;
  male: CoupleUser;
  female: CoupleUser;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all FCM device tokens for specified couples
 */
async function getTokensForCouples(coupleIds: string[]): Promise<string[]> {
  const tokens: string[] = [];

  for (const coupleId of coupleIds) {
    try {
      const coupleDoc = await db.collection('couples').doc(coupleId).get();
      if (coupleDoc.exists) {
        const data = coupleDoc.data() as Couple;
        
        // Get FCM tokens for male
        if (data.male?.pushNotificationsEnabled !== false) {
          if (data.male?.deviceTokens) {
            tokens.push(...data.male.deviceTokens);
          }
        }
        
        // Get FCM tokens for female
        if (data.female?.pushNotificationsEnabled !== false) {
          if (data.female?.deviceTokens) {
            tokens.push(...data.female.deviceTokens);
          }
        }
      }
    } catch (error) {
      console.error(`Error getting tokens for couple ${coupleId}:`, error);
    }
  }

  // Remove duplicates and filter out Expo tokens (they start with ExponentPushToken)
  return [...new Set(tokens)].filter(token => 
    token && !token.startsWith('ExponentPushToken')
  );
}

/**
 * Get all FCM device tokens for active couples
 */
async function getAllActiveTokens(): Promise<string[]> {
  const tokens: string[] = [];

  try {
    const couplesSnapshot = await db.collection('couples')
      .where('status', '==', 'active')
      .get();

    couplesSnapshot.forEach(doc => {
      const data = doc.data() as Couple;
      
      if (data.male?.pushNotificationsEnabled !== false && data.male?.deviceTokens) {
        tokens.push(...data.male.deviceTokens);
      }
      
      if (data.female?.pushNotificationsEnabled !== false && data.female?.deviceTokens) {
        tokens.push(...data.female.deviceTokens);
      }
    });
  } catch (error) {
    console.error('Error getting all active tokens:', error);
  }

  // Remove duplicates and filter out Expo tokens
  return [...new Set(tokens)].filter(token => 
    token && !token.startsWith('ExponentPushToken')
  );
}

/**
 * Send FCM messages to tokens (handles batching for large lists)
 */
async function sendToTokens(
  tokens: string[],
  payload: NotificationPayload
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0, invalidTokens: [] };
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  // FCM allows max 500 tokens per request
  const batchSize = 500;
  const batches = [];
  
  for (let i = 0; i < tokens.length; i += batchSize) {
    batches.push(tokens.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: batch,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'reminders',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            icon: 'notification_icon',
            color: '#006dab',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Track failed tokens for cleanup
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // Track tokens that should be removed
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              invalidTokens.push(batch[idx]);
            }
            console.error(`Failed to send to token: ${errorCode}`);
          }
        });
      }
    } catch (error) {
      console.error('Error sending batch:', error);
      failureCount += batch.length;
    }
  }

  return { success: successCount, failure: failureCount, invalidTokens };
}

/**
 * Remove invalid tokens from Firestore
 */
async function cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
  if (invalidTokens.length === 0) return;

  try {
    const couplesSnapshot = await db.collection('couples').get();
    const batch = db.batch();
    let updateCount = 0;

    for (const doc of couplesSnapshot.docs) {
      const data = doc.data() as Couple;
      let needsUpdate = false;
      const updates: Record<string, any> = {};

      // Check male tokens
      if (data.male?.deviceTokens) {
        const cleanedTokens = data.male.deviceTokens.filter((t: string) => !invalidTokens.includes(t));
        if (cleanedTokens.length !== data.male.deviceTokens.length) {
          updates['male.deviceTokens'] = cleanedTokens;
          needsUpdate = true;
        }
      }

      // Check female tokens
      if (data.female?.deviceTokens) {
        const cleanedTokens = data.female.deviceTokens.filter((t: string) => !invalidTokens.includes(t));
        if (cleanedTokens.length !== data.female.deviceTokens.length) {
          updates['female.deviceTokens'] = cleanedTokens;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, updates);
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Cleaned up invalid tokens from ${updateCount} couples`);
    }
  } catch (error) {
    console.error('Error cleaning up invalid tokens:', error);
  }
}

// ============================================
// CLOUD FUNCTIONS
// ============================================

/**
 * Send reminder notification to users with missing logs
 * Called from admin panel
 */
export const sendMissingLogsReminder = functions.https.onCall(async (data, context) => {
  const { coupleIds, adminName } = data;

  if (!coupleIds || !Array.isArray(coupleIds) || coupleIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'coupleIds must be a non-empty array');
  }

  try {
    const notificationId = db.collection('broadcasts').doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Create broadcast/reminder record in Firestore FIRST (for in-app display)
    // type='reminder' makes it show on home page bell icon
    await db.collection('broadcasts').doc(notificationId).set({
      id: notificationId,
      title: '📋 Daily Log Reminder',
      message: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
      type: 'reminder', // Shows on home page, not in messages
      priority: 'important',
      status: 'sent',
      sentBy: 'system',
      sentByName: adminName || 'Admin',
      targetCoupleIds: coupleIds,
      createdAt: timestamp,
      sentAt: timestamp,
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      ),
    });

    // Get device tokens
    const tokens = await getTokensForCouples(coupleIds);

    if (tokens.length === 0) {
      return {
        success: true,
        notificationId,
        sentCount: coupleIds.length,
        pushSent: 0,
        message: 'Reminder saved! Users will see it when they open the app.',
      };
    }

    // Send FCM push notifications
    const result = await sendToTokens(tokens, {
      title: '📋 Daily Log Reminder',
      body: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
      data: {
        type: 'reminder',
        notificationId: notificationId,
        screen: '/user/home',
        timestamp: Date.now().toString(),
      },
    });

    // Cleanup invalid tokens in background
    if (result.invalidTokens.length > 0) {
      cleanupInvalidTokens(result.invalidTokens).catch(console.error);
    }

    return {
      success: true,
      notificationId,
      sentCount: coupleIds.length,
      pushSent: result.success,
      pushFailed: result.failure,
      message: result.success > 0 
        ? `Push sent to ${result.success} device(s).`
        : 'Reminder saved! Users will see it when they open the app.',
    };
  } catch (error) {
    console.error('Error in sendMissingLogsReminder:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notifications');
  }
});

/**
 * Send broadcast notification to all active users
 */
export const sendBroadcast = functions.https.onCall(async (data, context) => {
  const { title, message, priority, adminId, adminName } = data;

  if (!title || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'title and message are required');
  }

  try {
    // Get all active user tokens
    const tokens = await getAllActiveTokens();

    if (tokens.length === 0) {
      return {
        success: false,
        sentCount: 0,
        error: 'No device tokens found for active users',
      };
    }

    // Send notifications
    const result = await sendToTokens(tokens, {
      title,
      body: message,
      data: {
        type: 'broadcast',
        priority: priority || 'normal',
        screen: '/user/home',
      },
    });

    // Create broadcast record
    await db.collection('broadcasts').add({
      title,
      message,
      priority: priority || 'normal',
      status: 'sent',
      sentBy: adminId || 'system',
      sentByName: adminName || 'Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      totalRecipients: tokens.length,
    });

    return {
      success: true,
      sentCount: result.success,
      failedCount: result.failure,
    };
  } catch (error) {
    console.error('Error in sendBroadcast:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send broadcast');
  }
});

/**
 * Scheduled function to send daily reminder at 8 PM
 * Checks for users who haven't logged today and sends reminder
 */
export const scheduledDailyReminder = functions.pubsub
  .schedule('0 20 * * *') // 8 PM every day (IST - adjust timezone as needed)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running scheduled daily reminder...');

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get all active couples
      const couplesSnapshot = await db.collection('couples')
        .where('status', '==', 'active')
        .get();

      const couplesWithMissingLogs: string[] = [];

      for (const doc of couplesSnapshot.docs) {
        const couple = doc.data() as Couple;
        let hasMissingLogs = false;

        // Check steps for both male and female
        for (const gender of ['male', 'female']) {
          try {
            const stepsSnapshot = await db.collection('couples')
              .doc(couple.coupleId)
              .collection('steps')
              .doc(gender)
              .collection('daily')
              .doc(today)
              .get();

            if (!stepsSnapshot.exists) {
              hasMissingLogs = true;
              break;
            }
          } catch (error) {
            console.error(`Error checking steps for ${couple.coupleId}/${gender}:`, error);
          }
        }

        if (hasMissingLogs) {
          couplesWithMissingLogs.push(couple.coupleId);
        }
      }

      if (couplesWithMissingLogs.length > 0) {
        const tokens = await getTokensForCouples(couplesWithMissingLogs);
        
        if (tokens.length > 0) {
          await sendToTokens(tokens, {
            title: '🌙 Evening Reminder',
            body: "Day's almost over! Have you logged your steps, food, and exercise today?",
            data: {
              type: 'daily_reminder',
              screen: '/user/home',
            },
          });
          
          console.log(`Sent evening reminder to ${tokens.length} devices`);
        }
      }

      return null;
    } catch (error) {
      console.error('Error in scheduledDailyReminder:', error);
      return null;
    }
  });

/**
 * Trigger notification when a new broadcast is created
 */
export const onBroadcastCreated = functions.firestore
  .document('broadcasts/{broadcastId}')
  .onCreate(async (snapshot, context) => {
    const broadcast = snapshot.data();
    
    // Skip if already sent (status !== 'draft')
    if (broadcast.status !== 'draft') {
      return null;
    }

    try {
      const tokens = await getAllActiveTokens();
      
      if (tokens.length > 0) {
        await sendToTokens(tokens, {
          title: broadcast.title,
          body: broadcast.message,
          data: {
            type: 'broadcast',
            broadcastId: context.params.broadcastId,
            screen: '/user/home',
          },
        });

        // Update broadcast status to sent
        await snapshot.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          totalRecipients: tokens.length,
        });
      }

      return null;
    } catch (error) {
      console.error('Error in onBroadcastCreated:', error);
      return null;
    }
  });

/**
 * Register FCM token for a user
 * Called from the app when user logs in on EAS build
 */
export const registerFCMToken = functions.https.onCall(async (data, context) => {
  const { coupleId, gender, token, deviceInfo } = data;

  if (!coupleId || !gender || !token) {
    throw new functions.https.HttpsError('invalid-argument', 'coupleId, gender, and token are required');
  }

  // Skip Expo push tokens - we only want native FCM tokens
  if (token.startsWith('ExponentPushToken')) {
    return { success: false, message: 'Expo tokens not supported for native FCM' };
  }

  try {
    const coupleRef = db.collection('couples').doc(coupleId);
    const coupleDoc = await coupleRef.get();

    if (!coupleDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Couple not found');
    }

    const coupleData = coupleDoc.data() as Couple;
    const userData = gender === 'male' ? coupleData.male : coupleData.female;
    const currentTokens = userData?.deviceTokens || [];

    // Only add if not already present
    if (!currentTokens.includes(token)) {
      await coupleRef.update({
        [`${gender}.deviceTokens`]: admin.firestore.FieldValue.arrayUnion(token),
        [`${gender}.pushNotificationsEnabled`]: true,
        [`${gender}.lastDeviceInfo`]: deviceInfo || null,
        [`${gender}.lastTokenUpdated`]: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`FCM token registered for ${coupleId}/${gender}`);
      return { success: true, message: 'Token registered successfully', isNew: true };
    }

    return { success: true, message: 'Token already registered', isNew: false };
  } catch (error) {
    console.error('Error registering FCM token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to register token');
  }
});

/**
 * Unregister FCM token when user logs out
 */
export const unregisterFCMToken = functions.https.onCall(async (data, context) => {
  const { coupleId, gender, token } = data;

  if (!coupleId || !gender || !token) {
    throw new functions.https.HttpsError('invalid-argument', 'coupleId, gender, and token are required');
  }

  try {
    const coupleRef = db.collection('couples').doc(coupleId);
    
    await coupleRef.update({
      [`${gender}.deviceTokens`]: admin.firestore.FieldValue.arrayRemove(token),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`FCM token removed for ${coupleId}/${gender}`);
    return { success: true };
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to unregister token');
  }
});

/**
 * HTTP endpoint for testing FCM notifications (development only)
 */
export const testFCMNotification = functions.https.onRequest(async (req, res) => {
  // Allow CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { token, title, body } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    const message: admin.messaging.Message = {
      token: token,
      notification: {
        title: title || '🧪 Test Notification',
        body: body || 'This is a test notification from Fit for Baby!',
      },
      data: {
        type: 'test',
        timestamp: Date.now().toString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'reminders',
          priority: 'high',
          icon: 'notification_icon',
          color: '#006dab',
        },
      },
    };

    const response = await messaging.send(message);
    console.log('Test notification sent:', response);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message, code: error.code });
  }
});

// ============================================
// ACTIVITY LOG TRIGGERS
// Automatically log all database operations
// ============================================

/**
 * Helper to create activity log entry
 */
async function createActivityLog(
  operation: 'create' | 'update' | 'delete',
  collectionName: string,
  documentId: string,
  data: any,
  previousData?: any
): Promise<void> {
  try {
    // Skip logging for activityLogs collection to prevent infinite loops
    if (collectionName === 'activityLogs') return;

    // Determine user info from the document data
    let userId: string | undefined;
    let coupleId: string | undefined;
    let description = '';

    // Extract user/couple info based on collection
    switch (collectionName) {
      case 'couples':
        coupleId = documentId;
        if (operation === 'create') {
          description = `New couple enrolled: ${data?.male?.name || 'Male'} & ${data?.female?.name || 'Female'}`;
        } else if (operation === 'update') {
          description = `Couple ${documentId} updated`;
        } else {
          description = `Couple ${documentId} deleted`;
        }
        break;

      case 'weightLogs':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Logged weight: ${data?.weight || 'N/A'}kg`;
        } else if (operation === 'update') {
          description = `Updated weight log`;
        } else {
          description = `Deleted weight log`;
        }
        break;

      case 'foodLogs':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Logged ${data?.mealType || 'meal'} (${data?.totalCalories || 0} cal)`;
        } else if (operation === 'update') {
          description = `Updated food log`;
        } else {
          description = `Deleted food log`;
        }
        break;

      case 'exerciseLogs':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Logged exercise: ${data?.exerciseType || data?.type || 'workout'}`;
        } else if (operation === 'update') {
          description = `Updated exercise log`;
        } else {
          description = `Deleted exercise log`;
        }
        break;

      case 'steps':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Logged ${data?.stepCount || 0} steps`;
        } else if (operation === 'update') {
          description = `Updated step count`;
        } else {
          description = `Deleted step entry`;
        }
        break;

      case 'appointments':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Created ${data?.type || 'appointment'} appointment`;
        } else if (operation === 'update') {
          const statusChanged = previousData?.status !== data?.status;
          description = statusChanged 
            ? `Appointment status changed to ${data?.status}`
            : `Updated appointment`;
        } else {
          description = `Deleted appointment`;
        }
        break;

      case 'feedbacks':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Submitted feedback: ${data?.category || 'general'} (${data?.rating || 'N/A'} stars)`;
        } else {
          description = `${operation === 'update' ? 'Updated' : 'Deleted'} feedback`;
        }
        break;

      case 'chatMessages':
        userId = data?.senderId;
        coupleId = data?.coupleId;
        description = `${operation === 'create' ? 'Sent' : operation === 'update' ? 'Updated' : 'Deleted'} chat message`;
        break;

      case 'callRequests':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Requested callback: ${data?.reason || 'general inquiry'}`;
        } else if (operation === 'update') {
          description = `Call request status: ${data?.status || 'updated'}`;
        } else {
          description = `Deleted call request`;
        }
        break;

      case 'deviceSessions':
        userId = data?.userId;
        description = `Device session ${operation}d`;
        break;

      case 'questionnaires':
        userId = data?.submittedBy;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Submitted questionnaire`;
        } else {
          description = `${operation === 'update' ? 'Updated' : 'Deleted'} questionnaire`;
        }
        break;

      case 'admins':
        userId = documentId;
        if (operation === 'create') {
          description = `Admin account created: ${data?.displayName || 'New Admin'}`;
        } else if (operation === 'update') {
          description = `Admin ${data?.displayName || documentId} updated`;
        } else {
          description = `Admin account deleted`;
        }
        break;

      case 'announcements':
        if (operation === 'create') {
          description = `New announcement: ${data?.title || 'Untitled'}`;
        } else if (operation === 'update') {
          description = `Announcement updated`;
        } else {
          description = `Announcement deleted`;
        }
        break;

      case 'reminders':
        userId = data?.userId;
        coupleId = data?.coupleId;
        if (operation === 'create') {
          description = `Created reminder: ${data?.title || data?.type || 'reminder'}`;
        } else if (operation === 'update') {
          description = `Updated reminder`;
        } else {
          description = `Deleted reminder`;
        }
        break;

      default:
        description = `${operation.charAt(0).toUpperCase() + operation.slice(1)}d document in ${collectionName}`;
    }

    // Create the activity log entry
    const logData: Record<string, any> = {
      category: userId ? 'user' : 'general',
      userRole: userId ? 'user' : 'unknown',
      type: operation === 'create' ? 'data_create' : operation === 'update' ? 'data_update' : 'data_delete',
      action: operation,
      description,
      collection: collectionName,
      documentId,
      source: 'firebase_trigger', // Mark as triggered by Firebase
      platform: 'server',
      deviceInfo: 'Firebase Cloud Functions',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (userId) logData.userId = userId;
    if (coupleId) logData.coupleId = coupleId;

    await db.collection('activityLogs').add(logData);
    console.log(`Activity logged: ${operation} on ${collectionName}/${documentId}`);
  } catch (error) {
    // Don't let logging errors affect the main operation
    console.error('Error creating activity log:', error);
  }
}

// --- Weight Logs Triggers (subcollection under users) ---
export const onWeightLogCreate = functions.firestore
  .document('users/{userId}/weightLogs/{docId}')
  .onCreate(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('create', 'weightLogs', context.params.docId, data);
  });

export const onWeightLogUpdate = functions.firestore
  .document('users/{userId}/weightLogs/{docId}')
  .onUpdate(async (change, context) => {
    const data = { ...change.after.data(), userId: context.params.userId };
    await createActivityLog('update', 'weightLogs', context.params.docId, data, change.before.data());
  });

export const onWeightLogDelete = functions.firestore
  .document('users/{userId}/weightLogs/{docId}')
  .onDelete(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('delete', 'weightLogs', context.params.docId, data);
  });

// --- Food Logs Triggers (subcollection under users) ---
export const onFoodLogCreate = functions.firestore
  .document('users/{userId}/foodLogs/{docId}')
  .onCreate(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('create', 'foodLogs', context.params.docId, data);
  });

export const onFoodLogUpdate = functions.firestore
  .document('users/{userId}/foodLogs/{docId}')
  .onUpdate(async (change, context) => {
    const data = { ...change.after.data(), userId: context.params.userId };
    await createActivityLog('update', 'foodLogs', context.params.docId, data, change.before.data());
  });

export const onFoodLogDelete = functions.firestore
  .document('users/{userId}/foodLogs/{docId}')
  .onDelete(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('delete', 'foodLogs', context.params.docId, data);
  });

// --- Exercise Logs Triggers (subcollection under users) ---
export const onExerciseLogCreate = functions.firestore
  .document('users/{userId}/exerciseLogs/{docId}')
  .onCreate(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('create', 'exerciseLogs', context.params.docId, data);
  });

export const onExerciseLogUpdate = functions.firestore
  .document('users/{userId}/exerciseLogs/{docId}')
  .onUpdate(async (change, context) => {
    const data = { ...change.after.data(), userId: context.params.userId };
    await createActivityLog('update', 'exerciseLogs', context.params.docId, data, change.before.data());
  });

export const onExerciseLogDelete = functions.firestore
  .document('users/{userId}/exerciseLogs/{docId}')
  .onDelete(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('delete', 'exerciseLogs', context.params.docId, data);
  });

// --- Steps Triggers (subcollection under users) ---
export const onStepsCreate = functions.firestore
  .document('users/{userId}/steps/{docId}')
  .onCreate(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('create', 'steps', context.params.docId, data);
  });

export const onStepsUpdate = functions.firestore
  .document('users/{userId}/steps/{docId}')
  .onUpdate(async (change, context) => {
    const data = { ...change.after.data(), userId: context.params.userId };
    await createActivityLog('update', 'steps', context.params.docId, data, change.before.data());
  });

export const onStepsDelete = functions.firestore
  .document('users/{userId}/steps/{docId}')
  .onDelete(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('delete', 'steps', context.params.docId, data);
  });

// --- Appointments Triggers (subcollection under users) ---
export const onAppointmentCreate = functions.firestore
  .document('users/{userId}/appointments/{docId}')
  .onCreate(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('create', 'appointments', context.params.docId, data);
  });

export const onAppointmentUpdate = functions.firestore
  .document('users/{userId}/appointments/{docId}')
  .onUpdate(async (change, context) => {
    const data = { ...change.after.data(), userId: context.params.userId };
    await createActivityLog('update', 'appointments', context.params.docId, data, change.before.data());
  });

export const onAppointmentDelete = functions.firestore
  .document('users/{userId}/appointments/{docId}')
  .onDelete(async (snap, context) => {
    const data = { ...snap.data(), userId: context.params.userId };
    await createActivityLog('delete', 'appointments', context.params.docId, data);
  });

// --- Couples Triggers (top-level collection) ---
export const onCoupleCreate = functions.firestore
  .document('couples/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'couples', context.params.docId, snap.data());
  });

export const onCoupleUpdate = functions.firestore
  .document('couples/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'couples', context.params.docId, change.after.data(), change.before.data());
  });

export const onCoupleDelete = functions.firestore
  .document('couples/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'couples', context.params.docId, snap.data());
  });

// --- Feedbacks Triggers (top-level collection) ---
export const onFeedbackCreate = functions.firestore
  .document('feedbacks/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'feedbacks', context.params.docId, snap.data());
  });

export const onFeedbackUpdate = functions.firestore
  .document('feedbacks/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'feedbacks', context.params.docId, change.after.data(), change.before.data());
  });

export const onFeedbackDelete = functions.firestore
  .document('feedbacks/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'feedbacks', context.params.docId, snap.data());
  });

// --- Chat Messages Triggers ---
export const onChatMessageCreate = functions.firestore
  .document('chatMessages/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'chatMessages', context.params.docId, snap.data());
  });

export const onChatMessageUpdate = functions.firestore
  .document('chatMessages/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'chatMessages', context.params.docId, change.after.data(), change.before.data());
  });

export const onChatMessageDelete = functions.firestore
  .document('chatMessages/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'chatMessages', context.params.docId, snap.data());
  });

// --- Call Requests Triggers ---
export const onCallRequestCreate = functions.firestore
  .document('callRequests/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'callRequests', context.params.docId, snap.data());
  });

export const onCallRequestUpdate = functions.firestore
  .document('callRequests/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'callRequests', context.params.docId, change.after.data(), change.before.data());
  });

export const onCallRequestDelete = functions.firestore
  .document('callRequests/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'callRequests', context.params.docId, snap.data());
  });

// --- Questionnaires Triggers ---
export const onQuestionnaireCreate = functions.firestore
  .document('questionnaires/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'questionnaires', context.params.docId, snap.data());
  });

export const onQuestionnaireUpdate = functions.firestore
  .document('questionnaires/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'questionnaires', context.params.docId, change.after.data(), change.before.data());
  });

export const onQuestionnaireDelete = functions.firestore
  .document('questionnaires/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'questionnaires', context.params.docId, snap.data());
  });

// --- Admins Triggers ---
export const onAdminCreate = functions.firestore
  .document('admins/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'admins', context.params.docId, snap.data());
  });

export const onAdminUpdate = functions.firestore
  .document('admins/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'admins', context.params.docId, change.after.data(), change.before.data());
  });

export const onAdminDelete = functions.firestore
  .document('admins/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'admins', context.params.docId, snap.data());
  });

// --- Announcements Triggers ---
export const onAnnouncementCreate = functions.firestore
  .document('announcements/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'announcements', context.params.docId, snap.data());
  });

export const onAnnouncementUpdate = functions.firestore
  .document('announcements/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'announcements', context.params.docId, change.after.data(), change.before.data());
  });

export const onAnnouncementDelete = functions.firestore
  .document('announcements/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'announcements', context.params.docId, snap.data());
  });

// --- Reminders Triggers ---
export const onReminderCreate = functions.firestore
  .document('reminders/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'reminders', context.params.docId, snap.data());
  });

export const onReminderUpdate = functions.firestore
  .document('reminders/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'reminders', context.params.docId, change.after.data(), change.before.data());
  });

export const onReminderDelete = functions.firestore
  .document('reminders/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'reminders', context.params.docId, snap.data());
  });

// --- Device Sessions Triggers ---
export const onDeviceSessionCreate = functions.firestore
  .document('deviceSessions/{docId}')
  .onCreate(async (snap, context) => {
    await createActivityLog('create', 'deviceSessions', context.params.docId, snap.data());
  });

export const onDeviceSessionUpdate = functions.firestore
  .document('deviceSessions/{docId}')
  .onUpdate(async (change, context) => {
    await createActivityLog('update', 'deviceSessions', context.params.docId, change.after.data(), change.before.data());
  });

export const onDeviceSessionDelete = functions.firestore
  .document('deviceSessions/{docId}')
  .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'deviceSessions', context.params.docId, snap.data());
  });
