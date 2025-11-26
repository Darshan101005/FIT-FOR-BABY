import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
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

interface UserPersonalInfo {
  // Basic Info (Non-editable - set by admin)
  name: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  profileImage: string | null;
  
  // IDs (Non-editable)
  odisId: string;
  userId: string; // Format: C_001_M or C_001_F
  
  // Editable fields
  email: string;
  phone: string;
  address: string;
  
  // Partner details (Non-editable)
  partner: {
    name: string;
    gender: 'male' | 'female';
    odisId: string;
    userId: string;
    email: string;
    phone: string;
  };
}

// Mock data - In production this would come from Firebase/Context
const mockUserData: UserPersonalInfo = {
  name: 'John Doe',
  gender: 'male',
  dateOfBirth: '1990-05-15',
  profileImage: null,
  odisId: 'C_001',
  userId: 'C_001_M',
  email: 'john.doe@example.com',
  phone: '+91 98765 43210',
  address: '123, Anna Nagar East, Chennai - 600102, Tamil Nadu',
  partner: {
    name: 'Sarah Doe',
    gender: 'female',
    odisId: 'C_001',
    userId: 'C_001_F',
    email: 'sarah.doe@example.com',
    phone: '+91 98765 43211',
  },
};

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [profileImage, setProfileImage] = useState<string | null>(mockUserData.profileImage);
  
  // Editable fields state with individual editing
  const [editingField, setEditingField] = useState<'email' | 'phone' | 'address' | null>(null);
  const [email, setEmail] = useState(mockUserData.email);
  const [phone, setPhone] = useState(mockUserData.phone);
  const [address, setAddress] = useState(mockUserData.address);
  
  // Temp values while editing
  const [tempEmail, setTempEmail] = useState(mockUserData.email);
  const [tempPhone, setTempPhone] = useState(mockUserData.phone);
  const [tempAddress, setTempAddress] = useState(mockUserData.address);

  const showToast = (message: string, type: 'error' | 'success' | 'info') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const handleStartEdit = (field: 'email' | 'phone' | 'address') => {
    setEditingField(field);
    if (field === 'email') setTempEmail(email);
    if (field === 'phone') setTempPhone(phone);
    if (field === 'address') setTempAddress(address);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempEmail(email);
    setTempPhone(phone);
    setTempAddress(address);
  };

  const handleSaveField = (field: 'email' | 'phone' | 'address') => {
    // Validation
    if (field === 'email' && !tempEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (field === 'phone' && tempPhone.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }
    if (field === 'address' && tempAddress.trim().length < 10) {
      showToast('Please enter a complete address', 'error');
      return;
    }
    
    // Save the value
    if (field === 'email') setEmail(tempEmail);
    if (field === 'phone') setPhone(tempPhone);
    if (field === 'address') setAddress(tempAddress);
    
    setEditingField(null);
    showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`, 'success');
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Permission to access gallery is required', 'error');
      return;
    }
    
    // Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      showToast('Profile photo updated', 'success');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getGenderIcon = (gender: 'male' | 'female') => {
    return gender === 'male' ? 'male' : 'female';
  };

  const getGenderColor = (gender: 'male' | 'female') => {
    return gender === 'male' ? '#3b82f6' : '#ec4899';
  };

  const renderHeader = () => (
    <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* User Avatar & Basic Info */}
      <View style={styles.profileSummary}>
        <TouchableOpacity 
          style={styles.avatarLargeContainer}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {profileImage ? (
            <View style={styles.avatarLarge}>
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            </View>
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>
                {mockUserData.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>{mockUserData.name}</Text>
        <View style={styles.userIdBadge}>
          <MaterialCommunityIcons name="identifier" size={16} color="#fff" />
          <Text style={styles.userIdText}>User ID: {mockUserData.userId}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderInfoField = (
    label: string,
    value: string,
    icon: string,
    iconColor: string,
  ) => (
    <View style={[styles.infoField, { backgroundColor: colors.cardBackground }]}>
      <View style={[styles.fieldIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );

  const renderEditableField = (
    fieldKey: 'email' | 'phone' | 'address',
    label: string,
    value: string,
    tempValue: string,
    setTempValue: (text: string) => void,
    icon: string,
    iconColor: string,
    multiline: boolean = false,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default'
  ) => {
    const isCurrentlyEditing = editingField === fieldKey;
    
    return (
      <View style={[styles.editableFieldContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.editableFieldTop}>
          <View style={[styles.fieldIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            {isCurrentlyEditing ? (
              <TextInput
                style={[
                  styles.fieldInput, 
                  { 
                    color: colors.text, 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.primary,
                  },
                  multiline && styles.fieldInputMultiline,
                ]}
                value={tempValue}
                onChangeText={setTempValue}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                keyboardType={keyboardType}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
            )}
          </View>
          {!isCurrentlyEditing && (
            <TouchableOpacity 
              style={[styles.editFieldButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => handleStartEdit(fieldKey)}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        {isCurrentlyEditing && (
          <View style={styles.editFieldActions}>
            <TouchableOpacity 
              style={[styles.editFieldCancelBtn, { borderColor: colors.border }]}
              onPress={handleCancelEdit}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={[styles.editFieldCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editFieldSaveBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleSaveField(fieldKey)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.editFieldSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (
    title: string, 
    icon: string, 
    iconColor: string,
    children: React.ReactNode
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground }]}>
        {children}
      </View>
    </View>
  );

  const renderPartnerCard = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: '#ef444415' }]}>
          <Ionicons name="heart" size={18} color="#ef4444" />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Partner Details</Text>
      </View>
      <View style={[styles.partnerCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.partnerHeader}>
          <View style={[styles.partnerAvatar, { backgroundColor: getGenderColor(mockUserData.partner.gender) + '20' }]}>
            <Text style={[styles.partnerAvatarText, { color: getGenderColor(mockUserData.partner.gender) }]}>
              {mockUserData.partner.name.split(' ').map(n => n[0]).join('')}
            </Text>
            <View style={[styles.partnerGenderBadge, { backgroundColor: getGenderColor(mockUserData.partner.gender) }]}>
              <Ionicons name={getGenderIcon(mockUserData.partner.gender)} size={12} color="#fff" />
            </View>
          </View>
          <View style={styles.partnerInfo}>
            <Text style={[styles.partnerName, { color: colors.text }]}>{mockUserData.partner.name}</Text>
            <Text style={[styles.partnerId, { color: colors.textSecondary }]}>
              User ID: {mockUserData.partner.userId}
            </Text>
          </View>
        </View>
        
        <View style={[styles.partnerDivider, { backgroundColor: colors.border }]} />
        
        <View style={styles.partnerDetails}>
          <View style={styles.partnerDetailItem}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.partnerDetailText, { color: colors.textSecondary }]}>
              {mockUserData.partner.email}
            </Text>
          </View>
          <View style={styles.partnerDetailItem}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.partnerDetailText, { color: colors.textSecondary }]}>
              {mockUserData.partner.phone}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast Notification */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : 
            toast.type === 'success' ? styles.toastSuccess : styles.toastInfo,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>
              {toast.type === 'error' ? '✗' : toast.type === 'success' ? '✓' : 'ℹ'}
            </Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          <View style={[styles.content, isMobile && styles.contentMobile]}>
            {/* User Identification */}
            {renderSection('Identification', 'id-card', colors.primary, (
              <>
                <View style={styles.idRow}>
                  <View style={styles.idItemFull}>
                    <Text style={[styles.idLabel, { color: colors.textSecondary }]}>User ID</Text>
                    <View style={[styles.idValueContainer, { backgroundColor: colors.inputBackground }]}>
                      <MaterialCommunityIcons name="identifier" size={18} color={colors.primary} />
                      <Text style={[styles.idValue, { color: colors.text }]}>{mockUserData.userId}</Text>
                    </View>
                  </View>
                </View>
              </>
            ))}

            {/* Basic Information (Non-editable) */}
            {renderSection('Basic Information', 'person', '#8b5cf6', (
              <>
                {renderInfoField('Full Name', mockUserData.name, 'person-outline', '#8b5cf6')}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderInfoField(
                  'Gender', 
                  mockUserData.gender === 'male' ? 'Male' : 'Female', 
                  getGenderIcon(mockUserData.gender), 
                  getGenderColor(mockUserData.gender)
                )}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderInfoField('Date of Birth', formatDate(mockUserData.dateOfBirth), 'calendar-outline', '#f59e0b')}
              </>
            ))}

            {/* Contact Information (Editable) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#22c55e15' }]}>
                  <Ionicons name="call" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
              </View>
              <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground }]}>
                {renderEditableField(
                  'email',
                  'Email Address', 
                  email,
                  tempEmail,
                  setTempEmail,
                  'mail-outline', 
                  '#3b82f6',
                  false,
                  'email-address'
                )}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderEditableField(
                  'phone',
                  'Phone Number', 
                  phone,
                  tempPhone,
                  setTempPhone,
                  'call-outline', 
                  '#22c55e',
                  false,
                  'phone-pad'
                )}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderEditableField(
                  'address',
                  'Address', 
                  address,
                  tempAddress,
                  setTempAddress,
                  'location-outline', 
                  '#f59e0b',
                  true
                )}
              </View>
            </View>

            {/* Partner Details */}
            {renderPartnerCard()}

            {/* Info Note */}
            <View style={[styles.infoNote, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
                Name, Gender, Date of Birth, and IDs are managed by your study administrator. 
                Contact support if you need to update these details.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: isWeb ? 320 : undefined,
    borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastInfo: { borderLeftColor: '#3b82f6' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: isWeb ? 40 : 100,
  },
  header: {
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSummary: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 28,
  },
  avatarLargeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarTextLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#006dab',
  },
  genderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  userIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  userIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    marginTop: -16,
  },
  contentMobile: {
    padding: 16,
  },
  editActions: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  editActionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  editActionsText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  editActionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  idRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  idItem: {
    flex: 1,
  },
  idItemFull: {
    flex: 1,
  },
  idLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  idValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  idValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '600',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldDivider: {
    height: 1,
    marginLeft: 70,
  },
  editableFieldContainer: {
    padding: 16,
  },
  editableFieldTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editFieldButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  editFieldActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingLeft: 54,
  },
  editFieldCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  editFieldCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editFieldSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editFieldSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  editableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
    gap: 4,
  },
  editableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editableIndicator: {
    marginLeft: 8,
    opacity: 0.5,
  },
  partnerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  partnerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  partnerGenderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  partnerId: {
    fontSize: 13,
    fontWeight: '500',
  },
  partnerDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  partnerDetails: {
    padding: 16,
    gap: 12,
  },
  partnerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerDetailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
