"use strict";
/**
 * Firebase Cloud Functions for Fit for Baby App
 * Handles push notifications via FCM for EAS builds
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
exports.onDeviceSessionDelete = exports.onDeviceSessionUpdate = exports.onDeviceSessionCreate = exports.onReminderDelete = exports.onReminderUpdate = exports.onReminderCreate = exports.onAnnouncementDelete = exports.onAnnouncementUpdate = exports.onAnnouncementCreate = exports.onAdminDelete = exports.onAdminUpdate = exports.onAdminCreate = exports.onQuestionnaireDelete = exports.onQuestionnaireUpdate = exports.onQuestionnaireCreate = exports.onCallRequestDelete = exports.onCallRequestUpdate = exports.onCallRequestCreate = exports.onChatMessageDelete = exports.onChatMessageUpdate = exports.onChatMessageCreate = exports.onFeedbackDelete = exports.onFeedbackUpdate = exports.onFeedbackCreate = exports.onCoupleDelete = exports.onCoupleUpdate = exports.onCoupleCreate = exports.onAppointmentDelete = exports.onAppointmentUpdate = exports.onAppointmentCreate = exports.onStepsDelete = exports.onStepsUpdate = exports.onStepsCreate = exports.onExerciseLogDelete = exports.onExerciseLogUpdate = exports.onExerciseLogCreate = exports.onFoodLogDelete = exports.onFoodLogUpdate = exports.onFoodLogCreate = exports.onWeightLogDelete = exports.onWeightLogUpdate = exports.onWeightLogCreate = exports.testFCMNotification = exports.unregisterFCMToken = exports.registerFCMToken = exports.onBroadcastCreated = exports.scheduledDailyReminder = exports.sendBroadcast = exports.sendMissingLogsReminder = void 0;
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
 * Get all FCM device tokens for specified couples
 */
async function getTokensForCouples(coupleIds) {
    var _a, _b, _c, _d;
    const tokens = [];
    for (const coupleId of coupleIds) {
        try {
            const coupleDoc = await db.collection('couples').doc(coupleId).get();
            if (coupleDoc.exists) {
                const data = coupleDoc.data();
                // Get FCM tokens for male
                if (((_a = data.male) === null || _a === void 0 ? void 0 : _a.pushNotificationsEnabled) !== false) {
                    if ((_b = data.male) === null || _b === void 0 ? void 0 : _b.deviceTokens) {
                        tokens.push(...data.male.deviceTokens);
                    }
                }
                // Get FCM tokens for female
                if (((_c = data.female) === null || _c === void 0 ? void 0 : _c.pushNotificationsEnabled) !== false) {
                    if ((_d = data.female) === null || _d === void 0 ? void 0 : _d.deviceTokens) {
                        tokens.push(...data.female.deviceTokens);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error getting tokens for couple ${coupleId}:`, error);
        }
    }
    // Remove duplicates and filter out Expo tokens (they start with ExponentPushToken)
    return [...new Set(tokens)].filter(token => token && !token.startsWith('ExponentPushToken'));
}
/**
 * Get all FCM device tokens for active couples
 */
async function getAllActiveTokens() {
    const tokens = [];
    try {
        const couplesSnapshot = await db.collection('couples')
            .where('status', '==', 'active')
            .get();
        couplesSnapshot.forEach(doc => {
            var _a, _b, _c, _d;
            const data = doc.data();
            if (((_a = data.male) === null || _a === void 0 ? void 0 : _a.pushNotificationsEnabled) !== false && ((_b = data.male) === null || _b === void 0 ? void 0 : _b.deviceTokens)) {
                tokens.push(...data.male.deviceTokens);
            }
            if (((_c = data.female) === null || _c === void 0 ? void 0 : _c.pushNotificationsEnabled) !== false && ((_d = data.female) === null || _d === void 0 ? void 0 : _d.deviceTokens)) {
                tokens.push(...data.female.deviceTokens);
            }
        });
    }
    catch (error) {
        console.error('Error getting all active tokens:', error);
    }
    // Remove duplicates and filter out Expo tokens
    return [...new Set(tokens)].filter(token => token && !token.startsWith('ExponentPushToken'));
}
/**
 * Send FCM messages to tokens (handles batching for large lists)
 */
async function sendToTokens(tokens, payload) {
    if (tokens.length === 0) {
        return { success: 0, failure: 0, invalidTokens: [] };
    }
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];
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
                    var _a;
                    if (!resp.success) {
                        const errorCode = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                        // Track tokens that should be removed
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(batch[idx]);
                        }
                        console.error(`Failed to send to token: ${errorCode}`);
                    }
                });
            }
        }
        catch (error) {
            console.error('Error sending batch:', error);
            failureCount += batch.length;
        }
    }
    return { success: successCount, failure: failureCount, invalidTokens };
}
/**
 * Remove invalid tokens from Firestore
 */
async function cleanupInvalidTokens(invalidTokens) {
    var _a, _b;
    if (invalidTokens.length === 0)
        return;
    try {
        const couplesSnapshot = await db.collection('couples').get();
        const batch = db.batch();
        let updateCount = 0;
        for (const doc of couplesSnapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            const updates = {};
            // Check male tokens
            if ((_a = data.male) === null || _a === void 0 ? void 0 : _a.deviceTokens) {
                const cleanedTokens = data.male.deviceTokens.filter((t) => !invalidTokens.includes(t));
                if (cleanedTokens.length !== data.male.deviceTokens.length) {
                    updates['male.deviceTokens'] = cleanedTokens;
                    needsUpdate = true;
                }
            }
            // Check female tokens
            if ((_b = data.female) === null || _b === void 0 ? void 0 : _b.deviceTokens) {
                const cleanedTokens = data.female.deviceTokens.filter((t) => !invalidTokens.includes(t));
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
    }
    catch (error) {
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
exports.sendMissingLogsReminder = functions.https.onCall(async (data, context) => {
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
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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
/**
 * Register FCM token for a user
 * Called from the app when user logs in on EAS build
 */
exports.registerFCMToken = functions.https.onCall(async (data, context) => {
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
        const coupleData = coupleDoc.data();
        const userData = gender === 'male' ? coupleData.male : coupleData.female;
        const currentTokens = (userData === null || userData === void 0 ? void 0 : userData.deviceTokens) || [];
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
    }
    catch (error) {
        console.error('Error registering FCM token:', error);
        throw new functions.https.HttpsError('internal', 'Failed to register token');
    }
});
/**
 * Unregister FCM token when user logs out
 */
exports.unregisterFCMToken = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error unregistering FCM token:', error);
        throw new functions.https.HttpsError('internal', 'Failed to unregister token');
    }
});
/**
 * HTTP endpoint for testing FCM notifications (development only)
 */
exports.testFCMNotification = functions.https.onRequest(async (req, res) => {
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
        const message = {
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
    }
    catch (error) {
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
async function createActivityLog(operation, collectionName, documentId, data, previousData) {
    var _a, _b;
    try {
        // Skip logging for activityLogs collection to prevent infinite loops
        if (collectionName === 'activityLogs')
            return;
        // Determine user info from the document data
        let userId;
        let coupleId;
        let description = '';
        // Extract user/couple info based on collection
        switch (collectionName) {
            case 'couples':
                coupleId = documentId;
                if (operation === 'create') {
                    description = `New couple enrolled: ${((_a = data === null || data === void 0 ? void 0 : data.male) === null || _a === void 0 ? void 0 : _a.name) || 'Male'} & ${((_b = data === null || data === void 0 ? void 0 : data.female) === null || _b === void 0 ? void 0 : _b.name) || 'Female'}`;
                }
                else if (operation === 'update') {
                    description = `Couple ${documentId} updated`;
                }
                else {
                    description = `Couple ${documentId} deleted`;
                }
                break;
            case 'weightLogs':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Logged weight: ${(data === null || data === void 0 ? void 0 : data.weight) || 'N/A'}kg`;
                }
                else if (operation === 'update') {
                    description = `Updated weight log`;
                }
                else {
                    description = `Deleted weight log`;
                }
                break;
            case 'foodLogs':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Logged ${(data === null || data === void 0 ? void 0 : data.mealType) || 'meal'} (${(data === null || data === void 0 ? void 0 : data.totalCalories) || 0} cal)`;
                }
                else if (operation === 'update') {
                    description = `Updated food log`;
                }
                else {
                    description = `Deleted food log`;
                }
                break;
            case 'exerciseLogs':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Logged exercise: ${(data === null || data === void 0 ? void 0 : data.exerciseType) || (data === null || data === void 0 ? void 0 : data.type) || 'workout'}`;
                }
                else if (operation === 'update') {
                    description = `Updated exercise log`;
                }
                else {
                    description = `Deleted exercise log`;
                }
                break;
            case 'steps':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Logged ${(data === null || data === void 0 ? void 0 : data.stepCount) || 0} steps`;
                }
                else if (operation === 'update') {
                    description = `Updated step count`;
                }
                else {
                    description = `Deleted step entry`;
                }
                break;
            case 'appointments':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Created ${(data === null || data === void 0 ? void 0 : data.type) || 'appointment'} appointment`;
                }
                else if (operation === 'update') {
                    const statusChanged = (previousData === null || previousData === void 0 ? void 0 : previousData.status) !== (data === null || data === void 0 ? void 0 : data.status);
                    description = statusChanged
                        ? `Appointment status changed to ${data === null || data === void 0 ? void 0 : data.status}`
                        : `Updated appointment`;
                }
                else {
                    description = `Deleted appointment`;
                }
                break;
            case 'feedbacks':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Submitted feedback: ${(data === null || data === void 0 ? void 0 : data.category) || 'general'} (${(data === null || data === void 0 ? void 0 : data.rating) || 'N/A'} stars)`;
                }
                else {
                    description = `${operation === 'update' ? 'Updated' : 'Deleted'} feedback`;
                }
                break;
            case 'chatMessages':
                userId = data === null || data === void 0 ? void 0 : data.senderId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                description = `${operation === 'create' ? 'Sent' : operation === 'update' ? 'Updated' : 'Deleted'} chat message`;
                break;
            case 'callRequests':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Requested callback: ${(data === null || data === void 0 ? void 0 : data.reason) || 'general inquiry'}`;
                }
                else if (operation === 'update') {
                    description = `Call request status: ${(data === null || data === void 0 ? void 0 : data.status) || 'updated'}`;
                }
                else {
                    description = `Deleted call request`;
                }
                break;
            case 'deviceSessions':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                description = `Device session ${operation}d`;
                break;
            case 'questionnaires':
                userId = data === null || data === void 0 ? void 0 : data.submittedBy;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Submitted questionnaire`;
                }
                else {
                    description = `${operation === 'update' ? 'Updated' : 'Deleted'} questionnaire`;
                }
                break;
            case 'admins':
                userId = documentId;
                if (operation === 'create') {
                    description = `Admin account created: ${(data === null || data === void 0 ? void 0 : data.displayName) || 'New Admin'}`;
                }
                else if (operation === 'update') {
                    description = `Admin ${(data === null || data === void 0 ? void 0 : data.displayName) || documentId} updated`;
                }
                else {
                    description = `Admin account deleted`;
                }
                break;
            case 'announcements':
                if (operation === 'create') {
                    description = `New announcement: ${(data === null || data === void 0 ? void 0 : data.title) || 'Untitled'}`;
                }
                else if (operation === 'update') {
                    description = `Announcement updated`;
                }
                else {
                    description = `Announcement deleted`;
                }
                break;
            case 'reminders':
                userId = data === null || data === void 0 ? void 0 : data.userId;
                coupleId = data === null || data === void 0 ? void 0 : data.coupleId;
                if (operation === 'create') {
                    description = `Created reminder: ${(data === null || data === void 0 ? void 0 : data.title) || (data === null || data === void 0 ? void 0 : data.type) || 'reminder'}`;
                }
                else if (operation === 'update') {
                    description = `Updated reminder`;
                }
                else {
                    description = `Deleted reminder`;
                }
                break;
            default:
                description = `${operation.charAt(0).toUpperCase() + operation.slice(1)}d document in ${collectionName}`;
        }
        // Create the activity log entry
        const logData = {
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
        if (userId)
            logData.userId = userId;
        if (coupleId)
            logData.coupleId = coupleId;
        await db.collection('activityLogs').add(logData);
        console.log(`Activity logged: ${operation} on ${collectionName}/${documentId}`);
    }
    catch (error) {
        // Don't let logging errors affect the main operation
        console.error('Error creating activity log:', error);
    }
}
// --- Weight Logs Triggers (subcollection under users) ---
exports.onWeightLogCreate = functions.firestore
    .document('users/{userId}/weightLogs/{docId}')
    .onCreate(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('create', 'weightLogs', context.params.docId, data);
});
exports.onWeightLogUpdate = functions.firestore
    .document('users/{userId}/weightLogs/{docId}')
    .onUpdate(async (change, context) => {
    const data = Object.assign(Object.assign({}, change.after.data()), { userId: context.params.userId });
    await createActivityLog('update', 'weightLogs', context.params.docId, data, change.before.data());
});
exports.onWeightLogDelete = functions.firestore
    .document('users/{userId}/weightLogs/{docId}')
    .onDelete(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('delete', 'weightLogs', context.params.docId, data);
});
// --- Food Logs Triggers (subcollection under users) ---
exports.onFoodLogCreate = functions.firestore
    .document('users/{userId}/foodLogs/{docId}')
    .onCreate(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('create', 'foodLogs', context.params.docId, data);
});
exports.onFoodLogUpdate = functions.firestore
    .document('users/{userId}/foodLogs/{docId}')
    .onUpdate(async (change, context) => {
    const data = Object.assign(Object.assign({}, change.after.data()), { userId: context.params.userId });
    await createActivityLog('update', 'foodLogs', context.params.docId, data, change.before.data());
});
exports.onFoodLogDelete = functions.firestore
    .document('users/{userId}/foodLogs/{docId}')
    .onDelete(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('delete', 'foodLogs', context.params.docId, data);
});
// --- Exercise Logs Triggers (subcollection under users) ---
exports.onExerciseLogCreate = functions.firestore
    .document('users/{userId}/exerciseLogs/{docId}')
    .onCreate(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('create', 'exerciseLogs', context.params.docId, data);
});
exports.onExerciseLogUpdate = functions.firestore
    .document('users/{userId}/exerciseLogs/{docId}')
    .onUpdate(async (change, context) => {
    const data = Object.assign(Object.assign({}, change.after.data()), { userId: context.params.userId });
    await createActivityLog('update', 'exerciseLogs', context.params.docId, data, change.before.data());
});
exports.onExerciseLogDelete = functions.firestore
    .document('users/{userId}/exerciseLogs/{docId}')
    .onDelete(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('delete', 'exerciseLogs', context.params.docId, data);
});
// --- Steps Triggers (subcollection under users) ---
exports.onStepsCreate = functions.firestore
    .document('users/{userId}/steps/{docId}')
    .onCreate(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('create', 'steps', context.params.docId, data);
});
exports.onStepsUpdate = functions.firestore
    .document('users/{userId}/steps/{docId}')
    .onUpdate(async (change, context) => {
    const data = Object.assign(Object.assign({}, change.after.data()), { userId: context.params.userId });
    await createActivityLog('update', 'steps', context.params.docId, data, change.before.data());
});
exports.onStepsDelete = functions.firestore
    .document('users/{userId}/steps/{docId}')
    .onDelete(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('delete', 'steps', context.params.docId, data);
});
// --- Appointments Triggers (subcollection under users) ---
exports.onAppointmentCreate = functions.firestore
    .document('users/{userId}/appointments/{docId}')
    .onCreate(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('create', 'appointments', context.params.docId, data);
});
exports.onAppointmentUpdate = functions.firestore
    .document('users/{userId}/appointments/{docId}')
    .onUpdate(async (change, context) => {
    const data = Object.assign(Object.assign({}, change.after.data()), { userId: context.params.userId });
    await createActivityLog('update', 'appointments', context.params.docId, data, change.before.data());
});
exports.onAppointmentDelete = functions.firestore
    .document('users/{userId}/appointments/{docId}')
    .onDelete(async (snap, context) => {
    const data = Object.assign(Object.assign({}, snap.data()), { userId: context.params.userId });
    await createActivityLog('delete', 'appointments', context.params.docId, data);
});
// --- Couples Triggers (top-level collection) ---
exports.onCoupleCreate = functions.firestore
    .document('couples/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'couples', context.params.docId, snap.data());
});
exports.onCoupleUpdate = functions.firestore
    .document('couples/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'couples', context.params.docId, change.after.data(), change.before.data());
});
exports.onCoupleDelete = functions.firestore
    .document('couples/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'couples', context.params.docId, snap.data());
});
// --- Feedbacks Triggers (top-level collection) ---
exports.onFeedbackCreate = functions.firestore
    .document('feedbacks/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'feedbacks', context.params.docId, snap.data());
});
exports.onFeedbackUpdate = functions.firestore
    .document('feedbacks/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'feedbacks', context.params.docId, change.after.data(), change.before.data());
});
exports.onFeedbackDelete = functions.firestore
    .document('feedbacks/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'feedbacks', context.params.docId, snap.data());
});
// --- Chat Messages Triggers ---
exports.onChatMessageCreate = functions.firestore
    .document('chatMessages/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'chatMessages', context.params.docId, snap.data());
});
exports.onChatMessageUpdate = functions.firestore
    .document('chatMessages/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'chatMessages', context.params.docId, change.after.data(), change.before.data());
});
exports.onChatMessageDelete = functions.firestore
    .document('chatMessages/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'chatMessages', context.params.docId, snap.data());
});
// --- Call Requests Triggers ---
exports.onCallRequestCreate = functions.firestore
    .document('callRequests/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'callRequests', context.params.docId, snap.data());
});
exports.onCallRequestUpdate = functions.firestore
    .document('callRequests/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'callRequests', context.params.docId, change.after.data(), change.before.data());
});
exports.onCallRequestDelete = functions.firestore
    .document('callRequests/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'callRequests', context.params.docId, snap.data());
});
// --- Questionnaires Triggers ---
exports.onQuestionnaireCreate = functions.firestore
    .document('questionnaires/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'questionnaires', context.params.docId, snap.data());
});
exports.onQuestionnaireUpdate = functions.firestore
    .document('questionnaires/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'questionnaires', context.params.docId, change.after.data(), change.before.data());
});
exports.onQuestionnaireDelete = functions.firestore
    .document('questionnaires/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'questionnaires', context.params.docId, snap.data());
});
// --- Admins Triggers ---
exports.onAdminCreate = functions.firestore
    .document('admins/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'admins', context.params.docId, snap.data());
});
exports.onAdminUpdate = functions.firestore
    .document('admins/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'admins', context.params.docId, change.after.data(), change.before.data());
});
exports.onAdminDelete = functions.firestore
    .document('admins/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'admins', context.params.docId, snap.data());
});
// --- Announcements Triggers ---
exports.onAnnouncementCreate = functions.firestore
    .document('announcements/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'announcements', context.params.docId, snap.data());
});
exports.onAnnouncementUpdate = functions.firestore
    .document('announcements/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'announcements', context.params.docId, change.after.data(), change.before.data());
});
exports.onAnnouncementDelete = functions.firestore
    .document('announcements/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'announcements', context.params.docId, snap.data());
});
// --- Reminders Triggers ---
exports.onReminderCreate = functions.firestore
    .document('reminders/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'reminders', context.params.docId, snap.data());
});
exports.onReminderUpdate = functions.firestore
    .document('reminders/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'reminders', context.params.docId, change.after.data(), change.before.data());
});
exports.onReminderDelete = functions.firestore
    .document('reminders/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'reminders', context.params.docId, snap.data());
});
// --- Device Sessions Triggers ---
exports.onDeviceSessionCreate = functions.firestore
    .document('deviceSessions/{docId}')
    .onCreate(async (snap, context) => {
    await createActivityLog('create', 'deviceSessions', context.params.docId, snap.data());
});
exports.onDeviceSessionUpdate = functions.firestore
    .document('deviceSessions/{docId}')
    .onUpdate(async (change, context) => {
    await createActivityLog('update', 'deviceSessions', context.params.docId, change.after.data(), change.before.data());
});
exports.onDeviceSessionDelete = functions.firestore
    .document('deviceSessions/{docId}')
    .onDelete(async (snap, context) => {
    await createActivityLog('delete', 'deviceSessions', context.params.docId, snap.data());
});
//# sourceMappingURL=index.js.map