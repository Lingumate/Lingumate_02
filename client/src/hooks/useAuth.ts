import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  signOutUser, 
  onAuthStateChange,
  convertFirebaseUser,
  auth
} from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  primaryLanguage?: string;
  location?: string;
  emailVerified?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase authentication functions
  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const firebaseUser = await signInWithEmail(email, password);
      const userData = convertFirebaseUser(firebaseUser);
      if (!userData) throw new Error('Failed to convert user data');
      
      // Get the ID token for backend authentication
      const token = await firebaseUser.getIdToken();
      
      setUser(userData);
      localStorage.setItem('token', token);
      
      return {
        user: userData,
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> => {
    try {
      const firebaseUser = await signUpWithEmail(email, password, firstName, lastName);
      const userData = convertFirebaseUser(firebaseUser);
      if (!userData) throw new Error('Failed to convert user data');
      
      // Get the ID token for backend authentication
      const token = await firebaseUser.getIdToken();
      
      setUser(userData);
      localStorage.setItem('token', token);
      
      return {
        user: userData,
        token
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const googleAuth = useCallback(async (): Promise<AuthResponse> => {
    try {
      const firebaseUser = await signInWithGoogle();
      const userData = convertFirebaseUser(firebaseUser);
      if (!userData) throw new Error('Failed to convert user data');
      
      // Get the ID token for backend authentication
      const token = await firebaseUser.getIdToken();
      
      setUser(userData);
      localStorage.setItem('token', token);
      
      return {
        user: userData,
        token
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Firebase logout fails
      setUser(null);
      localStorage.removeItem('token');
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const userData = convertFirebaseUser(firebaseUser);
        setUser(userData);
        
        // Get and store the token
        firebaseUser.getIdToken().then(token => {
          localStorage.setItem('token', token);
        });
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    googleAuth,
    logout,
    token: localStorage.getItem('token'),
  };
}
