import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  username: string;
  role: 'doctor' | 'admin' | 'patient' | 'visitor' | 'researcher';
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  medicalLicense?: string;
  specialization?: string;
  tmcCredits?: number;
  digitalCertificate?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  password: string;
  role: 'doctor' | 'admin' | 'patient' | 'researcher';
  name: string;
  email?: string;
  phone?: string;
  medicalLicense?: string; // CRM for doctors
  specialization?: string; // Specialty for doctors
  dateOfBirth?: string; // Date of birth for patients
  gender?: string; // Gender for patients
  bloodType?: string; // Blood type for patients
  allergies?: string; // Allergies for patients
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        username,
        password
      });
      
      const data = await response.json();
      setUser(data.user);
      
      // Clear any cached data and refetch
      queryClient.clear();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      
      const data = await response.json();
      setUser(data.user);
      
      // Clear any cached data and refetch
      queryClient.clear();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      setUser(null);
      
      // Clear all cached data
      queryClient.clear();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user data even if logout request fails
      setUser(null);
      queryClient.clear();
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}