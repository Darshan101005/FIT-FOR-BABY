import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

interface Broadcast {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'study' | 'control';
  sentAt: Date;
  readCount: number;
  totalRecipients: number;
}

// Mock broadcast history
const mockBroadcasts: Broadcast[] = [
  {
    id: 'b1',
    title: 'Weekly Check-in Reminder',
    message: 'Please remember to log your daily activities and complete your weekly feedback form.',
    targetAudience: 'all',
    sentAt: new Date('2024-11-27T09:00:00'),
    readCount: 45,
    totalRecipients: 50,
  },
  {
    id: 'b2',
    title: 'New Exercise Video Available',
    message: 'A new prenatal yoga video has been uploaded. Check it out in your exercise library!',
    targetAudience: 'study',
    sentAt: new Date('2024-11-25T14:00:00'),
    readCount: 22,
    totalRecipients: 25,
  },
];

export default function AdminCommunicationScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const isDesktop = screenWidth >= 1024;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast'>('inbox');
  const [chatThreads] = useState<ChatThread[]>(mockChatThreads);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'resolved'>('all');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  // Broadcast form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    targetAudience: 'all' as 'all' | 'study' | 'control',
  });

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

  // Handle thread click
  const handleThreadClick = (thread: ChatThread) => {
    setSelectedThread(thread);
    if (isMobile) {
      setShowChatModal(true);
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    showToast('Message sent successfully!', 'success');
    setNewMessage('');
  };

  // Handle send broadcast
  const handleSendBroadcast = () => {
    if (!broadcastForm.title || !broadcastForm.message) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    showToast('Broadcast sent successfully!', 'success');
    setShowBroadcastModal(false);
    setBroadcastForm({ title: '', message: '', targetAudience: 'all' });
  };

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Communication</Text>
          <Text style={styles.headerSubtitle}>
            {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up!'}
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
          {totalUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalUnread}</Text>
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
      </View>
    </View>
  );

  // Thread List
  const renderThreadList = () => (
    <View style={[styles.threadListContainer, isDesktop && selectedThread && styles.threadListContainerSplit]}>
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
          {['all', 'active', 'pending', 'resolved'].map(status => (
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
        {filteredThreads.map(thread => (
          <TouchableOpacity
            key={thread.coupleId}
            style={[
              styles.threadItem,
              selectedThread?.coupleId === thread.coupleId && styles.threadItemActive,
            ]}
            onPress={() => handleThreadClick(thread)}
          >
            <View style={styles.threadAvatar}>
              <Text style={styles.threadAvatarText}>
                {thread.coupleId.split('_')[1]}
              </Text>
              {thread.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.threadContent}>
              <View style={styles.threadHeader}>
                <Text style={styles.threadName}>{thread.coupleName}</Text>
                <Text style={styles.threadTime}>{formatTime(thread.lastMessageTime)}</Text>
              </View>
              <View style={styles.threadPreview}>
                <Text style={styles.threadCoupleId}>{thread.coupleId}</Text>
                <View style={[styles.threadStatus, styles[`status${thread.status}` as keyof typeof styles]]}>
                  <Text style={styles.threadStatusText}>
                    {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.threadLastMessage} numberOfLines={1}>
                {thread.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Chat Panel (Desktop)
  const renderChatPanel = () => {
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

  // Broadcast Section
  const renderBroadcastSection = () => (
    <View style={styles.broadcastSection}>
      <View style={styles.broadcastHeader}>
        <Text style={styles.sectionTitle}>Broadcast History</Text>
        <Text style={styles.sectionSubtitle}>View past announcements</Text>
      </View>

      <View style={styles.broadcastList}>
        {mockBroadcasts.map(broadcast => (
          <View key={broadcast.id} style={styles.broadcastCard}>
            <View style={styles.broadcastCardHeader}>
              <View style={styles.broadcastTitleRow}>
                <Ionicons name="megaphone" size={20} color={COLORS.primary} />
                <Text style={styles.broadcastTitle}>{broadcast.title}</Text>
              </View>
              <View style={[styles.audienceBadge, styles[`audience${broadcast.targetAudience}` as keyof typeof styles]]}>
                <Text style={styles.audienceBadgeText}>
                  {broadcast.targetAudience === 'all' ? 'All Users' :
                   broadcast.targetAudience === 'study' ? 'Study Group' : 'Control Group'}
                </Text>
              </View>
            </View>
            <Text style={styles.broadcastMessage}>{broadcast.message}</Text>
            <View style={styles.broadcastFooter}>
              <View style={styles.broadcastStat}>
                <Ionicons name="time" size={14} color={COLORS.textMuted} />
                <Text style={styles.broadcastStatText}>
                  {broadcast.sentAt.toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.broadcastStat}>
                <Ionicons name="eye" size={14} color={COLORS.textMuted} />
                <Text style={styles.broadcastStatText}>
                  {broadcast.readCount}/{broadcast.totalRecipients} read
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

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
            <TouchableOpacity onPress={() => setShowBroadcastModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter broadcast title..."
                placeholderTextColor={COLORS.textMuted}
                value={broadcastForm.title}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, title: text })}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your message..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                value={broadcastForm.message}
                onChangeText={(text) => setBroadcastForm({ ...broadcastForm, message: text })}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Target Audience</Text>
              <View style={styles.audienceOptions}>
                {[
                  { id: 'all', label: 'All Users', icon: 'people' },
                  { id: 'study', label: 'Study Group Only', icon: 'flask' },
                  { id: 'control', label: 'Control Group Only', icon: 'shield' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.audienceOption,
                      broadcastForm.targetAudience === option.id && styles.audienceOptionActive,
                    ]}
                    onPress={() => setBroadcastForm({ ...broadcastForm, targetAudience: option.id as any })}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={broadcastForm.targetAudience === option.id ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.audienceOptionText,
                        broadcastForm.targetAudience === option.id && styles.audienceOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBroadcastModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSendBroadcast}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Send Broadcast</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Chat Modal (Mobile)
  const renderChatModal = () => (
    <Modal
      visible={showChatModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowChatModal(false)}
    >
      <View style={styles.chatModalContainer}>
        {/* Chat Header */}
        {selectedThread && (
          <>
            <View style={styles.chatModalHeader}>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.chatModalHeaderInfo}>
                <Text style={styles.chatModalHeaderName}>{selectedThread.coupleName}</Text>
                <Text style={styles.chatModalHeaderId}>{selectedThread.coupleId}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView style={styles.chatModalMessages}>
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

            {/* Input */}
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
          </>
        )}
      </View>
    </Modal>
  );

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

  return (
    <View style={styles.container}>
      {renderHeader()}

      {activeTab === 'inbox' ? (
        <View style={[styles.inboxContainer, isDesktop && styles.inboxContainerDesktop]}>
          {renderThreadList()}
          {isDesktop && renderChatPanel()}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, !isMobile && styles.contentDesktop]}>
            {renderBroadcastSection()}
          </View>
        </ScrollView>
      )}

      {renderBroadcastModal()}
      {renderChatModal()}
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
    gap: 8,
  },
  chatAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    padding: 16,
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
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.borderLight,
    borderBottomLeftRadius: 4,
  },
  messageBubbleAdmin: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
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
    lineHeight: 20,
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
    marginBottom: 20,
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
  },
  broadcastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
});
