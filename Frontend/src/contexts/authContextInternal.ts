import { createContext } from 'react';
import type { AuthUser, LoginCredentials } from '../types/auth';


export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}


export const AuthContext = createContext<AuthContextValue | null>(null);