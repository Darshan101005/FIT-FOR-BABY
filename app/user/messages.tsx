import BottomNavBar from '@/components/navigation/BottomNavBar';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useTheme } from '@/context/ThemeContext';
import { broadcastService, chatService } from '@/services/firestore.service';
import { Broadcast, Chat } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';
const BROADCASTS_READ_KEY = 'broadcasts_last_read_timestamp';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'system';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  attachments?: { type: string; name: string }[];
}

interface ChatThread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  avatar: string;
  type: 'support' | 'counsellor' | 'system';
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const mockFAQs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I sync with my partner?',
    answer: 'Go to Profile → Partner Settings → Tap "Connect Partner" → Share the generated code with your partner. They enter the code on their device to connect.',
  },
  {
    id: '2',
    question: 'How do I log my daily food intake?',
    answer: 'Go to the Home screen and tap "Log Food". You can search for foods, scan barcodes, or add custom meals. All entries are saved to your daily log.',
  },
  {
    id: '3',
    question: 'How do I set weight goals?',
    answer: 'Navigate to Profile → Goals → Weight Goal. Enter your target weight and timeline. The app will calculate a safe and healthy plan for you.',
  },
  {
    id: '4',
    question: 'How do I book an appointment with a counsellor?',
    answer: 'Go to Appointments from the home screen, select an available slot, choose your preferred counsellor, and confirm your booking.',
  },
  {
    id: '5',
    question: 'How do I track my walking progress?',
    answer: 'Your steps are automatically tracked if you allow health permissions. View your progress in the Progress section on the home screen.',
  },
  {
    id: '6',
    question: 'Can I export my health data?',
    answer: 'Yes! Go to Profile → Settings → Export Data. You can download your data as a PDF or share it directly with your healthcare provider.',
  },
];

// Initial welcome message when user starts a new chat
const getWelcomeMessage = (): Message => ({
  id: '1',
  text: 'Hello! Welcome to Fit for Baby support. How can we help you today?',
  sender: 'support',
  timestamp: new Date(),
});

export default function MessagesScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  const [view, setView] = useState<'threads' | 'chat' | 'faq'>('threads');
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(true);
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState(0);
  
  // Chat state for nursing department
  const [nursingChat, setNursingChat] = useState<Chat | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  // Subscribe to nursing chat for unread count
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const loadChatData = async () => {
      try {
        const storedCoupleId = await AsyncStorage.getItem('coupleId');
        const storedGender = await AsyncStorage.getItem('userGender');
        
        if (storedCoupleId && storedGender) {
          const odAaByuserId = `${storedCoupleId}_${storedGender === 'male' ? 'M' : 'F'}`;
          
          // Subscribe to chat updates for real-time unread count
          unsubscribe = chatService.subscribe(odAaByuserId, (chat) => {
            setNursingChat(chat);
            setChatUnreadCount(chat?.unreadByUser || 0);
            setIsLoadingChat(false);
          });
        } else {
          setIsLoadingChat(false);
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
        setIsLoadingChat(false);
      }
    };

    loadChatData();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Total unread = broadcasts + chat messages
  const totalUnreadCount = unreadBroadcastCount + chatUnreadCount;

  // Fetch broadcasts and check which are unread (filter out reminders - only show broadcasts)
  useEffect(() => {
    const fetchBroadcasts = async () => {
      setIsLoadingBroadcasts(true);
      try {
        const activeBroadcasts = await broadcastService.getActive();
        // Filter to only show broadcasts (not reminders) in Announcements section
        // Reminders are shown on the home page bell icon instead
        const broadcastsOnly = activeBroadcasts.filter(b => b.type !== 'reminder');
        setBroadcasts(broadcastsOnly);

        // Check last read timestamp to determine unread count
        const lastReadStr = await AsyncStorage.getItem(BROADCASTS_READ_KEY);
        const lastReadTime = lastReadStr ? parseInt(lastReadStr) : 0;
        
        // Count broadcasts created after last read time
        const unreadCount = broadcastsOnly.filter(b => {
          const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt as any);
          return createdAt.getTime() > lastReadTime;
        }).length;
        
        setUnreadBroadcastCount(unreadCount);
      } catch (error) {
        console.error('Error fetching broadcasts:', error);
      } finally {
        setIsLoadingBroadcasts(false);
      }
    };

    fetchBroadcasts();
  }, []);

  // Mark broadcasts as read when user views the announcements section
  const markBroadcastsAsRead = async () => {
    if (unreadBroadcastCount > 0) {
      await AsyncStorage.setItem(BROADCASTS_READ_KEY, Date.now().toString());
      setUnreadBroadcastCount(0);
    }
  };

  // Mark as read when scrolling to broadcasts section (on mount after loading)
  useEffect(() => {
    if (!isLoadingBroadcasts && broadcasts.length > 0 && view === 'threads') {
      // Slight delay to ensure user has seen the content
      const timer = setTimeout(() => {
        markBroadcastsAsRead();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingBroadcasts, broadcasts.length, view]);

  const handleCallSupport = () => {
    Linking.openURL('tel:9884671395');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:e0323040@sriher.edu.in');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatBroadcastTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor(diff / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatChatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleSelectThread = (thread: ChatThread) => {
    setSelectedThread(thread);
    setView('chat');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages([...messages, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate support response
    setTimeout(() => {
      setIsTyping(false);
      const supportResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thank you for your message! Our team will review and respond shortly. In the meantime, feel free to explore our FAQ section for quick answers.",
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, supportResponse]);
    }, 2000);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => (view === 'chat' || view === 'faq') ? setView('threads') : router.back()} 
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        {view === 'threads' ? (
          <>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>Chat with support & counsellors</Text>
          </>
        ) : view === 'faq' ? (
          <>
            <Text style={styles.headerTitle}>FAQ</Text>
            <Text style={styles.headerSubtitle}>Frequently Asked Questions</Text>
          </>
        ) : (
          <>
            <View style={styles.chatHeaderInfo}>
              {selectedThread?.type === 'counsellor' ? (
                <Image 
                  source={require('../../assets/images/nurse.png')} 
                  style={styles.headerNurseImage}
                  contentFit="cover"
                />
              ) : selectedThread?.type === 'support' ? (
                <Image 
                  source={require('../../assets/images/customer-service.png')} 
                  style={styles.headerNurseImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarEmoji}>{selectedThread?.avatar}</Text>
              )}
              <View>
                <Text style={styles.headerTitle}>{selectedThread?.title}</Text>
                <Text style={styles.onlineStatus}>
                  {isTyping ? 'Typing...' : 'Usually replies within 1 hour'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
      {view === 'threads' && (
        <TouchableOpacity 
          style={styles.chatBotButton}
          onPress={() => router.push('/user/chat')}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderThreadsList = () => (
    <View style={styles.content}>
      {/* Contact Support - Request Callback */}
      <TouchableOpacity 
        style={styles.contactSupportCard}
        onPress={() => router.push('/user/contact-support')}
        activeOpacity={0.85}
      >
        <View style={styles.contactSupportContent}>
          <View style={styles.contactSupportIconWrap}>
            <Image 
              source={require('../../assets/images/customer-service.png')} 
              style={styles.supporterImage}
            />
          </View>
          <View style={styles.contactSupportText}>
            <Text style={styles.contactSupportTitle}>Contact Support</Text>
            <Text style={styles.contactSupportSubtitle}>Request a call or video meeting</Text>
          </View>
          <View style={styles.contactSupportArrow}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Conversations */}
      <Text style={styles.sectionTitle}>Conversations</Text>
      
      {/* Nursing Department Chat - only show if there are messages */}
      {isLoadingChat ? (
        <View style={styles.threadCard}>
          <SkeletonLoader width={50} height={50} style={{ borderRadius: 25 }} />
          <View style={styles.threadContent}>
            <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={14} />
          </View>
        </View>
      ) : nursingChat?.lastMessage && nursingChat.lastMessage.trim() !== '' ? (
        <TouchableOpacity
          style={styles.threadCard}
          onPress={() => router.push('/user/chat')}
          activeOpacity={0.85}
        >
          <View style={styles.threadAvatar}>
            <Image 
              source={require('../../assets/images/nurse.png')} 
              style={styles.nurseAvatarImage}
              contentFit="cover"
            />
            {chatUnreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{chatUnreadCount > 9 ? '9+' : chatUnreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={styles.threadTitle}>Chat with Nursing Department</Text>
              <Text style={styles.threadTime}>
                {nursingChat?.lastMessageAt ? formatChatTime(nursingChat.lastMessageAt) : ''}
              </Text>
            </View>
            <Text 
              style={[
                styles.threadPreview,
                chatUnreadCount > 0 && styles.threadPreviewUnread,
              ]}
              numberOfLines={1}
            >
              {nursingChat?.lastMessage}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        /* No active conversations - show a prompt to start one */
        <TouchableOpacity
          style={styles.startChatCard}
          onPress={() => router.push('/user/chat')}
          activeOpacity={0.85}
        >
          <View style={styles.startChatIcon}>
            <Ionicons name="chatbubbles-outline" size={28} color="#006dab" />
          </View>
          <View style={styles.startChatContent}>
            <Text style={styles.startChatTitle}>Start a Conversation</Text>
            <Text style={styles.startChatSubtitle}>Chat with our nursing team for support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {/* Broadcasts / Announcements Section */}
      <View style={styles.broadcastsSection}>
        <View style={styles.broadcastsHeader}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          {unreadBroadcastCount > 0 && (
            <View style={styles.broadcastBadge}>
              <Text style={styles.broadcastBadgeText}>{unreadBroadcastCount}</Text>
            </View>
          )}
        </View>
        
        {isLoadingBroadcasts ? (
          <View style={styles.broadcastLoadingContainer}>
            <SkeletonLoader width="100%" height={80} style={{ marginBottom: 12, borderRadius: 14 }} />
            <SkeletonLoader width="100%" height={80} style={{ borderRadius: 14 }} />
          </View>
        ) : broadcasts.length === 0 ? (
          <View style={styles.noBroadcastsCard}>
            <Ionicons name="notifications-off-outline" size={32} color="#94a3b8" />
            <Text style={styles.noBroadcastsText}>No announcements yet</Text>
            <Text style={styles.noBroadcastsSubtext}>Important updates will appear here</Text>
          </View>
        ) : (
          broadcasts.map((broadcast) => (
            <View key={broadcast.id} style={styles.broadcastCard}>
              <View style={styles.broadcastIconContainer}>
                <LinearGradient 
                  colors={
                    broadcast.priority === 'urgent' ? ['#ef4444', '#dc2626'] :
                    broadcast.priority === 'important' ? ['#f59e0b', '#d97706'] :
                    ['#006dab', '#005a8f']
                  } 
                  style={styles.broadcastIcon}
                >
                  <Ionicons 
                    name={
                      broadcast.priority === 'urgent' ? 'warning' :
                      broadcast.priority === 'important' ? 'alert-circle' :
                      'megaphone'
                    } 
                    size={18} 
                    color="#fff" 
                  />
                </LinearGradient>
              </View>
              <View style={styles.broadcastContent}>
                <View style={styles.broadcastHeader}>
                  <Text style={styles.broadcastTitle}>{broadcast.title}</Text>
                  <Text style={styles.broadcastTime}>{formatBroadcastTime(broadcast.sentAt || broadcast.createdAt)}</Text>
                </View>
                <Text style={styles.broadcastMessage} numberOfLines={3}>
                  {broadcast.message}
                </Text>
                {broadcast.priority && broadcast.priority !== 'normal' && (
                  <View style={[
                    styles.priorityTag,
                    broadcast.priority === 'urgent' && styles.priorityUrgent,
                    broadcast.priority === 'important' && styles.priorityImportant,
                  ]}>
                    <Text style={[
                      styles.priorityTagText,
                      broadcast.priority === 'urgent' && styles.priorityUrgentText,
                      broadcast.priority === 'important' && styles.priorityImportantText,
                    ]}>
                      {broadcast.priority === 'urgent' ? 'Urgent' : 'Important'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Technical Support Options */}
      <Text style={styles.sectionTitle}>Technical Support</Text>
      
      <View style={styles.helpOptions}>
        <TouchableOpacity style={styles.helpOption} onPress={handleCallSupport}>
          <View style={[styles.helpIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="call" size={24} color="#22c55e" />
          </View>
          <Text style={styles.helpLabel}>CONTACT US</Text>
          <Text style={styles.helpDetail}>9884671395</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.helpOption} onPress={handleEmailSupport}>
          <View style={[styles.helpIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="mail" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.helpLabel}>EMAIL US</Text>
          <Text style={styles.helpDetail}>e0323040@sriher.edu.in</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Section - At Bottom */}
      <View style={styles.faqSection}>
        <LinearGradient colors={['#006dab', '#005a8f']} style={styles.faqCard}>
          <View style={styles.faqContent}>
            <MaterialCommunityIcons name="frequently-asked-questions" size={32} color="#fff" />
            <View style={styles.faqText}>
              <Text style={styles.faqTitle}>Have a question?</Text>
              <Text style={styles.faqSubtitle}>Check our FAQ for quick answers</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.faqButton} onPress={() => setView('faq')}>
            <Text style={styles.faqButtonText}>View FAQ</Text>
            <Ionicons name="arrow-forward" size={16} color="#006dab" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );

  const renderFAQ = () => (
    <View style={styles.content}>
      <Text style={styles.faqPageTitle}>Frequently Asked Questions</Text>
      <Text style={styles.faqPageSubtitle}>Tap on a question to see the answer</Text>
      
      {mockFAQs.map((faq) => (
        <TouchableOpacity
          key={faq.id}
          style={styles.faqItem}
          onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
          activeOpacity={0.8}
        >
          <View style={styles.faqQuestion}>
            <Text style={styles.faqQuestionText}>{faq.question}</Text>
            <Ionicons 
              name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#64748b" 
            />
          </View>
          {expandedFAQ === faq.id && (
            <View style={styles.faqAnswer}>
              <Text style={styles.faqAnswerText}>{faq.answer}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <View style={styles.faqFooter}>
        <Text style={styles.faqFooterText}>Still have questions?</Text>
        <TouchableOpacity 
          style={styles.faqContactButton}
          onPress={() => setView('threads')}
        >
          <Text style={styles.faqContactButtonText}>Chat with Support</Text>
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChat = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Date divider */}
        <View style={styles.dateDivider}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>Today</Text>
          <View style={styles.dateLine} />
        </View>

        {messages.map((message) => {
          const isUser = message.sender === 'user';
          
          return (
            <View 
              key={message.id} 
              style={[
                styles.messageRow,
                isUser && styles.messageRowUser,
              ]}
            >
              {!isUser && (
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarEmoji}>👨‍💻</Text>
                </View>
              )}
              <View 
                style={[
                  styles.messageBubble,
                  isUser ? styles.messageBubbleUser : styles.messageBubbleSupport,
                ]}
              >
                <Text 
                  style={[
                    styles.messageText,
                    isUser && styles.messageTextUser,
                  ]}
                >
                  {message.text}
                </Text>
                <View style={styles.messageFooter}>
                  <Text 
                    style={[
                      styles.messageTime,
                      isUser && styles.messageTimeUser,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                  {isUser && message.status && (
                    <Ionicons 
                      name={message.status === 'read' ? 'checkmark-done' : 'checkmark'} 
                      size={14} 
                      color={message.status === 'read' ? '#22c55e' : 'rgba(255,255,255,0.6)'} 
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {isTyping && (
          <View style={styles.messageRow}>
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarEmoji}>👨‍💻</Text>
            </View>
            <View style={[styles.messageBubble, styles.messageBubbleSupport, styles.typingBubble]}>
              <View style={styles.typingIndicator}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="attach" size={24} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <LinearGradient
            colors={newMessage.trim() ? ['#006dab', '#005a8f'] : ['#e2e8f0', '#e2e8f0']}
            style={styles.sendButtonGradient}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? '#fff' : '#94a3b8'} 
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      {view === 'threads' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
          nestedScrollEnabled={true}
        >
          {renderThreadsList()}
        </ScrollView>
      )}
      
      {view === 'faq' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
          nestedScrollEnabled={true}
        >
          {renderFAQ()}
        </ScrollView>
      )}
      
      {view === 'chat' && renderChat()}
      
      {/* Bottom Navigation - hide in chat view on mobile for more space */}
      {view !== 'chat' && <BottomNavBar />}
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
    backgroundColor: '#ffffff',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarEmoji: { fontSize: 28 },
  onlineStatus: { fontSize: 12, color: '#22c55e', marginTop: 2 },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBotButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#006dab',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: isWeb ? 60 : 150,
    minHeight: '100%',
  },
  content: {
    padding: isWeb ? 40 : 16,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: isWeb ? 40 : 60,
  },
  faqSection: { marginTop: 24, marginBottom: 24 },
  faqCard: {
    borderRadius: 16,
    padding: 20,
  },
  faqContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  faqText: { flex: 1 },
  faqTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  faqSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  faqButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 8,
  },
  faqButtonText: { fontSize: 14, fontWeight: '700', color: '#006dab' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  threadAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  nurseAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 14,
  },
  headerNurseImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  threadContent: { flex: 1 },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  threadTime: { fontSize: 12, color: '#94a3b8' },
  threadPreview: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  threadPreviewUnread: { color: '#0f172a', fontWeight: '500' },
  helpOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  helpOption: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  helpLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  helpDetail: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  // FAQ Page Styles
  faqPageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  faqPageSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: { fontSize: 15, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 12 },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  faqAnswerText: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  faqFooter: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 20,
  },
  faqFooterText: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  faqContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006dab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  faqContactButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dateText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarEmoji: { fontSize: 18 },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
  },
  messageBubbleSupport: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageBubbleUser: {
    backgroundColor: '#006dab',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
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
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'web' ? 12 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
    minHeight: 60,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    maxHeight: 100,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#0f172a',
    maxHeight: 80,
    outlineStyle: 'none' as any,
    borderWidth: 0,
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Contact Support Card styles
  contactSupportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactSupportContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactSupportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  supporterImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  contactSupportText: {
    flex: 1,
  },
  contactSupportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  contactSupportSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  contactSupportArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Start Chat Card (when no conversations)
  startChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed' as const,
  },
  startChatIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  startChatContent: {
    flex: 1,
  },
  startChatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  startChatSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  
  // Broadcasts Section
  broadcastsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  broadcastsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  broadcastsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  broadcastBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  broadcastBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  broadcastLoadingContainer: {
    marginTop: 8,
  },
  noBroadcastsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  noBroadcastsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  noBroadcastsSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  broadcastCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  broadcastIconContainer: {
    marginRight: 12,
  },
  broadcastIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastContent: {
    flex: 1,
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  broadcastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  broadcastTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  broadcastMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  priorityTag: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  priorityUrgent: {
    backgroundColor: '#fef2f2',
  },
  priorityImportant: {
    backgroundColor: '#fef3c7',
  },
  priorityTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase' as const,
  },
  priorityUrgentText: {
    color: '#ef4444',
  },
  priorityImportantText: {
    color: '#d97706',
  },
});
