import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { chatService } from '@/services/firestore.service';
import { Chat, ChatMessage } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
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

// Welcome message for new chats
const WELCOME_MESSAGE = "Welcome to the Nursing Department Support Chat. Please feel free to share your queries, and our team will assist you shortly.";

// Shimmer component for loading state
const ShimmerBlock = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
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

export default function ChatScreen() {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Calculate max width for desktop layout (like other pages)
  const maxContentWidth = Math.min(screenWidth, 800);

  // User info state
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [coupleId, setCoupleId] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(null);

  // Chat state
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Typing debounce
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject scrollbar hide CSS for web
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      const styleId = 'hide-scrollbar-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = hideScrollbarStyle;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Load user info from AsyncStorage
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const storedCoupleId = await AsyncStorage.getItem('coupleId');
        const storedGender = await AsyncStorage.getItem('userGender');
        const storedUserName = await AsyncStorage.getItem('userName');

        if (storedCoupleId && storedGender) {
          const odAaByuserId = `${storedCoupleId}_${storedGender === 'male' ? 'M' : 'F'}`;
          setUserId(odAaByuserId);
          setCoupleId(storedCoupleId);
          setGender(storedGender as 'male' | 'female');
          setUserName(storedUserName || 'User');
          
          // Load profile photo from Firestore
          try {
            const { coupleService } = await import('@/services/firestore.service');
            const couple = await coupleService.get(storedCoupleId);
            if (couple) {
              const user = couple[storedGender as 'male' | 'female'];
              setUserProfilePhoto(user.profilePhoto || null);
            }
          } catch (e) {
            console.log('Could not load profile photo:', e);
          }
        } else {
          console.warn('Missing coupleId or userGender in AsyncStorage');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
        setIsLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  // Initialize chat and subscribe to messages
  useEffect(() => {
    if (!userId || !coupleId) return;

    const displayName = userName || 'User';

    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeMessages: (() => void) | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const initializeChat = async () => {
      try {
        setIsLoading(true);

        timeoutId = setTimeout(() => {
          console.warn('Chat initialization timed out');
          setIsLoading(false);
        }, 10000);

        const existingChat = await chatService.getOrCreate(userId, displayName, coupleId, gender);
        setChat(existingChat);

        await chatService.markAsRead(userId, 'user');
        await chatService.cleanupOldMessages(userId);

        unsubscribeChat = chatService.subscribe(userId, (updatedChat) => {
          setChat(updatedChat);
          setAdminTyping(updatedChat?.typing?.admin || false);
        });

        unsubscribeMessages = chatService.subscribeToMessages(userId, (msgs) => {
          const visibleMessages = msgs.filter((msg) => !msg.deletedByUser);
          setMessages(visibleMessages);
          chatService.markAsRead(userId, 'user');
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        if (timeoutId) clearTimeout(timeoutId);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (timeoutId) clearTimeout(timeoutId);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to load chat. Please try again.');
      }
    };

    initializeChat();

    return () => {
      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeMessages) unsubscribeMessages();
      if (timeoutId) clearTimeout(timeoutId);
      if (userId) {
        chatService.setTyping(userId, false, 'user');
      }
    };
  }, [userId, userName, coupleId, gender]);

  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);
    if (!userId || chat?.status === 'resolved') return;

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      chatService.setTyping(userId, true, 'user');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.setTyping(userId, false, 'user');
    }, 2000);
  }, [userId, isTyping, chat?.status]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId || isSending || chat?.status === 'resolved') return;

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    if (isTyping) {
      setIsTyping(false);
      chatService.setTyping(userId, false, 'user');
    }

    try {
      await chatService.sendMessage(userId, {
        senderId: userId,
        senderType: 'user',
        senderName: userName || 'User',
        message: textToSend,
        messageType: 'text',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(textToSend);
      if (Platform.OS === 'web') {
        alert('Failed to send message. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleReopenChat = async () => {
    if (!userId || !chat) return;
    try {
      await chatService.updateStatus(userId, 'active');
    } catch (error) {
      console.error('Error reopening chat:', error);
      Alert.alert('Error', 'Failed to reopen chat.');
    }
  };

  const handleClearChat = async () => {
    if (!userId) return;
    setIsClearing(true);
    try {
      await chatService.clearAllMessages(userId, coupleId, gender);
      setShowClearModal(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
      if (Platform.OS === 'web') {
        alert('Failed to clear chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to clear chat. Please try again.');
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (Platform.OS === 'web') {
      if (confirm('Delete this message?')) {
        chatService.deleteMessage(userId, messageId, 'user');
      }
    } else {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => chatService.deleteMessage(userId, messageId, 'user'),
          },
        ]
      );
    }
  };

  const handleAttachFile = () => {
    if (Platform.OS === 'web') {
      alert('File attachments will be available soon!');
    } else {
      Alert.alert('Coming Soon', 'File attachments will be available in a future update.');
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const renderTicks = (message: ChatMessage) => {
    if (message.senderType !== 'user') return null;
    const isRead = message.readAt !== null && message.readAt !== undefined;
    const tickColor = isRead ? '#34b7f1' : '#8696a0';

    return (
      <View style={styles.ticksContainer}>
        <Ionicons name="checkmark" size={14} color={tickColor} />
        <Ionicons name="checkmark" size={14} color={tickColor} style={{ marginLeft: -8 }} />
      </View>
    );
  };

  const messageGroups = groupMessagesByDate(messages);
  const isResolved = chat?.status === 'resolved';

  // Shimmer loading state
  if (isLoading || !userId) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
          <View style={[styles.headerInner, { maxWidth: maxContentWidth }]}>
            <ShimmerBlock width={40} height={40} style={{ borderRadius: 12 }} />
            <View style={{ marginLeft: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <ShimmerBlock width={44} height={44} style={{ borderRadius: 22 }} />
              <View style={{ marginLeft: 12 }}>
                <ShimmerBlock width={140} height={18} style={{ marginBottom: 6, borderRadius: 6 }} />
                <ShimmerBlock width={100} height={14} style={{ borderRadius: 6 }} />
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.chatContentWrapper, { maxWidth: maxContentWidth }]}>
          <View style={styles.shimmerMessages}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
              <ShimmerBlock width={32} height={32} style={{ borderRadius: 16, marginRight: 8 }} />
              <ShimmerBlock width={220} height={60} style={{ borderRadius: 20 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
              <ShimmerBlock width={180} height={50} style={{ borderRadius: 20 }} />
              <ShimmerBlock width={32} height={32} style={{ borderRadius: 16, marginLeft: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
              <ShimmerBlock width={32} height={32} style={{ borderRadius: 16, marginRight: 8 }} />
              <ShimmerBlock width={250} height={70} style={{ borderRadius: 20 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
              <ShimmerBlock width={160} height={45} style={{ borderRadius: 20 }} />
              <ShimmerBlock width={32} height={32} style={{ borderRadius: 16, marginLeft: 8 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Full-width Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
        <View style={[styles.headerInner, { maxWidth: maxContentWidth }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#0f172a'} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatarContainer}>
              <Image
                source={require('../../assets/images/nurse.png')}
                style={styles.headerAvatar}
                contentFit="cover"
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#0f172a' }]}>
                Nursing Department
              </Text>
              <Text style={styles.headerSubtitle}>
                {adminTyping ? (
                  <Text style={styles.typingText}>typing...</Text>
                ) : (
                  'Usually replies within 1 hour'
                )}
              </Text>
            </View>
          </View>
          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <TouchableOpacity 
              style={[styles.clearChatButton, { backgroundColor: isDarkMode ? '#334155' : '#fef2f2' }]} 
              onPress={() => setShowClearModal(true)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resolved Banner - Full Width */}
      {isResolved && (
        <View style={styles.resolvedBannerContainer}>
          <View style={[styles.resolvedBanner, { maxWidth: maxContentWidth }]}>
            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            <Text style={styles.resolvedBannerText}>This chat has been marked as resolved</Text>
            <TouchableOpacity style={styles.reopenButtonStyled} onPress={handleReopenChat}>
              <Ionicons name="refresh" size={16} color="#006dab" />
              <Text style={styles.reopenButtonText}>Reopen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat Content - Centered */}
      <View style={[styles.chatContentWrapper, { maxWidth: maxContentWidth }]}>
        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          {...(isWeb ? { className: 'hide-scrollbar' } : {})}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.welcomeCard, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
                <Image
                  source={require('../../assets/images/nurse.png')}
                  style={styles.welcomeAvatar}
                  contentFit="cover"
                />
                <Text style={[styles.welcomeTitle, { color: isDarkMode ? '#fff' : '#0f172a' }]}>
                  Nursing Department Support
                </Text>
                <Text style={[styles.welcomeText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                  {WELCOME_MESSAGE}
                </Text>
              </View>
            </View>
          ) : (
            messageGroups.map((group, groupIndex) => (
              <View key={groupIndex}>
                {/* Date separator */}
                <View style={styles.dateSeparator}>
                  <View style={[styles.dateLine, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
                  <Text style={styles.dateText}>{group.date}</Text>
                  <View style={[styles.dateLine, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
                </View>

                {/* Messages */}
                {group.messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      message.senderType === 'user' ? styles.messageRowUser : styles.messageRowAdmin,
                    ]}
                  >
                    {/* Admin avatar on left */}
                    {message.senderType === 'admin' && (
                      <Image
                        source={require('../../assets/images/nurse.png')}
                        style={styles.messageAvatar}
                        contentFit="cover"
                      />
                    )}
                    
                    <TouchableOpacity
                      style={[
                        styles.messageBubble,
                        message.senderType === 'user' 
                          ? styles.userMessage 
                          : [styles.adminMessage, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }],
                      ]}
                      onLongPress={() => message.senderType === 'user' && handleDeleteMessage(message.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          message.senderType === 'user' 
                            ? styles.userMessageText 
                            : [styles.adminMessageText, { color: isDarkMode ? '#fff' : '#0f172a' }],
                        ]}
                      >
                        {message.message}
                      </Text>
                      <View style={styles.messageFooter}>
                        <Text
                          style={[
                            styles.messageTime,
                            message.senderType === 'user' ? styles.userMessageTime : styles.adminMessageTime,
                          ]}
                        >
                          {formatTime(message.createdAt)}
                        </Text>
                        {renderTicks(message)}
                      </View>
                    </TouchableOpacity>

                    {/* User avatar on right */}
                    {message.senderType === 'user' && (
                      userProfilePhoto ? (
                        <Image
                          source={{ uri: `${userProfilePhoto}?t=${Date.now()}` }}
                          style={styles.userAvatarImage}
                          contentFit="cover"
                          {...(!isWeb && { cachePolicy: "none" })}
                        />
                      ) : (
                        <View style={styles.userAvatarContainer}>
                          <Text style={styles.userAvatarText}>
                            {(userName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                ))}
              </View>
            ))
          )}

          {/* Typing indicator */}
          {adminTyping && (
            <View style={[styles.messageRow, styles.messageRowAdmin]}>
              <Image
                source={require('../../assets/images/nurse.png')}
                style={styles.messageAvatar}
                contentFit="cover"
              />
              <View style={[styles.messageBubble, styles.adminMessage, styles.typingBubble, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Full-width Input Area */}
      <View style={[styles.inputAreaContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
        {isResolved ? (
          <View style={[styles.resolvedInputArea, { maxWidth: maxContentWidth }]}>
            <Text style={styles.resolvedInputText}>
              Chat is resolved. Tap "Reopen" above to continue the conversation.
            </Text>
          </View>
        ) : (
          <View style={[styles.inputContainer, { maxWidth: maxContentWidth, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Removed multimedia (attach) icon */}
            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
              <TextInput
                style={[styles.textInput, { color: isDarkMode ? '#fff' : '#0f172a' }]}
                value={messageText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={1000}
                onSubmitEditing={isWeb && !messageText.trim() ? undefined : handleSendMessage}
                blurOnSubmit={false}
                returnKeyType="send"
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Clear Chat Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash-outline" size={32} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#0f172a' }]}>
              Clear Chat History
            </Text>
            <Text style={[styles.modalMessage, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              This will permanently delete all messages for both you and the admin. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}
                onPress={() => setShowClearModal(false)}
                disabled={isClearing}
              >
                <Text style={[styles.modalCancelText, { color: isDarkMode ? '#fff' : '#64748b' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalClearButton]}
                onPress={handleClearChat}
                disabled={isClearing}
              >
                {isClearing ? (
                  <Text style={styles.modalClearText}>Clearing...</Text>
                ) : (
                  <Text style={styles.modalClearText}>Clear Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shimmerMessages: {
    flex: 1,
    padding: 16,
  },

  // Header - Full width
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : isWeb ? 16 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
  },
  headerAvatar: {
    width: 44,
    height: 44,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  typingText: {
    color: '#22c55e',
    fontStyle: 'italic',
  },
  clearChatButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Resolved Banner - Full width
  resolvedBannerContainer: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  resolvedBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  resolvedBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#15803d',
    fontWeight: '500',
  },
  reopenButtonStyled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  reopenButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#006dab',
  },

  // Chat content wrapper - Centered
  chatContentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Empty State / Welcome
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Date Separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 12,
    fontWeight: '500',
  },

  // Message Row
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAdmin: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#006dab',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Message Bubble - Softer borders
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: '#006dab',
    borderBottomRightRadius: 6,
  },
  adminMessage: {
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#ffffff',
  },
  adminMessageText: {
    color: '#0f172a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  adminMessageTime: {
    color: '#94a3b8',
  },
  ticksContainer: {
    flexDirection: 'row',
  },

  // Typing
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
    backgroundColor: '#94a3b8',
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

  // Input Area Container - Full width
  inputAreaContainer: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#006dab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },

  // Resolved Input Area
  resolvedInputArea: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resolvedInputText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 0,
  },
  modalClearButton: {
    backgroundColor: '#ef4444',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalClearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
