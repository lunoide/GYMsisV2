import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import type { User, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserRole, DEFAULT_ROLE, hasPermission } from '../../config/roles.config';
import type { 
  RegisterData, 
  LoginCredentials, 
  UserProfile, 
  AuthUser,
  FirestoreUserProfile 
} from '../../types/auth.types';
import { sanitizeText, sanitizeEmail, sanitizeObject, SANITIZATION_CONFIGS } from '../../utils/sanitization';
import { RateLimitService } from '../security/rateLimitService';
import { logger, criticalLogger } from '../../utils/logger';

// Interface para compatibilidad con el código existente
export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  // Registro de usuario con rol por defecto 'member'
  static async register(data: RegisterData): Promise<UserProfile> {
    let userCredential: any = null;
    
    // Detectar si hay un admin autenticado (para creación por admin vs auto-registro)
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email;
    const isAdminCreation = currentUser && (adminEmail === 'usu7@gmail.com' || adminEmail === 'benja@gmail.com');
    
    // Aplicar rate limiting solo para registros no administrativos
    if (!isAdminCreation) {
      const rateLimitResult = RateLimitService.checkRateLimit(
        data.email,
        RateLimitService.CONFIGS.REGISTRATION,
        'registration'
      );
      
      if (!rateLimitResult.allowed) {
        const error = new Error(`Demasiados intentos de registro. Intenta nuevamente en ${Math.ceil(rateLimitResult.retryAfter! / 60)} minutos.`);
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter = rateLimitResult.retryAfter;
        throw error;
      }
    }
    
    try {
      // Validate email format first
      const sanitizedEmail = sanitizeEmail(data.email);
      
      // Sanitize text fields individually to preserve Date objects
      const sanitizedFirstName = sanitizeText(data.firstName);
      const sanitizedLastName = sanitizeText(data.lastName);
      const sanitizedEmergencyContact = {
        name: sanitizeText(data.emergencyContact.name),
        phone: sanitizeText(data.emergencyContact.phone),
        relationship: sanitizeText(data.emergencyContact.relationship)
      };
      
      // Crear usuario en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        sanitizedEmail,
        data.password // Password is not sanitized as it's handled by Firebase Auth
      );

      const user = userCredential.user;

      // Si es creación por admin, cerrar sesión del nuevo usuario y re-autenticar como admin
      if (isAdminCreation) {
        await signOut(auth);
        
        // Re-autenticar como admin
        if (adminEmail === 'usu7@gmail.com') {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } else if (adminEmail === 'benja@gmail.com') {
          // Agregar credenciales para benja si es necesario
          throw new Error('Credenciales de admin no configuradas para este usuario');
        }
      }

      try {
        // Crear perfil en Firestore con rol 'member' por defecto
        const userProfile: FirestoreUserProfile = {
          uid: user.uid,
          email: sanitizedEmail,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          dateOfBirth: data.dateOfBirth.toISOString(), // Use original Date object
          role: data.role || DEFAULT_ROLE, // Por defecto será 'member'
          emergencyContact: sanitizedEmergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        // Guardar en Firestore
        await setDoc(doc(db, 'users', user.uid), userProfile);

        // Registrar intento exitoso de registro (solo para registros no administrativos)
        if (!isAdminCreation) {
          RateLimitService.recordAttempt(data.email, RateLimitService.CONFIGS.REGISTRATION, true, 'registration');
        }

        // Convertir a UserProfile para retornar
        return this.convertFirestoreToUserProfile(userProfile);
        
      } catch (firestoreError: any) {
        // Si hay error en Firestore, intentamos eliminar el usuario de Auth para mantener consistencia
        criticalLogger.error('Error creating user profile in Firestore:', firestoreError);
        
        // Restaurar autenticación del admin antes de limpiar (si es creación por admin)
        if (isAdminCreation && adminEmail === 'usu7@gmail.com') {
          try {
            await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
          } catch (reAuthError) {
            logger.error('Error al re-autenticar admin:', reAuthError);
          }
        }
        
        try {
          await user.delete();
          logger.log('User deleted from Auth due to Firestore error');
        } catch (deleteError) {
          criticalLogger.error('Error deleting user from Auth:', deleteError);
        }
        
        throw new Error('Error al crear el perfil del usuario en la base de datos.');
      }
      
    } catch (authError: any) {
      criticalLogger.error('Error creating user in Firebase Auth:', authError);
      
      // Registrar intento fallido de registro (solo para registros no administrativos)
      if (!isAdminCreation) {
        RateLimitService.recordAttempt(data.email, RateLimitService.CONFIGS.REGISTRATION, false, 'registration');
      }
      
      // Restaurar autenticación del admin en caso de error de Auth (si es creación por admin)
      if (isAdminCreation && adminEmail === 'usu7@gmail.com') {
        try {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } catch (reAuthError) {
          console.error('Error al re-autenticar admin:', reAuthError);
        }
      }
      
      throw new Error(this.getErrorMessage(this.getFirebaseErrorCode(authError)));
    }
  }

  // Inicio de sesión
  static async login(data: LoginData): Promise<UserProfile> {
    // Verificar rate limiting antes del intento de login
    const rateLimitResult = RateLimitService.checkRateLimit(
      data.email,
      RateLimitService.CONFIGS.LOGIN,
      'login'
    );
    
    if (!rateLimitResult.allowed) {
      const error = new Error(`Demasiados intentos de inicio de sesión. Intenta nuevamente en ${Math.ceil(rateLimitResult.retryAfter! / 60)} minutos.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = rateLimitResult.retryAfter;
      throw error;
    }

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;

      // Obtener perfil del usuario desde Firestore
      const userProfile = await this.getUserProfile(user.uid);
      
      if (!userProfile) {
        throw new Error('Perfil de usuario no encontrado');
      }

      // Actualizar última actividad
      await this.updateLastActivity(user.uid);

      // Registrar intento exitoso de login
      RateLimitService.recordAttempt(data.email, RateLimitService.CONFIGS.LOGIN, true, 'login');

      return userProfile;
    } catch (error) {
      // Registrar intento fallido de login
      RateLimitService.recordAttempt(data.email, RateLimitService.CONFIGS.LOGIN, false, 'login');
      
      throw new Error(this.getErrorMessage(this.getFirebaseErrorCode(error)));
    }
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(this.getErrorMessage(this.getFirebaseErrorCode(error)));
    }
  }

  // Obtener perfil de usuario desde Firestore
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FirestoreUserProfile;
        return this.convertFirestoreToUserProfile(data);
      }

      return null;
    } catch (error) {
      console.error('Error al obtener perfil de usuario:', error);
      return null;
    }
  }

  // Crear perfil de usuario completo en Firestore
  static async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      
      // Sanitize user data before creating
      const sanitizedProfile = sanitizeObject(profile, SANITIZATION_CONFIGS.text);
      
      // Convertir a formato Firestore
      const firestoreProfile: FirestoreUserProfile = {
        uid: sanitizedProfile.uid,
        email: sanitizeEmail(sanitizedProfile.email),
        firstName: sanitizedProfile.firstName,
        lastName: sanitizedProfile.lastName,
        dateOfBirth: sanitizedProfile.dateOfBirth.toISOString(),
        role: sanitizedProfile.role,
        emergencyContact: sanitizedProfile.emergencyContact,
        membershipStatus: sanitizedProfile.membershipStatus || 'inactive',
        membershipType: sanitizedProfile.membershipType,
        joinDate: sanitizedProfile.joinDate.toISOString(),
        lastActivity: sanitizedProfile.lastActivity?.toISOString(),
        profilePicture: sanitizedProfile.profilePicture,
        points: sanitizedProfile.points || 0
      };

      await setDoc(docRef, firestoreProfile);
    } catch (error) {
      console.error('Error detallado en createUserProfile:', error);
      console.error('Tipo de error:', typeof error);
      console.error('Error stringificado:', JSON.stringify(error, null, 2));
      
      // Intentar obtener más información del error
      let errorMessage = 'Error desconocido al crear perfil';
      
      if (error && typeof error === 'object') {
        if ('code' in error) {
          errorMessage = this.getErrorMessage((error as any).code);
        } else if ('message' in error) {
          errorMessage = `Error: ${(error as any).message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Actualizar perfil de usuario
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      
      // Sanitize user data before updating
      const sanitizedUpdates = sanitizeObject(updates, SANITIZATION_CONFIGS.text);
      
      // Convertir fechas a strings para Firestore
      const firestoreUpdates: Partial<FirestoreUserProfile> = {};
      
      Object.keys(sanitizedUpdates).forEach(key => {
        const value = sanitizedUpdates[key as keyof UserProfile];
        if (value instanceof Date) {
          firestoreUpdates[key as keyof FirestoreUserProfile] = value.toISOString() as any;
        } else {
          firestoreUpdates[key as keyof FirestoreUserProfile] = value as any;
        }
      });

      await updateDoc(docRef, firestoreUpdates);
    } catch (error) {
      throw new Error(this.getErrorMessage(this.getFirebaseErrorCode(error)));
    }
  }

  // Actualizar última actividad
  static async updateLastActivity(uid: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al actualizar última actividad:', error);
    }
  }

  // Verificar permisos del usuario
  static hasUserPermission(userRole: UserRole, permission: string): boolean {
    return hasPermission(userRole, permission);
  }

  // Observador de cambios de autenticación
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Convertir datos de Firestore a UserProfile
  private static convertFirestoreToUserProfile(data: FirestoreUserProfile): UserProfile {
    return {
      uid: data.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      role: data.role,
      emergencyContact: data.emergencyContact,
      membershipStatus: data.membershipStatus,
      membershipType: data.membershipType,
      joinDate: new Date(data.joinDate),
      lastActivity: data.lastActivity ? new Date(data.lastActivity) : undefined,
      profilePicture: data.profilePicture
    };
  }

  // Extraer código de error de Firebase
  private static getFirebaseErrorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: string }).code;
    }
    return 'unknown';
  }

  // Obtener mensaje de error amigable
  private static getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      // Errores de autenticación
      'auth/email-already-in-use': 'Este email ya está registrado',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'El email no es válido',
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/invalid-credential': 'Credenciales inválidas',
      
      // Errores de rate limiting
      'RATE_LIMIT_EXCEEDED': 'Demasiados intentos. Intenta más tarde',
      
      // Errores de Firestore
      'permission-denied': 'Permisos insuficientes para realizar esta operación',
      'not-found': 'El documento no fue encontrado',
      'already-exists': 'El documento ya existe',
      'resource-exhausted': 'Se ha excedido el límite de recursos',
      'failed-precondition': 'La operación no cumple con las condiciones requeridas',
      'aborted': 'La operación fue cancelada',
      'out-of-range': 'Valor fuera del rango permitido',
      'unimplemented': 'Operación no implementada',
      'internal': 'Error interno del servidor',
      'unavailable': 'Servicio no disponible temporalmente',
      'data-loss': 'Pérdida de datos irrecuperable',
      'unauthenticated': 'Usuario no autenticado',
      
      'unknown': 'Error desconocido'
    };

    return errorMessages[errorCode] || `Error: ${errorCode}`;
  }
}

export default AuthService;