import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isOfflineModalVisible, setIsOfflineModalVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // For web browsers
      const handleOnline = () => {
        setIsConnected(true);
        setIsOfflineModalVisible(false);
      };
      const handleOffline = () => {
        setIsConnected(false);
        setIsOfflineModalVisible(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check initial status
      setIsConnected(navigator.onLine);
      setIsOfflineModalVisible(!navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // For mobile (iOS, Android)
      const unsubscribe = NetInfo.addEventListener(state => {
        const connected = state.isConnected ?? true;
        setIsConnected(connected);
        setIsOfflineModalVisible(!connected);
      });

      return () => unsubscribe();
    }
  }, []);

  return { isConnected, isOfflineModalVisible, setIsOfflineModalVisible };
}
