import { broadcastService, chatService, coupleService, feedbackService } from '@/services/firestore.service';
import { Broadcast as BroadcastType, Chat, ChatMessage, Feedback, FeedbackStatus } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isWeb = Platform.OS === 'web';

// Hide scrollbar CSS for web
const hideScrollbarStyle = isWeb ? `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
` : '';

// Character limits for push notifications
const TITLE_MAX_LENGTH = 50;
const MESSAGE_MAX_LENGTH = 178;

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

interface Message {
  id: string;
  coupleId: string;
  senderType: 'male' | 'female' | 'admin';
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  hasAttachment: boolean;
  attachmentType?: 'image' | 'document';
}

interface ChatThread {
  coupleId: string;
  coupleName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'resolved' | 'pending';
  messages: Message[];
}

// Mock data for chat threads
const mockChatThreads: ChatThread[] = [
  {
    coupleId: 'C_001',
    coupleName: 'John & Jane Doe',
    lastMessage: 'Thank you for the exercise video! Very helpful.',
    lastMessageTime: new Date('2024-11-28T14:30:00'),
    unreadCount: 2,
    status: 'active',
    messages: [
      {
        id: 'm1',
        coupleId: 'C_001',
        senderType: 'female',
        senderName: 'Jane',
        content: 'Hi, I have a question about the diet plan.',
        timestamp: new Date('2024-11-28T10:00:00'),
        read: true,
        hasAttachment: false,
      },
      {
        id: 'm2',
        coupleId: 'C_001',
        senderType: 'admin',
        senderName: 'Support',
        content: 'Hello Jane! What would you like to know about the diet plan?',
        timestamp: new Date('2024-11-28T10:15:00'),
        read: true,
        hasAttachment: false,
      },
      {
        id: 'm3',
        coupleId: 'C_001',
        senderType: 'female',
        senderName: 'Jane',
        content: 'Thank you for the exercise video! Very helpful.',
        timestamp: new Date('2024-11-28T14:30:00'),
        read: false,
        hasAttachment: false,
      },
    ],
  },
  {
    coupleId: 'C_002',
    coupleName: 'Mike & Sarah Smith',
    lastMessage: 'I attached a screenshot of the error I am getting.',
    lastMessageTime: new Date('2024-11-28T12:00:00'),
    unreadCount: 1,
    status: 'pending',
    messages: [
      {
        id: 'm4',
        coupleId: 'C_002',
        senderType: 'male',
        senderName: 'Mike',
        content: 'I attached a screenshot of the error I am getting.',
        timestamp: new Date('2024-11-28T12:00:00'),
        read: false,
        hasAttachment: true,
        attachmentType: 'image',
      },
    ],
  },
  {
    coupleId: 'C_003',
    coupleName: 'David & Emily Wilson',
    lastMessage: 'Issue resolved. Thank you for your help!',
    lastMessageTime: new Date('2024-11-27T16:45:00'),
    unreadCount: 0,
    status: 'resolved',
    messages: [
      {
        id: 'm5',
        coupleId: 'C_003',
        senderType: 'female',
        senderName: 'Emily',
        content: 'Issue resolved. Thank you for your help!',
        timestamp: new Date('2024-11-27T16:45:00'),
        read: true,
        hasAttachment: false,
      },
    ],
  },
  {
    coupleId: 'C_004',
    coupleName: 'Robert & Lisa Brown',
    lastMessage: 'Can we schedule a call to discuss our progress?',
    lastMessageTime: new Date('2024-11-28T09:15:00'),
    unreadCount: 3,
    status: 'active',
    messages: [
      {
        id: 'm6',
        coupleId: 'C_004',
        senderType: 'male',
        senderName: 'Robert',
        content: 'Can we schedule a call to discuss our progress?',
        timestamp: new Date('2024-11-28T09:15:00'),
        read: false,
        hasAttachment: false,
      },
    ],
  },
];

interface CallRequest {
  id: string;
  coupleId: string;
  coupleName: string;
  requestedBy: 'male' | 'female';
  requesterName: string;
  phone: string;
  requestType: 'call' | 'video';
  reason: string;
  requestedAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

// Mock call requests data
const mockCallRequests: CallRequest[] = [
  {
    id: 'cr1',
    coupleId: 'C_001',
    coupleName: 'John & Jane Doe',
    requestedBy: 'female',
    requesterName: 'Jane Doe',
    phone: '+91 98765 43210',
    requestType: 'call',
    reason: 'Need to discuss diet plan modifications',
    requestedAt: new Date('2024-11-28T10:30:00'),
    status: 'pending',
  },
  {
    id: 'cr2',
    coupleId: 'C_002',
    coupleName: 'Mike & Sarah Smith',
    requestedBy: 'male',
    requesterName: 'Mike Smith',
    phone: '+91 98765 43212',
    requestType: 'video',
    reason: 'Questions about exercise routine',
    requestedAt: new Date('2024-11-28T09:15:00'),
    status: 'pending',
  },
  {
    id: 'cr3',
    coupleId: 'C_003',
    coupleName: 'David & Emily Wilson',
    requestedBy: 'female',
    requesterName: 'Emily Wilson',
    phone: '+91 98765 43214',
    requestType: 'call',
    reason: 'Follow-up on last week\'s consultation',
    requestedAt: new Date('2024-11-27T14:45:00'),
    status: 'completed',
  },
  {
    id: 'cr4',
    coupleId: 'C_004',
    coupleName: 'Robert & Lisa Brown',
    requestedBy: 'female',
    requesterName: 'Lisa Brown',
    phone: '+91 98765 43216',
    requestType: 'call',
    reason: 'Urgent health concern',
    requestedAt: new Date('2024-11-28T11:00:00'),
    status: 'pending',
  },
];

export default function AdminCommunicationScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = screenWidth < 768;
  const isDesktop = screenWidth >= 1024;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast' | 'feedback'>('inbox');
  const [chatThreads] = useState<ChatThread[]>(mockChatThreads);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'resolved'>('all');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  // Real-time chat state
  const [supportChats, setSupportChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesScrollRef = useRef<ScrollView>(null);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | FeedbackStatus>('all');

  // Broadcast state
  const [broadcasts, setBroadcasts] = useState<BroadcastType[]>([]);
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [adminData, setAdminData] = useState<{ id: string; name: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBroadcastId, setDeletingBroadcastId] = useState<string | null>(null);
  const [editingBroadcast, setEditingBroadcast] = useState<BroadcastType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Broadcast form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    expiryValue: 0, // 0 = never expires
    expiryUnit: 'days' as 'minutes' | 'hours' | 'days',
  });

  // Inject scrollbar hide CSS for web
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      const styleId = 'hide-scrollbar-style-admin';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = hideScrollbarStyle;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Load admin data, broadcasts, and subscribe to chats on focus
  useFocusEffect(
    useCallback(() => {
      let unsubscribeChats: (() => void) | undefined;
      let unsubscribeFeedbacks: (() => void) | undefined;

      const loadData = async () => {
        try {
          // Get admin info (adminUid is stored during login)
          const [adminUid, adminName] = await Promise.all([
            AsyncStorage.getItem('adminUid'),
            AsyncStorage.getItem('adminName'),
          ]);
          if (adminUid && adminName) {
            setAdminData({ id: adminUid, name: adminName });
          }

          // Load broadcasts (only type='broadcast', not reminders)
          setIsLoadingBroadcasts(true);
          const allBroadcasts = await broadcastService.getAll(20);
          // Filter out reminders - they are managed from admin home, not here
          const broadcastsOnly = allBroadcasts.filter(b => b.type === 'broadcast');
          setBroadcasts(broadcastsOnly);

          // Subscribe to support chats (real-time)
          setIsLoadingChats(true);
          unsubscribeChats = chatService.subscribeToAll((chats) => {
            setSupportChats(chats);
            setIsLoadingChats(false);
          });

          // Subscribe to feedbacks (real-time)
          setIsLoadingFeedbacks(true);
          unsubscribeFeedbacks = feedbackService.subscribeToFeedbacks((feedbackList) => {
            setFeedbacks(feedbackList);
            setIsLoadingFeedbacks(false);
          });
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoadingBroadcasts(false);
        }
      };

      loadData();

      // Cleanup subscription on unfocus
      return () => {
        if (unsubscribeChats) {
          unsubscribeChats();
        }
        if (unsubscribeFeedbacks) {
          unsubscribeFeedbacks();
        }
      };
    }, [])
  );

  // Subscribe to messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    
    // Mark as read when opening chat
    chatService.markAsRead(selectedChat.id, 'admin');

    const unsubscribe = chatService.subscribeToMessages(selectedChat.id, (messages) => {
      // Filter out messages deleted by admin
      const visibleMessages = messages.filter((msg) => !msg.deletedByAdmin);
      setChatMessages(visibleMessages);
      setIsLoadingMessages(false);
      
      // Auto scroll to bottom
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  // Filter threads
  const filteredThreads = chatThreads.filter(thread => {
    const matchesSearch =
      thread.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.coupleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get total unread count
  const totalUnread = chatThreads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  // Format time for chat messages
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter support chats - exclude chats with no messages
  const filteredSupportChats = supportChats.filter(chat => {
    // Hide chats with no messages (cleared or never messaged)
    if (!chat.lastMessage || chat.lastMessage.trim() === '') return false;
    
    const matchesSearch =
      chat.coupleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.odAaByuserName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get total unread count for support chats
  const totalSupportUnread = supportChats.reduce((sum, chat) => sum + (chat.unreadByAdmin || 0), 0);

  // Handle support chat click
  const handleSupportChatClick = (chat: Chat) => {
    console.log('Support chat clicked:', chat.id, 'isMobile:', isMobile, 'isDesktop:', isDesktop);
    setSelectedChat(chat);
    // Mark as read
    chatService.markAsRead(chat.id, 'admin');
    // Open modal on non-desktop screens (mobile and tablet)
    if (!isDesktop) {
      console.log('Opening chat modal for non-desktop view');
      setShowChatModal(true);
    }
  };

  // Handle typing indicator
  const handleAdminTyping = (text: string) => {
    setNewMessage(text);

    if (!selectedChat) return;

    // Set typing to true
    if (!adminTyping && text.length > 0) {
      setAdminTyping(true);
      chatService.setTyping(selectedChat.id, true, 'admin');
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setAdminTyping(false);
      if (selectedChat) {
        chatService.setTyping(selectedChat.id, false, 'admin');
      }
    }, 2000);
  };

  // Handle send support message
  const handleSendSupportMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !adminData) return;

    const textToSend = newMessage.trim();
    setNewMessage('');
    setIsSendingMessage(true);

    // Clear typing indicator
    setAdminTyping(false);
    chatService.setTyping(selectedChat.id, false, 'admin');

    try {
      await chatService.sendMessage(selectedChat.id, {
        senderId: adminData.id,
        senderName: adminData.name,
        senderType: 'admin',
        message: textToSend,
        messageType: 'text',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(textToSend);
      showToast('Failed to send message', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle resolve/reopen chat
  const handleToggleChatStatus = async (chat: Chat) => {
    try {
      const newStatus = chat.status === 'resolved' ? 'active' : 'resolved';
      await chatService.updateStatus(chat.id, newStatus);
      showToast(`Chat marked as ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating chat status:', error);
      showToast('Failed to update chat status', 'error');
    }
  };

  // Handle clear chat (for admin)
  const handleClearChat = async () => {
    if (!selectedChat) return;
    setIsClearingChat(true);
    try {
      await chatService.clearAllMessages(selectedChat.id, selectedChat.coupleId, selectedChat.gender);
      setShowClearChatModal(false);
      showToast('Chat cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing chat:', error);
      showToast('Failed to clear chat', 'error');
    } finally {
      setIsClearingChat(false);
    }
  };

  // Handle delete message
  const handleDeleteSupportMessage = (messageId: string) => {
    if (!selectedChat) return;
    if (Platform.OS === 'web') {
      if (confirm('Delete this message?')) {
        chatService.deleteMessage(selectedChat.id, messageId, 'admin');
      }
    } else {
      // For native, we would use Alert.alert
      chatService.deleteMessage(selectedChat.id, messageId, 'admin');
    }
  };

  // Handle thread click (legacy mock data - not actively used)
  const handleThreadClick = (thread: ChatThread) => {
    setSelectedThread(thread);
    if (!isDesktop) {
      setShowChatModal(true);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    showToast('Message sent successfully!', 'success');
    setNewMessage('');
  };

  // Show confirmation before sending broadcast
  const handleShowConfirmation = () => {
    if (!broadcastForm.title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }
    if (!broadcastForm.message.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    if (!adminData) {
      showToast('Admin data not loaded', 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  // Handle send broadcast after confirmation
  const handleSendBroadcast = async () => {
    setShowConfirmModal(false);
    setIsSendingBroadcast(true);
    try {
      // Get total number of active couples for recipient count
      const couples = await coupleService.getAll();
      const activeCouples = couples.filter(c => c.status === 'active');
      const totalRecipients = activeCouples.length * 2; // Both male and female

      // Calculate expiry date if set
      let expiresAt = undefined;
      if (broadcastForm.expiryValue > 0) {
        const expiryDate = new Date();
        switch (broadcastForm.expiryUnit) {
          case 'minutes':
            expiryDate.setMinutes(expiryDate.getMinutes() + broadcastForm.expiryValue);
            break;
          case 'hours':
            expiryDate.setHours(expiryDate.getHours() + broadcastForm.expiryValue);
            break;
          case 'days':
            expiryDate.setDate(expiryDate.getDate() + broadcastForm.expiryValue);
            break;
        }
        expiresAt = Timestamp.fromDate(expiryDate);
      }

      // Create broadcast
      await broadcastService.create({
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        priority: 'normal',
        status: 'sent',
        type: 'broadcast', // Mark as broadcast (not reminder) - shows in Messages, not home
        sentBy: adminData!.id,
        sentByName: adminData!.name,
        totalRecipients,
        readCount: 0,
        ...(expiresAt && { expiresAt }),
      });

      // Refresh broadcasts list (only broadcasts, not reminders)
      const allBroadcasts = await broadcastService.getAll(20);
      setBroadcasts(allBroadcasts.filter(b => b.type === 'broadcast'));

      showToast('Broadcast sent to all users!', 'success');
      setShowBroadcastModal(false);
      setBroadcastForm({ title: '', message: '', expiryValue: 0, expiryUnit: 'days' });

    } catch (error) {
      console.error('Error sending broadcast:', error);
      showToast('Failed to send broadcast', 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Handle delete broadcast - show confirmation modal
  const handleDeleteBroadcast = (broadcastId: string) => {
    setDeletingBroadcastId(broadcastId);
    setShowDeleteModal(true);
  };

  // Confirm and perform delete
  const confirmDeleteBroadcast = async () => {
    if (!deletingBroadcastId) return;
    
    setIsDeleting(true);
    try {
      await broadcastService.delete(deletingBroadcastId);
      setBroadcasts(prev => prev.filter(b => b.id !== deletingBroadcastId));
      showToast('Broadcast deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      showToast('Failed to delete broadcast', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletingBroadcastId(null);
    }
  };

  // Handle edit broadcast
  const handleEditBroadcast = (broadcast: BroadcastType) => {
    setEditingBroadcast(broadcast);
    setBroadcastForm({
      title: broadcast.title,
      message: broadcast.message,
      expiryValue: 0,
      expiryUnit: 'days',
    });
    setShowEditModal(true);
  };

  // Save edited broadcast
  const handleSaveEdit = async () => {
    if (!editingBroadcast) return;
    
    setIsSendingBroadcast(true);
    try {
      let expiresAt: Timestamp | null = null;
      if (broadcastForm.expiryValue > 0) {
        const expiryDate = new Date();
        switch (broadcastForm.expiryUnit) {
          case 'minutes':
            expiryDate.setMinutes(expiryDate.getMinutes() + broadcastForm.expiryValue);
            break;
          case 'hours':
            expiryDate.setHours(expiryDate.getHours() + broadcastForm.expiryValue);
            break;
          case 'days':
            expiryDate.setDate(expiryDate.getDate() + broadcastForm.expiryValue);
            break;
        }
        expiresAt = Timestamp.fromDate(expiryDate);
      }

      await broadcastService.update(editingBroadcast.id, {
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        ...(expiresAt && { expiresAt }),
      });

      // Refresh broadcasts list (only broadcasts, not reminders)
      const allBroadcasts = await broadcastService.getAll(20);
      setBroadcasts(allBroadcasts.filter(b => b.type === 'broadcast'));

      showToast('Broadcast updated successfully', 'success');
      setShowEditModal(false);
      setEditingBroadcast(null);
      setBroadcastForm({ title: '', message: '', expiryValue: 0, expiryUnit: 'days' });
    } catch (error) {
      console.error('Error updating broadcast:', error);
      showToast('Failed to update broadcast', 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Handle clear all broadcasts
  const handleClearAllBroadcasts = async () => {
    setIsClearing(true);
    try {
      await broadcastService.clearAll();
      setBroadcasts([]);
      showToast('All broadcasts cleared', 'success');
      setShowClearAllModal(false);
    } catch (error) {
      console.error('Error clearing broadcasts:', error);
      showToast('Failed to clear broadcasts', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Communication</Text>
          <Text style={styles.headerSubtitle}>
            {totalSupportUnread > 0 ? `${totalSupportUnread} unread messages` : 'All caught up!'}
          </Text>
        </View>
        {activeTab === 'broadcast' && (
          <TouchableOpacity
            style={styles.newBroadcastButton}
            onPress={() => setShowBroadcastModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newBroadcastButtonText}>New Broadcast</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
          onPress={() => setActiveTab('inbox')}
        >
          <Ionicons
            name="chatbubbles"
            size={18}
            color={activeTab === 'inbox' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
            Support Inbox
          </Text>
          {totalSupportUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalSupportUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'broadcast' && styles.tabActive]}
          onPress={() => setActiveTab('broadcast')}
        >
          <Ionicons
            name="megaphone"
            size={18}
            color={activeTab === 'broadcast' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'broadcast' && styles.tabTextActive]}>
            Broadcast
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.tabActive]}
          onPress={() => setActiveTab('feedback')}
        >
          <Ionicons
            name="star"
            size={18}
            color={activeTab === 'feedback' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}>
            Feedback
          </Text>
          {feedbacks.filter(f => f.status === 'pending').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{feedbacks.filter(f => f.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Thread List - Shows real support chats
  const renderThreadList = () => (
    <View style={[styles.threadListContainer, isDesktop && selectedChat && styles.threadListContainerSplit]}>
      {/* Search and Filters */}
      <View style={styles.threadFilters}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
          {['all', 'active', 'resolved'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.statusChip, statusFilter === status && styles.statusChipActive]}
              onPress={() => setStatusFilter(status as any)}
            >
              <Text style={[styles.statusChipText, statusFilter === status && styles.statusChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Thread List */}
      <ScrollView style={styles.threadList}>
        {isLoadingChats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : filteredSupportChats.length === 0 ? (
          <View style={styles.emptyThreads}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyThreadsTitle}>No conversations yet</Text>
            <Text style={styles.emptyThreadsText}>
              User chats will appear here when they send messages
            </Text>
          </View>
        ) : (
          filteredSupportChats.map(chat => (
            <TouchableOpacity
              key={chat.id}
              style={[
                styles.threadItem,
                selectedChat?.id === chat.id && styles.threadItemActive,
              ]}
              onPress={() => handleSupportChatClick(chat)}
            >
              <View style={styles.threadAvatar}>
                <Text style={styles.threadAvatarText}>
                  {chat.coupleId.split('_')[1] || '?'}
                </Text>
                {(chat.unreadByAdmin || 0) > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{chat.unreadByAdmin}</Text>
                  </View>
                )}
              </View>
              <View style={styles.threadContent}>
                <View style={styles.threadHeader}>
                  <Text style={styles.threadName}>{chat.odAaByuserName}</Text>
                  <Text style={styles.threadTime}>
                    {chat.lastMessageAt ? formatTime(chat.lastMessageAt.toDate ? chat.lastMessageAt.toDate() : new Date(chat.lastMessageAt as any)) : ''}
                  </Text>
                </View>
                <View style={styles.threadPreview}>
                  <Text style={styles.threadCoupleId}>
                    {chat.coupleId} ({chat.gender === 'male' ? 'M' : 'F'})
                  </Text>
                  <View style={[
                    styles.threadStatus, 
                    chat.status === 'active' ? styles.statusactive : styles.statusresolved
                  ]}>
                    <Text style={styles.threadStatusText}>
                      {chat.status.charAt(0).toUpperCase() + chat.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.threadLastMessageRow}>
                  {chat.typing?.user && (
                    <Text style={styles.typingIndicator}>typing...</Text>
                  )}
                  {!chat.typing?.user && (
                    <Text style={styles.threadLastMessage} numberOfLines={1}>
                      {chat.lastMessageBy === 'admin' ? 'You: ' : ''}{chat.lastMessage || 'No messages yet'}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Chat Panel (Desktop) - Shows real messages
  const renderChatPanel = () => {
    if (!selectedChat) {
      return (
        <View style={styles.chatPanelEmpty}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.chatPanelEmptyTitle}>Select a conversation</Text>
          <Text style={styles.chatPanelEmptyText}>
            Choose a thread from the list to view messages
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chatPanel}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderLeft}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.chatBackButton}
              onPress={() => setSelectedChat(null)}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {selectedChat.coupleId.split('_')[1] || '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{selectedChat.odAaByuserName}</Text>
              <Text style={styles.chatHeaderId}>
                {selectedChat.coupleId} ({selectedChat.gender === 'male' ? 'Male' : 'Female'})
              </Text>
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            {/* Clear Chat Button */}
            {chatMessages.length > 0 && (
              <TouchableOpacity 
                style={styles.clearChatHeaderButton}
                onPress={() => setShowClearChatModal(true)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            )}
            {/* Resolve/Reopen Button */}
            <TouchableOpacity 
              style={[
                styles.statusActionButton, 
                selectedChat.status === 'resolved' ? styles.reopenActionButton : styles.resolveActionButton
              ]}
              onPress={() => handleToggleChatStatus(selectedChat)}
            >
              <Ionicons 
                name={selectedChat.status === 'resolved' ? 'refresh' : 'checkmark-circle'} 
                size={16} 
                color={selectedChat.status === 'resolved' ? COLORS.info : COLORS.success} 
              />
              <Text style={[
                styles.statusActionText,
                { color: selectedChat.status === 'resolved' ? COLORS.info : COLORS.success }
              ]}>
                {selectedChat.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={messagesScrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          {...(isWeb ? { className: 'hide-scrollbar' } : {})}
          onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoadingMessages ? (
            <View style={styles.shimmerMessagesContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
                <View style={styles.shimmerBlock} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
                <View style={[styles.shimmerBlock, { width: 180 }]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
                <View style={[styles.shimmerBlock, { width: 250 }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
                <View style={[styles.shimmerBlock, { width: 160 }]} />
              </View>
            </View>
          ) : chatMessages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
            </View>
          ) : (
            chatMessages.map(message => (
              <TouchableOpacity
                key={message.id}
                style={[
                  styles.messageItem,
                  message.senderType === 'admin' ? styles.messageItemAdmin : styles.messageItemUser,
                ]}
                onLongPress={() => message.senderType === 'admin' && handleDeleteSupportMessage(message.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.senderType === 'admin' ? styles.messageBubbleAdmin : styles.messageBubbleUser,
                  ]}
                >
                  {message.senderType !== 'admin' && (
                    <Text style={styles.messageSender}>
                      {message.senderName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.senderType === 'admin' && styles.messageTextAdmin,
                    ]}
                  >
                    {message.message}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text style={[
                      styles.messageTime,
                      message.senderType === 'admin' && styles.messageTimeAdmin
                    ]}>
                      {formatMessageTime(message.createdAt)}
                    </Text>
                    {message.senderType === 'admin' && (
                      <View style={styles.ticksContainer}>
                        <Ionicons 
                          name="checkmark" 
                          size={12} 
                          color={message.readAt ? '#34b7f1' : '#8696a0'} 
                        />
                        <Ionicons 
                          name="checkmark" 
                          size={12} 
                          color={message.readAt ? '#34b7f1' : '#8696a0'} 
                          style={{ marginLeft: -6 }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          
          {/* Typing indicator */}
          {selectedChat.typing?.user && (
            <View style={[styles.messageItem, styles.messageItemUser]}>
              <View style={[styles.messageBubble, styles.messageBubbleUser, styles.typingBubble]}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.chatInputArea}>
          <View style={styles.chatInputWrapper}>
            <TextInput
              style={styles.chatInput}
              value={newMessage}
              onChangeText={handleAdminTyping}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || isSendingMessage) && styles.sendButtonDisabled]}
            onPress={handleSendSupportMessage}
            disabled={!newMessage.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Legacy Chat Panel (keeping for reference)
  const renderLegacyChatPanel = () => {
    if (!selectedThread) {
      return (
        <View style={styles.chatPanelEmpty}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.chatPanelEmptyTitle}>Select a conversation</Text>
          <Text style={styles.chatPanelEmptyText}>
            Choose a thread from the list to view messages
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chatPanel}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderLeft}>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {selectedThread.coupleId.split('_')[1]}
              </Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{selectedThread.coupleName}</Text>
              <Text style={styles.chatHeaderId}>{selectedThread.coupleId}</Text>
            </View>
          </View>
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity style={styles.chatAction}>
              <Ionicons name="call" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatAction}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView style={styles.messagesContainer}>
          {selectedThread.messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageItem,
                message.senderType === 'admin' ? styles.messageItemAdmin : styles.messageItemUser,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.senderType === 'admin' ? styles.messageBubbleAdmin : styles.messageBubbleUser,
                ]}
              >
                {message.senderType !== 'admin' && (
                  <Text style={styles.messageSender}>
                    {message.senderName} ({message.senderType === 'male' ? 'M' : 'F'})
                  </Text>
                )}
                <Text
                  style={[
                    styles.messageText,
                    message.senderType === 'admin' && styles.messageTextAdmin,
                  ]}
                >
                  {message.content}
                </Text>
                {message.hasAttachment && (
                  <View style={styles.attachmentIndicator}>
                    <Ionicons
                      name={message.attachmentType === 'image' ? 'image' : 'document'}
                      size={16}
                      color={message.senderType === 'admin' ? '#fff' : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.attachmentText,
                        message.senderType === 'admin' && styles.attachmentTextAdmin,
                      ]}
                    >
                      View attachment
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.messageTime,
                    message.senderType === 'admin' && styles.messageTimeAdmin,
                  ]}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.chatInputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Feedback Section
  const renderFeedbackSection = () => {
    const filteredFeedbacks = feedbacks.filter(f => {
      if (feedbackFilter === 'all') return true;
      return f.status === feedbackFilter;
    });

    const formatDate = (timestamp: any) => {
      if (!timestamp) return 'Unknown';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getCategoryIcon = (category: string) => {
      switch (category) {
        case 'bug': return 'bug';
        case 'feature': return 'bulb';
        case 'improvement': return 'trending-up';
        case 'question': return 'help-circle';
        default: return 'chatbox';
      }
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'bug': return '#EF4444';
        case 'feature': return '#8B5CF6';
        case 'improvement': return '#3B82F6';
        case 'question': return '#F59E0B';
        default: return COLORS.textMuted;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return '#F59E0B';
        case 'reviewed': return '#3B82F6';
        case 'resolved': return '#10B981';
        default: return COLORS.textMuted;
      }
    };

    const handleStatusChange = async (feedbackId: string, newStatus: 'pending' | 'reviewed' | 'resolved') => {
      try {
        await feedbackService.updateStatus(feedbackId, newStatus);
        setToast({
          visible: true,
          message: `Feedback marked as ${newStatus}`,
          type: 'success',
        });
      } catch (error) {
        console.error('Error updating feedback status:', error);
        setToast({
          visible: true,
          message: 'Failed to update feedback status',
          type: 'error',
        });
      }
    };

    const handleDeleteFeedback = async (feedbackId: string) => {
      try {
        await feedbackService.delete(feedbackId);
        setSelectedFeedback(null);
        setToast({
          visible: true,
          message: 'Feedback deleted successfully',
          type: 'success',
        });
      } catch (error) {
        console.error('Error deleting feedback:', error);
        setToast({
          visible: true,
          message: 'Failed to delete feedback',
          type: 'error',
        });
      }
    };

    const renderStars = (rating: number) => {
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <Ionicons
              key={star}
              name={star <= rating ? 'star' : 'star-outline'}
              size={14}
              color={star <= rating ? '#F59E0B' : COLORS.textMuted}
            />
          ))}
        </View>
      );
    };

    if (isLoadingFeedbacks) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyStateText}>Loading feedbacks...</Text>
        </View>
      );
    }

    return (
      <View style={styles.broadcastSection}>
        {/* Section Header */}
        <View style={styles.broadcastHeader}>
          <View style={styles.broadcastHeaderLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: `${COLORS.primary}15`,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="star" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>User Feedback</Text>
                <Text style={styles.sectionSubtitle}>
                  {feedbacks.length} total • {feedbacks.filter(f => f.status === 'pending').length} pending
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {(['all', 'pending', 'reviewed', 'resolved'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                feedbackFilter === status && styles.statusChipActive,
              ]}
              onPress={() => setFeedbackFilter(status)}
            >
              <Text style={[
                styles.statusChipText,
                feedbackFilter === status && styles.statusChipTextActive,
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && ` (${feedbacks.filter(f => f.status === status).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Feedback List */}
        {filteredFeedbacks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No Feedback Found</Text>
            <Text style={styles.emptyStateSubtext}>
              {feedbackFilter === 'all' 
                ? 'No feedback has been submitted yet.' 
                : `No ${feedbackFilter} feedback.`}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredFeedbacks.map(feedback => (
              <TouchableOpacity
                key={feedback.id}
                style={styles.broadcastCard}
                onPress={() => setSelectedFeedback(feedback)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${getCategoryColor(feedback.category)}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name={getCategoryIcon(feedback.category) as any} size={18} color={getCategoryColor(feedback.category)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }} numberOfLines={1}>
                        {feedback.userName || 'Anonymous User'}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                        {feedback.userEmail || 'No email'}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: `${getStatusColor(feedback.status)}15`,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: getStatusColor(feedback.status) }}>
                      {feedback.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: `${getCategoryColor(feedback.category)}15`,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: getCategoryColor(feedback.category) }}>
                      {feedback.category.toUpperCase()}
                    </Text>
                  </View>
                  {renderStars(feedback.rating)}
                </View>

                <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 }} numberOfLines={2}>
                  {feedback.message}
                </Text>

                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
                  {formatDate(feedback.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Feedback Detail Modal */}
        <Modal
          visible={!!selectedFeedback}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedFeedback(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              {selectedFeedback && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Feedback Details</Text>
                    <TouchableOpacity onPress={() => setSelectedFeedback(null)}>
                      <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 20 }}>
                    {/* User Info */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>FROM</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>
                        {selectedFeedback.userName || 'Anonymous User'}
                      </Text>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>
                        {selectedFeedback.userEmail || 'No email provided'}
                      </Text>
                      {selectedFeedback.coupleName && (
                        <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                          Couple: {selectedFeedback.coupleName}
                        </Text>
                      )}
                    </View>

                    {/* Category & Rating - Side by Side */}
                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>CATEGORY</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: `${getCategoryColor(selectedFeedback.category)}15`,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 10,
                          }}>
                            <Ionicons name={getCategoryIcon(selectedFeedback.category) as any} size={16} color={getCategoryColor(selectedFeedback.category)} />
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary }}>
                            {selectedFeedback.category.charAt(0).toUpperCase() + selectedFeedback.category.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>RATING</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {renderStars(selectedFeedback.rating)}
                          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 8 }}>
                            {selectedFeedback.rating}/5
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Message */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>MESSAGE</Text>
                      <View style={{
                        backgroundColor: COLORS.background,
                        padding: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.borderLight,
                      }}>
                        <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 }}>
                          {selectedFeedback.message}
                        </Text>
                      </View>
                    </View>

                    {/* Submitted Date */}
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>SUBMITTED</Text>
                      <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>
                        {formatDate(selectedFeedback.createdAt)}
                      </Text>
                    </View>

                    {/* Status Actions */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>UPDATE STATUS</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {(['pending', 'reviewed', 'resolved'] as const).map(status => (
                          <TouchableOpacity
                            key={status}
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              borderRadius: 10,
                              backgroundColor: selectedFeedback.status === status 
                                ? getStatusColor(status) 
                                : `${getStatusColor(status)}15`,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: selectedFeedback.status === status ? 0 : 1,
                              borderColor: `${getStatusColor(status)}30`,
                            }}
                            onPress={() => handleStatusChange(selectedFeedback.id, status)}
                          >
                            <Text style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: selectedFeedback.status === status ? '#fff' : getStatusColor(status),
                            }}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </ScrollView>

                  {/* Delete Button */}
                  <View style={{ padding: 20, paddingTop: 0 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 14,
                        borderRadius: 10,
                        backgroundColor: '#FEE2E2',
                      }}
                      onPress={() => {
                        if (isWeb) {
                          // Use confirm for web
                          if (window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
                            handleDeleteFeedback(selectedFeedback.id);
                          }
                        } else {
                          Alert.alert(
                            'Delete Feedback',
                            'Are you sure you want to delete this feedback? This action cannot be undone.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete', 
                                style: 'destructive',
                                onPress: () => handleDeleteFeedback(selectedFeedback.id),
                              },
                            ]
                          );
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>Delete Feedback</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Broadcast Section
  const renderBroadcastSection = () => {
    // Format timestamp to readable date
    const formatBroadcastDate = (timestamp: any) => {
      if (!timestamp) return 'Unknown';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatExpiryDate = (timestamp: any) => {
      if (!timestamp) return null;
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (days < 0) return 'Expired';
      if (days === 0) return 'Expires today';
      if (days === 1) return 'Expires tomorrow';
      return `Expires in ${days} days`;
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return '#ef4444';
        case 'important': return '#f59e0b';
        default: return COLORS.primary;
      }
    };

    return (
      <View style={styles.broadcastSection}>
        <View style={styles.broadcastHeader}>
          <View style={styles.broadcastHeaderLeft}>
            <Text style={styles.sectionTitle}>Broadcast History</Text>
            <Text style={styles.sectionSubtitle}>Past announcements sent to all users</Text>
          </View>
          {broadcasts.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={() => setShowClearAllModal(true)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoadingBroadcasts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading broadcasts...</Text>
          </View>
        ) : broadcasts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No broadcasts sent yet</Text>
            <Text style={styles.emptyStateSubtext}>Click "New Broadcast" to send your first announcement</Text>
          </View>
        ) : (
          <View style={styles.broadcastList}>
            {broadcasts.map((broadcast) => (
              <View key={broadcast.id} style={styles.broadcastCard}>
                <View style={styles.broadcastCardHeader}>
                  <View style={styles.broadcastTitleRow}>
                    <Ionicons name="megaphone" size={20} color={getPriorityColor(broadcast.priority)} />
                    <Text style={styles.broadcastTitle} numberOfLines={1}>{broadcast.title}</Text>
                  </View>
                  <View style={styles.broadcastActions}>
                    <TouchableOpacity 
                      style={styles.broadcastActionBtn}
                      onPress={() => handleEditBroadcast(broadcast)}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.broadcastActionBtn}
                      onPress={() => handleDeleteBroadcast(broadcast.id)}
                      disabled={isDeleting}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.broadcastMessage} numberOfLines={3}>{broadcast.message}</Text>
                <View style={styles.broadcastFooter}>
                  <View style={styles.broadcastStat}>
                    <Ionicons name="time" size={14} color={COLORS.textMuted} />
                    <Text style={styles.broadcastStatText}>
                      {formatBroadcastDate(broadcast.sentAt)}
                    </Text>
                  </View>
                  <View style={styles.broadcastStat}>
                    <Ionicons name="person" size={14} color={COLORS.textMuted} />
                    <Text style={styles.broadcastStatText}>
                      by {broadcast.sentByName || 'Admin'}
                    </Text>
                  </View>
                  {broadcast.expiresAt && (
                    <View style={styles.broadcastStat}>
                      <Ionicons name="hourglass-outline" size={14} color={COLORS.warning} />
                      <Text style={[styles.broadcastStatText, { color: COLORS.warning }]}>
                        {formatExpiryDate(broadcast.expiresAt)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Broadcast Modal
  const renderBroadcastModal = () => (
    <Modal
      visible={showBroadcastModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBroadcastModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="megaphone" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>New Broadcast</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBroadcastModal(false)} disabled={isSendingBroadcast}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={COLORS.info} />
              <Text style={styles.infoBannerText}>
                This message will be visible to all users in their Messages section.
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>Title</Text>
                <Text style={[
                  styles.charCount,
                  broadcastForm.title.length > TITLE_MAX_LENGTH && styles.charCountError
                ]}>
                  {broadcastForm.title.length}/{TITLE_MAX_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  broadcastForm.title.length > TITLE_MAX_LENGTH && styles.textInputError
                ]}
                placeholder="Enter broadcast title..."
                placeholderTextColor={COLORS.textMuted}
                value={broadcastForm.title}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, title: text.slice(0, TITLE_MAX_LENGTH) })}
                maxLength={TITLE_MAX_LENGTH}
                editable={!isSendingBroadcast}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>Message</Text>
                <Text style={[
                  styles.charCount,
                  broadcastForm.message.length > MESSAGE_MAX_LENGTH && styles.charCountError
                ]}>
                  {broadcastForm.message.length}/{MESSAGE_MAX_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.textArea,
                  broadcastForm.message.length > MESSAGE_MAX_LENGTH && styles.textInputError
                ]}
                placeholder="Enter your broadcast message..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                value={broadcastForm.message}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, message: text.slice(0, MESSAGE_MAX_LENGTH) })}
                maxLength={MESSAGE_MAX_LENGTH}
                editable={!isSendingBroadcast}
              />
            </View>

            {/* Expiry Options */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Auto-expire after (optional)</Text>
              
              {/* Quick preset buttons */}
              <View style={styles.expiryPresets}>
                {[
                  { label: 'Never', value: 0, unit: 'days' },
                  { label: '30 min', value: 30, unit: 'minutes' },
                  { label: '1 hour', value: 1, unit: 'hours' },
                  { label: '1 day', value: 1, unit: 'days' },
                  { label: '7 days', value: 7, unit: 'days' },
                ].map((option) => (
                  <TouchableOpacity
                    key={`${option.value}-${option.unit}`}
                    style={[
                      styles.expiryPreset,
                      broadcastForm.expiryValue === option.value && broadcastForm.expiryUnit === option.unit && styles.expiryPresetActive
                    ]}
                    onPress={() => setBroadcastForm({ ...broadcastForm, expiryValue: option.value, expiryUnit: option.unit as 'minutes' | 'hours' | 'days' })}
                  >
                    <Text style={[
                      styles.expiryPresetText,
                      broadcastForm.expiryValue === option.value && broadcastForm.expiryUnit === option.unit && styles.expiryPresetTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom expiry input */}
              <View style={styles.customExpiryRow}>
                <Text style={styles.customExpiryLabel}>Or set custom:</Text>
                <TextInput
                  style={styles.expiryInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={broadcastForm.expiryValue > 0 ? String(broadcastForm.expiryValue) : ''}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    setBroadcastForm({ ...broadcastForm, expiryValue: val });
                  }}
                />
                <View style={styles.expiryUnitSelector}>
                  {(['minutes', 'hours', 'days'] as const).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.expiryUnitBtn,
                        broadcastForm.expiryUnit === unit && styles.expiryUnitBtnActive
                      ]}
                      onPress={() => setBroadcastForm({ ...broadcastForm, expiryUnit: unit })}
                    >
                      <Text style={[
                        styles.expiryUnitText,
                        broadcastForm.expiryUnit === unit && styles.expiryUnitTextActive
                      ]}>
                        {unit.charAt(0).toUpperCase() + unit.slice(1, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.formHint}>
                {broadcastForm.expiryValue === 0 
                  ? 'Broadcast will remain visible until manually deleted' 
                  : `Broadcast will auto-hide after ${broadcastForm.expiryValue} ${broadcastForm.expiryUnit}`
                }
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, isSendingBroadcast && styles.buttonDisabled]}
              onPress={() => setShowBroadcastModal(false)}
              disabled={isSendingBroadcast}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, isSendingBroadcast && styles.buttonDisabled]} 
              onPress={handleShowConfirmation}
              disabled={isSendingBroadcast}
            >
              <Text style={styles.submitButtonText}>Send Broadcast</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Confirmation Modal
  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModalContent]}>
          <View style={styles.confirmIcon}>
            <Ionicons name="warning" size={32} color={COLORS.warning} />
          </View>
          <Text style={styles.confirmTitle}>Confirm Broadcast</Text>
          <Text style={styles.confirmMessage}>
            This message will be sent to all registered users. Please ensure the content is accurate before proceeding.
          </Text>
          <View style={styles.confirmPreview}>
            <Text style={styles.confirmPreviewLabel}>Preview:</Text>
            <Text style={styles.confirmPreviewTitle}>{broadcastForm.title}</Text>
            <Text style={styles.confirmPreviewMessage}>{broadcastForm.message}</Text>
          </View>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.confirmCancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmSendButton}
              onPress={handleSendBroadcast}
            >
              {isSendingBroadcast ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.confirmSendText}>Send Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Clear All Confirmation Modal
  const renderClearAllModal = () => (
    <Modal
      visible={showClearAllModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowClearAllModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModalContent]}>
          <View style={[styles.confirmIcon, { backgroundColor: COLORS.error + '15' }]}>
            <Ionicons name="trash" size={32} color={COLORS.error} />
          </View>
          <Text style={styles.confirmTitle}>Clear All Broadcasts</Text>
          <Text style={styles.confirmMessage}>
            Are you sure you want to delete all broadcast history? This action cannot be undone and will remove all broadcasts from user messages.
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setShowClearAllModal(false)}
              disabled={isClearing}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSendButton, { backgroundColor: COLORS.error }]}
              onPress={handleClearAllBroadcasts}
              disabled={isClearing}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.confirmSendText}>Clear All</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Delete Single Broadcast Confirmation Modal
  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        setShowDeleteModal(false);
        setDeletingBroadcastId(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModalContent]}>
          <View style={[styles.confirmIcon, { backgroundColor: COLORS.error + '15' }]}>
            <Ionicons name="trash-outline" size={32} color={COLORS.error} />
          </View>
          <Text style={styles.confirmTitle}>Delete Broadcast</Text>
          <Text style={styles.confirmMessage}>
            Are you sure you want to delete this broadcast? This action cannot be undone.
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => {
                setShowDeleteModal(false);
                setDeletingBroadcastId(null);
              }}
              disabled={isDeleting}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSendButton, { backgroundColor: COLORS.error }]}
              onPress={confirmDeleteBroadcast}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.confirmSendText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Edit Broadcast Modal
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowEditModal(false);
        setEditingBroadcast(null);
        setBroadcastForm({ title: '', message: '', expiryValue: 0, expiryUnit: 'days' });
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="create" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Edit Broadcast</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setShowEditModal(false);
                setEditingBroadcast(null);
                setBroadcastForm({ title: '', message: '', expiryValue: 0, expiryUnit: 'days' });
              }} 
              disabled={isSendingBroadcast}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formSection}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>Title</Text>
                <Text style={styles.charCount}>
                  {broadcastForm.title.length}/{TITLE_MAX_LENGTH}
                </Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter broadcast title..."
                placeholderTextColor={COLORS.textMuted}
                value={broadcastForm.title}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, title: text.slice(0, TITLE_MAX_LENGTH) })}
                maxLength={TITLE_MAX_LENGTH}
                editable={!isSendingBroadcast}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>Message</Text>
                <Text style={styles.charCount}>
                  {broadcastForm.message.length}/{MESSAGE_MAX_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your broadcast message..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                value={broadcastForm.message}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, message: text.slice(0, MESSAGE_MAX_LENGTH) })}
                maxLength={MESSAGE_MAX_LENGTH}
                editable={!isSendingBroadcast}
              />
            </View>

            {/* Set New Expiry */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Set new expiry (optional)</Text>
              <View style={styles.expiryPresets}>
                {[
                  { label: 'No change', value: 0, unit: 'days' },
                  { label: '30 min', value: 30, unit: 'minutes' },
                  { label: '1 hour', value: 1, unit: 'hours' },
                  { label: '1 day', value: 1, unit: 'days' },
                  { label: '7 days', value: 7, unit: 'days' },
                ].map((option) => (
                  <TouchableOpacity
                    key={`${option.value}-${option.unit}`}
                    style={[
                      styles.expiryPreset,
                      broadcastForm.expiryValue === option.value && broadcastForm.expiryUnit === option.unit && styles.expiryPresetActive
                    ]}
                    onPress={() => setBroadcastForm({ ...broadcastForm, expiryValue: option.value, expiryUnit: option.unit as 'minutes' | 'hours' | 'days' })}
                  >
                    <Text style={[
                      styles.expiryPresetText,
                      broadcastForm.expiryValue === option.value && broadcastForm.expiryUnit === option.unit && styles.expiryPresetTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, isSendingBroadcast && styles.buttonDisabled]}
              onPress={() => {
                setShowEditModal(false);
                setEditingBroadcast(null);
                setBroadcastForm({ title: '', message: '', expiryValue: 0, expiryUnit: 'days' });
              }}
              disabled={isSendingBroadcast}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, isSendingBroadcast && styles.buttonDisabled]} 
              onPress={handleSaveEdit}
              disabled={isSendingBroadcast}
            >
              {isSendingBroadcast ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
              <Text style={styles.submitButtonText}>
                {isSendingBroadcast ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Chat Modal (Mobile) - Uses real Firebase chat data
  const renderChatModal = () => {
    console.log('Rendering chat modal, visible:', showChatModal, 'selectedChat:', selectedChat?.id);
    return (
    <Modal
      visible={showChatModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowChatModal(false)}
    >
      <View style={styles.chatModalContainer}>
        {/* Show loading if no chat selected yet */}
        {!selectedChat ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading chat...</Text>
          </View>
        ) : (
          <>
            {/* Chat Header */}
            <View style={styles.chatModalHeader}>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.chatModalHeaderInfo}>
                <Text style={styles.chatModalHeaderName}>{selectedChat.odAaByuserName || 'User'}</Text>
                <Text style={styles.chatModalHeaderId}>{selectedChat.coupleId}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => {
                  setShowClearChatModal(true);
                }}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleToggleChatStatus(selectedChat)}>
                  <Ionicons 
                    name={selectedChat.status === 'resolved' ? 'refresh' : 'checkmark-done'} 
                    size={22} 
                    color={selectedChat.status === 'resolved' ? COLORS.primary : COLORS.success} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView 
              style={styles.chatModalMessages}
              ref={(ref) => ref?.scrollToEnd({ animated: false })}
            >
              {isLoadingMessages ? (
                <View style={styles.emptyChatMessages}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.emptyChatText}>Loading messages...</Text>
                </View>
              ) : chatMessages.length === 0 ? (
                <View style={styles.emptyChatMessages}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                </View>
              ) : (
                chatMessages.map(message => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageItem,
                      message.senderType === 'admin' ? styles.messageItemAdmin : styles.messageItemUser,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        message.senderType === 'admin' ? styles.messageBubbleAdmin : styles.messageBubbleUser,
                      ]}
                    >
                      {message.senderType !== 'admin' && (
                        <Text style={styles.messageSender}>
                          {message.senderName}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.messageText,
                          message.senderType === 'admin' && styles.messageTextAdmin,
                        ]}
                      >
                        {message.message}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          message.senderType === 'admin' && styles.messageTimeAdmin,
                        ]}
                      >
                        {message.createdAt?.toDate ? 
                          message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.chatInputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="attach" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textMuted}
                value={newMessage}
                onChangeText={handleAdminTyping}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, (!newMessage.trim() || isSendingMessage) && styles.sendButtonDisabled]}
                onPress={handleSendSupportMessage}
                disabled={!newMessage.trim() || isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
  };

  // Toast
  const renderToast = () => (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY: toastAnim }] },
        toast.type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Ionicons
        name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={20}
        color="#fff"
      />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );

  // Clear Chat Modal
  const renderClearChatModal = () => (
    <Modal
      visible={showClearChatModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowClearChatModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <View style={[styles.confirmIcon, { backgroundColor: COLORS.error + '15' }]}>
            <Ionicons name="trash-outline" size={32} color={COLORS.error} />
          </View>
          <Text style={styles.confirmTitle}>Clear Chat History</Text>
          <Text style={styles.confirmMessage}>
            This will permanently delete all messages for both you and the user. This action cannot be undone.
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setShowClearChatModal(false)}
              disabled={isClearingChat}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSendButton, { backgroundColor: COLORS.error }]}
              onPress={handleClearChat}
              disabled={isClearingChat}
            >
              {isClearingChat ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.confirmSendText}>Clear</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {activeTab === 'inbox' ? (
        <View style={[styles.inboxContainer, isDesktop && styles.inboxContainerDesktop]}>
          {renderThreadList()}
          {isDesktop && renderChatPanel()}
        </View>
      ) : activeTab === 'broadcast' ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, !isMobile && styles.contentDesktop]}>
            {renderBroadcastSection()}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, !isMobile && styles.contentDesktop]}>
            {renderFeedbackSection()}
          </View>
        </ScrollView>
      )}

      {renderBroadcastModal()}
      {renderConfirmModal()}
      {renderClearAllModal()}
      {renderDeleteModal()}
      {renderEditModal()}
      {renderChatModal()}
      {renderClearChatModal()}
      {toast.visible && renderToast()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    paddingBottom: 40,
  },
  content: {
    padding: 16,
  },
  contentDesktop: {
    padding: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  newBroadcastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  newBroadcastButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // Inbox Container
  inboxContainer: {
    flex: 1,
  },
  inboxContainerDesktop: {
    flexDirection: 'row',
  },

  // Thread List
  threadListContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  threadListContainerSplit: {
    flex: 0,
    width: 360,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  threadFilters: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  statusFilters: {
    flexDirection: 'row',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusChipTextActive: {
    color: '#fff',
  },
  threadList: {
    flex: 1,
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 12,
  },
  threadItemActive: {
    backgroundColor: COLORS.primary + '08',
  },
  threadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  threadAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  threadTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  threadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  threadCoupleId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  threadStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusactive: {
    backgroundColor: COLORS.success + '20',
  },
  statuspending: {
    backgroundColor: COLORS.warning + '20',
  },
  statusresolved: {
    backgroundColor: COLORS.textMuted + '20',
  },
  threadStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  threadLastMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Chat Panel
  chatPanel: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  chatPanelEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  chatPanelEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  chatPanelEmptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  chatBackButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chatHeaderId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
  },
  chatAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearChatHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  resolveActionButton: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '30',
  },
  reopenActionButton: {
    backgroundColor: COLORS.info + '10',
    borderColor: COLORS.info + '30',
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  shimmerMessagesContainer: {
    padding: 16,
  },
  shimmerBlock: {
    width: 220,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight,
    opacity: 0.6,
  },
  messageItem: {
    marginBottom: 16,
  },
  messageItemUser: {
    alignItems: 'flex-start',
  },
  messageItemAdmin: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.borderLight,
    borderBottomLeftRadius: 6,
  },
  messageBubbleAdmin: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  messageTextAdmin: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  messageTimeAdmin: {
    color: 'rgba(255,255,255,0.7)',
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  attachmentText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  attachmentTextAdmin: {
    color: '#fff',
  },

  // Chat Input
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },

  // Broadcast Section
  broadcastSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  broadcastHeaderLeft: {
    flex: 1,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  clearAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  broadcastList: {
    gap: 12,
  },
  broadcastCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
  },
  broadcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  broadcastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  broadcastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  broadcastActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  audienceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  audienceall: {
    backgroundColor: COLORS.primary + '20',
  },
  audiencestudy: {
    backgroundColor: COLORS.accent + '20',
  },
  audiencecontrol: {
    backgroundColor: COLORS.info + '20',
  },
  audienceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  broadcastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  broadcastFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  broadcastStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  broadcastStatText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContentMobile: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  audienceOptions: {
    gap: 8,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 12,
  },
  audienceOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  audienceOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  audienceOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Chat Modal
  chatModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  chatModalHeaderInfo: {
    flex: 1,
  },
  chatModalHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chatModalHeaderId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chatModalMessages: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  emptyChatMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: COLORS.success,
  },
  toastError: {
    backgroundColor: COLORS.error,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },

  // Calls Section Styles
  callsSection: {
    flex: 1,
  },
  callsHeader: {
    marginBottom: 20,
  },
  callsCategory: {
    marginBottom: 24,
  },
  callsCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  callUserNameCompleted: {
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
  callDetailsCompact: {
    marginTop: 4,
  },
  callDetailTextCompact: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  callReason: {
    marginBottom: 14,
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
  callActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  callActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  charCountError: {
    color: COLORS.error,
  },
  textInputError: {
    borderColor: COLORS.error,
  },
  formHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Expiry Options
  expiryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  expiryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  expiryOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  expiryOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  expiryOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Dynamic Expiry Presets
  expiryPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  expiryPreset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  expiryPresetActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  expiryPresetText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  expiryPresetTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  customExpiryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  expiryInput: {
    width: 60,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center' as const,
  },
  expiryUnitSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  expiryUnitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expiryUnitBtnActive: {
    backgroundColor: COLORS.primary,
  },
  expiryUnitText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  expiryUnitTextActive: {
    color: '#fff',
  },

  // Confirmation Modal
  confirmModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 16,
  },
  confirmPreview: {
    width: '100%',
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  confirmPreviewLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  confirmPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  confirmPreviewMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmSendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmSendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Additional chat styles
  emptyThreads: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyThreadsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyThreadsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  threadLastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingIndicator: {
    fontSize: 13,
    color: COLORS.success,
    fontStyle: 'italic',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  chatActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  messagesContent: {
    paddingBottom: 20,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  ticksContainer: {
    flexDirection: 'row',
  },
  typingBubble: {
    paddingVertical: 14,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  chatInputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 10,
  },
  chatInputWrapper: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  videoLinkSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  videoLinkLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  videoLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoLinkText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  sendLinkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  joinCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  joinCallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  videoSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  videoSentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
});
