import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  useWindowDimensions, 
  ActivityIndicator, 
  Modal,
  Alert
} from 'react-native';
import emailjs from '@emailjs/browser';

const isWeb = Platform.OS === 'web';

export default function ContactUsScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  // Form State
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState(''); // Added back
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ⚠️ REPLACE 'YOUR_TEMPLATE_ID' WITH THE REAL ID FROM EMAILJS WEBSITE
  const SERVICE_ID = 'service_qzgw5w4';
  const TEMPLATE_ID = 'template_x3kxoil'; 
  const PUBLIC_KEY = 'eXjCZPU319Tm0pMH9';

  const handleSubmit = async () => {
    // 1. Validation
    if (!name || !userEmail || !message) {
      Alert.alert('Missing Information', 'Please enter Name, Email, and Message.');
      return;
    }

    // 2. Start Loading
    setIsLoading(true);

    const templateParams = {
      from_name: name,
      from_email: userEmail, // Sending the user's email
      subject: subject || 'No Subject',
      message: message,
      to_email: 'fitforbaby.sriher@gmail.com',
    };

    try {
      // 3. Send Email
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      
      // 4. Success - Show Modal
      setShowSuccessModal(true);
      
      // Clear form
      setName('');
      setUserEmail('');
      setSubject('');
      setMessage('');
      
    } catch (error) {
      // 5. Error Handling
      console.error("EmailJS Error:", error);
      Alert.alert(
        'Submission Failed', 
        'Could not send message. Please check your internet connection or EmailJS configuration.'
      );
    } finally {
      // 6. STOP SPINNING
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.contentSection, isMobile && styles.contentSectionMobile]}>
          <View style={[styles.formContainer, isMobile && styles.formContainerMobile]}>
            <Text style={styles.formTitle}>Send us a message</Text>
            
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email Input (Added Back) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="What's this about?"
                placeholderTextColor="#94a3b8"
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your message here..."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Send Message</Text>
                  <Ionicons name="send" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Fit for Baby. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#006dab" />
            </View>
            <Text style={styles.modalTitle}>Message Sent!</Text>
            <Text style={styles.modalText}>
              Your message has been sent successfully. We will contact you at {userEmail} shortly.
            </Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isWeb ? 60 : 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
    textAlignVertical: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  contentSectionMobile: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  formContainerMobile: {
    padding: 20,
    maxWidth: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006dab',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#1e293b',
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#006dab',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});