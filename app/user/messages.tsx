import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
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
import BottomNavBar from '@/components/navigation/BottomNavBar';

const isWeb = Platform.OS === 'web';

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

const mockThreads: ChatThread[] = [
  {
    id: '1',
    title: 'Support Team',
    lastMessage: 'Your query has been resolved. Let us know if you need anything else!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unread: 2,
    avatar: '👨‍💻',
    type: 'support',
  },
  {
    id: '2',
    title: 'Dr. Priya Sharma',
    lastMessage: 'Remember to log your meals daily for better tracking.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unread: 0,
    avatar: '👩‍⚕️',
    type: 'counsellor',
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Hello! Welcome to Fit for Baby support. How can we help you today?',
    sender: 'support',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '2',
    text: 'Hi, I have a question about the couple walking feature. How do I sync with my partner?',
    sender: 'user',
    timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
    status: 'read',
  },
  {
    id: '3',
    text: 'Great question! To sync with your partner:\n\n1. Go to Profile → Partner Settings\n2. Tap "Connect Partner"\n3. Share the generated code with your partner\n4. They enter the code on their device\n\nOnce connected, your walks will be synced automatically! 🚶‍♂️🚶‍♀️',
    sender: 'support',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: '4',
    text: 'Thank you! That worked perfectly. One more thing - can we set walking goals together?',
    sender: 'user',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: 'read',
  },
  {
    id: '5',
    text: 'Absolutely! After syncing, you can:\n\n• Set shared daily step goals\n• Create couple walking challenges\n• View combined progress\n• Celebrate milestones together\n\nWould you like me to guide you through setting up your first couple goal?',
    sender: 'support',
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
  },
  {
    id: '6',
    text: 'Yes please! 🙏',
    sender: 'user',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'read',
  },
  {
    id: '7',
    text: 'Your query has been resolved. Let us know if you need anything else!',
    sender: 'support',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

const quickReplies = [
  'Thank you!',
  'I need more help',
  'Connect to counsellor',
  'Report an issue',
];

export default function MessagesScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const scrollViewRef = useRef<ScrollView>(null);

  const [view, setView] = useState<'threads' | 'chat' | 'faq'>('threads');
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

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

  const handleQuickReply = (reply: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: reply,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate support response
    setTimeout(() => {
      setIsTyping(false);
      const supportResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thank you for your message! Our team will review and respond shortly.",
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
              <Text style={styles.avatarEmoji}>{selectedThread?.avatar}</Text>
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
        <TouchableOpacity style={styles.newChatButton}>
          <Ionicons name="create-outline" size={24} color="#006dab" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderThreadsList = () => (
    <View style={styles.content}>
      {/* FAQ Section */}
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

      {/* Conversations */}
      <Text style={styles.sectionTitle}>Conversations</Text>
      
      {mockThreads.map((thread) => (
        <TouchableOpacity
          key={thread.id}
          style={styles.threadCard}
          onPress={() => handleSelectThread(thread)}
          activeOpacity={0.85}
        >
          <View style={styles.threadAvatar}>
            <Text style={styles.avatarEmoji}>{thread.avatar}</Text>
            {thread.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{thread.unread}</Text>
              </View>
            )}
          </View>
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={styles.threadTitle}>{thread.title}</Text>
              <Text style={styles.threadTime}>{formatTime(thread.timestamp)}</Text>
            </View>
            <Text 
              style={[
                styles.threadPreview,
                thread.unread > 0 && styles.threadPreviewUnread,
              ]}
              numberOfLines={2}
            >
              {thread.lastMessage}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Support Options */}
      <Text style={styles.sectionTitle}>Get Help</Text>
      
      <View style={styles.helpOptions}>
        <TouchableOpacity style={styles.helpOption} onPress={handleCallSupport}>
          <View style={[styles.helpIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="call" size={24} color="#22c55e" />
          </View>
          <Text style={styles.helpLabel}>Call Support</Text>
          <Text style={styles.helpDetail}>9884671395</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.helpOption} onPress={handleEmailSupport}>
          <View style={[styles.helpIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="mail" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.helpLabel}>Email Us</Text>
          <Text style={styles.helpDetail}>e0323040@sriher.edu.in</Text>
        </TouchableOpacity>
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

      {/* Quick Replies */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickRepliesContainer}
        contentContainerStyle={styles.quickRepliesContent}
      >
        {quickReplies.map((reply) => (
          <TouchableOpacity
            key={reply}
            style={styles.quickReply}
            onPress={() => handleQuickReply(reply)}
          >
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
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
    <View style={styles.container}>
      {renderHeader()}
      
      {view === 'threads' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderThreadsList()}
        </ScrollView>
      )}
      
      {view === 'faq' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: isWeb ? 40 : 100,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: isWeb ? 20 : 30,
  },
  faqSection: { marginBottom: 24 },
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
  quickRepliesContainer: {
    maxHeight: 50,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  quickRepliesContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickReply: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
});
