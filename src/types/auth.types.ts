// Tipos de autenticación
import type { UserRole } from '../config/roles.config';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  role: UserRole;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  membershipStatus?: 'active' | 'inactive' | 'suspended';
  membershipType?: string;
  joinDate: Date;
  lastActivity?: Date;
  profilePicture?: string;
  points?: number; // Puntos acumulados por compras
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  role?: UserRole; // Opcional, por defecto será 'member'
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  getUserRole: () => UserRole | null;
}

// Tipos para Firebase Firestore
export interface FirestoreUserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO string para Firestore
  role: UserRole;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  membershipStatus?: 'active' | 'inactive' | 'suspended';
  membershipType?: string;
  joinDate: string; // ISO string para Firestore
  lastActivity?: string; // ISO string para Firestore
  profilePicture?: string;
  points?: number; // Puntos acumulados por compras
}