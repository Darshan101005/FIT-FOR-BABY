import { useTheme } from '@/context/ThemeContext';
import { chatService } from '@/services/firestore.service';
import { Chat, ChatMessage } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
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

export default function ChatScreen() {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // User info state
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [coupleId, setCoupleId] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Chat state
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  // Typing debounce
  const typingTimeoutRef = useRef<number | null>(null);

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

    // Use a default name if userName is empty
    const displayName = userName || 'User';

    let unsubscribeChat: (() => void) | undefined;
    let unsubscribeMessages: (() => void) | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const initializeChat = async () => {
      try {
        setIsLoading(true);

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isLoading) {
            console.warn('Chat initialization timed out');
            setIsLoading(false);
          }
        }, 10000); // 10 second timeout

        // Get or create chat
        const existingChat = await chatService.getOrCreate(userId, displayName, coupleId, gender);
        setChat(existingChat);

        // Mark messages as read
        await chatService.markAsRead(userId, 'user');

        // Cleanup old messages (7-day policy)
        await chatService.cleanupOldMessages(userId);

        // Subscribe to chat updates
        unsubscribeChat = chatService.subscribe(userId, (updatedChat) => {
          setChat(updatedChat);
          if (updatedChat?.typing?.admin) {
            setAdminTyping(true);
          } else {
            setAdminTyping(false);
          }
        });

        // Subscribe to messages
        unsubscribeMessages = chatService.subscribeToMessages(userId, (msgs) => {
          // Filter out messages deleted by user
          const visibleMessages = msgs.filter((msg) => !msg.deletedByUser);
          setMessages(visibleMessages);
          
          // Mark as read when messages arrive
          chatService.markAsRead(userId, 'user');
          
          // Auto scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        // Clear the timeout since we loaded successfully
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
      // Clear typing indicator when leaving
      if (userId) {
        chatService.setTyping(userId, false, 'user');
      }
    };
  }, [userId, userName, coupleId, gender]);

  // Handle typing indicator
  const handleTextChange = useCallback((text: string) => {
    setMessageText(text);

    if (!userId) return;

    // Set typing to true
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      chatService.setTyping(userId, true, 'user');
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.setTyping(userId, false, 'user');
    }, 2000);
  }, [userId, isTyping]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId || isSending) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    // Clear typing indicator
    setIsTyping(false);
    chatService.setTyping(userId, false, 'user');

    try {
      await chatService.sendMessage(userId, {
        senderId: userId,
        senderName: userName,
        senderType: 'user',
        message: textToSend,
        messageType: 'text',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if failed
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

  // Delete message
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

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for day separators
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date
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

  // Render read receipt ticks
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

  const styles = createStyles(isDarkMode, width);

  // Show loading if still loading user info or chat
  if (isLoading || !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006dab" />
        <Text style={styles.loadingText}>
          {!userId ? 'Loading user info...' : 'Loading chat...'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons name="headset" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Support Chat</Text>
            <Text style={styles.headerSubtitle}>
              {adminTyping ? (
                <Text style={styles.typingText}>typing...</Text>
              ) : chat?.status === 'resolved' ? (
                'Resolved'
              ) : (
                'Online'
              )}
            </Text>
          </View>
        </View>
        {chat?.status === 'resolved' && (
          <View style={styles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.resolvedText}>Resolved</Text>
          </View>
        )}
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
              Send a message to our support team.{'\n'}We typically respond within a few minutes.
            </Text>
          </View>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <View key={groupIndex}>
              {/* Date separator */}
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>

              {/* Messages */}
              {group.messages.map((message) => (
                <TouchableOpacity
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.senderType === 'user' ? styles.userMessage : styles.adminMessage,
                  ]}
                  onLongPress={() => message.senderType === 'user' && handleDeleteMessage(message.id)}
                  activeOpacity={0.8}
                >
                  {message.senderType === 'admin' && (
                    <Text style={styles.senderName}>{message.senderName}</Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.senderType === 'user' ? styles.userMessageText : styles.adminMessageText,
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
              ))}
            </View>
          ))
        )}

        {/* Typing indicator */}
        {adminTyping && (
          <View style={[styles.messageBubble, styles.adminMessage, styles.typingBubble]}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (isDarkMode: boolean, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0f172a' : '#f0f4f8',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#0f172a' : '#f0f4f8',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: '#64748b',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'ios' ? 50 : isWeb ? 16 : 40,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
    },
    headerInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 12,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#006dab',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      marginLeft: 12,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#0f172a',
    },
    headerSubtitle: {
      fontSize: 13,
      color: '#22c55e',
      marginTop: 2,
    },
    typingText: {
      color: '#22c55e',
      fontStyle: 'italic',
    },
    resolvedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    resolvedText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#22c55e',
    },

    // Messages
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 24,
    },

    // Empty State
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#0f172a',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: '#64748b',
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
      backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    dateText: {
      marginHorizontal: 12,
      fontSize: 12,
      color: '#64748b',
      fontWeight: '500',
    },

    // Message Bubbles
    messageBubble: {
      maxWidth: '80%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      marginBottom: 8,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#006dab',
      borderBottomRightRadius: 4,
    },
    adminMessage: {
      alignSelf: 'flex-start',
      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
      borderBottomLeftRadius: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    senderName: {
      fontSize: 12,
      fontWeight: '600',
      color: '#006dab',
      marginBottom: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    userMessageText: {
      color: '#ffffff',
    },
    adminMessageText: {
      color: isDarkMode ? '#f1f5f9' : '#0f172a',
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
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
      marginLeft: 4,
    },

    // Typing Indicator
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
      backgroundColor: '#64748b',
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

    // Input Area
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 30 : 16,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
    },
    inputWrapper: {
      flex: 1,
      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      marginRight: 10,
      maxHeight: 120,
    },
    textInput: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#0f172a',
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
  });
