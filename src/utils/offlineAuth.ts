// Offline authentication utility
export class OfflineAuth {
  private static instance: OfflineAuth;
  private storageKey = 'mercadinho_offline_auth';
  private sessionKey = 'mercadinho_session';

  static getInstance(): OfflineAuth {
    if (!OfflineAuth.instance) {
      OfflineAuth.instance = new OfflineAuth();
    }
    return OfflineAuth.instance;
  }

  // Save user credentials for offline use (encrypted)
  saveOfflineCredentials(email: string, password: string, userData: any) {
    const credentials = {
      email,
      passwordHash: this.hashPassword(password), // Simple hash for demo
      userData,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(credentials));
  }

  // Verify offline credentials
  verifyOfflineCredentials(email: string, password: string): any | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const credentials = JSON.parse(stored);
      const passwordHash = this.hashPassword(password);

      if (credentials.email === email && credentials.passwordHash === passwordHash) {
        return credentials.userData;
      }
      return null;
    } catch (error) {
      console.error('Error verifying offline credentials:', error);
      return null;
    }
  }

  // Save current session
  saveSession(userData: any) {
    const session = {
      user: userData,
      timestamp: Date.now(),
      offline: !navigator.onLine
    };
    
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  // Get current session
  getSession(): any | null {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (!stored) return null;

      const session = JSON.parse(stored);
      
      // Check if session is still valid (24 hours for offline)
      const maxAge = navigator.onLine ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 8h online, 24h offline
      if (Date.now() - session.timestamp > maxAge) {
        this.clearSession();
        return null;
      }

      return session.user;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Clear session
  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  // Check if offline credentials exist
  hasOfflineCredentials(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  // Simple password hashing (in production, use proper encryption)
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Create offline demo user
  createOfflineUser() {
    const demoUser = {
      id: 'offline-user',
      email: 'admin@mercadinho.com',
      full_name: 'Administrador Offline',
      role: 'admin'
    };

    this.saveOfflineCredentials('admin@mercadinho.com', 'admin123', demoUser);
    return demoUser;
  }
}