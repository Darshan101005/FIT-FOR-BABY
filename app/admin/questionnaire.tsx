import { questionnaireService } from '@/services/firestore.service';
import { QuestionnaireProgress } from '@/types/firebase.types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

interface QuestionnaireResponse {
  coupleId: string;
  gender: 'male' | 'female';
  progress: QuestionnaireProgress;
  coupleName?: string;
}

export default function AdminQuestionnaireScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
  const [selectedResponse, setSelectedResponse] = useState<QuestionnaireResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load questionnaire responses
  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const allResponses = await questionnaireService.getAllResponses();
      setResponses(allResponses);
    } catch (error) {
      console.error('Error loading questionnaire responses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'in-progress': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  // Get status badge
  const getStatusBadge = (progress: QuestionnaireProgress) => {
    if (progress.isComplete) {
      return { label: 'Completed', color: COLORS.success, icon: 'checkmark-circle' };
    } else if (progress.status === 'in-progress') {
      return { label: 'In Progress', color: COLORS.warning, icon: 'time' };
    }
    return { label: 'Not Started', color: COLORS.textMuted, icon: 'ellipse-outline' };
  };

  // Filter responses
  const filteredResponses = responses.filter((response) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCoupleId = response.coupleId.toLowerCase().includes(query);
      const matchesName = response.coupleName?.toLowerCase().includes(query);
      if (!matchesCoupleId && !matchesName) return false;
    }

    // Status filter
    if (filterStatus === 'completed' && !response.progress.isComplete) return false;
    if (filterStatus === 'in-progress' && response.progress.status !== 'in-progress') return false;
    if (filterStatus === 'not-started' && response.progress.status !== 'not-started') return false;

    return true;
  });

  // Calculate summary stats
  const stats = {
    total: responses.length,
    completed: responses.filter(r => r.progress.isComplete).length,
    inProgress: responses.filter(r => r.progress.status === 'in-progress' && !r.progress.isComplete).length,
  };

  // View response details
  const viewDetails = (response: QuestionnaireResponse) => {
    setSelectedResponse(response);
    setShowDetailModal(true);
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Questionnaire Management</Text>
        <Text style={styles.headerSubtitle}>View and manage user questionnaires</Text>
      </View>
      <TouchableOpacity style={styles.refreshButton} onPress={loadResponses}>
        <Ionicons name="refresh" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  // Render stats cards
  const renderStats = () => (
    <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
      <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '15' }]}>
          <MaterialCommunityIcons name="clipboard-list" size={24} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Responses</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
          <Ionicons name="time" size={24} color={COLORS.warning} />
        </View>
        <View>
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>
    </View>
  );

  // Render search and filter bar
  const renderSearchFilter = () => (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by couple ID or name..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {[
          { id: 'all', label: 'All' },
          { id: 'completed', label: 'Completed' },
          { id: 'in-progress', label: 'In Progress' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              filterStatus === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(filter.id as any)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === filter.id && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render response card
  const renderResponseCard = (response: QuestionnaireResponse) => {
    const status = getStatusBadge(response.progress);
    const progress = response.progress.progress;

    return (
      <TouchableOpacity
        key={`${response.coupleId}_${response.gender}`}
        style={styles.responseCard}
        onPress={() => viewDetails(response)}
        activeOpacity={0.7}
      >
        <View style={styles.responseCardHeader}>
          <View style={styles.responseUserInfo}>
            <View style={[styles.genderAvatar, { 
              backgroundColor: response.gender === 'male' ? COLORS.primary : '#e91e8c' 
            }]}>
              <Ionicons 
                name={response.gender === 'male' ? 'male' : 'female'} 
                size={20} 
                color="#fff" 
              />
            </View>
            <View>
              <Text style={styles.responseName}>{response.coupleName}</Text>
              <Text style={styles.responseCoupleId}>{response.coupleId}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.responseProgress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {progress?.answeredQuestions || 0} of {progress?.totalQuestions || 0} questions
            </Text>
            <Text style={[styles.progressPercent, { color: status.color }]}>
              {Math.round(progress?.percentComplete || 0)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${progress?.percentComplete || 0}%`,
                  backgroundColor: status.color 
                }
              ]} 
            />
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.responseMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="language" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>
              {response.progress.language === 'english' ? '🇬🇧 English' : '🇮🇳 தமிழ்'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>
              {response.progress.isComplete 
                ? `Completed ${formatDate(response.progress.completedAt)}` 
                : `Updated ${formatDate(response.progress.lastUpdatedAt)}`
              }
            </Text>
          </View>
        </View>

        {/* View Details Arrow */}
        <View style={styles.viewDetailsArrow}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedResponse) return null;
    
    const { progress, coupleName, coupleId, gender } = selectedResponse;
    const status = getStatusBadge(progress);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: isMobile ? '95%' : 700, maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <View style={[styles.genderAvatar, { 
                  backgroundColor: gender === 'male' ? COLORS.primary : '#e91e8c',
                  width: 44,
                  height: 44,
                }]}>
                  <Ionicons 
                    name={gender === 'male' ? 'male' : 'female'} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{coupleName}'s Questionnaire</Text>
                  <Text style={styles.modalSubtitle}>{coupleId} • {gender === 'male' ? 'Husband' : 'Wife'}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status Card */}
              <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
                <View style={styles.statusCardHeader}>
                  <View style={[styles.statusIcon, { backgroundColor: status.color + '15' }]}>
                    <Ionicons name={status.icon as any} size={24} color={status.color} />
                  </View>
                  <View style={styles.statusCardInfo}>
                    <Text style={[styles.statusCardTitle, { color: status.color }]}>{status.label}</Text>
                    <Text style={styles.statusCardSubtitle}>
                      {progress.isComplete 
                        ? `Completed on ${formatDate(progress.completedAt)}` 
                        : `Last updated ${formatDate(progress.lastUpdatedAt)}`
                      }
                    </Text>
                  </View>
                </View>
                
                {/* Overall Progress */}
                <View style={styles.overallProgress}>
                  <View style={styles.overallProgressHeader}>
                    <Text style={styles.overallProgressLabel}>Overall Progress</Text>
                    <Text style={[styles.overallProgressPercent, { color: status.color }]}>
                      {Math.round(progress.progress?.percentComplete || 0)}%
                    </Text>
                  </View>
                  <View style={styles.overallProgressBar}>
                    <View 
                      style={[
                        styles.overallProgressFill, 
                        { 
                          width: `${progress.progress?.percentComplete || 0}%`,
                          backgroundColor: status.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.overallProgressCount}>
                    {progress.progress?.answeredQuestions || 0} of {progress.progress?.totalQuestions || 0} questions answered
                  </Text>
                </View>
              </View>

              {/* Info Cards */}
              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <Ionicons name="language" size={20} color={COLORS.info} />
                  <Text style={styles.infoCardLabel}>Language</Text>
                  <Text style={styles.infoCardValue}>
                    {progress.language === 'english' ? '🇬🇧 English' : '🇮🇳 Tamil'}
                  </Text>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="calendar" size={20} color={COLORS.accent} />
                  <Text style={styles.infoCardLabel}>Started</Text>
                  <Text style={styles.infoCardValue}>{formatDate(progress.startedAt)}</Text>
                </View>

                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="clipboard-list" size={20} color={COLORS.primary} />
                  <Text style={styles.infoCardLabel}>Answers</Text>
                  <Text style={styles.infoCardValue}>{Object.keys(progress.answers || {}).length}</Text>
                </View>
              </View>

              {/* Section Progress */}
              <View style={styles.sectionProgressContainer}>
                <Text style={styles.sectionProgressTitle}>Progress by Section</Text>
                {progress.progress?.parts?.map((part, partIndex) => (
                  <View key={partIndex} style={styles.partCard}>
                    <View style={styles.partHeader}>
                      <Text style={styles.partTitle}>{part.partTitle}</Text>
                      <Text style={[styles.partProgress, { color: part.isComplete ? COLORS.success : COLORS.warning }]}>
                        {part.answeredQuestions}/{part.totalQuestions}
                      </Text>
                    </View>
                    {part.sections?.map((section, sectionIndex) => (
                      <View key={sectionIndex} style={styles.sectionItem}>
                        <View style={styles.sectionItemHeader}>
                          <Ionicons 
                            name={section.isComplete ? 'checkmark-circle' : 'ellipse-outline'} 
                            size={16} 
                            color={section.isComplete ? COLORS.success : COLORS.textMuted} 
                          />
                          <Text style={styles.sectionItemTitle}>{section.sectionTitle}</Text>
                        </View>
                        <View style={styles.sectionItemProgress}>
                          <View style={styles.sectionItemProgressBar}>
                            <View 
                              style={[
                                styles.sectionItemProgressFill, 
                                { 
                                  width: section.totalQuestions > 0 
                                    ? `${(section.answeredQuestions / section.totalQuestions) * 100}%` 
                                    : '0%',
                                  backgroundColor: section.isComplete ? COLORS.success : COLORS.warning 
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.sectionItemCount}>
                            {section.answeredQuestions}/{section.totalQuestions}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              {/* Answers Preview (show for all questionnaires with answers) */}
              {Object.keys(progress.answers || {}).length > 0 && (
                <View style={styles.answersPreview}>
                  <View style={styles.answersPreviewHeader}>
                    <Text style={styles.answersPreviewTitle}>
                      {progress.isComplete ? 'All Answers' : 'Answers So Far'}
                    </Text>
                    <View style={[styles.answersBadge, { backgroundColor: progress.isComplete ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                      <Text style={[styles.answersBadgeText, { color: progress.isComplete ? COLORS.success : COLORS.warning }]}>
                        {Object.keys(progress.answers).length} answered
                      </Text>
                    </View>
                  </View>
                  
                  {/* Show all answers grouped by section */}
                  {Object.entries(progress.answers)
                    .sort((a, b) => {
                      // Sort by questionNumber if available
                      const numA = a[1].questionNumber || '0';
                      const numB = b[1].questionNumber || '0';
                      return numA.localeCompare(numB, undefined, { numeric: true });
                    })
                    .map(([questionId, answer]) => (
                    <View key={questionId} style={styles.answerItem}>
                      <View style={styles.answerHeader}>
                        <View style={styles.answerNumberBadge}>
                          <Text style={styles.answerNumberText}>Q{answer.questionNumber || '?'}</Text>
                        </View>
                        <Text style={styles.answerQuestion} numberOfLines={2}>
                          {answer.questionText || questionId}
                        </Text>
                      </View>
                      <View style={styles.answerValueContainer}>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.answerValue}>
                          {Array.isArray(answer.answer) ? answer.answer.join(', ') : String(answer.answer)}
                        </Text>
                      </View>
                      {answer.conditionalAnswer && (
                        <View style={styles.conditionalAnswerContainer}>
                          <Ionicons name="add-circle-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={styles.conditionalAnswerText}>{answer.conditionalAnswer}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>No Questionnaires Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || filterStatus !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Users will appear here once they start the questionnaire'
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStats()}
        {renderSearchFilter()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading questionnaires...</Text>
          </View>
        ) : filteredResponses.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.responseList}>
            <Text style={styles.responseListTitle}>
              {filteredResponses.length} Response{filteredResponses.length !== 1 ? 's' : ''}
            </Text>
            {filteredResponses.map(renderResponseCard)}
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsContainerMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Search & Filter
  searchFilterContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    ...(isWeb && { outlineStyle: 'none' as any }),
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Response List
  responseList: {
    gap: 12,
  },
  responseListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  responseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  responseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  responseUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  responseCoupleId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Response Progress
  responseProgress: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  // Response Meta
  responseMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewDetailsArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  // Status Card in Modal
  statusCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardInfo: {
    flex: 1,
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  overallProgress: {
    marginTop: 8,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overallProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  overallProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  overallProgressCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  // Info Cards
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  infoCardLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  infoCardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  // Section Progress
  sectionProgressContainer: {
    marginBottom: 20,
  },
  sectionProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  partCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  partTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  partProgress: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionItem: {
    marginBottom: 8,
  },
  sectionItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionItemTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  sectionItemProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 24,
  },
  sectionItemProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sectionItemProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionItemCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    width: 40,
    textAlign: 'right',
  },
  // Answers Preview
  answersPreview: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  answersPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  answersPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  answersBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answersBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  answersPreviewSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  answerItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  answerNumberBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  answerNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  answerQuestion: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  answerValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 46,
  },
  answerValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  conditionalAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 46,
    marginTop: 6,
  },
  conditionalAnswerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  moreAnswers: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 10,
    textAlign: 'center',
  },
});
