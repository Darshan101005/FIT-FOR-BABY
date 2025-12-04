/**
 * Firebase Cloud Functions for Fit for Baby App
 * Handles push notifications via FCM
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
  deviceTokens?: string[];
  pushNotificationsEnabled?: boolean;
  name?: string;
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
 * Get all device tokens for specified couples
 */
async function getTokensForCouples(coupleIds: string[]): Promise<string[]> {
  const tokens: string[] = [];

  for (const coupleId of coupleIds) {
    try {
      const coupleDoc = await db.collection('couples').doc(coupleId).get();
      if (coupleDoc.exists) {
        const data = coupleDoc.data() as Couple;
        
        // Get tokens for male
        if (data.male?.deviceTokens && data.male.pushNotificationsEnabled !== false) {
          tokens.push(...data.male.deviceTokens);
        }
        
        // Get tokens for female
        if (data.female?.deviceTokens && data.female.pushNotificationsEnabled !== false) {
          tokens.push(...data.female.deviceTokens);
        }
      }
    } catch (error) {
      console.error(`Error getting tokens for couple ${coupleId}:`, error);
    }
  }

  // Remove duplicates
  return [...new Set(tokens)];
}

/**
 * Get all device tokens for active couples
 */
async function getAllActiveTokens(): Promise<string[]> {
  const tokens: string[] = [];

  try {
    const couplesSnapshot = await db.collection('couples')
      .where('status', '==', 'active')
      .get();

    couplesSnapshot.forEach(doc => {
      const data = doc.data() as Couple;
      
      if (data.male?.deviceTokens && data.male.pushNotificationsEnabled !== false) {
        tokens.push(...data.male.deviceTokens);
      }
      
      if (data.female?.deviceTokens && data.female.pushNotificationsEnabled !== false) {
        tokens.push(...data.female.deviceTokens);
      }
    });
  } catch (error) {
    console.error('Error getting all active tokens:', error);
  }

  return [...new Set(tokens)];
}

/**
 * Send FCM messages to tokens (handles batching for large lists)
 */
async function sendToTokens(
  tokens: string[],
  payload: NotificationPayload
): Promise<{ success: number; failure: number }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

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
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'reminders',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Log failed tokens for debugging
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${batch[idx]}:`, resp.error);
          }
        });
      }
    } catch (error) {
      console.error('Error sending batch:', error);
      failureCount += batch.length;
    }
  }

  return { success: successCount, failure: failureCount };
}

// ============================================
// CLOUD FUNCTIONS
// ============================================

/**
 * Send reminder notification to users with missing logs
 * Called from admin panel
 */
export const sendMissingLogsReminder = functions.https.onCall(async (data, context) => {
  // Verify admin authentication (optional - add if needed)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  // }

  const { coupleIds, adminName } = data;

  if (!coupleIds || !Array.isArray(coupleIds) || coupleIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'coupleIds must be a non-empty array');
  }

  try {
    // Get device tokens
    const tokens = await getTokensForCouples(coupleIds);

    if (tokens.length === 0) {
      return {
        success: false,
        sentCount: 0,
        error: 'No device tokens found for specified users',
      };
    }

    // Send notifications
    const result = await sendToTokens(tokens, {
      title: '📋 Daily Log Reminder',
      body: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
      data: {
        type: 'missing_logs_reminder',
        screen: '/user/home',
      },
    });

    // Create broadcast record for in-app display
    await db.collection('broadcasts').add({
      title: 'Daily Log Reminder',
      message: "Don't forget to log your steps, food, and exercise for today! Stay on track with your health goals.",
      priority: 'important',
      status: 'sent',
      sentBy: 'system',
      sentByName: adminName || 'Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
    });

    return {
      success: true,
      sentCount: result.success,
      failedCount: result.failure,
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
