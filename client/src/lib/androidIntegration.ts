// Android Integration Service for native calling and permissions
export interface AndroidIntegration {
  callEmergency?: (phoneNumber: string) => void;
  checkPermissions?: () => Promise<boolean>;
  requestPermissions?: () => Promise<boolean>;
  getContacts?: () => Promise<any[]>;
}

declare global {
  interface Window {
    Android?: AndroidIntegration;
  }
}

export class AndroidIntegrationService {
  private static instance: AndroidIntegrationService;
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = this.detectAndroid();
  }

  static getInstance(): AndroidIntegrationService {
    if (!AndroidIntegrationService.instance) {
      AndroidIntegrationService.instance = new AndroidIntegrationService();
    }
    return AndroidIntegrationService.instance;
  }

  private detectAndroid(): boolean {
    return /Android/i.test(navigator.userAgent) || 
           (typeof window !== 'undefined' && 'Android' in window);
  }

  /**
   * Check if running on Android device
   */
  isAndroidDevice(): boolean {
    return this.isAndroid;
  }

  /**
   * Check if Android integration is available
   */
  isAndroidIntegrationAvailable(): boolean {
    return this.isAndroid && typeof window !== 'undefined' && window.Android !== undefined;
  }

  /**
   * Make an emergency call using Android's native calling API
   */
  async makeEmergencyCall(phoneNumber: string): Promise<boolean> {
    try {
      if (this.isAndroidIntegrationAvailable()) {
        // Use Android's native calling API
        if (window.Android?.callEmergency) {
          window.Android.callEmergency(phoneNumber);
          return true;
        }
      }

      // Fallback: Use tel: protocol
      if (this.isAndroid || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Mobile device - try tel: protocol
        window.location.href = `tel:${phoneNumber}`;
        return true;
      }

      // Desktop fallback - show instruction
      alert(`Please manually call: ${phoneNumber}`);
      return false;

    } catch (error) {
      console.error('Emergency call failed:', error);
      return false;
    }
  }

  /**
   * Check if required permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (this.isAndroidIntegrationAvailable()) {
        return window.Android?.checkPermissions?.() || false;
      }
      
      // Web fallback - check for basic permissions
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return permissionStatus.state === 'granted';
      }
      
      return true; // Assume granted if can't check
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Request required permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (this.isAndroidIntegrationAvailable()) {
        return window.Android?.requestPermissions?.() || false;
      }

      // Web fallback - request microphone permission
      if ('mediaDevices' in navigator) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          return true;
        } catch (error) {
          console.error('Microphone permission denied:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get contacts (Android only)
   */
  async getContacts(): Promise<any[]> {
    try {
      if (this.isAndroidIntegrationAvailable() && window.Android?.getContacts) {
        return await window.Android.getContacts();
      }
      return [];
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  /**
   * Initialize Android integration
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isAndroidDevice()) {
        const hasPermissions = await this.checkPermissions();
        if (!hasPermissions) {
          return await this.requestPermissions();
        }
        return true;
      }
      return true;
    } catch (error) {
      console.error('Android integration initialization failed:', error);
      return false;
    }
  }
}

export const androidIntegrationService = AndroidIntegrationService.getInstance(); 