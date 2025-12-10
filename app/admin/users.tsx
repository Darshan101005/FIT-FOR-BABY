import { LipidTestResult, adminService, coupleExerciseService, coupleFoodLogService, coupleService, coupleStepsService, coupleWeightLogService, lipidTestService, questionnaireService } from '@/services/firestore.service';
import { Couple as FirestoreCouple } from '@/types/firebase.types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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

// Extended Couple type for UI
interface Couple extends FirestoreCouple {
  id: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // State
  const [couples, setCouples] = useState<Couple[]>([]);
  const [adminsMap, setAdminsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [expandedCouples, setExpandedCouples] = useState<string[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [nextCoupleId, setNextCoupleId] = useState('C_001');
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState({ 
    coupleId: '', 
    maleName: '',
    maleTempPassword: '', 
    femaleName: '',
    femaleTempPassword: '' 
  });
  const [currentAdminUid, setCurrentAdminUid] = useState('');

  // Edit profile modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{ coupleId: string; gender: 'male' | 'female' } | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    dateOfBirth: '',
    weight: '',
    height: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCouple, setDeletingCouple] = useState<{ coupleId: string; maleName: string; femaleName: string } | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingCouple, setExportingCouple] = useState<Couple | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [exportSelection, setExportSelection] = useState<'male' | 'female' | 'couple'>('couple');
  const [showExportAllModal, setShowExportAllModal] = useState(false);
  const [exportAllFormat, setExportAllFormat] = useState<'pdf' | 'csv' | 'excel'>('csv');

  // Lipid Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingUser, setTestingUser] = useState<{ coupleId: string; gender: 'male' | 'female'; userName: string } | null>(null);
  const [existingTests, setExistingTests] = useState<LipidTestResult[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [testForm, setTestForm] = useState({
    cholesterol: '',
    triglyceride: '',
    hdlCholesterol: '',
    ldlCholesterol: '',
    cholesterolHdlRatio: '',
    testDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Enrollment form state
  const [enrollForm, setEnrollForm] = useState({
    coupleId: 'C_001',
    enrollmentDate: new Date().toISOString().split('T')[0],
    maleName: '',
    maleEmail: '',
    malePhone: '',
    maleAge: '',
    femaleName: '',
    femaleEmail: '',
    femalePhone: '',
    femaleAge: '',
  });

  // Load couples from Firestore
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        // Get current admin UID
        const adminUid = await AsyncStorage.getItem('adminUid');
        if (adminUid && isMounted) setCurrentAdminUid(adminUid);
        
        // Get next couple ID
        const nextId = await coupleService.getNextCoupleId();
        if (isMounted) {
          setNextCoupleId(nextId);
          setEnrollForm(prev => ({ ...prev, coupleId: nextId }));
        }
        
        // Load all admins to map UID to names
        const allAdmins = await adminService.getAll();
        if (isMounted) {
          const map: Record<string, string> = {};
          allAdmins.forEach(admin => {
            map[admin.uid] = admin.displayName || (admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.email) || 'Admin';
          });
          setAdminsMap(map);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Don't show error toast for initial data load - not critical
      }
    };
    
    loadInitialData();
    
    // Subscribe to real-time updates
    const unsubscribe = coupleService.subscribe(
      (coupleList) => {
        if (isMounted) {
          setCouples(coupleList as Couple[]);
          setLoading(false);
        }
      },
      (error) => {
        // Only log error, don't show toast - empty collection is not an error
        console.error('Subscription error:', error);
        if (isMounted) {
          // Still set loading to false and show empty state
          setCouples([]);
          setLoading(false);
          
          // Only show error if it's a permission/auth error (not empty collection)
          const errorMessage = error?.message?.toLowerCase() || '';
          if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            showToast('Permission denied. Please check your access.', 'error');
          }
          // For network errors, users can try refreshing
          // For empty collection, just show empty state - no error needed
        }
      }
    );
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Check for action param to open enrollment modal
  useEffect(() => {
    if (params.action === 'enroll') {
      setShowEnrollModal(true);
    }
  }, [params.action]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, { toValue: 20, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true })
        .start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const toggleCoupleExpand = (coupleId: string) => {
    setExpandedCouples(prev =>
      prev.includes(coupleId)
        ? prev.filter(id => id !== coupleId)
        : [...prev, coupleId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'inactive': return COLORS.warning;
      case 'pending': return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  };

  const filteredCouples = couples.filter(couple => {
    // Add null safety checks
    if (!couple || !couple.male || !couple.female) return false;
    
    const matchesSearch = 
      (couple.coupleId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (couple.male?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (couple.female?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (couple.male?.phone || '').includes(searchQuery) ||
      (couple.female?.phone || '').includes(searchQuery);
    
    const matchesStatus = filterStatus === 'all' || 
      couple.status === filterStatus ||
      couple.male?.status === filterStatus || 
      couple.female?.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Validate contact info - at least 1 mobile AND 1 email between the couple
  const validateContactInfo = (): boolean => {
    const hasMobile = (enrollForm.malePhone.trim() !== '' || enrollForm.femalePhone.trim() !== '');
    const hasEmail = (enrollForm.maleEmail.trim() !== '' || enrollForm.femaleEmail.trim() !== '');
    return hasMobile && hasEmail;
  };

  const handleEnrollSubmit = async () => {
    if (enrollStep === 1) {
      setEnrollStep(2);
    } else {
      // Validate required fields
      if (!enrollForm.maleName.trim() || !enrollForm.femaleName.trim()) {
        showToast('Please enter names for both male and female', 'error');
        return;
      }
      
      // Validate contact info - at least 1 mobile AND 1 email between the couple
      if (!validateContactInfo()) {
        showToast('Couple must have at least 1 mobile number AND 1 email between them', 'error');
        return;
      }
      
      setActionLoading(true);
      
      try {
        // Get current admin name
        const currentAdminName = adminsMap[currentAdminUid] || 'Admin';
        
        // Create couple in Firestore
        const result = await coupleService.create({
          coupleId: enrollForm.coupleId,
          enrollmentDate: enrollForm.enrollmentDate,
          enrolledBy: currentAdminUid,
          enrolledByName: currentAdminName,
          male: {
            name: enrollForm.maleName.trim(),
            email: enrollForm.maleEmail.trim() || undefined,
            phone: enrollForm.malePhone.trim() || undefined,
            age: enrollForm.maleAge ? parseInt(enrollForm.maleAge) : undefined,
          },
          female: {
            name: enrollForm.femaleName.trim(),
            email: enrollForm.femaleEmail.trim() || undefined,
            phone: enrollForm.femalePhone.trim() || undefined,
            age: enrollForm.femaleAge ? parseInt(enrollForm.femaleAge) : undefined,
          },
        });
        
        // Show temp password modal with individual passwords
        setTempPasswordInfo({
          coupleId: result.coupleId,
          maleName: enrollForm.maleName.trim(),
          maleTempPassword: result.maleTempPassword,
          femaleName: enrollForm.femaleName.trim(),
          femaleTempPassword: result.femaleTempPassword,
        });
        setShowEnrollModal(false);
        setShowTempPasswordModal(true);
        
        // Reset form
        setEnrollStep(1);
        const newNextId = await coupleService.getNextCoupleId();
        setNextCoupleId(newNextId);
        setEnrollForm({
          coupleId: newNextId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          maleName: '',
          maleEmail: '',
          malePhone: '',
          maleAge: '',
          femaleName: '',
          femaleEmail: '',
          femalePhone: '',
          femaleAge: '',
        });
        
        showToast(`Couple ${result.coupleId} enrolled successfully!`, 'success');
      } catch (error: any) {
        console.error('Error enrolling couple:', error);
        showToast(error.message || 'Failed to enroll couple', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleUserAction = async (action: 'edit' | 'reset' | 'toggle' | 'resetPin', coupleId: string, gender: 'male' | 'female') => {
    try {
      const couple = couples.find(c => c.coupleId === coupleId);
      const userName = couple ? couple[gender].name : '';
      const userId = `${coupleId}_${gender.charAt(0).toUpperCase()}`;
      
      switch (action) {
        case 'edit':
          if (couple) {
            const user = couple[gender];
            setEditingUser({ coupleId, gender });
            setEditForm({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              age: user.age?.toString() || '',
              dateOfBirth: user.dateOfBirth || '',
              weight: user.weight?.toString() || '',
              height: user.height?.toString() || '',
              addressLine1: user.address?.addressLine1 || '',
              addressLine2: user.address?.addressLine2 || '',
              city: user.address?.city || '',
              state: user.address?.state || '',
              pincode: user.address?.pincode || '',
            });
            setShowEditModal(true);
          }
          break;
        case 'reset':
          setActionLoading(true);
          const newPassword = await coupleService.forcePasswordReset(coupleId, gender);
          // Show single user password reset modal
          setTempPasswordInfo({ 
            coupleId: coupleId,
            maleName: gender === 'male' ? userName : '',
            maleTempPassword: gender === 'male' ? newPassword : '',
            femaleName: gender === 'female' ? userName : '',
            femaleTempPassword: gender === 'female' ? newPassword : '',
          });
          setShowTempPasswordModal(true);
          showToast(`Password reset for ${userId}`, 'success');
          setActionLoading(false);
          break;
        case 'resetPin':
          setActionLoading(true);
          await coupleService.forceResetPin(coupleId, gender);
          showToast(`PIN reset for ${userId}. User will need to set a new PIN.`, 'success');
          // The subscription will automatically update the couples list
          setActionLoading(false);
          break;
        case 'toggle':
          setActionLoading(true);
          if (couple) {
            const currentStatus = couple[gender].status;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await coupleService.updateUserStatus(coupleId, gender, newStatus);
            showToast(`${userId} is now ${newStatus}`, 'success');
          }
          setActionLoading(false);
          break;
      }
    } catch (error: any) {
      console.error('Error with user action:', error);
      showToast(error.message || 'Action failed', 'error');
      setActionLoading(false);
    }
  };

  // Handle save edit profile
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
      try {
      setActionLoading(true);
      const { coupleId, gender } = editingUser;
      
      // Build update object with only changed fields
      const updates: Record<string, any> = {};
      
      if (editForm.name.trim()) updates[`${gender}.name`] = editForm.name.trim();
      if (editForm.email.trim()) updates[`${gender}.email`] = editForm.email.trim();
      if (editForm.phone.trim()) updates[`${gender}.phone`] = editForm.phone.trim();
      if (editForm.age) updates[`${gender}.age`] = parseInt(editForm.age);
      if (editForm.dateOfBirth) updates[`${gender}.dateOfBirth`] = editForm.dateOfBirth;
      if (editForm.weight) updates[`${gender}.weight`] = parseFloat(editForm.weight);
      if (editForm.height) updates[`${gender}.height`] = parseFloat(editForm.height);
      
      // Calculate BMI if both weight and height are provided
      if (editForm.weight && editForm.height) {
        const weightKg = parseFloat(editForm.weight);
        const heightM = parseFloat(editForm.height) / 100;
        const bmi = (weightKg / (heightM * heightM)).toFixed(1);
        updates[`${gender}.bmi`] = bmi;
      }
      
      // Address fields
      if (editForm.addressLine1 || editForm.addressLine2 || editForm.city || editForm.state || editForm.pincode) {
        updates[`${gender}.address`] = {
          addressLine1: editForm.addressLine1.trim(),
          addressLine2: editForm.addressLine2.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim(),
          pincode: editForm.pincode.trim(),
        };
      }
      
      await (coupleService as any).update(coupleId, updates);
      
      setShowEditModal(false);
      setEditingUser(null);
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle open test modal
  const handleOpenTestModal = async (coupleId: string, gender: 'male' | 'female', userName: string) => {
    setTestingUser({ coupleId, gender, userName });
    setTestForm({
      cholesterol: '',
      triglyceride: '',
      hdlCholesterol: '',
      ldlCholesterol: '',
      cholesterolHdlRatio: '',
      testDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowTestModal(true);
    setIsLoadingTests(true);
    
    try {
      const tests = await lipidTestService.getTestResults(coupleId, gender);
      setExistingTests(tests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setExistingTests([]);
    } finally {
      setIsLoadingTests(false);
    }
  };

  // Handle save test result
  const handleSaveTestResult = async () => {
    if (!testingUser) {
      showToast('No user selected', 'error');
      return;
    }
    
    // Debug: Log form values - use Alert for visibility
    console.log('Test Form Values:', JSON.stringify(testForm));
    console.log('Testing User:', JSON.stringify(testingUser));
    
    // Validate all fields are filled
    const missingFields = [];
    if (!testForm.cholesterol || testForm.cholesterol.trim() === '') missingFields.push('Cholesterol');
    if (!testForm.triglyceride || testForm.triglyceride.trim() === '') missingFields.push('Triglyceride');
    if (!testForm.hdlCholesterol || testForm.hdlCholesterol.trim() === '') missingFields.push('HDL Cholesterol');
    if (!testForm.ldlCholesterol || testForm.ldlCholesterol.trim() === '') missingFields.push('LDL Cholesterol');
    if (!testForm.cholesterolHdlRatio || testForm.cholesterolHdlRatio.trim() === '') missingFields.push('Cholesterol/HDL Ratio');
    if (!testForm.testDate || testForm.testDate.trim() === '') missingFields.push('Test Date');
    
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      showToast(`Please fill: ${missingFields.join(', ')}`, 'error');
      return;
    }
    
    // Check if user already has 2 tests
    if (existingTests.length >= 2) {
      showToast('Maximum 2 tests allowed per user', 'error');
      return;
    }
    
    setIsSavingTest(true);
    
    try {
      const adminName = await AsyncStorage.getItem('adminName') || 'Admin';
      
      // Prepare data for Firebase
      const testData = {
        cholesterol: parseFloat(testForm.cholesterol),
        triglyceride: parseFloat(testForm.triglyceride),
        hdlCholesterol: parseFloat(testForm.hdlCholesterol),
        ldlCholesterol: parseFloat(testForm.ldlCholesterol),
        cholesterolHdlRatio: parseFloat(testForm.cholesterolHdlRatio),
        testDate: testForm.testDate,
        notes: testForm.notes,
      };
      
      console.log('Saving test with data:', {
        coupleId: testingUser.coupleId,
        gender: testingUser.gender,
        testData,
        adminUid: currentAdminUid,
        adminName,
      });
      
      const result = await lipidTestService.addTestResult(
        testingUser.coupleId,
        testingUser.gender,
        testData,
        currentAdminUid,
        adminName
      );
      
      console.log('Firebase result:', result);
      
      if (result.success) {
        showToast(`Test ${existingTests.length + 1} saved successfully`, 'success');
        // Reload tests
        const tests = await lipidTestService.getTestResults(testingUser.coupleId, testingUser.gender);
        setExistingTests(tests);
        // Clear form
        setTestForm({
          cholesterol: '',
          triglyceride: '',
          hdlCholesterol: '',
          ldlCholesterol: '',
          cholesterolHdlRatio: '',
          testDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
      } else {
        console.error('Firebase returned error:', result.error);
        showToast(result.error || 'Failed to save test', 'error');
      }
    } catch (error: any) {
      console.error('Error saving test - Full error:', error);
      // Check for Firebase permission error
      if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
        showToast('Firebase permission denied. Please update Firestore rules.', 'error');
      } else {
        showToast(error.message || 'Failed to save test', 'error');
      }
    } finally {
      setIsSavingTest(false);
    }
  };

  // Handle delete couple confirmation
  const handleDeleteCouple = (coupleId: string, maleName: string, femaleName: string) => {
    setDeletingCouple({ coupleId, maleName, femaleName });
    setShowDeleteModal(true);
  };

  // Confirm delete couple
  const confirmDeleteCouple = async () => {
    if (!deletingCouple) return;
    
    try {
      setActionLoading(true);
      await coupleService.delete(deletingCouple.coupleId);
      setShowDeleteModal(false);
      setDeletingCouple(null);
      showToast(`Couple ${deletingCouple.coupleId} deleted successfully`, 'success');
    } catch (error: any) {
      console.error('Error deleting couple:', error);
      showToast(error.message || 'Failed to delete couple', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open export modal for a couple
  const handleExportUser = (couple: Couple) => {
    setExportingCouple(couple);
    setExportFormat('pdf');
    setExportSelection('couple');
    setShowExportModal(true);
  };

  // Export single user data as PDF
  const handleExportSingleUser = async (couple: Couple, gender: 'male' | 'female') => {
    setActionLoading(true);
    
    try {
      const coupleId = couple.coupleId;
      const user = couple[gender];
      const userId = `${coupleId}_${gender === 'male' ? 'M' : 'F'}`;
      
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

      // Fetch all data for this user
      const [steps, weightLogs, exerciseLogs, foodLogs, questionnaire, testResults] = await Promise.all([
        coupleStepsService.getByDateRange(coupleId, gender, formatDateStr(thirtyDaysAgo), formatDateStr(today)),
        coupleWeightLogService.getAll(coupleId, gender),
        coupleExerciseService.getByDateRange(coupleId, gender, formatDateStr(thirtyDaysAgo), formatDateStr(today)),
        coupleFoodLogService.getByDateRange(coupleId, gender, formatDateStr(thirtyDaysAgo), formatDateStr(today)),
        questionnaireService.getProgress(coupleId, gender),
        lipidTestService.getTestResults(coupleId, gender),
      ]);

      // Get questionnaire answers (both complete and in-progress)
      let questionnaireAnswers: any = null;
      if (questionnaire?.answers && Object.keys(questionnaire.answers).length > 0) {
        questionnaireAnswers = questionnaire.answers;
      }

      // Generate HTML report
      const htmlContent = generateSingleUserExportHTML({
        couple,
        gender,
        user,
        userId,
        steps: steps || [],
        weightLogs: weightLogs || [],
        exerciseLogs: exerciseLogs || [],
        foodLogs: foodLogs || [],
        questionnaire,
        questionnaireAnswers,
        testResults: testResults || [],
      });

      if (isWeb) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
        showToast('Report opened in new tab. Use Print → Save as PDF', 'success');
      } else {
        const fileName = `${userId}_full_report_${formatDateStr(today)}.html`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Export User Report' });
        showToast('Report ready to share!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate HTML for single user export with full details
  const generateSingleUserExportHTML = (data: {
    couple: Couple;
    gender: 'male' | 'female';
    user: any;
    userId: string;
    steps: any[];
    weightLogs: any[];
    exerciseLogs: any[];
    foodLogs: any[];
    questionnaire: any;
    questionnaireAnswers: any;
    testResults: LipidTestResult[];
  }) => {
    const { couple, gender, user, userId, steps, weightLogs, exerciseLogs, foodLogs, questionnaire, questionnaireAnswers, testResults } = data;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Calculate stats
    const totalSteps = steps.reduce((sum, s) => sum + (s.stepCount || 0), 0);
    const avgSteps = steps.length > 0 ? Math.round(totalSteps / steps.length) : 0;
    const totalExerciseMins = exerciseLogs.reduce((sum, e) => sum + (e.duration || 0), 0);
    const latestWeight = weightLogs.length > 0 ? weightLogs[0] : null;

    // Generate questionnaire section
    let questionnaireHTML = '';
    if (questionnaire?.isComplete && questionnaireAnswers) {
      const answerEntries = Object.entries(questionnaireAnswers);
      questionnaireHTML = `
        <div class="section">
          <h2 class="section-title">📋 Health Questionnaire</h2>
          <div class="questionnaire-status completed">
            <span class="status-icon">✓</span>
            Completed on ${formatDate(questionnaire.completedAt?.toDate?.()?.toISOString?.() || '')}
          </div>
          <div class="questionnaire-answers">
            ${answerEntries.map(([key, answer]: [string, any]) => `
              <div class="qa-item">
                <div class="question">${answer.questionText || key}</div>
                <div class="answer">${Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer || 'N/A'}${answer.conditionalAnswer ? ` (${answer.conditionalAnswer})` : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (questionnaire && questionnaireAnswers) {
      // Show in-progress questionnaire with answered questions
      const answerEntries = Object.entries(questionnaireAnswers);
      questionnaireHTML = `
        <div class="section">
          <h2 class="section-title">📋 Health Questionnaire</h2>
          <div class="questionnaire-status pending">
            <span class="status-icon">⏳</span>
            In Progress - ${Math.round(questionnaire.progress?.percentComplete || 0)}% Complete
          </div>
          ${answerEntries.length > 0 ? `
            <div class="questionnaire-answers">
              <h3 style="font-size: 14px; color: #64748b; margin: 16px 0 12px;">Answered Questions (${answerEntries.length})</h3>
              ${answerEntries.map(([key, answer]: [string, any]) => `
                <div class="qa-item">
                  <div class="question">${answer.questionText || key}</div>
                  <div class="answer">${Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer || 'N/A'}${answer.conditionalAnswer ? ` (${answer.conditionalAnswer})` : ''}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else if (questionnaire) {
      questionnaireHTML = `
        <div class="section">
          <h2 class="section-title">📋 Health Questionnaire</h2>
          <div class="questionnaire-status pending">
            <span class="status-icon">⏳</span>
            In Progress - ${Math.round(questionnaire.progress?.percentComplete || 0)}% Complete
          </div>
        </div>
      `;
    } else {
      questionnaireHTML = `
        <div class="section">
          <h2 class="section-title">📋 Health Questionnaire</h2>
          <div class="questionnaire-status not-started">
            <span class="status-icon">○</span>
            Not Started
          </div>
        </div>
      `;
    }

    // Generate test results section
    let testResultsHTML = '';
    if (testResults.length > 0) {
      testResultsHTML = `
        <div class="section">
          <h2 class="section-title">🧪 Lipid Profile Tests</h2>
          <div class="tests-grid">
            ${testResults.map(test => `
              <div class="test-card">
                <div class="test-header">
                  <span class="test-number">Test ${test.testNumber}</span>
                  <span class="test-date">${formatDate(test.testDate)}</span>
                </div>
                <div class="test-results">
                  <div class="test-row">
                    <span class="test-label">Cholesterol</span>
                    <span class="test-value">${test.cholesterol} mg/dL</span>
                  </div>
                  <div class="test-row">
                    <span class="test-label">Triglyceride</span>
                    <span class="test-value">${test.triglyceride} mg/dL</span>
                  </div>
                  <div class="test-row">
                    <span class="test-label">HDL Cholesterol</span>
                    <span class="test-value">${test.hdlCholesterol} mg/dL</span>
                  </div>
                  <div class="test-row">
                    <span class="test-label">LDL Cholesterol</span>
                    <span class="test-value">${test.ldlCholesterol} mg/dL</span>
                  </div>
                  <div class="test-row highlight">
                    <span class="test-label">Chol/HDL Ratio</span>
                    <span class="test-value">${test.cholesterolHdlRatio}</span>
                  </div>
                </div>
                ${test.notes ? `<div class="test-notes">Notes: ${test.notes}</div>` : ''}
                <div class="test-entered-by">Entered by: ${test.enteredByName || 'Admin'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      testResultsHTML = `
        <div class="section">
          <h2 class="section-title">🧪 Lipid Profile Tests</h2>
          <div class="no-data">No test results recorded</div>
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit for Baby - User Report - ${userId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; line-height: 1.6; }
    .report-container { max-width: 900px; margin: 0 auto; }
    
    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${gender === 'male' ? '#006dab' : '#98be4e'}; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .logo { width: 60px; height: 60px; border-radius: 12px; object-fit: contain; }
    .header-text h1 { font-size: 24px; font-weight: 700; color: ${gender === 'male' ? '#006dab' : '#7da33e'}; }
    
    /* Download Button */
    .download-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, ${gender === 'male' ? '#006dab' : '#7da33e'} 0%, ${gender === 'male' ? '#0088d4' : '#98be4e'} 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; }
    .download-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    @media print { .download-btn { display: none; } }
    .header-text p { font-size: 13px; color: #64748b; }
    .report-date { text-align: right; font-size: 12px; color: #64748b; }
    
    /* User Profile Card */
    .profile-card { background: linear-gradient(135deg, ${gender === 'male' ? '#e0f2fe' : '#ecfccb'} 0%, ${gender === 'male' ? '#bae6fd' : '#d9f99d'} 100%); border-radius: 16px; padding: 24px; margin-bottom: 30px; border-left: 5px solid ${gender === 'male' ? '#006dab' : '#98be4e'}; }
    .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .profile-avatar { width: 70px; height: 70px; border-radius: 50%; background: ${gender === 'male' ? '#006dab' : '#98be4e'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700; }
    .profile-info h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .profile-info .user-id { font-size: 14px; color: #64748b; }
    .profile-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .detail-item { background: rgba(255,255,255,0.7); border-radius: 10px; padding: 12px; }
    .detail-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-value { font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 4px; }
    
    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .stat-icon { font-size: 28px; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: 800; color: ${gender === 'male' ? '#006dab' : '#7da33e'}; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    
    /* Sections */
    .section { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; }
    
    /* Questionnaire */
    .questionnaire-status { padding: 12px 16px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-weight: 600; margin-bottom: 20px; }
    .questionnaire-status.completed { background: #dcfce7; color: #16a34a; }
    .questionnaire-status.pending { background: #fef3c7; color: #d97706; }
    .questionnaire-status.not-started { background: #f1f5f9; color: #64748b; }
    .questionnaire-answers { display: grid; gap: 12px; }
    .qa-item { background: #f8fafc; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ${gender === 'male' ? '#006dab' : '#98be4e'}; }
    .question { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .answer { font-size: 15px; font-weight: 600; color: #0f172a; }
    
    /* Test Results */
    .tests-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .test-card { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
    .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .test-number { font-size: 16px; font-weight: 700; color: ${gender === 'male' ? '#006dab' : '#7da33e'}; }
    .test-date { font-size: 12px; color: #64748b; }
    .test-results { display: grid; gap: 8px; }
    .test-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
    .test-row.highlight { background: ${gender === 'male' ? '#e0f2fe' : '#ecfccb'}; margin: 4px -8px; padding: 8px; border-radius: 6px; }
    .test-label { font-size: 13px; color: #64748b; }
    .test-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .test-notes { font-size: 12px; color: #64748b; font-style: italic; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
    .test-entered-by { font-size: 11px; color: #94a3b8; margin-top: 8px; }
    
    /* Activity Table */
    .activity-table { width: 100%; border-collapse: collapse; }
    .activity-table th, .activity-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .activity-table th { background: #f8fafc; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .activity-table tr:hover { background: #fafafa; }
    
    /* No Data */
    .no-data { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; }
    
    /* Footer */
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 30px; }
    
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <img class="logo" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjkwIiBmaWxsPSIjOThiZTRlIi8+PHBhdGggZD0iTTYwIDEyMGMwLTIyIDIwLTQ1IDQwLTQ1czQwIDIzIDQwIDQ1Yy01LTEwLTE1LTE1LTQwLTE1cy0zNSA1LTQwIDE1eiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjYwIiByPSIyNSIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIj5GRkI8L3RleHQ+PC9zdmc+" alt="Fit for Baby Logo" />
        <div class="header-text">
          <h1>User Health Report</h1>
          <p>Fit for Baby - Complete Profile & Health Data</p>
        </div>
      </div>
      <div class="header-right">
        <button class="download-btn" onclick="window.print()">
          📥 Download PDF
        </button>
        <div class="report-date">
          Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
    
    <!-- User Profile Card -->
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">${user.name?.charAt(0) || (gender === 'male' ? 'M' : 'F')}</div>
        <div class="profile-info">
          <h2>${user.name || 'Unknown'}</h2>
          <div class="user-id">${userId} • ${gender.charAt(0).toUpperCase() + gender.slice(1)}</div>
        </div>
      </div>
      <div class="profile-details">
        <div class="detail-item">
          <div class="detail-label">Email</div>
          <div class="detail-value">${user.email || 'Not provided'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Phone</div>
          <div class="detail-value">${user.phone || 'Not provided'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Age</div>
          <div class="detail-value">${user.age ? user.age + ' years' : 'Not provided'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date of Birth</div>
          <div class="detail-value">${user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not provided'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Weight</div>
          <div class="detail-value">${user.weight ? user.weight + ' kg' : 'Not recorded'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Height</div>
          <div class="detail-value">${user.height ? user.height + ' cm' : 'Not recorded'}</div>
        </div>
        ${user.bmi ? `
        <div class="detail-item">
          <div class="detail-label">BMI</div>
          <div class="detail-value">${user.bmi}</div>
        </div>
        ` : ''}
        <div class="detail-item">
          <div class="detail-label">Enrollment Date</div>
          <div class="detail-value">${formatDate(couple.enrollmentDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value" style="color: ${user.status === 'active' ? '#16a34a' : '#dc2626'}">${user.status?.toUpperCase() || 'UNKNOWN'}</div>
        </div>
      </div>
    </div>
    
    <!-- Stats Summary -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👣</div>
        <div class="stat-value">${avgSteps.toLocaleString()}</div>
        <div class="stat-label">Avg Daily Steps</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏃</div>
        <div class="stat-value">${totalExerciseMins}</div>
        <div class="stat-label">Exercise Mins (30d)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚖️</div>
        <div class="stat-value">${latestWeight?.weight || user.weight || '-'}</div>
        <div class="stat-label">Latest Weight (kg)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧪</div>
        <div class="stat-value">${testResults.length}/2</div>
        <div class="stat-label">Tests Recorded</div>
      </div>
    </div>
    
    ${testResultsHTML}
    
    ${questionnaireHTML}
    
    <!-- Recent Activity -->
    <div class="section">
      <h2 class="section-title">📊 Recent Activity (Last 30 Days)</h2>
      ${(() => {
        // Merge all dates and aggregate data
        const dateMap = new Map<string, { steps: number; exercise: number; weight: number | null; dietLogged: boolean }>();
        
        // Add steps data (aggregate by date)
        steps.forEach(s => {
          const existing = dateMap.get(s.date) || { steps: 0, exercise: 0, weight: null, dietLogged: false };
          existing.steps += (s.stepCount || 0);
          dateMap.set(s.date, existing);
        });
        
        // Add exercise data (aggregate by date)
        exerciseLogs.forEach(e => {
          const existing = dateMap.get(e.date) || { steps: 0, exercise: 0, weight: null, dietLogged: false };
          existing.exercise += (e.duration || 0);
          dateMap.set(e.date, existing);
        });
        
        // Add weight data (take the latest for each date)
        weightLogs.forEach(w => {
          const existing = dateMap.get(w.date) || { steps: 0, exercise: 0, weight: null, dietLogged: false };
          existing.weight = w.weight;
          dateMap.set(w.date, existing);
        });
        
        // Add food log data (check if logged)
        foodLogs.forEach(f => {
          const existing = dateMap.get(f.date) || { steps: 0, exercise: 0, weight: null, dietLogged: false };
          existing.dietLogged = true;
          dateMap.set(f.date, existing);
        });
        
        // Sort dates descending
        const sortedDates = Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
        
        if (sortedDates.length === 0) {
          return '<div class="no-data">No activity data recorded in the last 30 days</div>';
        }
        
        return `
          <table class="activity-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Steps</th>
                <th>Exercise (mins)</th>
                <th>Weight (kg)</th>
                <th>Diet Logged</th>
              </tr>
            </thead>
            <tbody>
              ${sortedDates.slice(0, 20).map(([date, data]) => `
                <tr>
                  <td>${formatDate(date)}</td>
                  <td>${data.steps > 0 ? data.steps.toLocaleString() : '-'}</td>
                  <td>${data.exercise > 0 ? data.exercise : '-'}</td>
                  <td>${data.weight || '-'}</td>
                  <td style="color: ${data.dietLogged ? '#16a34a' : '#dc2626'}">${data.dietLogged ? '✓ Yes' : '✗ No'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      })()}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>This report was generated by Fit for Baby Admin Panel</p>
      <p>Couple ID: ${couple.coupleId} • User ID: ${userId}</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Generate and export user data
  const handleExportData = async () => {
    if (!exportingCouple) return;

    setIsExporting(true);

    try {
      const couple = exportingCouple;
      const coupleId = couple.coupleId;

      // Fetch all data for both male and female
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

      // Initialize data arrays
      let maleSteps: any[] = [];
      let femaleSteps: any[] = [];
      let maleWeight: any[] = [];
      let femaleWeight: any[] = [];
      let maleExercise: any[] = [];
      let femaleExercise: any[] = [];
      let maleFood: any[] = [];
      let femaleFood: any[] = [];
      let maleQuestionnaire: any = null;
      let femaleQuestionnaire: any = null;

      // Fetch data based on export selection
      if (exportSelection === 'male' || exportSelection === 'couple') {
        maleSteps = await coupleStepsService.getByDateRange(coupleId, 'male', formatDateStr(thirtyDaysAgo), formatDateStr(today)) || [];
        maleWeight = await coupleWeightLogService.getAll(coupleId, 'male') || [];
        maleExercise = await coupleExerciseService.getByDateRange(coupleId, 'male', formatDateStr(thirtyDaysAgo), formatDateStr(today)) || [];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        maleFood = await coupleFoodLogService.getByDateRange(coupleId, 'male', formatDateStr(sevenDaysAgo), formatDateStr(today)) || [];
        maleQuestionnaire = await questionnaireService.getProgress(coupleId, 'male');
      }

      if (exportSelection === 'female' || exportSelection === 'couple') {
        femaleSteps = await coupleStepsService.getByDateRange(coupleId, 'female', formatDateStr(thirtyDaysAgo), formatDateStr(today)) || [];
        femaleWeight = await coupleWeightLogService.getAll(coupleId, 'female') || [];
        femaleExercise = await coupleExerciseService.getByDateRange(coupleId, 'female', formatDateStr(thirtyDaysAgo), formatDateStr(today)) || [];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        femaleFood = await coupleFoodLogService.getByDateRange(coupleId, 'female', formatDateStr(sevenDaysAgo), formatDateStr(today)) || [];
        femaleQuestionnaire = await questionnaireService.getProgress(coupleId, 'female');
      }

      // For single user export, use the handleExportSingleUser function
      if (exportSelection === 'male' || exportSelection === 'female') {
        await handleExportSingleUser(couple, exportSelection);
        setShowExportModal(false);
        return;
      }

      if (exportFormat === 'pdf') {
        // Generate HTML report
        const htmlContent = generateUserExportHTML({
          couple,
          maleSteps,
          femaleSteps,
          maleWeight,
          femaleWeight,
          maleExercise,
          femaleExercise,
          maleFood,
          femaleFood,
          maleQuestionnaire,
          femaleQuestionnaire,
        });

        if (isWeb) {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
          }
          showToast('Report opened in new tab. Use Print → Save as PDF', 'success');
        } else {
          const fileName = `${couple.coupleId}_user_data_${formatDateStr(today)}.html`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, htmlContent);
          await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Export User Data' });
          showToast('Report ready to share!', 'success');
        }
      } else if (exportFormat === 'csv') {
        const csvContent = generateUserExportCSV({
          couple,
          maleSteps,
          femaleSteps,
          maleWeight,
          femaleWeight,
          maleExercise,
          femaleExercise,
        });

        if (isWeb) {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${couple.coupleId}_user_data_${formatDateStr(today)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
          showToast('CSV file downloaded!', 'success');
        } else {
          const fileName = `${couple.coupleId}_user_data_${formatDateStr(today)}.csv`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, csvContent);
          await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export User Data' });
          showToast('CSV file ready to share!', 'success');
        }
      } else if (exportFormat === 'excel') {
        // Generate CSV with Excel-compatible format (semicolon separated)
        const csvContent = generateUserExportCSV({
          couple,
          maleSteps,
          femaleSteps,
          maleWeight,
          femaleWeight,
          maleExercise,
          femaleExercise,
        }, ';');

        if (isWeb) {
          const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${couple.coupleId}_user_data_${formatDateStr(today)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
          showToast('Excel-compatible file downloaded!', 'success');
        } else {
          const fileName = `${couple.coupleId}_user_data_${formatDateStr(today)}.csv`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, '\ufeff' + csvContent);
          await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export User Data' });
          showToast('Excel file ready to share!', 'success');
        }
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export data. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export all couples data
  const handleExportAllCouples = async () => {
    setIsExporting(true);
    
    try {
      const today = new Date();
      const formatDateStr = (date: Date) => date.toISOString().split('T')[0];
      
      // Generate CSV with all couples summary data
      let csv = '\ufeff'; // BOM for Excel
      const s = ',';
      
      csv += `FIT FOR BABY - ALL COUPLES EXPORT\n`;
      csv += `Generated: ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n`;
      csv += `Total Couples: ${couples.length}\n\n`;
      
      // Couples Summary Header
      csv += `COUPLES SUMMARY\n`;
      csv += `Couple ID${s}Status${s}Enrollment Date${s}Male Name${s}Male Email${s}Male Phone${s}Male Age${s}Male Status${s}Female Name${s}Female Email${s}Female Phone${s}Female Age${s}Female Status\n`;
      
      for (const couple of couples) {
        csv += `${couple.coupleId}${s}`;
        csv += `${couple.status}${s}`;
        csv += `${couple.enrollmentDate}${s}`;
        csv += `${couple.male.name}${s}`;
        csv += `${couple.male.email || ''}${s}`;
        csv += `${couple.male.phone || ''}${s}`;
        csv += `${couple.male.age || ''}${s}`;
        csv += `${couple.male.status}${s}`;
        csv += `${couple.female.name}${s}`;
        csv += `${couple.female.email || ''}${s}`;
        csv += `${couple.female.phone || ''}${s}`;
        csv += `${couple.female.age || ''}${s}`;
        csv += `${couple.female.status}\n`;
      }
      
      if (isWeb) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all_couples_export_${formatDateStr(today)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('All couples data exported!', 'success');
      } else {
        const fileName = `all_couples_export_${formatDateStr(today)}.csv`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csv);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export All Couples' });
        showToast('All couples data ready to share!', 'success');
      }
      
      setShowExportAllModal(false);
    } catch (error) {
      console.error('Export all error:', error);
      showToast('Failed to export data. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate HTML report for user export
  const generateUserExportHTML = (data: {
    couple: Couple;
    maleSteps: any[];
    femaleSteps: any[];
    maleWeight: any[];
    femaleWeight: any[];
    maleExercise: any[];
    femaleExercise: any[];
    maleFood: any[];
    femaleFood: any[];
    maleQuestionnaire: any;
    femaleQuestionnaire: any;
  }) => {
    const { couple, maleSteps, femaleSteps, maleWeight, femaleWeight, maleExercise, femaleExercise, maleFood, femaleFood, maleQuestionnaire, femaleQuestionnaire } = data;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Calculate totals
    const maleTotalSteps = maleSteps.reduce((sum, s) => sum + (s.steps || 0), 0);
    const femaleTotalSteps = femaleSteps.reduce((sum, s) => sum + (s.steps || 0), 0);
    const maleAvgSteps = maleSteps.length > 0 ? Math.round(maleTotalSteps / maleSteps.length) : 0;
    const femaleAvgSteps = femaleSteps.length > 0 ? Math.round(femaleTotalSteps / femaleSteps.length) : 0;
    const maleExerciseMinutes = maleExercise.reduce((sum, e) => sum + (e.duration || 0), 0);
    const femaleExerciseMinutes = femaleExercise.reduce((sum, e) => sum + (e.duration || 0), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit for Baby - User Data Report - ${couple.coupleId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; line-height: 1.6; }
    .report-container { max-width: 1000px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #006dab; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #006dab 0%, #0088d4 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }
    .header-text h1 { font-size: 24px; font-weight: 700; color: #006dab; }
    .header-text p { font-size: 13px; color: #64748b; }
    .couple-info { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-radius: 16px; padding: 24px; margin-bottom: 30px; border: 1px solid #0ea5e9; }
    .couple-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .couple-avatars { display: flex; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .avatar.male { background: #006dab; color: white; }
    .avatar.female { background: #98be4e; color: white; margin-left: -10px; }
    .couple-id { font-size: 20px; font-weight: 700; color: #0f172a; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-inactive { background: #fee2e2; color: #dc2626; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .user-section { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
    .user-section.male { border-left: 4px solid #006dab; }
    .user-section.female { border-left: 4px solid #98be4e; }
    .user-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 16px; font-weight: 700; }
    .user-details { font-size: 13px; color: #64748b; }
    .user-details p { margin-bottom: 6px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .summary-card { padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
    .summary-card.steps { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-color: #22c55e; }
    .summary-card.exercise { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b; }
    .summary-value { font-size: 24px; font-weight: 800; margin-bottom: 5px; }
    .summary-label { font-size: 11px; color: #64748b; font-weight: 500; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 700; color: #006dab; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .data-table thead tr { background: linear-gradient(135deg, #006dab 0%, #0088d4 100%); }
    .data-table th { color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
    .data-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .data-table tbody tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
    .print-btn { background: linear-gradient(135deg, #006dab 0%, #0088d4 100%); color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 20px; }
    @media print { .no-print { display: none; } body { padding: 20px; } }
    @media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } .info-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="header-left">
        <div class="logo">FFB</div>
        <div class="header-text">
          <h1>User Data Report</h1>
          <p>Fit for Baby - Complete Health Data</p>
        </div>
      </div>
      <div style="text-align: right; font-size: 13px; color: #64748b;">
        <strong>Generated:</strong><br>
        ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div class="couple-info">
      <div class="couple-header">
        <div class="couple-avatars">
          <div class="avatar male">♂</div>
          <div class="avatar female">♀</div>
        </div>
        <div>
          <span class="couple-id">${couple.coupleId}</span>
          <span class="status-badge status-${couple.status}">${couple.status}</span>
        </div>
      </div>
      <p style="font-size: 14px; color: #64748b; margin-bottom: 8px;">${couple.male.name} & ${couple.female.name}</p>
      <p style="font-size: 12px; color: #94a3b8;">Enrolled: ${couple.enrollmentDate}</p>
      
      <div class="info-grid" style="margin-top: 20px;">
        <div class="user-section male">
          <div class="user-header" style="color: #006dab;">♂ ${couple.male.name} (${couple.male.id || couple.coupleId + '_M'})</div>
          <div class="user-details">
            <p><strong>Email:</strong> ${couple.male.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${couple.male.phone || 'N/A'}</p>
            <p><strong>Age:</strong> ${couple.male.age ? couple.male.age + ' years' : 'N/A'}</p>
            <p><strong>DOB:</strong> ${couple.male.dateOfBirth ? formatDate(couple.male.dateOfBirth) : 'N/A'}</p>
            <p><strong>Weight:</strong> ${couple.male.weight ? couple.male.weight + ' kg' : 'N/A'}</p>
            <p><strong>Height:</strong> ${couple.male.height ? couple.male.height + ' cm' : 'N/A'}</p>
            <p><strong>BMI:</strong> ${couple.male.bmi || 'N/A'}</p>
            ${couple.male.address ? `<p><strong>Address:</strong> ${[couple.male.address.addressLine1, couple.male.address.city, couple.male.address.state, couple.male.address.pincode].filter(Boolean).join(', ')}</p>` : ''}
            <p><strong>Password Set:</strong> ${couple.male.isPasswordReset ? 'Yes ✓' : 'No'}</p>
            <p><strong>PIN Set:</strong> ${couple.male.isPinSet ? 'Yes ✓' : 'No'}</p>
          </div>
        </div>
        <div class="user-section female">
          <div class="user-header" style="color: #7da33e;">♀ ${couple.female.name} (${couple.female.id || couple.coupleId + '_F'})</div>
          <div class="user-details">
            <p><strong>Email:</strong> ${couple.female.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${couple.female.phone || 'N/A'}</p>
            <p><strong>Age:</strong> ${couple.female.age ? couple.female.age + ' years' : 'N/A'}</p>
            <p><strong>DOB:</strong> ${couple.female.dateOfBirth ? formatDate(couple.female.dateOfBirth) : 'N/A'}</p>
            <p><strong>Weight:</strong> ${couple.female.weight ? couple.female.weight + ' kg' : 'N/A'}</p>
            <p><strong>Height:</strong> ${couple.female.height ? couple.female.height + ' cm' : 'N/A'}</p>
            <p><strong>BMI:</strong> ${couple.female.bmi || 'N/A'}</p>
            ${couple.female.address ? `<p><strong>Address:</strong> ${[couple.female.address.addressLine1, couple.female.address.city, couple.female.address.state, couple.female.address.pincode].filter(Boolean).join(', ')}</p>` : ''}
            <p><strong>Password Set:</strong> ${couple.female.isPasswordReset ? 'Yes ✓' : 'No'}</p>
            <p><strong>PIN Set:</strong> ${couple.female.isPinSet ? 'Yes ✓' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card steps">
        <div class="summary-value" style="color: #16a34a;">${maleAvgSteps.toLocaleString()}</div>
        <div class="summary-label">♂ Avg Daily Steps</div>
      </div>
      <div class="summary-card steps">
        <div class="summary-value" style="color: #16a34a;">${femaleAvgSteps.toLocaleString()}</div>
        <div class="summary-label">♀ Avg Daily Steps</div>
      </div>
      <div class="summary-card exercise">
        <div class="summary-value" style="color: #d97706;">${maleExerciseMinutes}</div>
        <div class="summary-label">♂ Exercise Min (30d)</div>
      </div>
      <div class="summary-card exercise">
        <div class="summary-value" style="color: #d97706;">${femaleExerciseMinutes}</div>
        <div class="summary-label">♀ Exercise Min (30d)</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📊 Steps Log (Last 30 Days)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #006dab; margin-bottom: 10px;">♂ ${couple.male.name}</h4>
          ${maleSteps.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Steps</th><th>Goal</th></tr></thead>
            <tbody>
              ${maleSteps.slice(0, 15).map(s => `<tr><td>${formatDate(s.date)}</td><td>${(s.steps || 0).toLocaleString()}</td><td>${(s.goal || 10000).toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
        <div>
          <h4 style="color: #7da33e; margin-bottom: 10px;">♀ ${couple.female.name}</h4>
          ${femaleSteps.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Steps</th><th>Goal</th></tr></thead>
            <tbody>
              ${femaleSteps.slice(0, 15).map(s => `<tr><td>${formatDate(s.date)}</td><td>${(s.steps || 0).toLocaleString()}</td><td>${(s.goal || 10000).toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">⚖️ Weight Log</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #006dab; margin-bottom: 10px;">♂ ${couple.male.name}</h4>
          ${maleWeight.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Weight (kg)</th><th>Notes</th></tr></thead>
            <tbody>
              ${maleWeight.slice(0, 10).map(w => `<tr><td>${formatDate(w.date)}</td><td>${w.weight}</td><td>${w.notes || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
        <div>
          <h4 style="color: #7da33e; margin-bottom: 10px;">♀ ${couple.female.name}</h4>
          ${femaleWeight.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Weight (kg)</th><th>Notes</th></tr></thead>
            <tbody>
              ${femaleWeight.slice(0, 10).map(w => `<tr><td>${formatDate(w.date)}</td><td>${w.weight}</td><td>${w.notes || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🏃 Exercise Log (Last 30 Days)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #006dab; margin-bottom: 10px;">♂ ${couple.male.name}</h4>
          ${maleExercise.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Calories</th></tr></thead>
            <tbody>
              ${maleExercise.slice(0, 10).map(e => `<tr><td>${formatDate(e.date)}</td><td>${e.exerciseType || e.type || 'Exercise'}</td><td>${e.duration || 0} min</td><td>${e.caloriesBurned || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
        <div>
          <h4 style="color: #7da33e; margin-bottom: 10px;">♀ ${couple.female.name}</h4>
          ${femaleExercise.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Calories</th></tr></thead>
            <tbody>
              ${femaleExercise.slice(0, 10).map(e => `<tr><td>${formatDate(e.date)}</td><td>${e.exerciseType || e.type || 'Exercise'}</td><td>${e.duration || 0} min</td><td>${e.caloriesBurned || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🍽️ Food Log (Last 7 Days)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #006dab; margin-bottom: 10px;">♂ ${couple.male.name} (${maleFood.length} entries)</h4>
          ${maleFood.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Meal</th><th>Food</th><th>Cal</th></tr></thead>
            <tbody>
              ${maleFood.slice(0, 10).map(f => `<tr><td>${formatDate(f.date)}</td><td>${f.mealType || 'Meal'}</td><td>${f.foodName || f.name || 'Food'}</td><td>${f.calories || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
        <div>
          <h4 style="color: #7da33e; margin-bottom: 10px;">♀ ${couple.female.name} (${femaleFood.length} entries)</h4>
          ${femaleFood.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Date</th><th>Meal</th><th>Food</th><th>Cal</th></tr></thead>
            <tbody>
              ${femaleFood.slice(0, 10).map(f => `<tr><td>${formatDate(f.date)}</td><td>${f.mealType || 'Meal'}</td><td>${f.foodName || f.name || 'Food'}</td><td>${f.calories || '-'}</td></tr>`).join('')}
            </tbody>
          </table>` : '<p style="color: #94a3b8;">No data</p>'}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📋 Questionnaire Progress</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: #f8fafc; padding: 16px; border-radius: 10px; border-left: 4px solid #006dab;">
          <h4 style="color: #006dab; margin-bottom: 10px;">♂ ${couple.male.name}</h4>
          <p><strong>Status:</strong> ${maleQuestionnaire?.isComplete ? '✅ Completed' : '⏳ In Progress'}</p>
          <p><strong>Progress:</strong> ${maleQuestionnaire?.progress || 0}%</p>
          <p><strong>Answers:</strong> ${maleQuestionnaire?.answers ? Object.keys(maleQuestionnaire.answers).length : 0}</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; border-radius: 10px; border-left: 4px solid #98be4e;">
          <h4 style="color: #7da33e; margin-bottom: 10px;">♀ ${couple.female.name}</h4>
          <p><strong>Status:</strong> ${femaleQuestionnaire?.isComplete ? '✅ Completed' : '⏳ In Progress'}</p>
          <p><strong>Progress:</strong> ${femaleQuestionnaire?.progress || 0}%</p>
          <p><strong>Answers:</strong> ${femaleQuestionnaire?.answers ? Object.keys(femaleQuestionnaire.answers).length : 0}</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <p style="font-weight: 600; color: #006dab; margin-bottom: 5px;">Fit for Baby - Health Monitoring System</p>
      <p>Complete user data report for ${couple.coupleId}</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 30px;">
      <button onclick="window.print()" class="print-btn">🖨️ Print / Save as PDF</button>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate CSV for user export
  const generateUserExportCSV = (data: {
    couple: Couple;
    maleSteps: any[];
    femaleSteps: any[];
    maleWeight: any[];
    femaleWeight: any[];
    maleExercise: any[];
    femaleExercise: any[];
  }, separator: string = ',') => {
    const { couple, maleSteps, femaleSteps, maleWeight, femaleWeight, maleExercise, femaleExercise } = data;
    const s = separator;
    
    let csv = '';
    
    // Header Info
    csv += `Fit for Baby - User Data Export\n`;
    csv += `Generated${s}${new Date().toLocaleString()}\n`;
    csv += `\n`;
    
    // Couple Info
    csv += `COUPLE INFORMATION\n`;
    csv += `Couple ID${s}${couple.coupleId}\n`;
    csv += `Status${s}${couple.status}\n`;
    csv += `Enrolled${s}${couple.enrollmentDate}\n`;
    csv += `\n`;
    
    // Male User Info
    csv += `MALE USER - ${couple.male.name}\n`;
    csv += `ID${s}${couple.male.id || couple.coupleId + '_M'}\n`;
    csv += `Email${s}${couple.male.email || 'N/A'}\n`;
    csv += `Phone${s}${couple.male.phone || 'N/A'}\n`;
    csv += `Age${s}${couple.male.age || 'N/A'}\n`;
    csv += `Weight${s}${couple.male.weight ? couple.male.weight + ' kg' : 'N/A'}\n`;
    csv += `Height${s}${couple.male.height ? couple.male.height + ' cm' : 'N/A'}\n`;
    csv += `BMI${s}${couple.male.bmi || 'N/A'}\n`;
    csv += `\n`;
    
    // Female User Info
    csv += `FEMALE USER - ${couple.female.name}\n`;
    csv += `ID${s}${couple.female.id || couple.coupleId + '_F'}\n`;
    csv += `Email${s}${couple.female.email || 'N/A'}\n`;
    csv += `Phone${s}${couple.female.phone || 'N/A'}\n`;
    csv += `Age${s}${couple.female.age || 'N/A'}\n`;
    csv += `Weight${s}${couple.female.weight ? couple.female.weight + ' kg' : 'N/A'}\n`;
    csv += `Height${s}${couple.female.height ? couple.female.height + ' cm' : 'N/A'}\n`;
    csv += `BMI${s}${couple.female.bmi || 'N/A'}\n`;
    csv += `\n`;
    
    // Steps Data
    csv += `STEPS DATA (MALE)\n`;
    csv += `Date${s}Steps${s}Goal\n`;
    maleSteps.forEach(step => {
      csv += `${step.date}${s}${step.steps || 0}${s}${step.goal || 10000}\n`;
    });
    csv += `\n`;
    
    csv += `STEPS DATA (FEMALE)\n`;
    csv += `Date${s}Steps${s}Goal\n`;
    femaleSteps.forEach(step => {
      csv += `${step.date}${s}${step.steps || 0}${s}${step.goal || 10000}\n`;
    });
    csv += `\n`;
    
    // Weight Data
    csv += `WEIGHT DATA (MALE)\n`;
    csv += `Date${s}Weight (kg)${s}Notes\n`;
    maleWeight.forEach(w => {
      csv += `${w.date}${s}${w.weight}${s}${(w.notes || '').replace(/,/g, ' ')}\n`;
    });
    csv += `\n`;
    
    csv += `WEIGHT DATA (FEMALE)\n`;
    csv += `Date${s}Weight (kg)${s}Notes\n`;
    femaleWeight.forEach(w => {
      csv += `${w.date}${s}${w.weight}${s}${(w.notes || '').replace(/,/g, ' ')}\n`;
    });
    csv += `\n`;
    
    // Exercise Data
    csv += `EXERCISE DATA (MALE)\n`;
    csv += `Date${s}Type${s}Duration (min)${s}Calories\n`;
    maleExercise.forEach(e => {
      csv += `${e.date}${s}${e.exerciseType || e.type || 'Exercise'}${s}${e.duration || 0}${s}${e.caloriesBurned || ''}\n`;
    });
    csv += `\n`;
    
    csv += `EXERCISE DATA (FEMALE)\n`;
    csv += `Date${s}Type${s}Duration (min)${s}Calories\n`;
    femaleExercise.forEach(e => {
      csv += `${e.date}${s}${e.exerciseType || e.type || 'Exercise'}${s}${e.duration || 0}${s}${e.caloriesBurned || ''}\n`;
    });
    
    return csv;
  };

  // Header with search
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.headerTop, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>{couples.length} couples enrolled</Text>
        </View>
        <View style={[{ flexDirection: 'row', gap: 10 }, isMobile && { width: '100%' }]}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: COLORS.accent }, isMobile && { flex: 1 }]}
            onPress={() => setShowExportAllModal(true)}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Export All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, isMobile && { flex: 1 }]}
            onPress={() => setShowEnrollModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Couple</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Name, Couple ID, or Phone..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            {(['all', 'active', 'inactive', 'pending'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </View>
    </View>
  );

  // Couple Row (Expandable)
  const renderCoupleRow = (couple: Couple) => {
    const isExpanded = expandedCouples.includes(couple.id);

    return (
      <View key={couple.id} style={styles.coupleContainer}>
        {/* Couple Header Row */}
        <TouchableOpacity
          style={styles.coupleRow}
          onPress={() => toggleCoupleExpand(couple.id)}
          activeOpacity={0.7}
        >
          <View style={styles.coupleAvatars}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="male" size={16} color="#fff" />
            </View>
            <View style={[styles.avatar, { backgroundColor: COLORS.accent, marginLeft: -12 }]}>
              <Ionicons name="female" size={16} color="#fff" />
            </View>
          </View>

          <View style={styles.coupleInfo}>
            <View style={styles.coupleIdRow}>
              <Text style={styles.coupleId}>{couple.coupleId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(couple.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(couple.status) }]}>
                  {couple.status}
                </Text>
              </View>
              {/* Export Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.primary + '15',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginLeft: 8,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleExportUser(couple);
                }}
              >
                <Ionicons name="download-outline" size={14} color={COLORS.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary, marginLeft: 4 }}>Export</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.coupleNames}>
              {couple.male.name} & {couple.female.name}
            </Text>
            <Text style={styles.enrollmentDate}>
              Enrolled: {couple.enrollmentDate}
              {couple.enrolledBy && (
                <Text style={styles.enrolledByText}>
                  {' • by '}{couple.enrolledByName || adminsMap[couple.enrolledBy] || 'Admin'}
                </Text>
              )}
            </Text>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Expanded User Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Male User */}
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={[styles.genderIcon, { backgroundColor: COLORS.primary + '15' }]}>
                  <Ionicons name="male" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.userIdContainer}>
                  <Text style={styles.userId}>{couple.male.id}</Text>
                  <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(couple.male.status) }]} />
                </View>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Ionicons name="person" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.male.name}</Text>
                </View>
                {couple.male.age ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>Age: {couple.male.age} years</Text>
                  </View>
                ) : null}
                {couple.male.dateOfBirth ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="gift" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>DOB: {new Date(couple.male.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                ) : null}
                {couple.male.phone ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.male.phone}</Text>
                  </View>
                ) : null}
                {couple.male.email ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.male.email}</Text>
                  </View>
                ) : null}
                {couple.male.address && (couple.male.address.addressLine1 || couple.male.address.city || couple.male.address.state) ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="location" size={14} color={COLORS.textMuted} />
                    <Text style={[styles.userDetailText, { flex: 1 }]} numberOfLines={2}>
                      {[couple.male.address.addressLine1, couple.male.address.addressLine2, couple.male.address.city, couple.male.address.state, couple.male.address.pincode].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
                {/* Health Metrics - only show if at least one value exists */}
                {(couple.male.weight || couple.male.height || couple.male.bmi) && (
                  <View style={styles.healthMetricsRow}>
                    {couple.male.weight ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="fitness" size={14} color={COLORS.primary} />
                        <Text style={styles.healthMetricLabel}>Weight</Text>
                        <Text style={styles.healthMetricValue}>{couple.male.weight} kg</Text>
                      </View>
                    ) : null}
                    {couple.male.height ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="resize-outline" size={14} color={COLORS.accent} />
                        <Text style={styles.healthMetricLabel}>Height</Text>
                        <Text style={styles.healthMetricValue}>{couple.male.height} cm</Text>
                      </View>
                    ) : null}
                    {couple.male.bmi ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="body" size={14} color={COLORS.info} />
                        <Text style={styles.healthMetricLabel}>BMI</Text>
                        <Text style={styles.healthMetricValue}>{couple.male.bmi}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
                {couple.male.lastActive ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="time" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>Last Login: {couple.male.lastActive}</Text>
                  </View>
                ) : null}
                
                {/* Setup Status & Temp Password */}
                <View style={styles.setupStatusRow}>
                  <View style={[styles.setupBadge, { backgroundColor: couple.male.isPasswordReset ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.male.isPasswordReset ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.male.isPasswordReset ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.male.isPasswordReset ? COLORS.success : COLORS.warning }]}>
                      {couple.male.isPasswordReset ? 'Password Set' : 'Needs Reset'}
                    </Text>
                  </View>
                  <View style={[styles.setupBadge, { backgroundColor: couple.male.isPinSet ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.male.isPinSet ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.male.isPinSet ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.male.isPinSet ? COLORS.success : COLORS.warning }]}>
                      {couple.male.isPinSet ? 'PIN Set' : 'Needs PIN'}
                    </Text>
                  </View>
                </View>
                
                {/* Show temp password if not yet reset */}
                {!couple.male.isPasswordReset && couple.male.tempPassword && (
                  <View style={styles.tempPasswordRow}>
                    <Ionicons name="key" size={14} color={COLORS.warning} />
                    <Text style={styles.tempPasswordLabel}>Temp Password:</Text>
                    <Text style={styles.tempPasswordValue}>{couple.male.tempPassword}</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.coupleId, 'male')}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.coupleId, 'male')}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('resetPin', couple.coupleId, 'male')}
                >
                  <Ionicons name="keypad-outline" size={16} color={COLORS.info} />
                  <Text style={[styles.actionButtonText, { color: COLORS.info }]}>Reset PIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.coupleId, 'male')}
                >
                  <Ionicons name={couple.male.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.male.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.male.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.male.status === 'active' ? 'Pause' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.testButton]}
                  onPress={() => handleOpenTestModal(couple.coupleId, 'male', couple.male.name)}
                >
                  <Ionicons name="flask" size={16} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Test</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Female User */}
            <View style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={[styles.genderIcon, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="female" size={18} color={COLORS.accentDark} />
                </View>
                <View style={styles.userIdContainer}>
                  <Text style={styles.userId}>{couple.female.id}</Text>
                  <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(couple.female.status) }]} />
                </View>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Ionicons name="person" size={14} color={COLORS.textMuted} />
                  <Text style={styles.userDetailText}>{couple.female.name}</Text>
                </View>
                {couple.female.age ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>Age: {couple.female.age} years</Text>
                  </View>
                ) : null}
                {couple.female.dateOfBirth ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="gift" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>DOB: {new Date(couple.female.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                ) : null}
                {couple.female.phone ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.female.phone}</Text>
                  </View>
                ) : null}
                {couple.female.email ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="mail" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>{couple.female.email}</Text>
                  </View>
                ) : null}
                {couple.female.address && (couple.female.address.addressLine1 || couple.female.address.city || couple.female.address.state) ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="location" size={14} color={COLORS.textMuted} />
                    <Text style={[styles.userDetailText, { flex: 1 }]} numberOfLines={2}>
                      {[couple.female.address.addressLine1, couple.female.address.addressLine2, couple.female.address.city, couple.female.address.state, couple.female.address.pincode].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
                {/* Health Metrics - only show if at least one value exists */}
                {(couple.female.weight || couple.female.height || couple.female.bmi) && (
                  <View style={styles.healthMetricsRow}>
                    {couple.female.weight ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="fitness" size={14} color={COLORS.primary} />
                        <Text style={styles.healthMetricLabel}>Weight</Text>
                        <Text style={styles.healthMetricValue}>{couple.female.weight} kg</Text>
                      </View>
                    ) : null}
                    {couple.female.height ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="resize-outline" size={14} color={COLORS.accent} />
                        <Text style={styles.healthMetricLabel}>Height</Text>
                        <Text style={styles.healthMetricValue}>{couple.female.height} cm</Text>
                      </View>
                    ) : null}
                    {couple.female.bmi ? (
                      <View style={styles.healthMetric}>
                        <Ionicons name="body" size={14} color={COLORS.info} />
                        <Text style={styles.healthMetricLabel}>BMI</Text>
                        <Text style={styles.healthMetricValue}>{couple.female.bmi}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
                {couple.female.lastActive ? (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="time" size={14} color={COLORS.textMuted} />
                    <Text style={styles.userDetailText}>Last Login: {couple.female.lastActive}</Text>
                  </View>
                ) : null}
                
                {/* Setup Status & Temp Password */}
                <View style={styles.setupStatusRow}>
                  <View style={[styles.setupBadge, { backgroundColor: couple.female.isPasswordReset ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.female.isPasswordReset ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.female.isPasswordReset ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.female.isPasswordReset ? COLORS.success : COLORS.warning }]}>
                      {couple.female.isPasswordReset ? 'Password Set' : 'Needs Reset'}
                    </Text>
                  </View>
                  <View style={[styles.setupBadge, { backgroundColor: couple.female.isPinSet ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Ionicons name={couple.female.isPinSet ? 'checkmark-circle' : 'alert-circle'} size={12} color={couple.female.isPinSet ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.setupBadgeText, { color: couple.female.isPinSet ? COLORS.success : COLORS.warning }]}>
                      {couple.female.isPinSet ? 'PIN Set' : 'Needs PIN'}
                    </Text>
                  </View>
                </View>
                
                {/* Show temp password if not yet reset */}
                {!couple.female.isPasswordReset && couple.female.tempPassword && (
                  <View style={styles.tempPasswordRow}>
                    <Ionicons name="key" size={14} color={COLORS.warning} />
                    <Text style={styles.tempPasswordLabel}>Temp Password:</Text>
                    <Text style={styles.tempPasswordValue}>{couple.female.tempPassword}</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('edit', couple.coupleId, 'female')}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('reset', couple.coupleId, 'female')}
                >
                  <Ionicons name="key-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Reset Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('resetPin', couple.coupleId, 'female')}
                >
                  <Ionicons name="keypad-outline" size={16} color={COLORS.info} />
                  <Text style={[styles.actionButtonText, { color: COLORS.info }]}>Reset PIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUserAction('toggle', couple.coupleId, 'female')}
                >
                  <Ionicons name={couple.female.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={couple.female.status === 'active' ? COLORS.error : COLORS.success} />
                  <Text style={[styles.actionButtonText, { color: couple.female.status === 'active' ? COLORS.error : COLORS.success }]}>
                    {couple.female.status === 'active' ? 'Pause' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.testButton]}
                  onPress={() => handleOpenTestModal(couple.coupleId, 'female', couple.female.name)}
                >
                  <Ionicons name="flask" size={16} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Test</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Couple Actions - Delete button */}
            <View style={styles.coupleActionsRow}>
              <TouchableOpacity
                style={[styles.deleteCoupleButton]}
                onPress={() => handleDeleteCouple(couple.coupleId, couple.male.name, couple.female.name)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete Couple</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Enrollment Modal
  const renderEnrollmentModal = () => (
    <Modal
      visible={showEnrollModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEnrollModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Enroll New Couple</Text>
              <Text style={styles.modalSubtitle}>Step {enrollStep} of 2</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>1</Text>
            </View>
            <View style={[styles.progressLine, enrollStep === 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, enrollStep === 2 && styles.progressStepActive]}>
              <Text style={[styles.progressStepText, enrollStep !== 2 && styles.progressStepTextInactive]}>2</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody}>
            {enrollStep === 1 ? (
              // Step 1: Couple Profile
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Couple Profile</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Couple ID</Text>
                  <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{enrollForm.coupleId}</Text>
                    <Text style={styles.autoGenLabel}>Auto-generated</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Enrollment Date</Text>
                  <TextInput
                    style={styles.input}
                    value={enrollForm.enrollmentDate}
                    onChangeText={(text) => setEnrollForm({ ...enrollForm, enrollmentDate: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            ) : (
              // Step 2: Individual Accounts
              <View style={styles.formSection}>
                {/* Male Account */}
                <View style={styles.accountSection}>
                  <View style={styles.accountHeader}>
                    <View style={[styles.genderIcon, { backgroundColor: COLORS.primary + '15' }]}>
                      <Ionicons name="male" size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.accountTitle}>Male Account</Text>
                      <Text style={styles.accountId}>{enrollForm.coupleId}_M</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleName}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleName: text })}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleAge}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleAge: text })}
                      placeholder="Enter age"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.malePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, malePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.maleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, maleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.passwordNote}>
                    <Ionicons name="information-circle" size={16} color={COLORS.info} />
                    <Text style={styles.passwordNoteText}>Temporary password will be auto-generated with Force Reset enabled</Text>
                  </View>
                </View>

                {/* Female Account */}
                <View style={styles.accountSection}>
                  <View style={styles.accountHeader}>
                    <View style={[styles.genderIcon, { backgroundColor: COLORS.accent + '20' }]}>
                      <Ionicons name="female" size={18} color={COLORS.accentDark} />
                    </View>
                    <View>
                      <Text style={styles.accountTitle}>Female Account</Text>
                      <Text style={styles.accountId}>{enrollForm.coupleId}_F</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleName}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleName: text })}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleAge}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleAge: text })}
                      placeholder="Enter age"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femalePhone}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femalePhone: text })}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={enrollForm.femaleEmail}
                      onChangeText={(text) => setEnrollForm({ ...enrollForm, femaleEmail: text })}
                      placeholder="Enter email address"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.passwordNote}>
                    <Ionicons name="information-circle" size={16} color={COLORS.info} />
                    <Text style={styles.passwordNoteText}>Temporary password will be auto-generated with Force Reset enabled</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            {enrollStep === 2 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setEnrollStep(1)}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEnrollSubmit}
            >
              <Text style={styles.submitButtonText}>
                {enrollStep === 1 ? 'Continue' : 'Enroll Couple'}
              </Text>
              <Ionicons name={enrollStep === 1 ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Toast Component
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

  // Temp Password Modal
  const renderTempPasswordModal = () => {
    // Determine if this is a single user reset or enrollment (both users)
    const isSingleUserReset = !tempPasswordInfo.maleTempPassword || !tempPasswordInfo.femaleTempPassword;
    
    return (
      <Modal
        visible={showTempPasswordModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTempPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.tempPasswordModal, isMobile && styles.modalContentMobile]}>
            <View style={styles.tempPasswordHeader}>
              <View style={[styles.tempPasswordIcon, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name={isSingleUserReset ? "key" : "checkmark-circle"} size={48} color={isSingleUserReset ? COLORS.warning : COLORS.success} />
              </View>
              <Text style={styles.tempPasswordTitle}>
                {isSingleUserReset ? 'Password Reset Successful!' : 'Enrollment Successful!'}
              </Text>
              <Text style={styles.tempPasswordSubtitle}>
                {isSingleUserReset 
                  ? 'Share this new password with the user'
                  : 'Share these credentials with each user individually'}
              </Text>
            </View>

            <View style={styles.credentialBox}>
              <Text style={styles.credentialLabel}>Couple ID</Text>
              <View style={styles.credentialValue}>
                <Text style={styles.credentialText}>{tempPasswordInfo.coupleId}</Text>
              </View>
            </View>

            {/* Male User Credentials - show only if has password */}
            {tempPasswordInfo.maleTempPassword && (
              <View style={[styles.credentialBox, { borderLeftColor: COLORS.primary, borderLeftWidth: 3 }]}>
                <View style={styles.credentialUserHeader}>
                  <Ionicons name="male" size={16} color={COLORS.primary} />
                  <Text style={[styles.credentialLabel, { color: COLORS.primary }]}>
                    {tempPasswordInfo.maleName} ({tempPasswordInfo.coupleId}_M)
                  </Text>
                </View>
                <View style={styles.credentialValue}>
                  <Text style={[styles.credentialText, styles.passwordText]}>{tempPasswordInfo.maleTempPassword}</Text>
                </View>
              </View>
            )}

            {/* Female User Credentials - show only if has password */}
            {tempPasswordInfo.femaleTempPassword && (
              <View style={[styles.credentialBox, { borderLeftColor: COLORS.accent, borderLeftWidth: 3 }]}>
                <View style={styles.credentialUserHeader}>
                  <Ionicons name="female" size={16} color={COLORS.accentDark} />
                  <Text style={[styles.credentialLabel, { color: COLORS.accentDark }]}>
                    {tempPasswordInfo.femaleName} ({tempPasswordInfo.coupleId}_F)
                  </Text>
                </View>
                <View style={styles.credentialValue}>
                  <Text style={[styles.credentialText, styles.passwordText]}>{tempPasswordInfo.femaleTempPassword}</Text>
                </View>
              </View>
            )}

            <View style={styles.tempPasswordNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.info} />
              <Text style={styles.tempPasswordNoteText}>
                {isSingleUserReset
                  ? 'The user must login with their ID/Phone/Email and reset their password.'
                  : 'Each user must login with their own ID/Phone/Email and reset their password individually.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.tempPasswordButton}
              onPress={() => setShowTempPasswordModal(false)}
            >
              <Text style={styles.tempPasswordButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Edit Profile Modal
  const renderEditModal = () => {
    if (!editingUser) return null;
    
    const genderColor = editingUser.gender === 'male' ? COLORS.primary : COLORS.accent;
    const genderIcon = editingUser.gender === 'male' ? 'male' : 'female';
    const userId = `${editingUser.coupleId}_${editingUser.gender.charAt(0).toUpperCase()}`;
    
    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.genderIcon, { backgroundColor: genderColor + '15' }]}>
                  <Ionicons name={genderIcon} size={18} color={genderColor} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <Text style={styles.modalSubtitle}>{userId}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                {/* Personal Information */}
                <Text style={styles.formSectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    placeholder="Enter full name"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.email}
                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                    placeholder="Enter email"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                    placeholder="Enter phone number"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.age}
                      onChangeText={(text) => setEditForm({ ...editForm, age: text })}
                      placeholder="Years"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>Date of Birth</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.dateOfBirth}
                      onChangeText={(text) => setEditForm({ ...editForm, dateOfBirth: text })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                {/* Health Metrics */}
                <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>Health Metrics</Text>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.weight}
                      onChangeText={(text) => setEditForm({ ...editForm, weight: text })}
                      placeholder="kg"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>Height (cm)</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.height}
                      onChangeText={(text) => setEditForm({ ...editForm, height: text })}
                      placeholder="cm"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Address */}
                <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>Address</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address Line 1</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.addressLine1}
                    onChangeText={(text) => setEditForm({ ...editForm, addressLine1: text })}
                    placeholder="Street address"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address Line 2</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.addressLine2}
                    onChangeText={(text) => setEditForm({ ...editForm, addressLine2: text })}
                    placeholder="Apartment, suite, etc."
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.city}
                      onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                      placeholder="City"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.state}
                      onChangeText={(text) => setEditForm({ ...editForm, state: text })}
                      placeholder="State"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.pincode}
                    onChangeText={(text) => setEditForm({ ...editForm, pincode: text })}
                    placeholder="Pincode"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Lipid Test Modal
  const renderTestModal = () => {
    if (!testingUser) return null;
    
    const canAddTest = existingTests.length < 2;
    
    return (
      <Modal
        visible={showTestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeader, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="flask" size={24} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Lipid Profile Test</Text>
                  <Text style={styles.modalSubtitle}>{testingUser.userName} ({testingUser.coupleId}_{testingUser.gender === 'male' ? 'M' : 'F'})</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Existing Tests */}
              {isLoadingTests ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading tests...</Text>
                </View>
              ) : existingTests.length > 0 ? (
                <View style={styles.existingTestsSection}>
                  <Text style={styles.sectionTitle}>Previous Tests ({existingTests.length}/2)</Text>
                  {existingTests.map((test, index) => (
                    <View key={test.id} style={styles.existingTestCard}>
                      <View style={styles.testCardHeader}>
                        <Text style={styles.testCardTitle}>Test {test.testNumber}</Text>
                        <Text style={styles.testCardDate}>{test.testDate}</Text>
                      </View>
                      <View style={styles.testResultsGrid}>
                        <View style={styles.testResultItem}>
                          <Text style={styles.testResultLabel}>Cholesterol</Text>
                          <Text style={styles.testResultValue}>{test.cholesterol} mg/dL</Text>
                        </View>
                        <View style={styles.testResultItem}>
                          <Text style={styles.testResultLabel}>Triglyceride</Text>
                          <Text style={styles.testResultValue}>{test.triglyceride} mg/dL</Text>
                        </View>
                        <View style={styles.testResultItem}>
                          <Text style={styles.testResultLabel}>HDL</Text>
                          <Text style={styles.testResultValue}>{test.hdlCholesterol} mg/dL</Text>
                        </View>
                        <View style={styles.testResultItem}>
                          <Text style={styles.testResultLabel}>LDL</Text>
                          <Text style={styles.testResultValue}>{test.ldlCholesterol} mg/dL</Text>
                        </View>
                        <View style={styles.testResultItem}>
                          <Text style={styles.testResultLabel}>Chol/HDL Ratio</Text>
                          <Text style={styles.testResultValue}>{test.cholesterolHdlRatio}</Text>
                        </View>
                      </View>
                      {test.notes && (
                        <Text style={styles.testNotes}>Notes: {test.notes}</Text>
                      )}
                      <Text style={styles.testEnteredBy}>Entered by: {test.enteredByName}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noTestsMessage}>
                  <Ionicons name="flask-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.noTestsText}>No tests recorded yet</Text>
                </View>
              )}

              {/* Add New Test Form */}
              {canAddTest ? (
                <View style={styles.addTestSection}>
                  <Text style={styles.sectionTitle}>Add Test {existingTests.length + 1}</Text>
                  
                  <View style={styles.testFormRow}>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>Cholesterol (mg/dL) *</Text>
                      <TextInput
                        style={styles.testInput}
                        value={testForm.cholesterol}
                        onChangeText={(text) => setTestForm({ ...testForm, cholesterol: text })}
                        placeholder="e.g., 180"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>Triglyceride (mg/dL) *</Text>
                      <TextInput
                        style={styles.testInput}
                        value={testForm.triglyceride}
                        onChangeText={(text) => setTestForm({ ...testForm, triglyceride: text })}
                        placeholder="e.g., 150"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.testFormRow}>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>HDL Cholesterol (mg/dL) *</Text>
                      <TextInput
                        style={styles.testInput}
                        value={testForm.hdlCholesterol}
                        onChangeText={(text) => setTestForm({ ...testForm, hdlCholesterol: text })}
                        placeholder="e.g., 50"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>LDL Cholesterol (mg/dL) *</Text>
                      <TextInput
                        style={styles.testInput}
                        value={testForm.ldlCholesterol}
                        onChangeText={(text) => setTestForm({ ...testForm, ldlCholesterol: text })}
                        placeholder="e.g., 100"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.testFormRow}>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>Cholesterol/HDL Ratio *</Text>
                      <TextInput
                        style={styles.testInput}
                        value={testForm.cholesterolHdlRatio}
                        onChangeText={(text) => setTestForm({ ...testForm, cholesterolHdlRatio: text })}
                        placeholder="e.g., 3.6"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.testInputGroup}>
                      <Text style={styles.testInputLabel}>Test Date *</Text>
                      {isWeb ? (
                        <input
                          type="date"
                          value={testForm.testDate}
                          onChange={(e) => setTestForm({ ...testForm, testDate: e.target.value })}
                          style={{
                            height: 44,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            borderRadius: 8,
                            padding: '0 12px',
                            fontSize: 15,
                            color: COLORS.textPrimary,
                            backgroundColor: COLORS.surface,
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                          } as React.CSSProperties}
                        />
                      ) : (
                        <TextInput
                          style={styles.testInput}
                          value={testForm.testDate}
                          onChangeText={(text) => setTestForm({ ...testForm, testDate: text })}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={COLORS.textMuted}
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.testInputGroupFull}>
                    <Text style={styles.testInputLabel}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.testInput, { height: 60 }]}
                      value={testForm.notes}
                      onChangeText={(text) => setTestForm({ ...testForm, notes: text })}
                      placeholder="Any additional notes..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.maxTestsReached}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <Text style={styles.maxTestsText}>Maximum 2 tests have been recorded for this user</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => setShowTestModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.textSecondary }]}>Close</Text>
              </TouchableOpacity>
              {canAddTest && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: COLORS.accent, minWidth: 140 }, isSavingTest && { opacity: 0.6 }]}
                  onPress={handleSaveTestResult}
                  disabled={isSavingTest}
                >
                  {isSavingTest ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save" size={18} color="#fff" />
                      <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save Test</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Toast inside modal for visibility */}
            {toast.visible && (
              <Animated.View
                style={[
                  styles.toast,
                  { transform: [{ translateY: toastAnim }], zIndex: 9999 },
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
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Delete Confirmation Modal
  const renderDeleteModal = () => {
    if (!deletingCouple) return null;
    
    return (
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            {/* Warning Icon */}
            <View style={[styles.deleteIconCircle, { backgroundColor: COLORS.error + '15' }]}>
              <Ionicons name="warning" size={40} color={COLORS.error} />
            </View>
            
            <Text style={styles.deleteTitle}>Delete Couple?</Text>
            <Text style={styles.deleteSubtitle}>
              Are you sure you want to delete couple {deletingCouple.coupleId}?
            </Text>
            <Text style={styles.deleteNames}>
              {deletingCouple.maleName} & {deletingCouple.femaleName}
            </Text>
            
            <View style={styles.deleteWarning}>
              <Ionicons name="information-circle" size={16} color={COLORS.error} />
              <Text style={styles.deleteWarningText}>
                This action cannot be undone. All data for this couple will be permanently deleted.
              </Text>
            </View>

            <View style={styles.deleteButtonRow}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteButtonCancel]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletingCouple(null);
                }}
              >
                <Text style={[styles.deleteButtonText, { color: COLORS.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteButtonConfirm]}
                onPress={confirmDeleteCouple}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={[styles.deleteButtonText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Export Modal
  const renderExportModal = () => {
    if (!exportingCouple) return null;
    
    return (
      <Modal
        visible={showExportModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            {/* Export Icon */}
            <View style={[styles.deleteIconCircle, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="download" size={40} color={COLORS.primary} />
            </View>
            
            <Text style={styles.deleteTitle}>Export User Data</Text>
            <Text style={styles.deleteSubtitle}>
              Export data for couple {exportingCouple.coupleId}
            </Text>
            <Text style={styles.deleteNames}>
              {exportingCouple.male.name} & {exportingCouple.female.name}
            </Text>
            
            {/* Export Selection - Who to export */}
            <View style={{ marginTop: 20, width: '100%' }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, fontWeight: '600' }}>EXPORT DATA FOR:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 10,
                    backgroundColor: exportSelection === 'male' ? COLORS.primary : COLORS.background,
                    borderWidth: 1,
                    borderColor: exportSelection === 'male' ? COLORS.primary : COLORS.border,
                    alignItems: 'center',
                  }}
                  onPress={() => setExportSelection('male')}
                >
                  <Ionicons name="male" size={20} color={exportSelection === 'male' ? '#fff' : COLORS.textSecondary} />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: exportSelection === 'male' ? '#fff' : COLORS.textSecondary,
                    marginTop: 4,
                  }}>
                    {exportingCouple.male.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 10,
                    backgroundColor: exportSelection === 'female' ? COLORS.accent : COLORS.background,
                    borderWidth: 1,
                    borderColor: exportSelection === 'female' ? COLORS.accent : COLORS.border,
                    alignItems: 'center',
                  }}
                  onPress={() => setExportSelection('female')}
                >
                  <Ionicons name="female" size={20} color={exportSelection === 'female' ? '#fff' : COLORS.textSecondary} />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: exportSelection === 'female' ? '#fff' : COLORS.textSecondary,
                    marginTop: 4,
                  }}>
                    {exportingCouple.female.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 10,
                    backgroundColor: exportSelection === 'couple' ? COLORS.info : COLORS.background,
                    borderWidth: 1,
                    borderColor: exportSelection === 'couple' ? COLORS.info : COLORS.border,
                    alignItems: 'center',
                  }}
                  onPress={() => setExportSelection('couple')}
                >
                  <Ionicons name="people" size={20} color={exportSelection === 'couple' ? '#fff' : COLORS.textSecondary} />
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: exportSelection === 'couple' ? '#fff' : COLORS.textSecondary,
                    marginTop: 4,
                  }}>
                    Both
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Data Included */}
            <View style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 10, marginTop: 16, width: '100%' }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' }}>DATA INCLUDED:</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 }}>
                • Personal information{'\n'}
                • Steps history (30 days){'\n'}
                • Weight logs{'\n'}
                • Exercise logs (30 days){'\n'}
                • Food logs (7 days){'\n'}
                • Questionnaire progress
              </Text>
            </View>
            
            {/* Export Format Selection */}
            <View style={{ marginTop: 20, width: '100%' }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, fontWeight: '600' }}>SELECT FORMAT:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['pdf', 'csv', 'excel'] as const).map(format => (
                  <TouchableOpacity
                    key={format}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      backgroundColor: exportFormat === format ? COLORS.primary : COLORS.background,
                      borderWidth: 1,
                      borderColor: exportFormat === format ? COLORS.primary : COLORS.border,
                      alignItems: 'center',
                    }}
                    onPress={() => setExportFormat(format)}
                  >
                    <Ionicons 
                      name={format === 'pdf' ? 'document-text' : format === 'csv' ? 'grid' : 'document'} 
                      size={20} 
                      color={exportFormat === format ? '#fff' : COLORS.textSecondary} 
                    />
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: exportFormat === format ? '#fff' : COLORS.textSecondary,
                      marginTop: 4,
                      textTransform: 'uppercase',
                    }}>
                      {format}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.deleteButtonRow, { marginTop: 24 }]}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteButtonCancel]}
                onPress={() => {
                  setShowExportModal(false);
                  setExportingCouple(null);
                }}
              >
                <Text style={[styles.deleteButtonText, { color: COLORS.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: COLORS.primary }]}
                onPress={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download" size={18} color="#fff" />
                    <Text style={[styles.deleteButtonText, { color: '#fff' }]}>Export</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Export All Modal
  const renderExportAllModal = () => {
    return (
      <Modal
        visible={showExportAllModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowExportAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            {/* Export Icon */}
            <View style={[styles.deleteIconCircle, { backgroundColor: COLORS.accent + '15' }]}>
              <Ionicons name="cloud-download" size={40} color={COLORS.accent} />
            </View>
            
            <Text style={styles.deleteTitle}>Export All Couples</Text>
            <Text style={styles.deleteSubtitle}>
              Export summary data for all {couples.length} couples
            </Text>
            
            {/* Data Included */}
            <View style={{ backgroundColor: COLORS.background, padding: 12, borderRadius: 10, marginTop: 16, width: '100%' }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' }}>DATA INCLUDED:</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 }}>
                • Couple ID & Status{'\n'}
                • Enrollment Date{'\n'}
                • Male & Female Names{'\n'}
                • Contact Information (Email, Phone){'\n'}
                • Age & Account Status
              </Text>
            </View>
            
            {/* Export Format Selection */}
            <View style={{ marginTop: 16, width: '100%' }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10, fontWeight: '600' }}>SELECT FORMAT:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['pdf', 'csv', 'excel'] as const).map(format => (
                  <TouchableOpacity
                    key={format}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      backgroundColor: exportAllFormat === format ? COLORS.accent : COLORS.background,
                      borderWidth: 1,
                      borderColor: exportAllFormat === format ? COLORS.accent : COLORS.border,
                      alignItems: 'center',
                    }}
                    onPress={() => setExportAllFormat(format)}
                  >
                    <Ionicons 
                      name={format === 'pdf' ? 'document-text' : format === 'csv' ? 'grid' : 'document'} 
                      size={20} 
                      color={exportAllFormat === format ? '#fff' : COLORS.textSecondary} 
                    />
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: exportAllFormat === format ? '#fff' : COLORS.textSecondary,
                      marginTop: 4,
                      textTransform: 'uppercase',
                    }}>
                      {format}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.deleteButtonRow, { marginTop: 24 }]}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteButtonCancel]}
                onPress={() => setShowExportAllModal(false)}
              >
                <Text style={[styles.deleteButtonText, { color: COLORS.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: COLORS.accent }]}
                onPress={handleExportAllCouples}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download" size={18} color="#fff" />
                    <Text style={[styles.deleteButtonText, { color: '#fff' }]}>Export All</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading couples...</Text>
      </View>
    );
  }

  // Empty state with helpful message
  const renderEmptyState = () => {
    const isFiltered = searchQuery || filterStatus !== 'all';
    const hasNoCouples = couples.length === 0;
    
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.primary + '10' }]}>
          <Ionicons 
            name={hasNoCouples ? "people-outline" : "search-outline"} 
            size={48} 
            color={COLORS.primary} 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {hasNoCouples ? 'No couples enrolled yet' : 'No couples found'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasNoCouples 
            ? 'Get started by enrolling your first couple using the button above' 
            : 'Try adjusting your search or filters'}
        </Text>
        {hasNoCouples && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setShowEnrollModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Enroll First Couple</Text>
          </TouchableOpacity>
        )}
        {isFiltered && !hasNoCouples && (
          <TouchableOpacity
            style={[styles.emptyActionButton, { backgroundColor: COLORS.textSecondary }]}
            onPress={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, !isMobile && styles.contentDesktop]}>
          {filteredCouples.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredCouples.map(renderCoupleRow)
          )}
        </View>
      </ScrollView>

      {renderEnrollmentModal()}
      {renderTempPasswordModal()}
      {renderEditModal()}
      {renderTestModal()}
      {renderDeleteModal()}
      {renderExportModal()}
      {renderExportAllModal()}
      {toast.visible && renderToast()}
      
      {/* Loading overlay for actions */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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

  // Header Styles
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filtersContainer: {
    marginTop: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Couple Row Styles
  coupleContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  coupleAvatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  coupleInfo: {
    flex: 1,
  },
  coupleIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  coupleId: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupText: {
    fontSize: 10,
    fontWeight: '600',
  },
  coupleNames: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  enrollmentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  enrolledByText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Expanded Content Styles
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  userCard: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 14,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  genderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  miniStatusBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userDetails: {
    gap: 8,
    marginBottom: 14,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  healthMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  healthMetric: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  healthMetricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  healthMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  setupStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  setupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  setupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tempPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  tempPasswordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  tempPasswordValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Appointment Card Styles
  appointmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  appointmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appointmentContent: {
    gap: 10,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  appointmentDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  appointmentDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  appointmentTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appointmentTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  appointmentDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  appointmentDetailValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  noAppointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noAppointmentText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Modal Styles
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  progressStepTextInactive: {
    color: COLORS.textMuted,
  },
  progressLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    gap: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  autoGenLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 10,
  },
  radioOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  radioTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  accountSection: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  accountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  accountId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  passwordNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '10',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  passwordNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.info,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    gap: 6,
  },
  backButtonText: {
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
  // Generic modal buttons used in edit modal footer
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  modalButtonOutline: {
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 24,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // Temp Password Modal
  tempPasswordModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  tempPasswordHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tempPasswordIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tempPasswordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tempPasswordSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  credentialBox: {
    width: '100%',
    marginBottom: 16,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credentialUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  credentialValue: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  credentialText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  passwordText: {
    fontFamily: 'monospace',
  },
  tempPasswordNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  tempPasswordNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.info,
    lineHeight: 18,
  },
  tempPasswordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  tempPasswordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Input Row (for side by side inputs)
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Couple Actions Row
  coupleActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 16,
  },

  // Delete Couple Button
  deleteCoupleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },

  // Delete Modal
  deleteModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  deleteSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  deleteNames: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.error + '10',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  deleteWarningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    lineHeight: 18,
  },
  deleteButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  deleteButtonCancel: {
    backgroundColor: COLORS.borderLight,
  },
  deleteButtonConfirm: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Test Modal Styles
    existingTestsSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginBottom: 12,
    },
    existingTestCard: {
      backgroundColor: COLORS.borderLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    testCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    testCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.primary,
    },
    testCardDate: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    testResultsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    testResultItem: {
      backgroundColor: COLORS.surface,
      borderRadius: 8,
      padding: 10,
      minWidth: '48%',
      flex: 1,
    },
    testResultLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      marginBottom: 2,
    },
    testResultValue: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    testNotes: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontStyle: 'italic',
      marginTop: 10,
    },
    testEnteredBy: {
      fontSize: 11,
      color: COLORS.textMuted,
      marginTop: 8,
    },
    noTestsMessage: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
      gap: 8,
    },
    noTestsText: {
      fontSize: 14,
      color: COLORS.textMuted,
    },
    addTestSection: {
      marginTop: 10,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    testFormRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    testInputGroup: {
      flex: 1,
    },
    testInputGroupFull: {
      marginBottom: 12,
    },
    testInputLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: COLORS.textSecondary,
      marginBottom: 6,
    },
    testInput: {
      backgroundColor: COLORS.borderLight,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: COLORS.textPrimary,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    maxTestsReached: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.success + '15',
      borderRadius: 12,
      padding: 16,
      gap: 10,
      marginTop: 16,
    },
    maxTestsText: {
      fontSize: 14,
      color: COLORS.success,
      fontWeight: '500',
    },
  // Styled Test and Export Buttons
  testButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportUserButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});