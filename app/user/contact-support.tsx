import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { coupleService, supportRequestService } from '@/services/firestore.service';
import { SupportRequest } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

// Shimmer component for loading state
const ShimmerPlaceholder = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#e2e8f0',
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton loader for request cards
const RequestCardSkeleton = () => (
  <View style={styles.requestCard}>
    <View style={styles.requestHeader}>
      <ShimmerPlaceholder width={42} height={42} style={{ borderRadius: 11 }} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <ShimmerPlaceholder width="70%" height={16} style={{ marginBottom: 6 }} />
        <ShimmerPlaceholder width="50%" height={12} />
      </View>
      <ShimmerPlaceholder width={70} height={24} style={{ borderRadius: 8 }} />
    </View>
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
      <ShimmerPlaceholder width="60%" height={14} />
    </View>
  </View>
);

export default function ContactSupportScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors } = useTheme();
  const { t } = useLanguage();

  // User data
  const [userData, setUserData] = useState<{
    coupleId: string;
    userName: string;
    userGender: 'male' | 'female';
    coupleName: string;
    userPhone: string;
  } | null>(null);

  // Request form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [requestType, setRequestType] = useState<'call' | 'video'>('call');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My requests state
  const [myRequests, setMyRequests] = useState<SupportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Active tab for filtering requests
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'cancel' | 'delete';
    requestId: string | null;
    isLoading: boolean;
  }>({
    visible: false,
    type: 'cancel',
    requestId: null,
    isLoading: false,
  });

  // Pending request warning modal state
  const [pendingWarningModal, setPendingWarningModal] = useState(false);

  // Generic message modal state
  const [messageModal, setMessageModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Load user data and requests
  const loadData = async () => {
    try {
      setLoadingUserData(true);
      setLoadingRequests(true);
      
      const [coupleId, userName, userGender] = await Promise.all([
        AsyncStorage.getItem('coupleId'),
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userGender'),
      ]);

      console.log('Loading data for:', { coupleId, userName, userGender });

      if (coupleId) {
        const couple = await coupleService.get(coupleId);
        if (couple) {
          const user = couple[userGender as 'male' | 'female'];
          const phone = user.phone || '';
          setPhoneNumber(phone);
          setUserData({
            coupleId,
            userName: userName || user.name || 'User',
            userGender: userGender as 'male' | 'female',
            coupleName: `${couple.male.name} & ${couple.female.name}`,
            userPhone: phone,
          });

          // Load requests for this couple (filtered by this user's gender)
          const allRequests = await supportRequestService.getByCoupleId(coupleId);
          console.log('Fetched requests:', allRequests.length);
          
          // Filter to only show current user's requests (by userGender)
          const userRequests = allRequests.filter(req => req.userGender === userGender);
          console.log('User requests:', userRequests.length);
          
          setMyRequests(userRequests);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingUserData(false);
      setLoadingRequests(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Submit request
  const handleSubmitRequest = async () => {
    if (!userData) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'User data not loaded. Please try again.',
      });
      return;
    }

    // Check if user already has a pending request
    const hasPendingRequest = myRequests.some(r => r.status === 'pending');
    if (hasPendingRequest) {
      setPendingWarningModal(true);
      return;
    }

    const phoneTrimmed = phoneNumber.trim();
    if (!/^[0-9]{10}$/.test(phoneTrimmed)) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Invalid Phone Number',
        message: 'Please enter a valid 10 digit number.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: any = {
        coupleId: userData.coupleId,
        coupleName: userData.coupleName,
        userId: userData.coupleId,
        userName: userData.userName,
        userPhone: userData.userPhone,
        userEmail: '',
        userGender: userData.userGender,
        type: requestType,
        status: 'pending',
      };

      // Only add editedPhone if different from original
      if (phoneNumber !== userData.userPhone) {
        requestData.editedPhone = phoneNumber;
      }

      // Only add reason if provided
      if (reason.trim()) {
        requestData.reason = reason.trim();
      }

      await supportRequestService.create(requestData);

      setMessageModal({
        visible: true,
        type: 'success',
        title: 'Request Sent!',
        message: `Your ${requestType === 'call' ? 'callback' : 'video meeting'} request has been submitted successfully. Our team will contact you soon.`,
      });

      // Reset form
      setReason('');
      setRequestType('call');
      setIsEditingPhone(false);
      
      // Reload requests
      await loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to submit request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel request (user) - show confirmation modal
  const handleCancelRequest = (requestId: string) => {
    setConfirmModal({
      visible: true,
      type: 'cancel',
      requestId,
      isLoading: false,
    });
  };

  // Delete request - show confirmation modal
  const handleDeleteRequest = (requestId: string) => {
    setConfirmModal({
      visible: true,
      type: 'delete',
      requestId,
      isLoading: false,
    });
  };

  // Confirm action (cancel or delete)
  const handleConfirmAction = async () => {
    if (!confirmModal.requestId || !userData) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      if (confirmModal.type === 'cancel') {
        await supportRequestService.cancelRequest(confirmModal.requestId, 'user', undefined, userData.coupleId, userData.userGender);
      } else {
        await supportRequestService.delete(confirmModal.requestId, userData.coupleId, userData.userGender);
      }
      await loadData();
      setConfirmModal({ visible: false, type: 'cancel', requestId: null, isLoading: false });
    } catch (error) {
      console.error(`Error ${confirmModal.type}ing request:`, error);
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Close confirmation modal
  const handleCloseConfirmModal = () => {
    if (!confirmModal.isLoading) {
      setConfirmModal({ visible: false, type: 'cancel', requestId: null, isLoading: false });
    }
  };

  // Open video meeting URL
  const handleJoinVideoMeet = (url: string) => {
    Linking.openURL(url);
  };

  // Format timestamp
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', color: '#d97706', label: 'Pending', icon: 'time-outline' };
      case 'completed':
        return { bg: '#f0f7e6', color: '#98be4e', label: 'Completed', icon: 'checkmark-circle-outline' };
      case 'cancelled':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled', icon: 'close-circle-outline' };
      default:
        return { bg: '#f1f5f9', color: '#64748b', label: status, icon: 'help-circle-outline' };
    }
  };

  // Filter requests by active tab
  const filteredRequests = myRequests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  // Count by status
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;
  const cancelledCount = myRequests.filter(r => r.status === 'cancelled').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('support.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('support.subtitle')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006dab']} />
        }
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {/* New Request Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('support.newRequest')}</Text>
            <Text style={styles.cardSubtitle}>{t('support.submitRequest')}</Text>

            {/* Phone Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('support.yourPhone')}</Text>
              {loadingUserData ? (
                <ShimmerPlaceholder width="100%" height={48} style={{ borderRadius: 12 }} />
              ) : (
                <View style={styles.phoneRow}>
                  {isEditingPhone ? (
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={text => {
                        // Only allow numbers and max 10 digits
                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                        setPhoneNumber(cleaned);
                      }}
                      placeholder={t('support.enterPhone')}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.phoneDisplay}>{phoneNumber || t('support.noPhone')}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingPhone(!isEditingPhone)}
                  >
                    <Ionicons
                      name={isEditingPhone ? 'checkmark' : 'pencil'}
                      size={18}
                      color="#006dab"
                    />
                    <Text style={styles.editButtonText}>{isEditingPhone ? 'Done' : 'Edit'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Request Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Request Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeButton, requestType === 'call' && styles.typeButtonActive]}
                  onPress={() => setRequestType('call')}
                >
                  <Ionicons
                    name="call"
                    size={22}
                    color={requestType === 'call' ? '#fff' : '#006dab'}
                  />
                  <Text style={[styles.typeText, requestType === 'call' && styles.typeTextActive]}>
                    Call Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, requestType === 'video' && styles.typeButtonActive]}
                  onPress={() => setRequestType('video')}
                >
                  <Ionicons
                    name="videocam"
                    size={22}
                    color={requestType === 'video' ? '#fff' : '#006dab'}
                  />
                  <Text style={[styles.typeText, requestType === 'video' && styles.typeTextActive]}>
                    Video Call
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Brief description of why you need support..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.charCount}>{reason.length}/200</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isSubmitting ? ['#94a3b8', '#94a3b8'] : ['#006dab', '#005a8f']}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.submitText}>Send Request</Text>
                    <Ionicons name="send" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* My Requests Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Requests</Text>
            <Text style={styles.sectionSubtitle}>Track your support requests</Text>
          </View>

          {/* Status Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            <TouchableOpacity
              style={[styles.filterTab, activeTab === 'all' && styles.filterTabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.filterTabText, activeTab === 'all' && styles.filterTabTextActive]}>
                All ({myRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, activeTab === 'pending' && styles.filterTabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.filterTabText, activeTab === 'pending' && styles.filterTabTextActive]}>
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, activeTab === 'completed' && styles.filterTabActive]}
              onPress={() => setActiveTab('completed')}
            >
              <Text style={[styles.filterTabText, activeTab === 'completed' && styles.filterTabTextActive]}>
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, activeTab === 'cancelled' && styles.filterTabActive]}
              onPress={() => setActiveTab('cancelled')}
            >
              <Text style={[styles.filterTabText, activeTab === 'cancelled' && styles.filterTabTextActive]}>
                Cancelled ({cancelledCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Request List */}
          {loadingRequests ? (
            <>
              <RequestCardSkeleton />
              <RequestCardSkeleton />
              <RequestCardSkeleton />
            </>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No {activeTab !== 'all' ? activeTab : ''} requests</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'all' 
                  ? 'Submit a request above to get started'
                  : `You don't have any ${activeTab} requests`
                }
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const statusStyle = getStatusBadge(request.status);
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={[styles.requestTypeIcon, request.type === 'video' && styles.requestTypeIconVideo]}>
                      <Ionicons
                        name={request.type === 'call' ? 'call' : 'videocam'}
                        size={20}
                        color={request.type === 'call' ? '#006dab' : '#8b5cf6'}
                      />
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestType}>
                        {request.type === 'call' ? 'Callback Request' : 'Video Meeting'}
                      </Text>
                      <Text style={styles.requestDate}>{formatDateTime(request.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.color} />
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  {/* Phone number used */}
                  <View style={styles.requestDetail}>
                    <Ionicons name="call-outline" size={14} color="#94a3b8" />
                    <Text style={styles.requestDetailText}>
                      {request.editedPhone || request.userPhone}
                      {request.editedPhone && <Text style={styles.editedTag}> (edited)</Text>}
                    </Text>
                  </View>

                  {request.reason && (
                    <View style={styles.requestReason}>
                      <Text style={styles.reasonLabel}>Reason:</Text>
                      <Text style={styles.reasonText}>{request.reason}</Text>
                    </View>
                  )}

                  {/* Video URL Section */}
                  {request.videoUrl && (
                    <View style={styles.videoSection}>
                      <View style={styles.videoHeader}>
                        <Ionicons name="videocam" size={18} color="#006dab" />
                        <Text style={styles.videoLabel}>
                          {request.status === 'completed' ? 'Video Meeting Completed' : 'Video Meeting Link Ready!'}
                        </Text>
                      </View>
                      {request.status !== 'completed' && (
                        <TouchableOpacity
                          style={styles.joinButton}
                          onPress={() => handleJoinVideoMeet(request.videoUrl!)}
                        >
                          <LinearGradient colors={['#006dab', '#005a8f']} style={styles.joinGradient}>
                            <Ionicons name="enter-outline" size={20} color="#fff" />
                            <Text style={styles.joinText}>Join Video Meeting</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.videoSentAt}>
                        Link sent: {formatDateTime(request.videoUrlSentAt)}
                      </Text>
                    </View>
                  )}

                  {/* Completed info */}
                  {request.status === 'completed' && request.resolvedAt && (
                    <View style={styles.completedInfo}>
                      <Ionicons name="checkmark-circle" size={16} color="#98be4e" />
                      <Text style={styles.completedText}>
                        Completed on {formatDateTime(request.resolvedAt)}
                      </Text>
                    </View>
                  )}

                  {/* Cancelled info */}
                  {request.status === 'cancelled' && (
                    <View style={styles.cancelledInfo}>
                      <Ionicons name="close-circle" size={16} color="#dc2626" />
                      <Text style={styles.cancelledText}>
                        {request.cancelledBy === 'admin' ? 'Cancelled by admin' : 'Cancelled by you'}
                        {request.cancelReason && `: ${request.cancelReason}`}
                      </Text>
                    </View>
                  )}

                  {/* Cancel button for pending requests */}
                  {request.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.cancelRequestButton}
                      onPress={() => handleCancelRequest(request.id!)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                      <Text style={styles.cancelRequestButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}

                  {/* Delete button for completed/cancelled requests */}
                  {(request.status === 'completed' || request.status === 'cancelled') && (
                    <TouchableOpacity
                      style={styles.deleteRequestButton}
                      onPress={() => handleDeleteRequest(request.id!)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                      <Text style={styles.deleteRequestButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseConfirmModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <View style={[
                styles.confirmModalIcon,
                { backgroundColor: confirmModal.type === 'cancel' ? '#fef2f2' : '#f1f5f9' }
              ]}>
                <Ionicons
                  name={confirmModal.type === 'cancel' ? 'close-circle' : 'trash'}
                  size={32}
                  color={confirmModal.type === 'cancel' ? '#dc2626' : '#64748b'}
                />
              </View>
              <Text style={styles.confirmModalTitle}>
                {confirmModal.type === 'cancel' ? 'Cancel Request?' : 'Delete Request?'}
              </Text>
              <Text style={styles.confirmModalMessage}>
                {confirmModal.type === 'cancel'
                  ? 'Are you sure you want to cancel this request? This action cannot be undone.'
                  : 'Are you sure you want to delete this request? This will permanently remove it from your history.'}
              </Text>
            </View>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancelBtn}
                onPress={handleCloseConfirmModal}
                disabled={confirmModal.isLoading}
              >
                <Text style={styles.confirmModalCancelText}>No, Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmModalConfirmBtn,
                  { backgroundColor: confirmModal.type === 'cancel' ? '#dc2626' : '#64748b' }
                ]}
                onPress={handleConfirmAction}
                disabled={confirmModal.isLoading}
              >
                {confirmModal.isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmModalConfirmText}>
                    {confirmModal.type === 'cancel' ? 'Yes, Cancel' : 'Yes, Delete'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pending Request Warning Modal */}
      <Modal
        visible={pendingWarningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <View style={[styles.confirmModalIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time" size={32} color="#d97706" />
              </View>
              <Text style={styles.confirmModalTitle}>Request Already Pending</Text>
              <Text style={styles.confirmModalMessage}>
                You already have a pending request. Please wait for it to be completed or cancel it before submitting a new one.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmModalConfirmBtn, { backgroundColor: '#d97706' }]}
              onPress={() => setPendingWarningModal(false)}
            >
              <Text style={styles.confirmModalConfirmText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Generic Message Modal */}
      <Modal
        visible={messageModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setMessageModal({ ...messageModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <View style={[
                styles.confirmModalIcon,
                { 
                  backgroundColor: messageModal.type === 'success' ? '#f0f7e6' : 
                                   messageModal.type === 'error' ? '#fef2f2' : '#fef3c7' 
                }
              ]}>
                <Ionicons
                  name={messageModal.type === 'success' ? 'checkmark-circle' : 
                        messageModal.type === 'error' ? 'close-circle' : 'warning'}
                  size={32}
                  color={messageModal.type === 'success' ? '#98be4e' : 
                         messageModal.type === 'error' ? '#dc2626' : '#d97706'}
                />
              </View>
              <Text style={styles.confirmModalTitle}>{messageModal.title}</Text>
              <Text style={styles.confirmModalMessage}>{messageModal.message}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmModalConfirmBtn,
                { 
                  backgroundColor: messageModal.type === 'success' ? '#98be4e' : 
                                   messageModal.type === 'error' ? '#dc2626' : '#d97706' 
                }
              ]}
              onPress={() => setMessageModal({ ...messageModal, visible: false })}
            >
              <Text style={styles.confirmModalConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: isWeb ? 16 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  scrollContentMobile: {
    paddingBottom: 150,
  },
  content: {
    padding: 16,
  },
  contentDesktop: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phoneDisplay: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    padding: 0,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#006dab',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#006dab',
    backgroundColor: '#006dab',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#006dab',
  },
  typeTextActive: {
    color: '#fff',
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#0f172a',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#006dab',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestTypeIconVideo: {
    backgroundColor: '#ede9fe',
  },
  requestInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  requestDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  requestDetailText: {
    fontSize: 13,
    color: '#64748b',
  },
  editedTag: {
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  requestReason: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  videoSection: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006dab',
  },
  joinButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  joinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  videoSentAt: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  completedText: {
    fontSize: 13,
    color: '#98be4e',
  },
  cancelledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelledText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  cancelRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  cancelRequestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  deleteRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  deleteRequestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 42,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  confirmModalCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmModalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
