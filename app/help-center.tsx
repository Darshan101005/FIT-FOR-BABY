import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

const helpCategories = [
	{
		icon: 'person-circle',
		title: 'Account & Profile',
		description: 'Manage your account settings, profile information, and preferences.',
		articles: [
			{
				q: 'How to update your profile',
				a: 'Profile details are managed by the app administrator. Users can request updates if needed.',
			},
			{
				q: 'Changing your password',
				a: 'To change your password, use the "Forgot Password" option on the login screen. You will verify your identity using your registered details and PIN.',
			},
			{
				q: 'Managing notifications',
				a: 'Notification settings are managed by the app administrator. Users receive updates as configured in the app.',
			},
		],
	},
	{
		icon: 'fitness',
		title: 'Health Tracking',
		description: 'Learn how to track your health metrics and monitor progress.',
		articles: [
			{
				q: 'Logging daily steps',
				a: 'Users log daily steps in the "Log Steps" section. Data is used to monitor progress.',
			},
			{
				q: 'Tracking weight changes',
				a: 'Go to "Log Weight" to record your current weight. This information helps track your progress.',
			},
			{
				q: 'Recording exercise',
				a: 'Use "Log Exercise" to record activities. All entries help monitor your activity.',
			},
		],
	},
	{
		icon: 'nutrition',
		title: 'Nutrition & Diet',
		description: 'Get help with meal logging and diet plan features.',
		articles: [
			{
				q: 'Logging food intake',
				a: 'Go to "Log Food" to record meals. Users can log food to track their nutrition.',
			},
			{
				q: 'Understanding your diet plan',
				a: 'Diet plans are assigned by the app administrator. Users can view their plan in the "Diet Plan" section.',
			},
			{
				q: 'Meal recommendations',
				a: 'Meal recommendations are provided in the app. Users should follow the assigned plan.',
			},
		],
	},
	{
		icon: 'calendar',
		title: 'Appointments',
		description: 'Manage your personal doctor visits and view nursing schedules.',
		articles: [
			{
				q: 'Logging doctor visits',
				a: 'You can log your own doctor visits by selecting a date, time, and optional details (Doctor Name, Purpose).',
			},
			{
				q: 'Nursing department visits',
				a: 'Nursing visits are scheduled by administrators and appear automatically in your calendar. You cannot book or reschedule these directly.',
			},
			{
				q: 'Deleting appointments',
				a: 'You can delete the doctor visits you have logged. Official nursing department visits cannot be deleted by users.',
			},
		],
	},
	{
		icon: 'shield-checkmark',
		title: 'Privacy & Security',
		description: 'Understand how we protect your data and manage privacy.',
		articles: [
			{
				q: 'Data protection policies',
				a: 'All user data is securely stored and only accessible to authorized staff. See our Privacy Policy for details.',
			},
			{
				q: 'Managing PIN security',
				a: 'PINs are set during onboarding. If you need to change your PIN, use the "Manage PIN" option or contact support.',
			},
			{
				q: 'Managing devices',
				a: 'In the "Device Management" page, you can view all devices logged into your account. You can securely log out of other devices at any time.',
			},
		],
	},
	{
		icon: 'help-circle',
		title: 'Getting Started',
		description: 'Fit for Baby is an app for users. The administrator manages onboarding and access.',
		articles: [
			{
				q: 'Creating your account',
				a: 'Accounts are created by the app administrator. Users do not sign up directly. You will receive login credentials from your administrator.',
			},
			{
				q: 'First-time setup',
				a: 'After receiving your credentials, log in and set your PIN if prompted. For any setup issues, contact support.',
			},
			{
				q: 'Quick start guide',
				a: 'See the "Getting Started" section for an overview. For questions, reach out to support.',
			},
		],
	},
];

export default function HelpCenterScreen() {
	const router = useRouter();
	const { width: screenWidth } = useWindowDimensions();
	const isMobile = screenWidth < 768;
	const { colors, isDarkMode } = useTheme();
	const [searchQuery, setSearchQuery] = useState('');
	const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

	const toggleItem = (key: string) => {
		setExpandedItems((prev) => {
			return {
				...prev,
				[key]: !prev[key],
			};
		});
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}>
				<TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }]}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
					<Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Help Center</Text>
					<Text style={[styles.pageSubtitle, isMobile && styles.pageSubtitleMobile]}>
						Find answers to your questions and get the support you need
					</Text>

					<View style={[styles.searchContainer, isMobile && styles.searchContainerMobile, { backgroundColor: isDarkMode ? '#374151' : '#ffffff' }]}>
						<Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#64748b'} />
						<TextInput
							style={[
                                styles.searchInput,
                                isWeb && ({ outlineStyle: 'none' } as any),
                                { color: colors.text }
                            ]}
							placeholder="Search for help..."
                            placeholderTextColor={isDarkMode ? '#9ca3af' : '#94a3b8'}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
                    </View>
				</View>

				{/* Categories Grid */}
                <View style={[styles.categoriesGrid, isMobile && styles.categoriesGridMobile, { backgroundColor: colors.background }]}>
					{helpCategories.map((category, categoryIndex) => (
						<View key={categoryIndex} style={[styles.categoryCard, isMobile && styles.categoryCardMobile, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? '#374151' : '#f1f5f9' }]}>
							<View style={styles.categoryHeader}>
								<View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1e3a5f' : '#EFF6FF' }]}>
									<Ionicons name={category.icon as any} size={28} color="#006dab" />
								</View>
								<View style={styles.categoryTitleContainer}>
									<Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
									<Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>{category.description}</Text>
								</View>
                            </View>
							<View style={[styles.articlesList, { borderTopColor: isDarkMode ? '#374151' : '#f1f5f9' }]}>
								{category.articles.map((article, articleIndex) => {
									const key = `${categoryIndex}-${articleIndex}`;
									const isExpanded = expandedItems[key];
									return (
										<TouchableOpacity
											key={articleIndex}
											style={[styles.articleItem, isExpanded && styles.articleItemExpanded, isExpanded && { backgroundColor: isDarkMode ? '#374151' : '#f8fafc' }]}
											onPress={() => toggleItem(key)}
											activeOpacity={0.7}
										>
											<View style={styles.questionRow}>
												<View style={styles.questionLeft}>
													<Ionicons name="document-text-outline" size={18} color={isDarkMode ? '#9ca3af' : '#64748b'} />
													<Text style={styles.articleText}>{article.q}</Text>
												</View>
												<Ionicons 
													name={isExpanded ? "chevron-up" : "chevron-down"} 
													size={16} 
													color={isDarkMode ? '#9ca3af' : '#94a3b8'} 
												/>
											</View>
											
											{isExpanded && (
												<View style={styles.answerBox}>
													<Text style={[styles.answerText, { color: colors.textSecondary }]}>{article.a}</Text>
												</View>
											)}
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					))}
				</View>

				<View style={[styles.contactSection, { backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc' }]}>
					<Text style={[styles.contactTitle, { color: colors.text }]}>Still need help?</Text>
					<Text style={[styles.contactText, { color: colors.textSecondary }]}>
						Our support team is available 24/7 to assist you with any questions.
					</Text>
					<TouchableOpacity style={styles.contactButton} onPress={() => router.push('/contact-us')}>
						<Ionicons name="mail" size={18} color="#ffffff" />
						<Text style={styles.contactButtonText}>Contact Support</Text>
					</TouchableOpacity>
				</View>

				<View style={[styles.footer, { backgroundColor: isDarkMode ? '#111827' : '#1e293b' }]}>
					<Text style={styles.footerText}>© 2025 Fit for Baby. All rights reserved.</Text>
				</View>
			</ScrollView>
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
	heroSection: {
		backgroundColor: '#006dab',
		paddingHorizontal: 60,
		paddingVertical: 60,
		alignItems: 'center',
	},
	heroSectionMobile: {
		paddingHorizontal: 20,
		paddingVertical: 40,
	},
	pageTitle: {
		fontSize: 48,
		fontWeight: '800',
		color: '#ffffff',
		textAlign: 'center',
		marginBottom: 16,
	},
	pageTitleMobile: {
		fontSize: 32,
	},
	pageSubtitle: {
		fontSize: 20,
		color: '#e0f2fe',
		textAlign: 'center',
		maxWidth: 600,
		lineHeight: 30,
		marginBottom: 32,
	},
	pageSubtitleMobile: {
		fontSize: 16,
		lineHeight: 24,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		width: '100%',
		maxWidth: 500,
		gap: 12,
	},
	searchContainerMobile: {
		maxWidth: '100%',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#1e293b',
	},
	categoriesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		alignItems: 'flex-start',
		paddingHorizontal: 60,
		paddingVertical: 60,
		gap: 24,
	},
	categoriesGridMobile: {
		paddingHorizontal: 20,
		paddingVertical: 30,
		flexDirection: 'column',
	},
	categoryCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 24,
		width: isWeb ? '30%' : '100%',
		minWidth: 300,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	categoryCardMobile: {
		width: '100%',
	},
	categoryHeader: {
		flexDirection: 'row',
		marginBottom: 20,
		gap: 16,
	},
	iconContainer: {
		width: 56,
		height: 56,
		borderRadius: 12,
		backgroundColor: '#EFF6FF',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	categoryTitleContainer: {
		flex: 1,
	},
	categoryTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 4,
	},
	categoryDescription: {
		fontSize: 14,
		color: '#64748b',
		lineHeight: 20,
	},
	articlesList: {
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 16,
		gap: 12,
	},
	articleItem: {
		flexDirection: 'column', 
		borderRadius: 8,
		padding: 8,
	},
	articleItemExpanded: {
		backgroundColor: '#f8fafc',
	},
	questionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
	},
	questionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	articleText: {
		fontSize: 15,
		color: '#006dab',
		fontWeight: '500',
		flex: 1,
	},
	answerBox: {
		marginTop: 12,
		marginLeft: 28,
		paddingRight: 8,
	},
	answerText: {
		fontSize: 14,
		color: '#334155',
		lineHeight: 22,
	},
	contactSection: {
		backgroundColor: '#f8fafc',
		paddingHorizontal: 60,
		paddingVertical: 60,
		alignItems: 'center',
	},
	contactTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1e293b',
		marginBottom: 12,
		textAlign: 'center',
	},
	contactText: {
		fontSize: 16,
		color: '#64748b',
		textAlign: 'center',
		maxWidth: 400,
		marginBottom: 24,
		lineHeight: 24,
	},
	contactButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#006dab',
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 8,
		gap: 8,
	},
	contactButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	footer: {
		backgroundColor: '#1e293b',
		paddingVertical: 24,
		alignItems: 'center',
	},
	footerText: {
		color: '#94a3b8',
		fontSize: 14,
	},
});