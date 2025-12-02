import { useApp } from '@/context/AppContext';
import { supportRequestService } from '@/services/firestore.service';
import { SupportRequest } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

// Fit for Baby Color Palette
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#0088d4',
  accent: '#98be4e',
  accentDark: '#7da33e',
  success: '#98be4e',
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

export default function RequestedCallsScreen() {
  const { user } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  // Data states
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'cancelled'>('all');

  // Video link inline states (expanded card ID)
  const [expandedVideoCardId, setExpandedVideoCardId] = useState<string | null>(null);
  const [sendingVideoLinkId, setSendingVideoLinkId] = useState<string | null>(null);

  // Expanded detail card state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showVideoLinkSection, setShowVideoLinkSection] = useState(false);
  const [sendingVideoLink, setSendingVideoLink] = useState(false);

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    type: 'video-sent' | 'completed' | 'deleted';
    message: string;
  }>({
    visible: false,
    type: 'video-sent',
    message: '',
  });

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    requestId: string | null;
    userName: string;
    isDeleting: boolean;
  }>({
    visible: false,
    requestId: null,
    userName: '',
    isDeleting: false,
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({
    visible: false,
    message: '',
  });

  // Load data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const requests = await supportRequestService.getAll();
      // Sort by createdAt descending (newest first)
      const sorted = requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setSupportRequests(sorted);
    } catch (error) {
      console.error('Error loading support requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Filter requests
  const filteredRequests = supportRequests.filter(request => {
    const matchesSearch =
      request.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.coupleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.coupleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userPhone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get counts by status
  const pendingCount = supportRequests.filter(r => r.status === 'pending').length;
  const inProgressCount = supportRequests.filter(r => r.status === 'in-progress').length;
  const completedCount = supportRequests.filter(r => r.status === 'completed').length;

  // Format date/time
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return { date: 'N/A', time: 'N/A' };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
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
  const generateVideoLink = (request: SupportRequest): string => {
    const baseUrl = 'https://meet.jit.si/FitForBaby';
    const coupleId = (request.coupleId || 'Unknown').replace(/[^a-zA-Z0-9]/g, '-');
    const userName = (request.userName || 'User').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const today = new Date();
    const dateStr = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
    
    const generatedLink = baseUrl + '-' + coupleId + '-' + userName + '-' + dateStr;
    return generatedLink;
  };

  // Handle send video link (inline - for card)
  const handleSendVideoLinkInline = async (request: SupportRequest) => {
    const generatedLink = generateVideoLink(request);

    setSendingVideoLinkId(request.id);
    try {
      await supportRequestService.sendVideoUrl(request.id, generatedLink);
      await loadData();
      setExpandedVideoCardId(null);
    } catch (error) {
      console.error('Error sending video link:', error);
      setErrorModal({ visible: true, message: 'Failed to send video link. Please try again.' });
    } finally {
      setSendingVideoLinkId(null);
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

  // Toggle card expansion
  const handleToggleCard = (request: SupportRequest) => {
    if (expandedCardId === request.id) {
      setExpandedCardId(null);
      setShowVideoLinkSection(false);
    } else {
      setExpandedCardId(request.id);
      setShowVideoLinkSection(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (request: SupportRequest, newStatus: 'in-progress' | 'completed' | 'cancelled') => {
    setIsSaving(true);
    try {
      await supportRequestService.updateStatus(
        request.id,
        newStatus,
        user?.id,
        user?.name || user?.email
      );
      await loadData();
      if (newStatus === 'completed') {
        setExpandedCardId(null);
        setSuccessModal({
          visible: true,
          type: 'completed',
          message: 'Request has been marked as completed!',
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setErrorModal({ visible: true, message: 'Failed to update status. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle send video link inline
  const handleSendVideoLinkExpanded = async (request: SupportRequest) => {
    const generatedLink = generateVideoLink(request);

    setSendingVideoLink(true);
    try {
      await supportRequestService.sendVideoUrl(request.id, generatedLink);
      await loadData();
      setShowVideoLinkSection(false);
      setSuccessModal({
        visible: true,
        type: 'video-sent',
        message: 'Video link has been sent to the user successfully!',
      });
    } catch (error) {
      console.error('Error sending video link:', error);
      setErrorModal({ visible: true, message: 'Failed to send video link. Please try again.' });
    } finally {
      setSendingVideoLink(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!deleteModal.requestId) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await supportRequestService.delete(deleteModal.requestId);
      await loadData();
      setDeleteModal({ visible: false, requestId: null, userName: '', isDeleting: false });
      setExpandedCardId(null);
      setSuccessModal({
        visible: true,
        type: 'deleted',
        message: 'Request has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      setErrorModal({ visible: true, message: 'Failed to delete request. Please try again.' });
    } finally {
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Render Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Requested Calls</Text>
          <Text style={styles.headerSubtitle}>Manage call and video requests from users</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
          <Text style={styles.statNumber}>{inProgressCount}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, couple ID, or phone..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
          <View style={styles.filterChips}>
            {(['all', 'pending', 'in-progress', 'completed', 'cancelled'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                  {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // Render Request Card
  const renderRequestCard = (request: SupportRequest) => {
    const dateTime = formatDateTime(request.createdAt);
    const isCompleted = request.status === 'completed';
    const isCancelled = request.status === 'cancelled';
    const phone = request.editedPhone || request.userPhone;
    const isExpanded = expandedCardId === request.id;

    return (
      <View
        key={request.id}
        style={[
          styles.callCard,
          isCompleted && styles.callCardCompleted,
          isCancelled && styles.callCardCancelled,
          isExpanded && styles.callCardExpanded,
        ]}
      >
        {/* Card Header - Always visible, clickable to expand/collapse */}
        <TouchableOpacity
          style={styles.callCardTouchable}
          onPress={() => handleToggleCard(request)}
          activeOpacity={0.7}
        >
          <View style={styles.callCardHeader}>
            <View style={styles.callUserInfo}>
              <View style={[
                styles.callAvatar,
                { backgroundColor: request.userGender === 'male' ? COLORS.primary : '#e91e8c' }
              ]}>
                <Ionicons
                  name={request.userGender === 'male' ? 'male' : 'female'}
                  size={18}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.callUserName, (isCompleted || isCancelled) && styles.callUserNameMuted]}>
                  {request.userName}
                </Text>
                <Text style={styles.callCoupleId}>
                  {request.coupleId} • {request.coupleName || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[
                styles.callTypeBadge,
                request.type === 'video' && styles.callTypeBadgeVideo
              ]}>
                <Ionicons
                  name={request.type === 'call' ? 'call' : 'videocam'}
                  size={14}
                  color={request.type === 'call' ? COLORS.primary : COLORS.accent}
                />
                <Text style={[
                  styles.callTypeBadgeText,
                  request.type === 'video' && styles.callTypeBadgeTextVideo
                ]}>
                  {request.type === 'call' ? 'Call' : 'Video'}
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textMuted}
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>

          <View style={styles.callDetails}>
            <View style={styles.callDetailRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.callDetailText}>{phone}</Text>
            </View>
            <View style={styles.callDetailRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.callDetailText}>{dateTime.date}</Text>
            </View>
            <View style={styles.callDetailRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.callDetailText}>{dateTime.time}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(request.status) + '20' }
            ]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(request.status) }]}>
                {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Text>
            </View>
            {!isExpanded && (
              <Text style={styles.tapToExpandText}>Tap to view details</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Details Section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedDivider} />

            {/* Reason Section */}
            {request.reason && (
              <View style={styles.expandedDetailBlock}>
                <Text style={styles.expandedDetailLabel}>Reason for Request</Text>
                <View style={styles.expandedReasonBox}>
                  <Text style={styles.expandedReasonText}>{request.reason}</Text>
                </View>
              </View>
            )}

            {/* Preferred Time */}
            {request.preferredTime && (
              <View style={styles.expandedDetailBlock}>
                <Text style={styles.expandedDetailLabel}>Preferred Time</Text>
                <Text style={styles.expandedDetailValue}>{request.preferredTime}</Text>
              </View>
            )}

            {/* Assigned Info */}
            {request.assignedName && (
              <View style={styles.expandedDetailBlock}>
                <Text style={styles.expandedDetailLabel}>Assigned To</Text>
                <Text style={styles.expandedDetailValue}>{request.assignedName}</Text>
              </View>
            )}

            {/* Video Link Section for Video Requests */}
            {request.type === 'video' && (
              <View style={styles.expandedDetailBlock}>
                <Text style={styles.expandedDetailLabel}>Video Meeting</Text>
                {request.videoUrl ? (
                  <View style={styles.videoLinkSentBox}>
                    <View style={styles.videoLinkSentHeader}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.videoLinkSentTitle}>Link Sent to User</Text>
                    </View>
                    <Text style={styles.videoLinkUrl} numberOfLines={2}>{request.videoUrl}</Text>
                    {request.status !== 'completed' && request.status !== 'cancelled' && (
                      <TouchableOpacity
                        style={styles.joinVideoBtn}
                        onPress={() => handleJoinVideoCall(request.videoUrl!)}
                      >
                        <Ionicons name="videocam" size={16} color="#fff" />
                        <Text style={styles.joinVideoBtnText}>Join Video Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <>
                    {!showVideoLinkSection ? (
                      <TouchableOpacity
                        style={styles.sendVideoLinkBtn}
                        onPress={() => setShowVideoLinkSection(true)}
                      >
                        <Ionicons name="link" size={16} color="#fff" />
                        <Text style={styles.sendVideoLinkBtnText}>Generate & Send Video Link</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.videoLinkGenBox}>
                        <Text style={styles.videoLinkGenLabel}>Generated Link:</Text>
                        <View style={styles.generatedLinkPreview}>
                          <Ionicons name="link" size={14} color={COLORS.accent} />
                          <Text style={styles.generatedLinkText} numberOfLines={2}>
                            {generateVideoLink(request)}
                          </Text>
                        </View>
                        <View style={styles.videoLinkBtnRow}>
                          <TouchableOpacity
                            style={styles.videoLinkCancelBtn}
                            onPress={() => setShowVideoLinkSection(false)}
                          >
                            <Text style={styles.videoLinkCancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.videoLinkConfirmBtn}
                            onPress={() => handleSendVideoLinkExpanded(request)}
                            disabled={sendingVideoLink}
                          >
                            {sendingVideoLink ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Text style={styles.videoLinkConfirmBtnText}>Send</Text>
                                <Ionicons name="send" size={14} color="#fff" />
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Action Buttons */}
            {request.status !== 'completed' && request.status !== 'cancelled' && (
              <View style={styles.expandedActions}>
                {request.type === 'call' && (
                  <TouchableOpacity
                    style={styles.actionCallBtn}
                    onPress={() => handleCall(phone)}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Call Now</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionCompleteBtn}
                  onPress={() => handleUpdateStatus(request, 'completed')}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={COLORS.success} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Mark Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Completed/Cancelled Info */}
            {request.status === 'completed' && request.resolvedAt && (
              <View style={styles.completedInfoBox}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.completedInfoText}>
                  Completed on {formatDateTime(request.resolvedAt).date} at {formatDateTime(request.resolvedAt).time}
                </Text>
              </View>
            )}

            {request.status === 'cancelled' && (
              <View style={styles.cancelledInfoBox}>
                <Ionicons name="close-circle" size={18} color={COLORS.error} />
                <Text style={styles.cancelledInfoText}>
                  {request.cancelledBy === 'admin' ? 'Cancelled by admin' : 'Cancelled by user'}
                  {request.cancelReason && `: ${request.cancelReason}`}
                </Text>
              </View>
            )}

            {/* Delete Button for completed/cancelled requests */}
            {(request.status === 'completed' || request.status === 'cancelled') && (
              <TouchableOpacity
                style={styles.deleteRequestBtn}
                onPress={() => setDeleteModal({
                  visible: true,
                  requestId: request.id,
                  userName: request.userName,
                  isDeleting: false,
                })}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.deleteRequestBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Main Content
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      );
    }

    if (filteredRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="call-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyStateTitle}>No call requests found</Text>
          <Text style={styles.emptyStateSubtext}>
            {statusFilter !== 'all'
              ? `No ${statusFilter} requests at the moment`
              : 'Users can request calls from the Contact Support page'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {filteredRequests.map(renderRequestCard)}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}

      {/* Success Modal */}
      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal({ ...successModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <View style={[
                styles.successModalIcon,
                { backgroundColor: successModal.type === 'deleted' ? COLORS.textMuted + '20' : successModal.type === 'video-sent' ? COLORS.accent + '20' : COLORS.success + '20' }
              ]}>
                <Ionicons
                  name={successModal.type === 'deleted' ? 'trash' : successModal.type === 'video-sent' ? 'videocam' : 'checkmark-circle'}
                  size={32}
                  color={successModal.type === 'deleted' ? COLORS.textMuted : successModal.type === 'video-sent' ? COLORS.accent : COLORS.success}
                />
              </View>
              <Text style={styles.successModalTitle}>
                {successModal.type === 'deleted' ? 'Deleted!' : successModal.type === 'video-sent' ? 'Link Sent!' : 'Completed!'}
              </Text>
              <Text style={styles.successModalMessage}>
                {successModal.message}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.successModalBtn,
                { backgroundColor: successModal.type === 'deleted' ? COLORS.textMuted : successModal.type === 'video-sent' ? COLORS.accent : COLORS.success }
              ]}
              onPress={() => setSuccessModal({ ...successModal, visible: false })}
            >
              <Text style={styles.successModalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ ...deleteModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="trash" size={32} color={COLORS.error} />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Request?</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete the request from {deleteModal.userName}? This action cannot be undone.
              </Text>
            </View>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteModal({ visible: false, requestId: null, userName: '', isDeleting: false })}
                disabled={deleteModal.isDeleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={handleDeleteRequest}
                disabled={deleteModal.isDeleting}
              >
                {deleteModal.isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Yes, Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <View style={[styles.successModalIcon, { backgroundColor: COLORS.error + '20' }]}>
                <Ionicons name="close-circle" size={32} color={COLORS.error} />
              </View>
              <Text style={styles.successModalTitle}>Error</Text>
              <Text style={styles.successModalMessage}>{errorModal.message}</Text>
            </View>
            <TouchableOpacity
              style={[styles.successModalBtn, { backgroundColor: COLORS.error }]}
              onPress={() => setErrorModal({ visible: false, message: '' })}
            >
              <Text style={styles.successModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  filtersContainer: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterChipsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
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
  listContainer: {
    flex: 1,
    padding: 16,
  },
  callCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  callCardCompleted: {
    borderLeftColor: COLORS.success,
    opacity: 0.8,
  },
  callCardCancelled: {
    borderLeftColor: COLORS.error,
    opacity: 0.7,
  },
  callCardExpanded: {
    borderLeftWidth: 4,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  callCardTouchable: {
    // No padding here since parent has padding
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapToExpandText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  expandedSection: {
    marginTop: 12,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  expandedDetailBlock: {
    marginBottom: 16,
  },
  expandedDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  expandedDetailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  expandedReasonBox: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
  },
  expandedReasonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  videoLinkSentBox: {
    backgroundColor: COLORS.success + '10',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  videoLinkSentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  videoLinkSentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  videoLinkUrl: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  joinVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  joinVideoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sendVideoLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  sendVideoLinkBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  videoLinkGenBox: {
    backgroundColor: COLORS.accent + '10',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  videoLinkGenLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  generatedLinkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  generatedLinkText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  videoLinkBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  videoLinkCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLinkCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  videoLinkConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoLinkConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionCompleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  completedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  completedInfoText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '500',
    flex: 1,
  },
  cancelledInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  cancelledInfoText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
    flex: 1,
  },
  callCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  callUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  callAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  callUserNameMuted: {
    color: COLORS.textSecondary,
  },
  callCoupleId: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  callTypeBadgeVideo: {
    backgroundColor: COLORS.accent + '15',
  },
  callTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  callTypeBadgeTextVideo: {
    color: COLORS.accent,
  },
  callDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  callDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  callReason: {
    marginBottom: 12,
  },
  callReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  callReasonText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successModalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  successModalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  successModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  deleteRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    backgroundColor: COLORS.error + '10',
  },
  deleteRequestBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  deleteModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
