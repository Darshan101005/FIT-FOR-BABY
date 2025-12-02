import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { coupleService, supportRequestService } from '@/services/firestore.service';
import { SupportRequest } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
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
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'cancelled'>('all');

  // Load user data and requests
  const loadData = async () => {
    try {
      setLoadingUserData(true);
      const [coupleId, userName, userGender] = await Promise.all([
        AsyncStorage.getItem('coupleId'),
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userGender'),
      ]);

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

          // Load requests for this couple
          setLoadingRequests(true);
          const requests = await supportRequestService.getByCoupleId(coupleId);
          setMyRequests(requests);
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
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number.');
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

      Alert.alert(
        '✅ Request Sent!',
        `Your ${requestType === 'call' ? 'callback' : 'video meeting'} request has been submitted successfully. Our team will contact you soon.`,
        [{ text: 'OK' }]
      );

      // Reset form
      setReason('');
      setRequestType('call');
      setIsEditingPhone(false);
      
      // Reload requests
      await loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('❌ Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel request (user)
  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await supportRequestService.cancelRequest(requestId, 'user');
              Alert.alert('Success', 'Request cancelled successfully.');
              await loadData();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request.');
            }
          },
        },
      ]
    );
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
      case 'in-progress':
        return { bg: '#dbeafe', color: '#2563eb', label: 'In Progress', icon: 'sync-outline' };
      case 'completed':
        return { bg: '#dcfce7', color: '#16a34a', label: 'Completed', icon: 'checkmark-circle-outline' };
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
  const inProgressCount = myRequests.filter(r => r.status === 'in-progress').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;
  const cancelledCount = myRequests.filter(r => r.status === 'cancelled').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient colors={['#98be4e', '#7da33e']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Request a callback or video meeting</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#98be4e']} />
        }
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {/* New Request Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBg}>
                <Ionicons name="add-circle" size={24} color="#98be4e" />
              </View>
              <Text style={styles.cardTitle}>New Request</Text>
            </View>

            {/* Phone Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Phone Number</Text>
              {loadingUserData ? (
                <ShimmerPlaceholder width="100%" height={48} style={{ borderRadius: 12 }} />
              ) : (
                <View style={styles.phoneRow}>
                  {isEditingPhone ? (
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.phoneDisplay}>{phoneNumber || 'No phone number'}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingPhone(!isEditingPhone)}
                  >
                    <Ionicons
                      name={isEditingPhone ? 'checkmark' : 'pencil'}
                      size={18}
                      color="#98be4e"
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
                    color={requestType === 'call' ? '#fff' : '#98be4e'}
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
                    color={requestType === 'video' ? '#fff' : '#98be4e'}
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
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSubmitting ? ['#94a3b8', '#94a3b8'] : ['#98be4e', '#7da33e']}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.submitText}>Send Request</Text>
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
              style={[styles.filterTab, activeTab === 'in-progress' && styles.filterTabActive]}
              onPress={() => setActiveTab('in-progress')}
            >
              <Text style={[styles.filterTabText, activeTab === 'in-progress' && styles.filterTabTextActive]}>
                In Progress ({inProgressCount})
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
                        <Ionicons name="videocam" size={18} color="#16a34a" />
                        <Text style={styles.videoLabel}>Video Meeting Link Ready!</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => handleJoinVideoMeet(request.videoUrl!)}
                      >
                        <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.joinGradient}>
                          <Ionicons name="enter-outline" size={20} color="#fff" />
                          <Text style={styles.joinText}>Join Video Meeting</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <Text style={styles.videoSentAt}>
                        Link sent: {formatDateTime(request.videoUrlSentAt)}
                      </Text>
                    </View>
                  )}

                  {/* Completed info */}
                  {request.status === 'completed' && request.resolvedAt && (
                    <View style={styles.completedInfo}>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
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
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

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
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
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
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#98be4e',
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
    borderColor: '#98be4e',
    backgroundColor: '#98be4e',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#98be4e',
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
    backgroundColor: '#98be4e',
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
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
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
    color: '#16a34a',
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
    color: '#16a34a',
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
});
