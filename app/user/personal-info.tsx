import BottomNavBar from '@/components/navigation/BottomNavBar';
import { PersonalInfoSkeleton } from '@/components/ui/SkeletonLoader';
import { useTheme } from '@/context/ThemeContext';
import { coupleService } from '@/services/firestore.service';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
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
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

// Indian States list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Address structure
interface Address {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface UserPersonalInfo {
  name: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  profilePhoto: string | null;
  userId: string;
  coupleId: string;
  email: string;
  phone: string;
  address: Address;
  partner: {
    name: string;
    gender: 'male' | 'female';
    userId: string;
    email: string;
    phone: string;
  };
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User data
  const [userData, setUserData] = useState<UserPersonalInfo>({
    name: '',
    gender: 'male',
    dateOfBirth: '',
    profilePhoto: null,
    userId: '',
    coupleId: '',
    email: '',
    phone: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    partner: {
      name: '',
      gender: 'female',
      userId: '',
      email: '',
      phone: '',
    },
  });
  
  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);
  
  // Date picker state
  const [showDobPicker, setShowDobPicker] = useState(false);
  
  // State picker modal
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  
  // Fetch user data
  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const coupleId = await AsyncStorage.getItem('coupleId');
          const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
          
          if (coupleId && userGender) {
            const couple = await coupleService.get(coupleId);
            if (couple) {
              const user = couple[userGender];
              const partner = couple[userGender === 'male' ? 'female' : 'male'];
              
              setUserData({
                name: user.name || '',
                gender: userGender,
                dateOfBirth: user.dateOfBirth || '',
                profilePhoto: user.profilePhoto || null,
                userId: user.id || '',
                coupleId: coupleId,
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || {
                  addressLine1: '',
                  addressLine2: '',
                  city: '',
                  state: '',
                  pincode: '',
                  country: 'India',
                },
                partner: {
                  name: partner.name || '',
                  gender: userGender === 'male' ? 'female' : 'male',
                  userId: partner.id || '',
                  email: partner.email || '',
                  phone: partner.phone || '',
                },
              });
              setProfilePhoto(user.profilePhoto || null);
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          showToast('Failed to load profile data', 'error');
        } finally {
          setLoading(false);
        }
      };
      
      loadUserData();
    }, [])
  );

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

  const handleStartEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue(null);
  };

  const handleSaveField = async (field: string) => {
    try {
      const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
      
      // Validation
      if (field === 'email' && tempValue && !tempValue.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      if (field === 'phone' && tempValue && tempValue.replace(/\D/g, '').length < 10) {
        showToast('Please enter a valid phone number', 'error');
        return;
      }
      if (field === 'pincode' && tempValue && !/^\d{6}$/.test(tempValue)) {
        showToast('Pincode must be 6 digits', 'error');
        return;
      }
      if (field === 'addressLine1' && (!tempValue || !tempValue.trim())) {
        showToast('Address Line 1 is required', 'error');
        return;
      }
      
      // Build update object
      let updateData: any = {};
      
      if (field === 'email' || field === 'phone' || field === 'dateOfBirth') {
        updateData[`${userGender}.${field}`] = tempValue;
        setUserData(prev => ({ ...prev, [field]: tempValue }));
      } else if (['addressLine1', 'addressLine2', 'city', 'state', 'pincode'].includes(field)) {
        // Address field
        const newAddress = { ...userData.address, [field]: tempValue };
        updateData[`${userGender}.address`] = newAddress;
        setUserData(prev => ({ ...prev, address: newAddress }));
      }
      
      // Save to Firestore
      await coupleService.updateUserField(userData.coupleId, userGender, updateData);
      
      setEditingField(null);
      setTempValue(null);
      showToast(`Updated successfully`, 'success');
    } catch (error: any) {
      console.error('Save error:', error);
      showToast(error.message || 'Failed to save', 'error');
    }
  };

  // DOB picker handler
  const handleDobChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowDobPicker(false);
      return;
    }
    
    if (selectedDate) {
      try {
        const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
        const dateString = selectedDate.toISOString().split('T')[0];
        
        await coupleService.updateUserField(userData.coupleId, userGender, {
          [`${userGender}.dateOfBirth`]: dateString,
        });
        
        setUserData(prev => ({ ...prev, dateOfBirth: dateString }));
        setShowDobPicker(false);
        showToast('Date of birth updated', 'success');
      } catch (error) {
        console.error('Save DOB error:', error);
        showToast('Failed to update date of birth', 'error');
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Permission to access gallery is required', 'error');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
      showToast('Profile photo updated', 'success');
      // TODO: Upload to Firebase Storage and save URL
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
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

  const getInitials = () => {
    if (!userData.name) return 'U';
    const parts = userData.name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase()
      : userData.name[0].toUpperCase();
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
      
      <View style={styles.profileSummary}>
        <TouchableOpacity 
          style={styles.avatarLargeContainer}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {profilePhoto ? (
            <View style={styles.avatarLarge}>
              <Image 
                source={{ uri: `${profilePhoto}?t=${Date.now()}` }} 
                style={styles.avatarImage}
                cachePolicy="none"
              />
            </View>
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>{getInitials()}</Text>
            </View>
          )}
          <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>{userData.name || 'User'}</Text>
        <View style={styles.userIdBadge}>
          <MaterialCommunityIcons name="identifier" size={16} color="#fff" />
          <Text style={styles.userIdText}>User ID: {userData.userId}</Text>
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
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value || 'Not set'}</Text>
      </View>
    </View>
  );

  const renderEditableField = (
    fieldKey: string,
    label: string,
    value: string,
    icon: string,
    iconColor: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default',
    placeholder: string = ''
  ) => {
    const isEditing = editingField === fieldKey;
    
    return (
      <View style={[styles.editableFieldContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.editableFieldTop}>
          <View style={[styles.fieldIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.fieldInput, 
                  { 
                    color: colors.text, 
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.primary,
                  },
                ]}
                value={tempValue || ''}
                onChangeText={setTempValue}
                keyboardType={keyboardType}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{value || 'Not set'}</Text>
            )}
          </View>
          {!isEditing && (
            <TouchableOpacity 
              style={[styles.editFieldButton, { backgroundColor: colors.inputBackground }]}
              onPress={() => handleStartEdit(fieldKey, value)}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing && (
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

  // State Picker Modal
  const renderStatePicker = () => {
    const filteredStates = INDIAN_STATES.filter(state => 
      state.toLowerCase().includes(stateSearchQuery.toLowerCase())
    );
    
    return (
      <Modal
        visible={showStatePicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowStatePicker(false);
          setStateSearchQuery('');
        }}
      >
        <View style={styles.statePickerOverlay}>
          <View style={[styles.statePickerContent, { backgroundColor: colors.cardBackground }]}>
            {/* Header */}
            <View style={[styles.statePickerHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.statePickerHeaderLeft}>
                <Ionicons name="map-outline" size={22} color={colors.primary} />
                <Text style={[styles.statePickerTitle, { color: colors.text }]}>Select State</Text>
              </View>
              <TouchableOpacity 
                style={[styles.statePickerCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => {
                  setShowStatePicker(false);
                  setStateSearchQuery('');
                }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Search Bar */}
            <View style={[styles.stateSearchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.stateSearchInput, { color: colors.text }]}
                placeholder="Search state..."
                placeholderTextColor={colors.textMuted}
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                autoCorrect={false}
              />
              {stateSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStateSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Results Count */}
            <View style={styles.stateResultsCount}>
              <Text style={[styles.stateResultsText, { color: colors.textSecondary }]}>
                {filteredStates.length} {filteredStates.length === 1 ? 'state' : 'states'} found
              </Text>
            </View>
            
            {/* State List */}
            <ScrollView 
              style={styles.stateList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredStates.length === 0 ? (
                <View style={styles.stateEmptyContainer}>
                  <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.stateEmptyText, { color: colors.textMuted }]}>
                    No states found
                  </Text>
                </View>
              ) : (
                filteredStates.map((state, index) => {
                  const isSelected = userData.address.state === state;
                  return (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateItem,
                        { backgroundColor: isSelected ? colors.primary + '12' : 'transparent' },
                        isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                        index === filteredStates.length - 1 && { marginBottom: 16 },
                      ]}
                      onPress={async () => {
                        const newAddress = { ...userData.address, state };
                        setUserData(prev => ({ ...prev, address: newAddress }));
                        setShowStatePicker(false);
                        setStateSearchQuery('');
                        
                        try {
                          const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
                          await coupleService.updateUserField(userData.coupleId, userGender, {
                            [`${userGender}.address`]: newAddress,
                          });
                          showToast('State updated', 'success');
                        } catch (error) {
                          showToast('Failed to save', 'error');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stateItemLeft}>
                        <View style={[
                          styles.stateRadio, 
                          { borderColor: isSelected ? colors.primary : colors.border },
                          isSelected && { backgroundColor: colors.primary }
                        ]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={[
                          styles.stateItemText, 
                          { color: isSelected ? colors.primary : colors.text },
                          isSelected && { fontWeight: '700' },
                        ]}>
                          {state}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.stateSelectedBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.stateSelectedBadgeText}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Address Section
  const renderAddressSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b15' }]}> 
          <Ionicons name="location-outline" size={18} color="#f59e0b" />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Address</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground, padding: 20 }]}> 
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Country</Text>
  <View style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }]}> 
          <Ionicons name="flag-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.text, fontSize: 16 }}>🇮🇳 India</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Address Line 1</Text>
        <TextInput
          style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
          placeholder="House/Flat No, Building Name"
          placeholderTextColor={colors.textMuted}
          value={userData.address.addressLine1}
          onChangeText={text => setUserData(prev => ({ ...prev, address: { ...prev.address, addressLine1: text } }))}
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Address Line 2</Text>
        <TextInput
          style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
          placeholder="Street, Area, Landmark"
          placeholderTextColor={colors.textMuted}
          value={userData.address.addressLine2}
          onChangeText={text => setUserData(prev => ({ ...prev, address: { ...prev.address, addressLine2: text } }))}
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>City</Text>
        <TextInput
          style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
          placeholder="Enter city name"
          placeholderTextColor={colors.textMuted}
          value={userData.address.city}
          onChangeText={text => setUserData(prev => ({ ...prev, address: { ...prev.address, city: text } }))}
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>State</Text>
        <TouchableOpacity
          style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }]}
          onPress={() => setShowStatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="map-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: userData.address.state ? colors.text : colors.textMuted, fontSize: 16 }}>
            {userData.address.state || 'Select state'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Pincode</Text>
        <TextInput
          style={[styles.dobTextInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginBottom: 24 }]}
          placeholder="6-digit pincode"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={6}
          value={userData.address.pincode}
          onChangeText={text => setUserData(prev => ({ ...prev, address: { ...prev.address, pincode: text.replace(/[^0-9]/g, '') } }))}
        />
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
          onPress={async () => {
            try {
              const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
              await coupleService.updateUserField(userData.coupleId, userGender, {
                [`${userGender}.address`]: userData.address,
              });
              showToast('Address updated', 'success');
            } catch (error) {
              showToast('Failed to save', 'error');
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

  const renderPartnerCard = () => {
    const partnerInitials = userData.partner.name 
      ? userData.partner.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'P';
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#ef444415' }]}>
            <Ionicons name="people-outline" size={18} color="#ef4444" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Partner Details</Text>
        </View>
        <View style={[styles.partnerCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.partnerHeader}>
            <View style={[styles.partnerAvatar, { backgroundColor: getGenderColor(userData.partner.gender) + '20' }]}>
              <Text style={[styles.partnerAvatarText, { color: getGenderColor(userData.partner.gender) }]}>
                {partnerInitials}
              </Text>
              <View style={[styles.partnerGenderBadge, { backgroundColor: getGenderColor(userData.partner.gender) }]}>
                <Ionicons name={getGenderIcon(userData.partner.gender)} size={12} color="#fff" />
              </View>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={[styles.partnerName, { color: colors.text }]}>{userData.partner.name || 'Partner'}</Text>
              <Text style={[styles.partnerId, { color: colors.textSecondary }]}>
                User ID: {userData.partner.userId || 'Not set'}
              </Text>
            </View>
          </View>
          
          <View style={[styles.partnerDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.partnerDetails}>
            {userData.partner.email ? (
              <View style={styles.partnerDetailItem}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.partnerDetailText, { color: colors.textSecondary }]}>
                  {userData.partner.email}
                </Text>
              </View>
            ) : null}
            {userData.partner.phone ? (
              <View style={styles.partnerDetailItem}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.partnerDetailText, { color: colors.textSecondary }]}>
                  {userData.partner.phone}
                </Text>
              </View>
            ) : null}
            {!userData.partner.email && !userData.partner.phone && (
              <Text style={[styles.partnerDetailText, { color: colors.textMuted }]}>
                No contact information available
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PersonalInfoSkeleton isMobile={isMobile} />
        <BottomNavBar />
      </View>
    );
  }

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
            {renderSection('Identification', 'card-outline', colors.primary, (
              <>
                <View style={styles.idRow}>
                  <View style={styles.idItemFull}>
                    <Text style={[styles.idLabel, { color: colors.textSecondary }]}>Couple ID</Text>
                    <View style={[styles.idValueContainer, { backgroundColor: colors.inputBackground }]}>
                      <MaterialCommunityIcons name="identifier" size={18} color={colors.primary} />
                      <Text style={[styles.idValue, { color: colors.text }]}>{userData.coupleId}</Text>
                    </View>
                  </View>
                </View>
              </>
            ))}

            {/* Basic Information (Non-editable) */}
            {renderSection('Basic Information', 'person-outline', '#8b5cf6', (
              <>
                {renderInfoField('Full Name', userData.name, 'person-circle-outline', '#8b5cf6')}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderInfoField(
                  'Gender', 
                  userData.gender === 'male' ? 'Male' : 'Female', 
                  getGenderIcon(userData.gender), 
                  getGenderColor(userData.gender)
                )}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                
                {/* Date of Birth with Picker */}
                <TouchableOpacity
                  style={[styles.editableFieldContainer, { backgroundColor: colors.cardBackground }]}
                  onPress={() => setShowDobPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.editableFieldTop}>
                    <View style={[styles.fieldIcon, { backgroundColor: '#f59e0b15' }]}>
                      <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
                      <Text style={[styles.fieldValue, { color: colors.text }]}>
                        {userData.dateOfBirth 
                          ? new Date(userData.dateOfBirth).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Select date of birth'
                        }
                      </Text>
                    </View>
                    <View style={[styles.editFieldButton, { backgroundColor: colors.inputBackground }]}>
                      <Ionicons name="calendar" size={16} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
                
                {showDobPicker && (
                  Platform.OS === 'web' ? (
                    <Modal
                      visible={showDobPicker}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowDobPicker(false)}
                    >
                      <View style={styles.dobModalOverlay}>
                        <View style={[styles.dobModalContent, { backgroundColor: colors.cardBackground }]}>
                          <Text style={[styles.dobModalTitle, { color: colors.text }]}>Select Date of Birth</Text>
                          
                          {/* Single Input - Type or Pick Calendar */}
                          <Text style={[styles.dobInputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                            Select a date of birth
                          </Text>
                          <input
                            type="date"
                            defaultValue={userData.dateOfBirth || ''}
                            max={new Date().toISOString().split('T')[0]}
                            min="1950-01-01"
                            onChange={(e) => setTempValue(e.target.value)}
                            style={{
                              width: '100%',
                              padding: 14,
                              fontSize: 16,
                              borderRadius: 10,
                              border: '2px solid #006dab',
                              backgroundColor: '#eaf6fb',
                              color: '#006dab',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              outline: 'none',
                              accentColor: '#98be4e',
                            }}
                          />
                          
                          <View style={styles.dobModalButtons}>
                            <TouchableOpacity
                              style={[styles.dobModalCancelBtn, { borderColor: colors.border }]}
                              onPress={() => {
                                setShowDobPicker(false);
                                setTempValue(null);
                              }}
                            >
                              <Text style={[styles.dobModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.dobModalSaveBtn, { backgroundColor: colors.primary }]}
                              onPress={async () => {
                                if (tempValue && /^\d{4}-\d{2}-\d{2}$/.test(tempValue)) {
                                  const parsedDate = new Date(tempValue);
                                  
                                  if (isNaN(parsedDate.getTime())) {
                                    showToast('Please select a valid date', 'error');
                                    return;
                                  }
                                  
                                  try {
                                    const userGender = await AsyncStorage.getItem('userGender') as 'male' | 'female';
                                    await coupleService.updateUserField(userData.coupleId, userGender, {
                                      [`${userGender}.dateOfBirth`]: tempValue,
                                    });
                                    setUserData(prev => ({ ...prev, dateOfBirth: tempValue }));
                                    setShowDobPicker(false);
                                    setTempValue(null);
                                    showToast('Date of birth updated', 'success');
                                  } catch (error) {
                                    showToast('Failed to save', 'error');
                                  }
                                } else {
                                  showToast('Please select or enter a valid date', 'error');
                                }
                              }}
                            >
                              <Text style={styles.dobModalSaveText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={userData.dateOfBirth ? new Date(userData.dateOfBirth) : new Date(1990, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      minimumDate={new Date(1950, 0, 1)}
                      onChange={handleDobChange}
                    />
                  )
                )}
              </>
            ))}

            {/* Contact Information (Editable) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#22c55e15' }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
              </View>
              <View style={[styles.sectionContent, { backgroundColor: colors.cardBackground }]}>
                {renderEditableField(
                  'email',
                  'Email Address', 
                  userData.email,
                  'mail-outline', 
                  '#3b82f6',
                  'email-address',
                  'Enter email address'
                )}
                <View style={[styles.fieldDivider, { backgroundColor: colors.borderLight }]} />
                {renderEditableField(
                  'phone',
                  'Phone Number', 
                  userData.phone,
                  'call-outline', 
                  '#22c55e',
                  'phone-pad',
                  'Enter phone number'
                )}
              </View>
            </View>

            {/* Address Section */}
            {renderAddressSection()}

            {/* State Picker Modal */}
            {renderStatePicker()}

            {/* Partner Details */}
            {renderPartnerCard()}

            {/* Info Note */}
            <View style={[styles.infoNote, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
                Name, Gender, and IDs are managed by your study administrator. 
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
  // State Picker Modal Styles
  statePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isWeb ? 20 : 16,
  },
  statePickerContent: {
    width: '100%',
    maxWidth: isWeb ? 420 : '100%',
    maxHeight: isWeb ? '80%' : '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  statePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  statePickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statePickerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44, // Touch-friendly
    minHeight: 44,
  },
  stateSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    minHeight: 48,
  },
  stateSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  stateResultsCount: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  stateResultsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stateList: {
    paddingHorizontal: 12,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isWeb ? 14 : 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    minHeight: 48, // Touch-friendly minimum height
  },
  stateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stateRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  stateSelectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  stateEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  stateEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // DOB Web Modal Styles
  dobModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dobModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  dobModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  dobInputContainer: {
    marginBottom: 8,
  },
  dobInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  dobTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  dobDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dobDividerLine: {
    flex: 1,
    height: 1,
  },
  dobDividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dobInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
  },
  dobHelperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  dobModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  dobModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dobModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dobModalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dobModalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
