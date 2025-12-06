import { Platform } from 'react-native';

// PWA Install Event
let deferredPrompt: any = null;
let installPromptListeners: ((prompt: any) => void)[] = [];

// Initialize PWA features - call this on app start
export function initPWA() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  // Register service worker
  registerServiceWorker();

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    
    // Notify all listeners
    installPromptListeners.forEach(listener => listener(deferredPrompt));
  });

  // Track when PWA is installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    installPromptListeners.forEach(listener => listener(null));
  });

  // Add PWA meta tags dynamically
  addPWAMetaTags();
}

// Register service worker
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update prompt if needed
            console.log('[PWA] New content available');
          }
        });
      }
    });
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
}

// Add PWA meta tags to document head
function addPWAMetaTags() {
  if (typeof document === 'undefined') return;

  const head = document.head;

  // Check if tags already exist
  if (document.querySelector('link[rel="manifest"]')) return;

  // Manifest link
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/manifest.json';
  head.appendChild(manifestLink);

  // Theme color
  const themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#006dab';
  head.appendChild(themeColor);

  // Apple touch icon
  const appleIcon = document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  appleIcon.href = '/icon-192.png';
  head.appendChild(appleIcon);

  // Apple mobile web app capable
  const appleMobile = document.createElement('meta');
  appleMobile.name = 'apple-mobile-web-app-capable';
  appleMobile.content = 'yes';
  head.appendChild(appleMobile);

  // Apple mobile web app status bar style
  const appleStatusBar = document.createElement('meta');
  appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
  appleStatusBar.content = 'black-translucent';
  head.appendChild(appleStatusBar);

  // Apple mobile web app title
  const appleTitle = document.createElement('meta');
  appleTitle.name = 'apple-mobile-web-app-title';
  appleTitle.content = 'Fit for Baby';
  head.appendChild(appleTitle);

  // MS application tile color
  const msTileColor = document.createElement('meta');
  msTileColor.name = 'msapplication-TileColor';
  msTileColor.content = '#006dab';
  head.appendChild(msTileColor);
}

// Check if PWA can be installed
export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

// Check if app is running as installed PWA
export function isRunningAsPWA(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check display-mode media query
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // iOS Safari specific check
  const isIOSPWA = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSPWA;
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Trigger PWA install prompt
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const choiceResult = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', choiceResult.outcome);
    
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted install');
      deferredPrompt = null;
      return true;
    } else {
      console.log('[PWA] User dismissed install');
      return false;
    }
  } catch (error) {
    console.error('[PWA] Install prompt error:', error);
    return false;
  }
}

// Subscribe to install prompt availability changes
export function onInstallPromptChange(callback: (available: boolean) => void): () => void {
  const listener = (prompt: any) => callback(prompt !== null);
  installPromptListeners.push(listener);
  
  // Call immediately with current state
  callback(deferredPrompt !== null);
  
  // Return unsubscribe function
  return () => {
    installPromptListeners = installPromptListeners.filter(l => l !== listener);
  };
}

// Get PWA display mode
export function getPWADisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'browser';
  }

  const mqStandalone = window.matchMedia('(display-mode: standalone)');
  const mqMinimalUI = window.matchMedia('(display-mode: minimal-ui)');
  const mqFullscreen = window.matchMedia('(display-mode: fullscreen)');

  if (mqFullscreen.matches) return 'fullscreen';
  if (mqMinimalUI.matches) return 'minimal-ui';
  if (mqStandalone.matches) return 'standalone';
  if ((window.navigator as any).standalone) return 'standalone'; // iOS Safari
  
  return 'browser';
}
