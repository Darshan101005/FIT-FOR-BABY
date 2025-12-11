import BottomNavBar from '@/components/navigation/BottomNavBar';
import { MobileProfileCardSkeleton, QuestionnaireCardSkeleton, WebProfileCardSkeleton } from '@/components/ui/SkeletonLoader';
import APP_VERSION from '@/constants/appVersion';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserData } from '@/context/UserDataContext';
import { cloudinaryService } from '@/services/cloudinary.service';
import { coupleExerciseService, coupleFoodLogService, coupleService, coupleStepsService, coupleWeightLogService, formatDateString, questionnaireService } from '@/services/firestore.service';
import { QuestionnaireProgress } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

// User profile data interface
interface ProfileData {
  name: string;
  email: string;
  coupleId: string;
  userId: string;
  partnerName: string;
  partnerUserId: string;
  initials: string;
  userGender: 'male' | 'female';
  partnerGender: 'male' | 'female';
  profilePhoto?: string; // Cloudinary URL
}

// Custom Toggle Component for consistent styling across platforms
const CustomToggle = ({ 
  value, 
  onValueChange, 
  activeColor = '#98be4e' 
}: { 
  value: boolean; 
  onValueChange: () => void; 
  activeColor?: string;
}) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        toggleStyles.customToggle,
        { backgroundColor: value ? activeColor : colors.border },
      ]}
      onPress={onValueChange}
      activeOpacity={0.8}
    >
      <View 
        style={[
          toggleStyles.customToggleThumb,
          { 
            backgroundColor: '#ffffff',
            transform: [{ translateX: value ? 18 : 0 }],
          },
        ]} 
      />
    </TouchableOpacity>
  );
};

// Toggle styles defined separately to avoid circular reference
const toggleStyles = StyleSheet.create({
  customToggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

interface SettingItem {
  id: string;
  icon: string;
  label: string;
  labelTamil?: string;
  type: 'toggle' | 'link' | 'select';
  value?: boolean | string;
  options?: string[];
  color?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const { logout: authLogout } = useAuth();
  const { language: appLanguage, setLanguage: setAppLanguage, t } = useLanguage();

  // Get cached data from context
  const { 
    userInfo, 
    questionnaire: cachedQuestionnaire, 
    streak: cachedStreak,
    isInitialized,
    refreshUserInfo,
    globalSettings
  } = useUserData();

  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [notifications, setNotifications] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [stepTracking, setStepTracking] = useState(true);
  const [partnerSync, setPartnerSync] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Always start with loading
  
  // Export data states
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Profile photo states
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Profile data from Firestore
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Questionnaire progress from Firestore
  const [questionnaireProgress, setQuestionnaireProgress] = useState<QuestionnaireProgress | null>(null);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(true); // Always start with loading
  
  // Profile stats
  const [profileStats, setProfileStats] = useState({
    daysActive: 0,
    weeklyGoalsAchieved: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  // Sync with context data
  useEffect(() => {
    if (userInfo) {
      const nameParts = (userInfo.name || 'User').split(' ');
      const initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length-1][0]}`.toUpperCase()
        : (userInfo.name || 'U')[0].toUpperCase();
      
      setProfileData({
        name: userInfo.name || 'User',
        email: userInfo.email || '',
        coupleId: userInfo.coupleId || '',
        userId: userInfo.id || '',
        partnerName: userInfo.partnerName || '',
        partnerUserId: userInfo.partnerId || '',
        initials,
        userGender: userInfo.gender || 'male',
        partnerGender: userInfo.gender === 'male' ? 'female' : 'male',
        profilePhoto: userInfo.profilePhoto || undefined,
      });
      
      setNotifications(userInfo.pushNotificationsEnabled !== false);
      setIsLoading(false);
    }
  }, [userInfo]);

  useEffect(() => {
    if (cachedQuestionnaire) {
      setQuestionnaireProgress(cachedQuestionnaire);
      setQuestionnaireLoading(false);
    }
  }, [cachedQuestionnaire]);

  useEffect(() => {
    if (cachedStreak !== undefined) {
      setProfileStats(prev => ({
        ...prev,
        currentStreak: cachedStreak,
      }));
    }
  }, [cachedStreak]);

  // Fetch profile data when screen loads (for data not in context)
  useFocusEffect(
    useCallback(() => {
      const loadProfileData = async () => {
        // Always show loading state until data is fetched
        setIsLoading(true);
        setQuestionnaireLoading(true);
        
        try {
          const coupleId = await AsyncStorage.getItem('coupleId');
          const userGender = await AsyncStorage.getItem('userGender');
          
          if (coupleId && userGender) {
            const couple = await coupleService.get(coupleId);
            if (couple) {
              const user = couple[userGender as 'male' | 'female'];
              const partner = couple[userGender === 'male' ? 'female' : 'male'];
              
              // Get initials from name
              const nameParts = (user.name || 'User').split(' ');
              const initials = nameParts.length > 1 
                ? `${nameParts[0][0]}${nameParts[nameParts.length-1][0]}`.toUpperCase()
                : (user.name || 'U')[0].toUpperCase();
              
              setProfileData({
                name: user.name || 'User',
                email: user.email || '',
                coupleId: coupleId,
                userId: user.id || '',
                partnerName: partner.name || '',
                partnerUserId: partner.id || '',
                initials,
                userGender: userGender as 'male' | 'female',
                partnerGender: userGender === 'male' ? 'female' : 'male',
                profilePhoto: user.profilePhoto,
              });
              
              // Load push notification setting (default to true)
              setNotifications(user.pushNotificationsEnabled !== false);
              
              // Check and update streak (reset if missed a day)
              const currentStreak = await coupleService.checkAndUpdateStreak(coupleId, userGender as 'male' | 'female');
              
              // Calculate days active (from enrollment date)
              let daysActive = 0;
              if (couple.enrollmentDate) {
                const enrollDate = new Date(couple.enrollmentDate);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - enrollDate.getTime());
                daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              
              // Set all stats
              setProfileStats({
                daysActive,
                weeklyGoalsAchieved: user.weeklyGoalsAchieved || 0,
                currentStreak: currentStreak,
                longestStreak: user.longestStreak || 0,
              });
              
              // Fetch questionnaire progress if not in context
              if (!cachedQuestionnaire) {
                try {
                  const qProgress = await questionnaireService.getProgress(coupleId, userGender as 'male' | 'female');
                  setQuestionnaireProgress(qProgress);
                } catch (qError) {
                  console.error('Error fetching questionnaire progress:', qError);
                } finally {
                  setQuestionnaireLoading(false);
                }
              } else {
                // Use cached data and stop loading
                setQuestionnaireProgress(cachedQuestionnaire);
                setQuestionnaireLoading(false);
              }
            } else {
              // Fallback if no couple data
              setProfileData({
                name: 'User',
                email: '',
                coupleId: coupleId || '',
                userId: '',
                partnerName: '',
                partnerUserId: '',
                initials: 'U',
                userGender: (userGender as 'male' | 'female') || 'male',
                partnerGender: userGender === 'male' ? 'female' : 'male',
              });
            }
          } else {
            // Fallback if no storage data
            setProfileData({
              name: 'User',
              email: '',
              coupleId: '',
              userId: '',
              partnerName: '',
              partnerUserId: '',
              initials: 'U',
              userGender: 'male',
              partnerGender: 'female',
            });
          }
        } catch (error) {
          console.error('Error loading profile data:', error);
          // Set fallback on error
          setProfileData({
            name: 'User',
            email: '',
            coupleId: '',
            userId: '',
            partnerName: '',
            partnerUserId: '',
            initials: 'U',
            userGender: 'male',
            partnerGender: 'female',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProfileData();
    }, [])
  );

  const showToast = (message: string, type: 'error' | 'success') => {
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

  // ============================================
  // PROFILE PHOTO FUNCTIONS
  // ============================================
  
  const handlePhotoPress = () => {
    setIsPhotoModalVisible(true);
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('profile.permissionRequired'), t('profile.galleryPermissionMsg'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsPhotoModalVisible(false);
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to pick image', 'error');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('profile.permissionRequired'), t('profile.cameraPermissionMsg'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsPhotoModalVisible(false);
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    }
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    if (!profileData) return;
    
    setIsUploadingPhoto(true);
    try {
      const userId = `${profileData.coupleId}_${profileData.userGender === 'male' ? 'M' : 'F'}`;
      const photoUrl = await cloudinaryService.uploadProfilePicture(userId, imageUri);
      
      // Update Firestore
      await coupleService.updateUserField(
        profileData.coupleId,
        profileData.userGender,
        { [`${profileData.userGender}.profilePhoto`]: photoUrl }
      );
      
      // Update local state immediately
      setProfileData(prev => prev ? { ...prev, profilePhoto: photoUrl } : null);
      
      // Refresh global context so home page gets updated
      await refreshUserInfo();
      
      showToast('Profile photo updated', 'success');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const deleteProfilePhoto = async () => {
    if (!profileData) return;
    
    setIsPhotoModalVisible(false);
    setIsUploadingPhoto(true);
    
    try {
      // Update Firestore to remove photo URL (deleteField will be used)
      await coupleService.updateUserField(
        profileData.coupleId,
        profileData.userGender,
        { [`${profileData.userGender}.profilePhoto`]: null }
      );
      
      // Update local state - set to null/undefined to show initials
      setProfileData(prev => prev ? { ...prev, profilePhoto: undefined } : null);
      
      // Refresh global context so home page gets updated
      await refreshUserInfo();
      
      showToast('Profile photo removed', 'success');
    } catch (error) {
      console.error('Error removing profile photo:', error);
      showToast('Failed to remove photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ============================================
  // END PROFILE PHOTO FUNCTIONS
  // ============================================

  // ============================================
  // EXPORT DATA FUNCTION
  // ============================================
  const handleExportData = async () => {
    if (!profileData || !userInfo) {
      showToast('User data not available', 'error');
      return;
    }

    setIsExporting(true);
    setShowExportModal(false);

    try {
      // Fetch all user data
      const coupleId = profileData.coupleId;
      const userGender = profileData.userGender;
      
      // Get couple data
      const coupleData = await coupleService.get(coupleId);
      
      // Get steps data (last 30 days) - using same method as admin
      const endDate = formatDateString(new Date());
      const startDate = formatDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      const stepsData = await coupleStepsService.getByDateRange(coupleId, userGender, startDate, endDate);
      
      // Debug: Log the fetched steps data
      console.log('📊 Fetched Steps Data (Raw):', {
        count: stepsData?.length || 0,
        dateRange: `${startDate} to ${endDate}`,
        sample: stepsData?.slice(0, 5).map((s: any) => ({
          date: s.date,
          stepCount: s.stepCount,
          goal: s.goal
        })),
        today: endDate
      });
      
      // Aggregate steps by date (sum all stepCount entries for each date)
      const aggregatedSteps = stepsData.reduce((acc: any, entry: any) => {
        const dateKey = entry.date;
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: entry.date,
            steps: 0,
            goal: globalSettings?.dailySteps || entry.goal || 3000, // Use admin goal if available, else entry or default
          };
        }
        acc[dateKey].steps += entry.stepCount || 0;
        return acc;
      }, {});
      
      // Convert to array and sort by date descending
      const sortedStepsData = Object.values(aggregatedSteps)
        .sort((a: any, b: any) => {
          return b.date.localeCompare(a.date);
        });
      
      console.log('📊 Aggregated Steps Data:', {
        count: sortedStepsData.length,
        sample: sortedStepsData.slice(0, 5)
      });
      
      // Get weight logs
      const weightData = await coupleWeightLogService.getAll(coupleId, userGender);
      
      // Get food logs (last 7 days)
      const foodEndDate = formatDateString(new Date());
      const foodStartDate = formatDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const foodData = await coupleFoodLogService.getByDateRange(coupleId, userGender, foodStartDate, foodEndDate);
      
      // Get exercise logs (last 30 days)
      const exerciseData = await coupleExerciseService.getByDateRange(coupleId, userGender, startDate, endDate);
      
      // Get questionnaire progress
      const questionnaireData = await questionnaireService.getProgress(coupleId, userGender);

      // Generate HTML report
      const htmlContent = generateExportHTML({
        userData: coupleData?.[userGender] || {},
        coupleData: {
          coupleId,
          coupleName: `${coupleData?.male?.name || 'N/A'} & ${coupleData?.female?.name || 'N/A'}`,
          enrollmentDate: coupleData?.enrollmentDate || 'N/A',
        },
        stepsData: sortedStepsData || [],
        weightData: weightData || [],
        foodData: foodData || [],
        exerciseData: exerciseData || [],
        questionnaireData,
        profileData,
      });

      if (isWeb) {
        // Open in new tab for printing/saving as PDF
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
        showToast('Report opened in new tab. Use Print → Save as PDF', 'success');
      } else {
        // Mobile - save HTML and share
        const fileName = `fit_for_baby_my_data_${new Date().toISOString().split('T')[0]}.html`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Export My Data' });
        showToast('Report ready to share!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate export HTML content
  const generateExportHTML = (data: {
    userData: any;
    coupleData: any;
    stepsData: any[];
    weightData: any[];
    foodData: any[];
    exerciseData: any[];
    questionnaireData: any;
    profileData: ProfileData;
  }) => {
    const { userData, coupleData, stepsData, weightData, foodData, exerciseData, questionnaireData, profileData } = data;
    
    const formatDate = (dateInput: any) => {
      if (!dateInput) return 'N/A';
      
      let date: Date;
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput.toDate) {
        // Firestore Timestamp
        date = dateInput.toDate();
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTimestamp = (timestamp: any) => {
      if (!timestamp) return 'N/A';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Calculate totals and averages
    const totalSteps = stepsData.reduce((sum: number, s: any) => sum + (s.steps || 0), 0);
    const avgSteps = stepsData.length > 0 ? Math.round(totalSteps / stepsData.length) : 0;
    const totalExerciseMinutes = exerciseData.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
    const latestWeight = weightData.length > 0 ? weightData[0]?.weight || 'N/A' : 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit for Baby - My Health Data</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 30px; 
      color: #1e293b;
      background: #fff;
      line-height: 1.6;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .header { 
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #006dab;
    }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #006dab 0%, #0088d4 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }
    .header-text h1 { font-size: 24px; font-weight: 700; color: #006dab; }
    .header-text p { font-size: 13px; color: #64748b; }
    .user-info-card {
      background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid #0ea5e9;
    }
    .user-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .info-item { margin-bottom: 12px; }
    .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 16px; font-weight: 600; color: #0f172a; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .summary-card.steps { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-color: #22c55e; }
    .summary-card.weight { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-color: #3b82f6; }
    .summary-card.exercise { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b; }
    .summary-card.food { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-color: #ec4899; }
    .summary-value { font-size: 28px; font-weight: 800; margin-bottom: 5px; }
    .summary-label { font-size: 12px; color: #64748b; font-weight: 500; }
    .section { margin-bottom: 30px; }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #006dab;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    .data-table { 
      width: 100%; 
      border-collapse: collapse;
      font-size: 13px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .data-table thead tr { background: linear-gradient(135deg, #006dab 0%, #0088d4 100%); }
    .data-table th { color: white; padding: 12px 10px; text-align: left; font-weight: 600; }
    .data-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .data-table tbody tr:nth-child(even) { background: #f8fafc; }
    .data-table tbody tr:hover { background: #f1f5f9; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    .print-btn {
      background: linear-gradient(135deg, #006dab 0%, #0088d4 100%);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    .print-btn:hover { opacity: 0.9; }
    @media print {
      .no-print { display: none; }
      body { padding: 20px; }
    }
    @media (max-width: 600px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      .user-info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-left">
        <div class="logo">FFB</div>
        <div class="header-text">
          <h1>My Health Data Report</h1>
          <p>Fit for Baby - Personal Health Tracking</p>
        </div>
      </div>
      <div style="text-align: right; font-size: 13px; color: #64748b;">
        <strong>Generated:</strong><br>
        ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div class="user-info-card">
      <h3 style="margin-bottom: 16px; color: #006dab;">👤 Personal Information</h3>
      <div class="user-info-grid">
        <div class="info-item">
          <div class="info-label">Name</div>
          <div class="info-value">${profileData.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${profileData.email}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Couple ID</div>
          <div class="info-value">${coupleData.coupleId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Partner</div>
          <div class="info-value">${profileData.partnerName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Enrollment Date</div>
          <div class="info-value">${formatDate(coupleData.enrollmentDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Phone</div>
          <div class="info-value">${userData.phone || t('profile.notProvided')}</div>
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card steps">
        <div class="summary-value" style="color: #16a34a;">${avgSteps.toLocaleString()}</div>
        <div class="summary-label">Avg Daily Steps</div>
      </div>
      <div class="summary-card weight">
        <div class="summary-value" style="color: #2563eb;">${latestWeight}${latestWeight !== 'N/A' ? ' kg' : ''}</div>
        <div class="summary-label">Current Weight</div>
      </div>
      <div class="summary-card exercise">
        <div class="summary-value" style="color: #d97706;">${totalExerciseMinutes}</div>
        <div class="summary-label">Exercise Minutes</div>
      </div>
      <div class="summary-card food">
        <div class="summary-value" style="color: #db2777;">${foodData.length}</div>
        <div class="summary-label">Food Logs (7 days)</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📊 Steps Log (Last 30 Days)</h2>
      ${stepsData.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Steps</th>
            <th>Goal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${stepsData.slice(0, 30).map((s: any) => {
            // Use goal from admin if sent, else use fixed minimum (3000)
            const goal = s.goal || 3000;
            const steps = s.steps || 0;
            
            // Determine if this is today's date - handle both string and Date objects
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            let dateStr = '';
            if (s.date) {
              if (typeof s.date === 'string') {
                dateStr = s.date;
              } else if (s.date.toDate) {
                // Firestore Timestamp
                const d = s.date.toDate();
                dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } else if (s.date.toISOString) {
                dateStr = s.date.toISOString().split('T')[0];
              }
            }
            
            // Status logic: Only today is 'In Progress', others are 'Completed' or 'Not Completed'
            let status = '';
            let statusColor = '';
            if (dateStr === todayStr) {
              status = '⏳ In Progress';
              statusColor = '#f59e0b';
            } else {
              if (steps >= goal) {
                status = '✅ Completed';
                statusColor = '#16a34a';
              } else {
                status = '❌ Not Completed';
                statusColor = '#ef4444';
              }
            }
            
            return `
          <tr>
            <td>${formatDate(s.date)}</td>
            <td><strong>${steps.toLocaleString()}</strong></td>
            <td>${goal.toLocaleString()}</td>
            <td style="color: ${statusColor};">
              ${status}
            </td>
          </tr>
          `;
          }).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; text-align: center; padding: 20px;">No steps data recorded yet.</p>'}
    </div>

    <div class="section">
      <h2 class="section-title">⚖️ Weight Log</h2>
      ${weightData.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Weight (kg)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${weightData.slice(0, 20).map(w => `
          <tr>
            <td>${formatDate(w.date)}</td>
            <td><strong>${w.weight} kg</strong></td>
            <td>${w.notes || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; text-align: center; padding: 20px;">No weight data recorded yet.</p>'}
    </div>

    <div class="section">
      <h2 class="section-title">🏃 Exercise Log</h2>
      ${exerciseData.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Exercise Type</th>
            <th>Duration</th>
            <th>Calories</th>
          </tr>
        </thead>
        <tbody>
          ${exerciseData.slice(0, 20).map(e => `
          <tr>
            <td>${formatDate(e.date)}</td>
            <td><strong>${e.exerciseType || e.type || 'Exercise'}</strong></td>
            <td>${e.duration || 0} min</td>
            <td>${e.caloriesBurned || e.calories || '-'} kcal</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; text-align: center; padding: 20px;">No exercise data recorded yet.</p>'}
    </div>

    <div class="section">
      <h2 class="section-title">🍽️ Food Log (Last 7 Days)</h2>
      ${foodData.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Meal</th>
            <th>Food Item</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            // Group food logs by date
            const grouped: { [date: string]: any[] } = {};
            foodData.slice(0, 30).forEach((f: any) => {
              const dateKey: string = f.date ? (typeof f.date === 'string' ? f.date : (f.date.toISOString ? f.date.toISOString().split('T')[0] : '')) : '';
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push(f);
            });
            
            // Render rows - show date only on first meal of each date
            const rows: string[] = [];
            Object.entries(grouped).forEach(([date, meals]) => {
              (meals as any[]).forEach((meal: any, idx: number) => {
                rows.push(`
          <tr>
            <td>${idx === 0 ? formatDate(meal.date) : ''}</td>
            <td>${meal.mealType || 'Meal'}</td>
            <td><strong>${meal.foodName || meal.name || 'Food'}</strong></td>
          </tr>
                `);
              });
            });
            return rows.join('');
          })()}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; text-align: center; padding: 20px;">No food data recorded yet.</p>'}
    </div>

    ${questionnaireData ? `
    <div class="section">
      <h2 class="section-title">📋 Questionnaire Progress</h2>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p><strong>Status:</strong> ${questionnaireData.status === 'completed' ? '✅ Completed' : questionnaireData.status === 'in-progress' ? '⏳ In Progress' : '📝 Not Started'}</p>
        <p><strong>Progress:</strong> ${questionnaireData.progress?.percentComplete || 0}%</p>
        <p><strong>Questions Answered:</strong> ${questionnaireData.progress?.answeredQuestions || 0} / ${questionnaireData.progress?.totalQuestions || 0}</p>
        ${questionnaireData.completedAt ? `<p><strong>Completed:</strong> ${formatTimestamp(questionnaireData.completedAt)}</p>` : ''}
        ${questionnaireData.lastUpdatedAt ? `<p><strong>Last Updated:</strong> ${formatTimestamp(questionnaireData.lastUpdatedAt)}</p>` : ''}
        ${questionnaireData.language ? `<p><strong>Language:</strong> ${questionnaireData.language === 'english' ? '🇬🇧 English' : '🇮🇳 தமிழ்'}</p>` : ''}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p style="font-weight: 600; color: #006dab; margin-bottom: 5px;">Fit for Baby - Health Monitoring System</p>
      <p>This report contains your personal health data from the Fit for Baby app.</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 30px;">
      <button onclick="window.print()" class="print-btn">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>
</body>
</html>`;
  };

  const handleLogout = async () => {
    try {
      showToast('Logging out...', 'success');
      // Use the AuthContext logout which clears all storage and redirects
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback - clear storage manually and redirect
      await AsyncStorage.multiRemove([
        'userRole', 'coupleId', 'userGender', 'userId', 'userName',
        'quickAccessMode', 'pendingProfileSelection',
        'isSuperAdmin', 'adminUid', 'adminEmail', 'adminName'
      ]);
      router.replace('/login');
    }
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    showToast(isDarkMode ? 'Light mode enabled' : 'Dark mode enabled', 'success');
  };

  // Handle push notifications toggle
  const handleNotificationsToggle = async () => {
    if (!profileData) return;
    
    const newValue = !notifications;
    setNotifications(newValue);
    
    try {
      // Save to Firestore using updateUserField
      await coupleService.updateUserField(
        profileData.coupleId, 
        profileData.userGender, 
        { [`${profileData.userGender}.pushNotificationsEnabled`]: newValue }
      );
      showToast(
        newValue ? 'Push notifications enabled' : 'Push notifications disabled', 
        'success'
      );
    } catch (error) {
      console.error('Error updating notification setting:', error);
      // Revert on error
      setNotifications(!newValue);
      showToast('Failed to update setting', 'error');
    }
  };

  // Mobile Header with gradient
  const renderMobileHeader = () => (
    <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !profileData ? (
        <MobileProfileCardSkeleton />
      ) : (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {isUploadingPhoto ? (
                <View style={[styles.avatar, { backgroundColor: colors.cardBackground }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : profileData.profilePhoto ? (
                <Image
                  source={{ uri: `${profileData.profilePhoto}?t=${Date.now()}` }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  {...(!isWeb && { cachePolicy: "none" })}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{profileData.initials}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.cameraButton, { backgroundColor: colors.cardBackground }]}
                onPress={handlePhotoPress}
                disabled={isUploadingPhoto}
              >
                <Ionicons name="camera" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileData.name}</Text>
              <Text style={styles.profileEmail}>{profileData.email || profileData.userId}</Text>
              {profileData.partnerName && (
                <View style={styles.partnerBadge}>
                  <Ionicons name="heart" size={14} color="#ef4444" />
                  <Text style={styles.partnerText}>{t('profile.connectedWith')} {profileData.partnerName}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.daysActive}</Text>
              <Text style={styles.statLabel}>{t('profile.daysActive')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.weeklyGoalsAchieved}</Text>
              <Text style={styles.statLabel}>{t('profile.weeklyGoals')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileStats.currentStreak}🔥</Text>
              <Text style={styles.statLabel}>{t('profile.logStreak')}</Text>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );

  // Web/Laptop Header - simple header with profile card as settings item
  const renderWebHeader = () => (
    <>
      <View style={[styles.webHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.webBackButton, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.webHeaderTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
    </>
  );

  // Profile card for web view (inline with settings)
  const renderWebProfileCard = () => {
    if (isLoading || !profileData) {
      return <WebProfileCardSkeleton />;
    }
    
    return (
      <View style={[styles.webProfileCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.webProfileRow}>
          <View style={styles.avatarContainer}>
            {isUploadingPhoto ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : profileData.profilePhoto ? (
              <Image
                source={{ uri: `${profileData.profilePhoto}?t=${Date.now()}` }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{profileData.initials}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }]}
              onPress={handlePhotoPress}
              disabled={isUploadingPhoto}
            >
              <Ionicons name="camera" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.webProfileInfo}>
            <Text style={[styles.webProfileName, { color: colors.text }]}>{profileData.name}</Text>
            <Text style={[styles.webProfileEmail, { color: colors.textSecondary }]}>{profileData.email || profileData.userId}</Text>
            {profileData.partnerName && (
              <View style={[styles.webPartnerBadge, { backgroundColor: '#ef444415' }]}>
                <Ionicons name="heart" size={12} color="#ef4444" />
                <Text style={styles.webPartnerText}>{t('profile.connectedWith')} {profileData.partnerName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.webStatsRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.daysActive}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>{t('profile.daysActive')}</Text>
          </View>
          <View style={[styles.webStatDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.weeklyGoalsAchieved}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>{t('profile.weeklyGoals')}</Text>
          </View>
          <View style={[styles.webStatDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.webStatItem}>
            <Text style={[styles.webStatValue, { color: colors.primary }]}>{profileStats.currentStreak}🔥</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>{t('profile.logStreak')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuestionnaireStatus = () => {
    // Show skeleton while loading questionnaire data
    if (questionnaireLoading) {
      return (
        <View style={isMobile ? { marginTop: 16 } : undefined}>
          <QuestionnaireCardSkeleton />
        </View>
      );
    }

    // Helper function to format date
    const formatDate = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    // Determine status and display info
    const isCompleted = questionnaireProgress?.status === 'completed';
    const isInProgress = questionnaireProgress?.status === 'in-progress';
    const notStarted = !questionnaireProgress || questionnaireProgress.status === 'not-started';
    
    const progressPercent = questionnaireProgress?.progress?.percentComplete || 0;
    const completedDate = questionnaireProgress?.completedAt ? formatDate(questionnaireProgress.completedAt) : '';
    const lastUpdatedDate = questionnaireProgress?.lastUpdatedAt ? formatDate(questionnaireProgress.lastUpdatedAt) : '';

    // Determine icon, color, and status text
    let statusIcon = 'clipboard-outline';
    let statusColor = colors.textMuted;
    let statusText = t('profile.notStarted');
    let actionButtonText = t('profile.start');
    
    if (isCompleted) {
      statusIcon = 'clipboard-check';
      statusColor = colors.success;
      statusText = `${t('profile.completed')} ${completedDate}`;
      actionButtonText = t('profile.view');
    } else if (isInProgress) {
      statusIcon = 'clipboard-edit-outline';
      statusColor = colors.warning;
      statusText = `${Math.round(progressPercent)}% ${t('profile.percentComplete')} • ${t('profile.lastUpdated')} ${lastUpdatedDate}`;
      actionButtonText = t('profile.continue');
    }

    const handlePress = () => {
      if (notStarted || isInProgress) {
        // Navigate to questionnaire
        router.push('/questionnaire' as any);
      } else if (isCompleted) {
        // View completed questionnaire (read-only mode)
        router.push({
          pathname: '/questionnaire',
          params: { viewOnly: 'true' }
        } as any);
      }
    };

    return (
      <View style={[styles.questionnaireCard, { backgroundColor: colors.cardBackground }, isMobile && { marginTop: 16 }]}>
        <View style={styles.questionnaireHeader}>
          <MaterialCommunityIcons 
            name={statusIcon as any} 
            size={24} 
            color={statusColor} 
          />
          <View style={styles.questionnaireInfo}>
            <Text style={[styles.questionnaireTitle, { color: colors.text }]}>{t('profile.healthQuestionnaire')}</Text>
            <Text style={[styles.questionnaireStatus, { color: statusColor }]}>{statusText}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.viewButton, { backgroundColor: colors.inputBackground }]}
            onPress={handlePress}
          >
            <Text style={[styles.viewButtonText, { color: isCompleted ? colors.textSecondary : colors.primary }]}>
              {actionButtonText}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.questionnaireProgress, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressBarFull, 
              { 
                backgroundColor: statusColor,
                width: `${progressPercent}%` 
              }
            ]} 
          />
        </View>
        {isInProgress && questionnaireProgress?.progress && (
          <View style={styles.questionnaireDetails}>
            <Text style={[styles.questionnaireDetailText, { color: colors.textSecondary }]}>
              {questionnaireProgress.progress.answeredQuestions} / {questionnaireProgress.progress.totalQuestions} {t('profile.questionsAnswered')}
            </Text>
            <Text style={[styles.questionnaireLanguageTag, { backgroundColor: colors.inputBackground, color: colors.textSecondary }]}>
              {questionnaireProgress.language === 'english' ? '🇬🇧 English' : '🇮🇳 தமிழ்'}
            </Text>
          </View>
        )}
        {isCompleted && (
          <View style={styles.questionnaireDetails}>
            <Text style={[styles.questionnaireDetailText, { color: colors.textSecondary }]}>
              ✓ {t('profile.allQuestionsAnswered')}
            </Text>
            <Text style={[styles.questionnaireLanguageTag, { backgroundColor: colors.inputBackground, color: colors.textSecondary }]}>
              {questionnaireProgress?.language === 'english' ? '🇬🇧 English' : '🇮🇳 தமிழ்'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSettingsSection = (
    title: string, 
    items: { id: string; icon: string; label: string; type: string; value?: any; onPress?: () => void; color?: string }[]
  ) => (
    <View style={styles.settingsSection}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground }]}>
        {items.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.settingItem,
              index < items.length - 1 && [styles.settingItemBorder, { borderBottomColor: colors.borderLight }],
            ]}
            onPress={item.onPress}
            disabled={item.type === 'toggle'}
          >
            <View style={[styles.settingIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color || colors.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
            {item.type === 'toggle' && (
              <CustomToggle
                value={item.value}
                onValueChange={item.onPress!}
                activeColor={colors.accent}
              />
            )}
            {item.type === 'link' && (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
            {item.type === 'select' && (
              <View style={styles.selectValue}>
                <Text style={[styles.selectText, { color: colors.textSecondary }]}>{item.value}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLanguageSelector = () => (
    <View style={styles.languageSection}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.languageTitle')}</Text>
      <View style={styles.languageOptions}>
        <TouchableOpacity 
          style={[
            styles.languageOption,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            appLanguage === 'en' && { borderColor: colors.primary, backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' },
          ]}
          onPress={() => {
            setAppLanguage('en');
            showToast('Language changed to English', 'success');
          }}
        >
          <Text style={[
            styles.languageText,
            { color: colors.textSecondary },
            appLanguage === 'en' && { color: colors.primary },
          ]}>English</Text>
          {appLanguage === 'en' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.languageOption,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            appLanguage === 'ta' && { borderColor: colors.primary, backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' },
          ]}
          onPress={() => {
            setAppLanguage('ta');
            showToast('மொழி தமிழுக்கு மாற்றப்பட்டது', 'success');
          }}
        >
          <Text style={[
            styles.languageText,
            { color: colors.textSecondary },
            appLanguage === 'ta' && { color: colors.primary },
          ]}>தமிழ் (Tamil)</Text>
          {appLanguage === 'ta' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isMobile ? renderMobileHeader() : renderWebHeader()}

        <View style={[styles.content, !isMobile && styles.contentWeb]}>
          {!isMobile && renderWebProfileCard()}
          {renderQuestionnaireStatus()}
          {renderLanguageSelector()}

          {renderSettingsSection(t('profile.appearance'), [
            {
              id: 'dark-mode',
              icon: isDarkMode ? 'sunny' : 'moon',
              label: t('profile.darkMode'),
              type: 'toggle',
              value: isDarkMode,
              onPress: handleDarkModeToggle,
              color: '#8b5cf6',
            },
          ])}

          {renderSettingsSection(t('profile.notifications'), [
            {
              id: 'notifications',
              icon: 'notifications',
              label: t('account.pushNotifications'),
              type: 'toggle',
              value: notifications,
              onPress: handleNotificationsToggle,
              color: '#f59e0b',
            },
            {
              id: 'daily-reminders',
              icon: 'alarm',
              label: t('account.dailyReminders'),
              type: 'toggle',
              value: dailyReminders,
              onPress: () => setDailyReminders(!dailyReminders),
              color: '#22c55e',
            },
            {
              id: 'weekly-reports',
              icon: 'bar-chart',
              label: t('account.weeklyReports'),
              type: 'toggle',
              value: weeklyReports,
              onPress: () => setWeeklyReports(!weeklyReports),
              color: '#3b82f6',
            },
          ])}

          {renderSettingsSection(t('account.title'), [
            {
              id: 'switch-profile',
              icon: 'swap-horizontal',
              label: t('account.switchProfile'),
              type: 'link',
              onPress: () => {
                if (profileData) {
                  router.push({
                    pathname: '/user/enter-pin',
                    params: {
                      coupleId: profileData.coupleId,
                      gender: profileData.partnerGender,
                    }
                  } as any);
                }
              },
              color: profileData?.partnerGender === 'female' ? '#ec4899' : '#3b82f6',
            },
            {
              id: 'manage-pin',
              icon: 'keypad',
              label: t('account.managePin'),
              type: 'link',
              onPress: () => router.push('/user/manage-pin' as any),
              color: '#f59e0b',
            },
            {
              id: 'personal-info',
              icon: 'person',
              label: t('account.personalInfo'),
              type: 'link',
              onPress: () => router.push('/user/personal-info' as any),
            },
            {
              id: 'device-management',
              icon: 'phone-portrait-outline',
              label: t('profile.deviceManagement'),
              type: 'link',
              onPress: () => router.push('/user/device-management' as any),
              color: '#8b5cf6',
            },
          ])}

          {renderSettingsSection(t('profile.support'), [
            {
              id: 'help',
              icon: 'help-circle',
              label: t('profile.helpCenter'),
              type: 'link',
              onPress: () => router.push('/user/help-center' as any),
            },
            {
              id: 'feedback',
              icon: 'chatbubble-ellipses',
              label: t('profile.sendFeedback'),
              type: 'link',
              onPress: () => router.push('/user/feedback' as any),
              color: '#f59e0b',
            },
            {
              id: 'about',
              icon: 'information-circle',
              label: t('profile.about'),
              type: 'link',
              onPress: () => router.push('/user/about' as any),
              color: '#64748b',
            },
          ])}

          {renderSettingsSection(t('account.dataPrivacy'), [
            {
              id: 'export-data',
              icon: 'download',
              label: t('account.exportData'),
              type: 'link',
              onPress: () => setShowExportModal(true),
            },
          ])}

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2' }]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={[styles.version, { color: colors.textMuted }]}>Fit for Baby v{APP_VERSION.version}</Text>
        </View>
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavBar />

      {/* Export Data Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowExportModal(false)}
        >
          <View style={[styles.photoModalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ 
                width: 60, 
                height: 60, 
                borderRadius: 30, 
                backgroundColor: '#006dab15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}>
                <Ionicons name="download-outline" size={32} color="#006dab" />
              </View>
              <Text style={[styles.photoModalTitle, { color: colors.text, marginBottom: 8 }]}>{t('profile.exportMyData')}</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                {t('profile.exportDescription')}
              </Text>
            </View>
            
            <View style={{ 
              backgroundColor: colors.inputBackground, 
              padding: 12, 
              borderRadius: 10, 
              marginBottom: 16 
            }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{t('profile.dataIncluded')}</Text>
              <Text style={{ fontSize: 13, color: colors.text }}>
                • {t('profile.personalInformation')}{'\n'}
                • {t('profile.stepsHistory')}{'\n'}
                • {t('profile.weightLogs')}{'\n'}
                • {t('profile.exerciseLogs')}{'\n'}
                • {t('profile.foodLogs')}{'\n'}
                • {t('profile.questionnaireProgressData')}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.photoModalOption, { 
                borderBottomWidth: 0, 
                backgroundColor: '#006dab', 
                borderRadius: 12,
                justifyContent: 'center',
              }]}
              onPress={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                  <Text style={[styles.photoModalOptionText, { color: '#fff', fontWeight: '600' }]}>
                    {t('profile.generateReport')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.photoModalCancel, { backgroundColor: colors.inputBackground }]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.photoModalCancelText, { color: colors.textSecondary }]}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Photo Modal */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsPhotoModalVisible(false)}
        >
          <View style={[styles.photoModalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.photoModalTitle, { color: colors.text }]}>{t('profile.profilePhoto')}</Text>
            
            <TouchableOpacity 
              style={[styles.photoModalOption, { borderBottomColor: colors.border }]}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={[styles.photoModalOptionText, { color: colors.text }]}>{t('profile.takePhoto')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.photoModalOption, { borderBottomColor: colors.border }]}
              onPress={pickImageFromGallery}
            >
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text style={[styles.photoModalOptionText, { color: colors.text }]}>{t('profile.chooseFromGallery')}</Text>
            </TouchableOpacity>
            
            {profileData?.profilePhoto && (
              <TouchableOpacity 
                style={[styles.photoModalOption, { borderBottomWidth: 0 }]}
                onPress={deleteProfilePhoto}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <Text style={[styles.photoModalOptionText, { color: '#ef4444' }]}>{t('profile.removePhoto')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.photoModalCancel, { backgroundColor: colors.inputBackground }]}
              onPress={() => setIsPhotoModalVisible(false)}
            >
              <Text style={[styles.photoModalCancelText, { color: colors.textSecondary }]}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // For mobile web browsers, use min-height with dvh (dynamic viewport height)
    ...(isWeb && {
      minHeight: '100dvh' as any,
      height: '100dvh' as any,
    }),
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
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: isWeb ? 40 : 100 },
  // Mobile Header
  header: {
    paddingTop: 50,
    paddingBottom: 24,
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
  // Web Header
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
  },
  webBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Web Profile Card
  webProfileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  webProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webProfileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  webProfileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  webProfileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  webPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  webPartnerText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  webStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  webStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  webStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  webStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  webStatDivider: {
    width: 1,
    height: 30,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  partnerText: {
    fontSize: 12,
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    marginTop: -20,
  },
  contentWeb: {
    padding: 40,
    marginTop: 0,
  },
  // Questionnaire Card
  questionnaireCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionnaireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionnaireInfo: { flex: 1, marginLeft: 12 },
  questionnaireTitle: { fontSize: 15, fontWeight: '700' },
  questionnaireStatus: { fontSize: 13, marginTop: 2 },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: { fontSize: 13, fontWeight: '600' },
  questionnaireProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFull: {
    height: '100%',
    borderRadius: 2,
  },
  questionnaireDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  questionnaireDetailText: {
    fontSize: 12,
  },
  questionnaireLanguageTag: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  languageSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 2,
  },
  languageFlag: { fontSize: 24 },
  languageText: { flex: 1, fontSize: 14, fontWeight: '600' },
  settingsSection: { marginBottom: 24 },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectText: { fontSize: 14 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 24,
  },
  deleteText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
  // Photo Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  photoModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  photoModalCancel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
