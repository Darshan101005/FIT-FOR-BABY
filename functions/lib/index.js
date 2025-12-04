"use strict";
/**
 * Firebase Cloud Functions for Fit for Baby App
 * Handles push notifications via FCM
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBroadcastCreated = exports.scheduledDailyReminder = exports.sendBroadcast = exports.sendMissingLogsReminder = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get all device tokens for specified couples
 */
async function getTokensForCouples(coupleIds) {
    var _a, _b;
    const tokens = [];
    for (const coupleId of coupleIds) {
        try {
            const coupleDoc = await db.collection('couples').doc(coupleId).get();
            if (coupleDoc.exists) {
                const data = coupleDoc.data();
                // Get tokens for male
                if (((_a = data.male) === null || _a === void 0 ? void 0 : _a.deviceTokens) && data.male.pushNotificationsEnabled !== false) {
                    tokens.push(...data.male.deviceTokens);
                }
                // Get tokens for female
                if (((_b = data.female) === null || _b === void 0 ? void 0 : _b.deviceTokens) && data.female.pushNotificationsEnabled !== false) {
                    tokens.push(...data.female.deviceTokens);
                }
            }
        }
        catch (error) {
            console.error(`Error getting tokens for couple ${coupleId}:`, error);
        }
    }
    // Remove duplicates
    return [...new Set(tokens)];
}
/**
 * Get all device tokens for active couples
 */
async function getAllActiveTokens() {
    const tokens = [];
    try {
        const couplesSnapshot = await db.collection('couples')
            .where('status', '==', 'active')
            .get();
        couplesSnapshot.forEach(doc => {
            var _a, _b;
            const data = doc.data();
            if (((_a = data.male) === null || _a === void 0 ? void 0 : _a.deviceTokens) && data.male.pushNotificationsEnabled !== false) {
                tokens.push(...data.male.deviceTokens);
            }
            if (((_b = data.female) === null || _b === void 0 ? void 0 : _b.deviceTokens) && data.female.pushNotificationsEnabled !== false) {
                tokens.push(...data.female.deviceTokens);
            }
        });
    }
    catch (error) {
        console.error('Error getting all active tokens:', error);
    }
    return [...new Set(tokens)];
}
/**
 * Send FCM messages to tokens (handles batching for large lists)
 */
async function sendToTokens(tokens, payload) {
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
            const message = {
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
        }
        catch (error) {
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
exports.sendMissingLogsReminder = functions.https.onCall(async (data, context) => {
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
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        });
        return {
            success: true,
            sentCount: result.success,
            failedCount: result.failure,
        };
    }
    catch (error) {
        console.error('Error in sendMissingLogsReminder:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notifications');
    }
});
/**
 * Send broadcast notification to all active users
 */
exports.sendBroadcast = functions.https.onCall(async (data, context) => {
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
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            totalRecipients: tokens.length,
        });
        return {
            success: true,
            sentCount: result.success,
            failedCount: result.failure,
        };
    }
    catch (error) {
        console.error('Error in sendBroadcast:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send broadcast');
    }
});
/**
 * Scheduled function to send daily reminder at 8 PM
 * Checks for users who haven't logged today and sends reminder
 */
exports.scheduledDailyReminder = functions.pubsub
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
        const couplesWithMissingLogs = [];
        for (const doc of couplesSnapshot.docs) {
            const couple = doc.data();
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
                }
                catch (error) {
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
    }
    catch (error) {
        console.error('Error in scheduledDailyReminder:', error);
        return null;
    }
});
/**
 * Trigger notification when a new broadcast is created
 */
exports.onBroadcastCreated = functions.firestore
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
    }
    catch (error) {
        console.error('Error in onBroadcastCreated:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map