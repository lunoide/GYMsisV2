import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthService } from '../services/auth';
import { hasPermission, UserRole } from '../config/roles.config';
import { SchedulerService } from '../services/scheduler/schedulerService';
import type { AuthContextType, AuthUser, UserProfile, RegisterData, LoginCredentials } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Manejar el scheduler basado en el rol del usuario
  useEffect(() => {
    if (profile && hasPermission(profile.role, 'manage_system')) {
      // Solo iniciar el scheduler si el usuario tiene permisos de staff
      SchedulerService.startScheduler();
      console.log('Scheduler iniciado para usuario con permisos de staff');
    } else {
      // Detener el scheduler si no hay usuario staff autenticado
      SchedulerService.stopScheduler();
    }
    
    // Cleanup: detener el scheduler cuando el componente se desmonta
    return () => {
      SchedulerService.stopScheduler();
    };
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener el perfil completo del usuario desde Firestore
          let userProfile = await AuthService.getUserProfile(firebaseUser.uid);
          
          // Si el perfil no existe (usuario recién registrado), intentar nuevamente después de un breve delay
          if (!userProfile) {
            console.log('Perfil no encontrado, reintentando en 1 segundo...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            userProfile = await AuthService.getUserProfile(firebaseUser.uid);
          }
          
          // Si aún no existe el perfil, crear uno básico con rol member y guardarlo en Firestore
           if (!userProfile) {
             console.warn('Perfil no encontrado después del reintento, creando perfil básico');
             userProfile = {
               uid: firebaseUser.uid,
               email: firebaseUser.email!,
               firstName: firebaseUser.displayName?.split(' ')[0] || 'Usuario',
               lastName: firebaseUser.displayName?.split(' ')[1] || '',
               role: 'member' as UserRole,
               membershipStatus: 'inactive',
               joinDate: new Date(),
               lastActivity: new Date(),
               dateOfBirth: new Date(),
               emergencyContact: {
                 name: '',
                 phone: '',
                 relationship: ''
               }
             };
             
             // Guardar el perfil básico en Firestore para evitar recrearlo en futuras sesiones
             try {
               await AuthService.createUserProfile(firebaseUser.uid, userProfile);
               console.log('Perfil básico creado y guardado en Firestore');
             } catch (profileError) {
               console.error('Error al guardar perfil básico:', profileError);
               // Continuar con el perfil en memoria aunque no se haya podido guardar
             }
           }
          
          // Crear el objeto AuthUser
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            emailVerified: firebaseUser.emailVerified,
            createdAt: new Date(firebaseUser.metadata.creationTime || new Date()),
            role: userProfile!.role
          };
          
          setUser(authUser);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error obteniendo perfil de usuario:', error);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const credentials: LoginCredentials = { email, password };
      await AuthService.login(credentials);
      
      // El estado se actualizará automáticamente a través del listener onAuthStateChanged
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.register(data);
      // El estado se actualizará automáticamente a través del listener onAuthStateChanged
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    
    setIsLoading(true);
    try {
      await AuthService.updateUserProfile(user.uid, data);
      // El perfil se actualizará automáticamente a través del listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const getUserRole = (): UserRole | null => {
    return user?.role || null;
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    hasPermission: checkPermission,
    getUserRole,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;