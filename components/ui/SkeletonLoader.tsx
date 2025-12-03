import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Single skeleton box with shimmer animation
export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}) => {
  const { isDarkMode } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const backgroundColor = isDarkMode ? '#3d4654' : '#e0e0e0';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton for circular elements (avatar, progress ring)
export const SkeletonCircle: React.FC<{ size?: number; style?: ViewStyle }> = ({ 
  size = 48,
  style 
}) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
};

// Skeleton for text lines
export const SkeletonText: React.FC<{ 
  lines?: number; 
  lineHeight?: number;
  lastLineWidth?: string;
  style?: ViewStyle;
}> = ({ 
  lines = 1, 
  lineHeight = 16,
  lastLineWidth = '60%',
  style 
}) => {
  return (
    <View style={[{ gap: 8 }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton 
          key={index} 
          width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'} 
          height={lineHeight} 
          borderRadius={4}
        />
      ))}
    </View>
  );
};

// Home page skeleton loader
export const HomePageSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <SkeletonCircle size={48} />
            <View style={{ gap: 6 }}>
              <Skeleton width={150} height={18} borderRadius={4} />
              <Skeleton width={100} height={13} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={44} height={44} borderRadius={12} />
        </View>
        <Skeleton width={180} height={13} borderRadius={4} style={{ marginTop: 8 }} />
      </View>

      {/* Content with proper max-width like the real page */}
      <View style={[styles.content, { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
        {/* Date Selector Skeleton - 4 small boxes */}
        <View style={styles.dateSelector}>
          {[1, 2, 3, 4].map((_, index) => (
            <View key={index} style={[styles.dateItem, { backgroundColor: colors.cardBackground }]}>
              <Skeleton width={28} height={11} borderRadius={4} />
              <Skeleton width={20} height={18} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>

        {/* Pedometer Card Skeleton */}
        <View style={[styles.pedometerCard, { backgroundColor: colors.cardBackground }]}>
          <SkeletonCircle size={isMobile ? 180 : 200} />
          <Skeleton width={140} height={32} borderRadius={20} style={{ marginTop: 16 }} />
          <Skeleton width={180} height={48} borderRadius={14} style={{ marginTop: 20 }} />
        </View>

        {/* Quick Actions Title */}
        <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
        
        {/* Quick Actions - 3 small cards */}
        <View style={styles.quickActionsRow}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={[styles.quickActionCard, { backgroundColor: colors.cardBackground }]}>
              <Skeleton width={48} height={48} borderRadius={14} />
              <Skeleton width={50} height={12} borderRadius={4} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>

        {/* Activity Title */}
        <Skeleton width={130} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
        
        {/* Activity Cards - 2x2 grid */}
        <View style={styles.activityGrid}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.activityCard, { backgroundColor: colors.cardBackground, minWidth: 140 }]}>
              <Skeleton width={48} height={48} borderRadius={14} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={50} height={20} borderRadius={4} />
                <Skeleton width={70} height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.activityGrid, { marginTop: 12 }]}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.activityCard, { backgroundColor: colors.cardBackground, minWidth: 140 }]}>
              <Skeleton width={48} height={48} borderRadius={14} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={50} height={20} borderRadius={4} />
                <Skeleton width={70} height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>

        {/* Tip Title */}
        <Skeleton width={100} height={18} borderRadius={4} style={{ marginTop: 24, marginBottom: 16 }} />
        
        {/* Tip Card */}
        <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
          <Skeleton width={56} height={56} borderRadius={16} />
          <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
            <Skeleton width="90%" height={15} borderRadius={4} />
            <Skeleton width="60%" height={15} borderRadius={4} />
          </View>
          <Skeleton width={32} height={32} borderRadius={10} style={{ marginLeft: 10 }} />
        </View>
      </View>
    </View>
  );
};

// Profile page skeleton loader
export const ProfilePageSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {isMobile ? (
        /* Mobile: Gradient Header with Profile Card */
        <View style={[styles.profileMobileHeader, { backgroundColor: colors.primary }]}>
          <View style={styles.profileHeaderTop}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <Skeleton width={60} height={18} borderRadius={4} />
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.profileCardRow}>
            <View style={styles.profileAvatarWrapper}>
              <SkeletonCircle size={80} />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width={140} height={22} borderRadius={4} />
              <Skeleton width={180} height={14} borderRadius={4} />
              <Skeleton width={160} height={24} borderRadius={20} style={{ marginTop: 4 }} />
            </View>
          </View>
          
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Skeleton width={40} height={22} borderRadius={4} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.profileStatItem}>
              <Skeleton width={30} height={22} borderRadius={4} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.profileStatItem}>
              <Skeleton width={35} height={22} borderRadius={4} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>
      ) : (
        /* Web: Simple Header */
        <View style={[styles.webHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={60} height={20} borderRadius={4} />
          <View style={{ width: 40 }} />
        </View>
      )}

      <View style={[styles.profileContent, { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
        {/* Web Profile Card */}
        {!isMobile && (
          <View style={[styles.webProfileCardSkeleton, { backgroundColor: colors.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SkeletonCircle size={80} />
              <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
                <Skeleton width={150} height={20} borderRadius={4} />
                <Skeleton width={180} height={14} borderRadius={4} />
                <Skeleton width={140} height={24} borderRadius={20} />
              </View>
            </View>
            <View style={[styles.webStatsRowSkeleton, { borderTopColor: colors.borderLight }]}>
              {[1, 2, 3].map((_, i) => (
                <React.Fragment key={i}>
                  <View style={styles.webStatItemSkeleton}>
                    <Skeleton width={40} height={20} borderRadius={4} />
                    <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                  {i < 2 && <View style={[styles.webStatDividerSkeleton, { backgroundColor: colors.borderLight }]} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Questionnaire Card */}
        <View style={[styles.questionnaireCardSkeleton, { backgroundColor: colors.cardBackground }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={24} height={24} borderRadius={6} />
            <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
              <Skeleton width={140} height={15} borderRadius={4} />
              <Skeleton width={160} height={13} borderRadius={4} />
            </View>
            <Skeleton width={50} height={28} borderRadius={8} />
          </View>
          <Skeleton width="100%" height={4} borderRadius={2} />
        </View>

        {/* Language Options */}
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12, marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {[1, 2].map((_, i) => (
            <View key={i} style={[styles.languageOptionSkeleton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Skeleton width={24} height={24} borderRadius={4} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Settings Sections */}
        {[1, 2, 3, 4].map((section) => (
          <View key={section} style={{ marginBottom: 24 }}>
            <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
            <View style={[styles.settingsCardSkeleton, { backgroundColor: colors.cardBackground }]}>
              {[1, 2, 3].slice(0, section === 1 ? 1 : 3).map((_, i, arr) => (
                <View 
                  key={i} 
                  style={[
                    styles.settingItemSkeleton,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }
                  ]}
                >
                  <Skeleton width={40} height={40} borderRadius={12} />
                  <Skeleton width={120} height={15} borderRadius={4} style={{ flex: 1, marginLeft: 14 }} />
                  <Skeleton width={42} height={24} borderRadius={12} />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <Skeleton width="100%" height={52} borderRadius={14} style={{ marginBottom: 12 }} />
        <Skeleton width={100} height={14} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 24 }} />
        <Skeleton width={120} height={12} borderRadius={4} style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );
};

// Questionnaire Card Skeleton for inline use in profile
export const QuestionnaireCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.questionnaireCardSkeleton, { backgroundColor: colors.cardBackground }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Skeleton width={24} height={24} borderRadius={6} />
        <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
          <Skeleton width={140} height={15} borderRadius={4} />
          <Skeleton width={160} height={13} borderRadius={4} />
        </View>
        <Skeleton width={60} height={32} borderRadius={8} />
      </View>
      <Skeleton width="100%" height={4} borderRadius={2} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Skeleton width={180} height={12} borderRadius={4} />
        <Skeleton width={70} height={20} borderRadius={10} />
      </View>
    </View>
  );
};

// Personal Info page skeleton loader
export const PersonalInfoSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header with Avatar */}
      <View style={[styles.personalInfoHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.personalInfoHeaderTop}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={160} height={18} borderRadius={4} />
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.personalInfoProfileSummary}>
          <View style={styles.personalInfoAvatarContainer}>
            <SkeletonCircle size={90} />
          </View>
          <Skeleton width={140} height={24} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width={180} height={28} borderRadius={20} style={{ marginTop: 8 }} />
        </View>
      </View>

      <View style={[styles.personalInfoContent, { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
        {/* Identification Section */}
        <View style={styles.personalInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={100} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
          <View style={[styles.personalInfoSectionContent, { backgroundColor: colors.cardBackground }]}>
            <View style={{ padding: 16 }}>
              <Skeleton width={70} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <View style={[styles.personalInfoIdContainer, { backgroundColor: colors.inputBackground }]}>
                <Skeleton width={18} height={18} borderRadius={4} />
                <Skeleton width={120} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
              </View>
            </View>
          </View>
        </View>

        {/* Basic Information Section */}
        <View style={styles.personalInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={130} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
          <View style={[styles.personalInfoSectionContent, { backgroundColor: colors.cardBackground }]}>
            {[1, 2, 3].map((_, i) => (
              <View key={i}>
                <View style={styles.personalInfoFieldRow}>
                  <Skeleton width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
                    <Skeleton width={80} height={12} borderRadius={4} />
                    <Skeleton width={140} height={15} borderRadius={4} />
                  </View>
                </View>
                {i < 2 && <View style={[styles.personalInfoDivider, { backgroundColor: colors.borderLight }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.personalInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={150} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
          <View style={[styles.personalInfoSectionContent, { backgroundColor: colors.cardBackground }]}>
            {[1, 2].map((_, i) => (
              <View key={i}>
                <View style={styles.personalInfoFieldRow}>
                  <Skeleton width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
                    <Skeleton width={100} height={12} borderRadius={4} />
                    <Skeleton width={180} height={15} borderRadius={4} />
                  </View>
                  <Skeleton width={36} height={36} borderRadius={10} />
                </View>
                {i < 1 && <View style={[styles.personalInfoDivider, { backgroundColor: colors.borderLight }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.personalInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={70} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
          <View style={[styles.personalInfoSectionContent, { backgroundColor: colors.cardBackground, padding: 20 }]}>
            {[1, 2, 3, 4, 5].map((_, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={48} borderRadius={10} />
              </View>
            ))}
            <Skeleton width="100%" height={48} borderRadius={10} style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Partner Section */}
        <View style={styles.personalInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={32} height={32} borderRadius={10} />
            <Skeleton width={110} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
          <View style={[styles.personalInfoSectionContent, { backgroundColor: colors.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <SkeletonCircle size={56} />
              <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
                <Skeleton width={100} height={17} borderRadius={4} />
                <Skeleton width={140} height={13} borderRadius={4} />
              </View>
            </View>
            <View style={[styles.personalInfoDivider, { backgroundColor: colors.borderLight, marginHorizontal: 16 }]} />
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Skeleton width={16} height={16} borderRadius={4} />
                <Skeleton width={160} height={14} borderRadius={4} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Skeleton width={16} height={16} borderRadius={4} />
                <Skeleton width={120} height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoNoteSkeleton, { backgroundColor: colors.primaryLight || '#eff6ff' }]}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
            <Skeleton width="100%" height={13} borderRadius={4} />
            <Skeleton width="80%" height={13} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
};

// Mobile Profile Card Skeleton (for inline use in profile header)
export const MobileProfileCardSkeleton: React.FC = () => {
  return (
    <>
      <View style={styles.profileCardRow}>
        <View style={styles.profileAvatarWrapper}>
          <SkeletonCircle size={80} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={140} height={22} borderRadius={4} />
          <Skeleton width={180} height={14} borderRadius={4} />
          <Skeleton width={160} height={24} borderRadius={20} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatItem}>
          <Skeleton width={40} height={22} borderRadius={4} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <View style={[styles.profileStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        <View style={styles.profileStatItem}>
          <Skeleton width={30} height={22} borderRadius={4} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <View style={[styles.profileStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        <View style={styles.profileStatItem}>
          <Skeleton width={35} height={22} borderRadius={4} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
    </>
  );
};

// Web Profile Card Skeleton (for inline use)
export const WebProfileCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.webProfileCardSkeleton, { backgroundColor: colors.cardBackground }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonCircle size={80} />
        <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
          <Skeleton width={150} height={20} borderRadius={4} />
          <Skeleton width={180} height={14} borderRadius={4} />
          <Skeleton width={140} height={24} borderRadius={20} />
        </View>
      </View>
      <View style={[styles.webStatsRowSkeleton, { borderTopColor: colors.borderLight }]}>
        {[1, 2, 3].map((_, i) => (
          <React.Fragment key={i}>
            <View style={styles.webStatItemSkeleton}>
              <Skeleton width={40} height={20} borderRadius={4} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            {i < 2 && <View style={[styles.webStatDividerSkeleton, { backgroundColor: colors.borderLight }]} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// Progress Page Skeleton Loader
export const ProgressPageSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header - no skeleton needed as header renders immediately */}

      <View style={[styles.progressContent, { maxWidth: 800, width: '100%', alignSelf: 'center' }]}>
        {/* Time Range Selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <Skeleton width={100} height={40} borderRadius={10} />
        </View>

        {/* Summary Cards Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.progressSummaryCard, { backgroundColor: colors.cardBackground }]}>
              <Skeleton width={28} height={28} borderRadius={8} />
              <Skeleton width={50} height={22} borderRadius={4} style={{ marginTop: 8 }} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>

        {/* Weekly Chart Card */}
        <View style={[styles.progressChartCard, { backgroundColor: colors.cardBackground }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Skeleton width={120} height={18} borderRadius={4} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Skeleton width={8} height={8} borderRadius={4} />
              <Skeleton width={40} height={12} borderRadius={4} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Skeleton width={9} height={9} borderRadius={4} style={{ marginBottom: 4 }} />
                <Skeleton width={24} height={40 + Math.random() * 50} borderRadius={6} />
                <Skeleton width={24} height={12} borderRadius={4} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
        </View>

        {/* Weight Chart Card */}
        <View style={[styles.progressChartCard, { backgroundColor: colors.cardBackground }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Skeleton width={130} height={18} borderRadius={4} />
            <Skeleton width={80} height={28} borderRadius={20} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <View style={{ alignItems: 'center' }}>
              <Skeleton width={40} height={11} borderRadius={4} />
              <Skeleton width={50} height={16} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={16} height={16} borderRadius={4} />
            <View style={{ alignItems: 'center' }}>
              <Skeleton width={50} height={11} borderRadius={4} />
              <Skeleton width={50} height={16} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Skeleton width={20} height={30 + Math.random() * 40} borderRadius={4} />
                <Skeleton width={20} height={9} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Goals Section */}
        <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={[styles.progressGoalCard, { backgroundColor: colors.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={12} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width={100} height={15} borderRadius={4} />
                <Skeleton width={140} height={13} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <Skeleton width={40} height={18} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={6} borderRadius={3} />
          </View>
        ))}

        {/* Couple Journey Card */}
        <View style={[styles.progressCoupleCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <SkeletonCircle size={32} />
            <Skeleton width={130} height={20} borderRadius={4} />
          </View>
          <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Skeleton width={40} height={28} borderRadius={4} />
              <Skeleton width={80} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={1} height={40} borderRadius={1} />
            <View style={{ alignItems: 'center' }}>
              <Skeleton width={40} height={28} borderRadius={4} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <Skeleton width={150} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.progressAchievementCard, { backgroundColor: colors.cardBackground }]}>
              <Skeleton width={52} height={52} borderRadius={14} />
              <Skeleton width={70} height={13} borderRadius={4} style={{ marginTop: 10 }} />
              <Skeleton width={80} height={10} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// User Appointments Page Skeleton
export const AppointmentsPageSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[appointmentStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[appointmentStyles.header, { backgroundColor: colors.surface }]}>
        <View style={appointmentStyles.headerLeft}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View>
            <Skeleton width={120} height={18} borderRadius={4} />
            <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      {/* Section Tabs */}
      <View style={appointmentStyles.tabsContainer}>
        <Skeleton width="48%" height={44} borderRadius={12} />
        <Skeleton width="48%" height={44} borderRadius={12} />
      </View>

      {/* Calendar Skeleton */}
      <View style={[appointmentStyles.calendarCard, { backgroundColor: colors.surface }]}>
        <View style={appointmentStyles.calendarHeader}>
          <Skeleton width={24} height={24} borderRadius={6} />
          <Skeleton width={120} height={18} borderRadius={4} />
          <Skeleton width={24} height={24} borderRadius={6} />
        </View>
        <View style={appointmentStyles.weekdaysRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((_, index) => (
            <Skeleton key={index} width={30} height={14} borderRadius={4} />
          ))}
        </View>
        <View style={appointmentStyles.daysGrid}>
          {Array.from({ length: 35 }).map((_, index) => (
            <View key={index} style={appointmentStyles.dayCell}>
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
          ))}
        </View>
      </View>

      {/* Appointment Form Skeleton */}
      <View style={[appointmentStyles.formCard, { backgroundColor: colors.surface }]}>
        <View style={appointmentStyles.formHeader}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={180} height={18} borderRadius={4} />
        </View>
        <View style={appointmentStyles.formFields}>
          <Skeleton width="100%" height={48} borderRadius={12} />
          <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
        </View>
        <Skeleton width="100%" height={50} borderRadius={12} style={{ marginTop: 16 }} />
      </View>

      {/* Logged Appointments Skeleton */}
      <View style={appointmentStyles.loggedSection}>
        <Skeleton width={80} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        {[1, 2].map((_, index) => (
          <View key={index} style={[appointmentStyles.appointmentCard, { backgroundColor: colors.surface }]}>
            <View style={appointmentStyles.dateBox}>
              <Skeleton width={32} height={24} borderRadius={4} />
              <Skeleton width={28} height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={appointmentStyles.cardContent}>
              <Skeleton width={80} height={14} borderRadius={4} />
              <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width={100} height={10} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Admin Appointments Page Skeleton
export const AdminAppointmentsPageSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = true }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[appointmentStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[appointmentStyles.adminHeader, { backgroundColor: colors.surface }]}>
        <View>
          <Skeleton width={180} height={24} borderRadius={6} />
          <Skeleton width={140} height={14} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={140} height={44} borderRadius={12} />
      </View>

      {/* Tabs */}
      <View style={appointmentStyles.adminTabs}>
        <Skeleton width="48%" height={48} borderRadius={12} />
        <Skeleton width="48%" height={48} borderRadius={12} />
      </View>

      {/* Search and Filter */}
      <View style={appointmentStyles.searchFilterRow}>
        <Skeleton width={isMobile ? '100%' : '60%'} height={48} borderRadius={12} />
        {!isMobile && <Skeleton width="35%" height={48} borderRadius={12} />}
      </View>

      {/* Visit Cards */}
      <View style={appointmentStyles.visitsList}>
        {[1, 2, 3, 4].map((_, index) => (
          <View key={index} style={[appointmentStyles.visitCard, { backgroundColor: colors.surface }]}>
            <View style={appointmentStyles.visitCardHeader}>
              <View style={appointmentStyles.visitCardLeft}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View>
                  <Skeleton width={140} height={16} borderRadius={4} />
                  <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
              </View>
              <Skeleton width={80} height={28} borderRadius={14} />
            </View>
            <View style={appointmentStyles.visitCardBody}>
              <View style={appointmentStyles.visitInfoRow}>
                <Skeleton width={18} height={18} borderRadius={4} />
                <Skeleton width={120} height={14} borderRadius={4} />
              </View>
              <View style={appointmentStyles.visitInfoRow}>
                <Skeleton width={18} height={18} borderRadius={4} />
                <Skeleton width={80} height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const appointmentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  calendarCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  formCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  formFields: {
    gap: 0,
  },
  loggedSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  dateBox: {
    alignItems: 'center',
    padding: 8,
  },
  cardContent: {
    flex: 1,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  adminTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  visitsList: {
    paddingHorizontal: 20,
  },
  visitCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visitCardBody: {
    gap: 8,
  },
  visitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Home Page Styles
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    padding: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  pedometerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 0,
  },
  activityCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  
  // Profile Page Styles
  profileMobileHeader: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  profileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatarWrapper: {
    marginRight: 16,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  profileStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  profileStatDivider: {
    width: 1,
    height: 30,
  },
  profileContent: {
    padding: 20,
    marginTop: -20,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
  },
  webProfileCardSkeleton: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  webStatsRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  webStatItemSkeleton: {
    alignItems: 'center',
    flex: 1,
  },
  webStatDividerSkeleton: {
    width: 1,
    height: 30,
  },
  questionnaireCardSkeleton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  languageOptionSkeleton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 2,
  },
  settingsCardSkeleton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  
  // Personal Info Styles
  personalInfoHeader: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  personalInfoHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  personalInfoProfileSummary: {
    alignItems: 'center',
  },
  personalInfoAvatarContainer: {
    marginBottom: 0,
  },
  personalInfoContent: {
    padding: 16,
    marginTop: -16,
  },
  personalInfoSection: {
    marginBottom: 20,
  },
  personalInfoSectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  personalInfoIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  personalInfoFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  personalInfoDivider: {
    height: 1,
    marginLeft: 70,
  },
  infoNoteSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  
  // Progress Page Styles
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressContent: {
    padding: 16,
  },
  progressSummaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  progressChartCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  progressGoalCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  progressCoupleCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    backgroundColor: '#ede9fe',
  },
  progressAchievementCard: {
    width: 130,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
});

export default Skeleton;
