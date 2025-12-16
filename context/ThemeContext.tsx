import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  cardBackground: string;
  inputBackground: string;
  headerBackground: string[];

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Primary colors (stay same in both themes)
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Accent colors
  accent: string;
  accentDark: string;
  accentLight: string;

  // Status colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  // Special
  shadow: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
}

const lightTheme: ThemeColors = {
  // Backgrounds
  background: '#f5f5f5',
  cardBackground: '#ffffff',
  surface: '#ffffff',
  inputBackground: '#f8fafc',
  headerBackground: ['#006dab', '#005a8f'],

  // Text
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Primary colors
  primary: '#006dab',
  primaryDark: '#005a8f',
  primaryLight: '#e0f2fe',

  // Accent colors
  accent: '#98be4e',
  accentDark: '#7ba83c',
  accentLight: '#e8f5d6',

  // Status colors
  success: '#98be4e',
  successLight: '#e8f5d6',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',

  // Special
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#ffffff',
  tabBarBorder: '#e5e7eb',
};

const darkTheme: ThemeColors = {
  // Backgrounds
  background: '#0f172a',
  cardBackground: '#1e293b',
  surface: '#1e293b',
  inputBackground: '#334155',
  headerBackground: ['#1e3a5f', '#0f2744'],

  // Text
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Borders
  border: '#334155',
  borderLight: '#1e293b',

  // Primary colors
  primary: '#38bdf8',
  primaryDark: '#0284c7',
  primaryLight: '#0c4a6e',

  // Accent colors
  accent: '#a3e635',
  accentDark: '#84cc16',
  accentLight: '#1a2e05',

  // Status colors
  success: '#a3e635',
  successLight: '#1a2e05',
  warning: '#fbbf24',
  warningLight: '#422006',
  error: '#f87171',
  errorLight: '#450a0a',

  // Special
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
};

const DARK_MODE_STORAGE_KEY = 'app_dark_mode';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  colors: ThemeColors;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved dark mode preference
  useEffect(() => {
    loadDarkModePref();
  }, []);

  const loadDarkModePref = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (savedDarkMode !== null) {
        setIsDarkMode(savedDarkMode === 'true');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, newValue.toString());
      setIsDarkMode(newValue);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
      // Still update state even if save fails
      setIsDarkMode(prev => !prev);
    }
  };

  const setDarkMode = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, value.toString());
      setIsDarkMode(value);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
      // Still update state even if save fails
      setIsDarkMode(value);
    }
  };

  const colors = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode, colors, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { darkTheme, lightTheme };

