import { useApp } from '@/context/AppContext';
import { supportRequestService } from '@/services/firestore.service';
import { SupportRequest } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

// Fit for Baby Color Palette
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#0088d4',
  accent: '#98be4e',
  accentDark: '#7da33e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

export default function RequestDetailScreen() {
  const router = useRouter();
  const { user } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showVideoLinkSection, setShowVideoLinkSection] = useState(false);
  const [sendingVideoLink, setSendingVideoLink] = useState(false);

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const allRequests = await supportRequestService.getAll();
      const found = allRequests.find(r => r.id === id);
      setRequest(found || null);
    } catch (error) {
      console.error('Error loading request:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date/time
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return { date: 'N/A', time: 'N/A', full: 'N/A' };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('en-US'),
    };
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'in-progress': return COLORS.info;
      case 'completed': return COLORS.success;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  // Handle call action
  const handleCall = (phone: string) => {
    const phoneNumber = phone.replace(/\s/g, '');
    if (Platform.OS === 'web') {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  // Generate Jitsi meeting link
  const generateVideoLink = (req: SupportRequest): string => {
    const baseUrl = 'https://meet.jit.si/FitForBaby';
    const coupleId = (req.coupleId || 'Unknown').replace(/[^a-zA-Z0-9]/g, '-');
    const userName = (req.userName || 'User').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const today = new Date();
    const dateStr = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
    return baseUrl + '-' + coupleId + '-' + userName + '-' + dateStr;
  };

  // Handle send video link
  const handleSendVideoLink = async () => {
    if (!request) return;

    const generatedLink = generateVideoLink(request);

    setSendingVideoLink(true);
    try {
      await supportRequestService.sendVideoUrl(request.id, generatedLink);
      await loadRequest();
      setShowVideoLinkSection(false);
      Alert.alert('Success', 'Video link sent successfully!');
    } catch (error) {
      console.error('Error sending video link:', error);
      Alert.alert('Error', 'Failed to send video link');
    } finally {
      setSendingVideoLink(false);
    }
  };

  // Handle join video call
  const handleJoinVideoCall = (videoUrl: string) => {
    if (Platform.OS === 'web') {
      window.open(videoUrl, '_blank');
    } else {
      Linking.openURL(videoUrl);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (newStatus: 'in-progress' | 'completed' | 'cancelled') => {
    if (!request) return;

    setIsSaving(true);
    try {
      await supportRequestService.updateStatus(
        request.id,
        newStatus,
        user?.id,
        user?.name || user?.email
      );
      await loadRequest();
      if (newStatus === 'completed') {
        Alert.alert('Success', 'Request marked as completed!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>Request Not Found</Text>
          <Text style={styles.errorText}>The request you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dateTime = formatDateTime(request.createdAt);
  const phone = request.editedPhone || request.userPhone;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Request Details</Text>
          <Text style={styles.headerSubtitle}>
            {request.type === 'call' ? 'Phone Call' : 'Video Call'} Request
          </Text>
        </View>
        <View style={[
          styles.headerTypeBadge,
          request.type === 'video' && { backgroundColor: COLORS.accent + '20' }
        ]}>
          <Ionicons
            name={request.type === 'call' ? 'call' : 'videocam'}
            size={16}
            color={request.type === 'call' ? COLORS.primary : COLORS.accent}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>User Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {request.userName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.userName}>{request.userName}</Text>
                <Text style={styles.userMeta}>{request.coupleId} • {request.coupleName || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(phone)}
              >
                <Ionicons name="call" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Request Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Request Details</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Requested On</Text>
                <Text style={styles.detailValue}>{dateTime.date}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{dateTime.time}</Text>
              </View>
            </View>
            {request.preferredTime && (
              <View style={styles.detailRow}>
                <Ionicons name="time" size={18} color={COLORS.textMuted} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Preferred Time</Text>
                  <Text style={styles.detailValue}>{request.preferredTime}</Text>
                </View>
              </View>
            )}
            {request.reason && (
              <>
                <View style={styles.divider} />
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Reason for Request</Text>
                  <Text style={styles.reasonText}>{request.reason}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Status</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current Status</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(request.status) + '20' }
              ]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
                <Text style={[styles.statusBadgeText, { color: getStatusColor(request.status) }]}>
                  {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Text>
              </View>
            </View>
            {request.assignedName && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={18} color={COLORS.textMuted} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Assigned To</Text>
                  <Text style={styles.detailValue}>{request.assignedName}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Video Link Section (for video requests) */}
        {request.type === 'video' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="videocam" size={20} color={COLORS.accent} />
              <Text style={styles.cardTitle}>Video Meeting</Text>
            </View>
            <View style={styles.cardContent}>
              {request.videoUrl ? (
                <>
                  <View style={styles.videoLinkSent}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    <Text style={styles.videoLinkSentText}>Link has been sent to user</Text>
                  </View>
                  <View style={styles.videoLinkContainer}>
                    <Text style={styles.videoLinkLabel}>Meeting Link:</Text>
                    <Text style={styles.videoLinkText} numberOfLines={2}>{request.videoUrl}</Text>
                  </View>
                  {request.status !== 'completed' && request.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.joinVideoButton}
                      onPress={() => handleJoinVideoCall(request.videoUrl!)}
                    >
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.joinVideoButtonText}>Join Video Call</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  {!showVideoLinkSection ? (
                    <TouchableOpacity
                      style={styles.sendLinkButton}
                      onPress={() => setShowVideoLinkSection(true)}
                    >
                      <Ionicons name="link" size={18} color="#fff" />
                      <Text style={styles.sendLinkButtonText}>Send Video Link</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.videoLinkGenSection}>
                      <Text style={styles.videoLinkGenLabel}>Generated Meeting Link:</Text>
                      <View style={styles.generatedLinkBox}>
                        <Ionicons name="link" size={16} color={COLORS.accent} />
                        <Text style={styles.generatedLinkText} numberOfLines={2}>
                          {generateVideoLink(request)}
                        </Text>
                      </View>
                      <View style={styles.videoLinkActions}>
                        <TouchableOpacity
                          style={styles.cancelLinkButton}
                          onPress={() => setShowVideoLinkSection(false)}
                        >
                          <Text style={styles.cancelLinkButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.confirmSendButton}
                          onPress={handleSendVideoLink}
                          disabled={sendingVideoLink}
                        >
                          {sendingVideoLink ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="send" size={16} color="#fff" />
                              <Text style={styles.confirmSendButtonText}>Send Link</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      {request.status !== 'completed' && request.status !== 'cancelled' && (
        <View style={styles.bottomActions}>
          {request.type === 'call' && (
            <TouchableOpacity
              style={styles.actionButtonCall}
              onPress={() => handleCall(phone)}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Call Now</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButtonComplete}
            onPress={() => handleUpdateStatus('completed')}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.success} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Mark Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoContent: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonSection: {
    paddingTop: 4,
  },
  reasonLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    backgroundColor: COLORS.borderLight,
    padding: 12,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  videoLinkSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  videoLinkSentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.success,
  },
  videoLinkContainer: {
    backgroundColor: COLORS.borderLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  videoLinkLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  videoLinkText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  joinVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  joinVideoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sendLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  sendLinkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  videoLinkGenSection: {
    gap: 12,
  },
  videoLinkGenLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  generatedLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    gap: 8,
  },
  generatedLinkText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  videoLinkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelLinkButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLinkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmSendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmSendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButtonCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonComplete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
