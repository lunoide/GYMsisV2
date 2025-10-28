import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  getDoc, 
  query, 
  where,
  orderBy,
  deleteDoc,
  updateDoc} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import type { UserProfile, FirestoreUserProfile } from '../../types/auth.types';
import { logger, criticalLogger } from '../../utils/logger';
export interface CreateVendorData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: Date;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}
export interface UpdateVendorData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
const COLLECTION_NAME = 'users';
export class VendorService {
  // Crear un nuevo vendedor con cuenta de Firebase Auth y perfil en Firestore
  static async createVendor(data: CreateVendorData): Promise<UserProfile> {
    let userCredential: any = null;
    // Guardar información del admin actual antes de crear el nuevo usuario
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email;
    try {
      // 1. Crear usuario en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;
      // 2. Cerrar sesión del nuevo usuario y volver a autenticar como admin
      await signOut(auth);
      // Re-autenticar como admin si tenemos la información
      if (adminEmail && currentUser) {
        // Nota: En un entorno de producción, deberías manejar esto de manera más segura
        // Por ahora, asumimos que el admin es usu7@gmail.com
        if (adminEmail === 'usu7@gmail.com') {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } else if (adminEmail === 'benja@gmail.com') {
          // Agregar credenciales para benja si es necesario
          throw new Error('Credenciales de admin no configuradas para este usuario');
        }
      }
      try {
        // 3. Crear perfil de usuario en Firestore con rol 'vendor'
        const userProfile: FirestoreUserProfile = {
          uid: user.uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth.toISOString(),
          role: UserRole.VENDOR,
          emergencyContact: data.emergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        // Guardar en la colección 'users'
        await setDoc(doc(db, COLLECTION_NAME, user.uid), userProfile);
        // Convertir a UserProfile para retornar
        return this.convertFirestoreToUserProfile(userProfile);
      } catch (firestoreError: any) {
        // Si hay error en Firestore, intentamos eliminar el usuario de Auth para mantener consistencia
        criticalLogger.error('Error creating vendor profile in Firestore:', firestoreError);
        // Restaurar autenticación del admin antes de limpiar
        if (adminEmail === 'usu7@gmail.com') {
          try {
            await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
          } catch (reAuthError) {
            criticalLogger.error('Error al re-autenticar admin:', reAuthError);
          }
        }
        try {
          await user.delete();
          logger.log('User deleted from Auth due to Firestore error');
        } catch (deleteError) {
          criticalLogger.error('Error deleting user from Auth:', deleteError);
        }
        throw new Error('Error al crear el perfil del vendedor en la base de datos.');
      }
    } catch (authError: any) {
      criticalLogger.error('Error creating vendor in Firebase Auth:', authError);
      // Restaurar autenticación del admin en caso de error de Auth
      if (adminEmail === 'usu7@gmail.com') {
        try {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } catch (reAuthError) {
          criticalLogger.error('Error al re-autenticar admin:', reAuthError);
        }
      }
      // Errores específicos de Firebase Auth
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error('Este email ya está registrado en el sistema.');
      } else if (authError.code === 'auth/weak-password') {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      } else if (authError.code === 'auth/invalid-email') {
        throw new Error('El formato del email no es válido.');
      } else {
        throw new Error('Error al crear el vendedor. Por favor, intenta de nuevo.');
      }
    }
  }
  // Obtener todos los vendedores (usuarios con rol 'vendor')
  static async getAllVendors(): Promise<UserProfile[]> {
    try {
      const vendorsQuery = query(
        collection(db, COLLECTION_NAME),
        where('role', '==', UserRole.VENDOR),
        orderBy('firstName', 'asc')
      );
      const querySnapshot = await getDocs(vendorsQuery);
      const vendors: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        vendors.push(this.convertFirestoreToUserProfile({
          uid: doc.id,
          ...data
        } as FirestoreUserProfile));
      });
      return vendors;
    } catch (error) {
      logger.error('Error obteniendo vendedores:', error);
      throw new Error('Error al cargar la lista de vendedores');
    }
  }
  // Obtener un vendedor por ID
  static async getVendorById(vendorId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, vendorId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.role === UserRole.VENDOR) {
          return this.convertFirestoreToUserProfile({
            uid: docSnap.id,
            ...data
          } as FirestoreUserProfile);
        }
      }
      return null;
    } catch (error) {
      logger.error('Error obteniendo vendedor:', error);
      throw new Error('Error al obtener el vendedor');
    }
  }
  // Actualizar un vendedor
  static async updateVendor(vendorId: string, data: UpdateVendorData): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, vendorId);
      const updateData: any = {};
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.email) updateData.email = data.email;
      if (data.dateOfBirth) updateData.dateOfBirth = data.dateOfBirth.toISOString();
      if (data.emergencyContact) updateData.emergencyContact = data.emergencyContact;
      updateData.lastActivity = new Date().toISOString();
      await updateDoc(docRef, updateData);
    } catch (error) {
      logger.error('Error actualizando vendedor:', error);
      throw new Error('Error al actualizar el vendedor');
    }
  }
  // Eliminar un vendedor
  static async deleteVendor(vendorId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, vendorId);
      await deleteDoc(docRef);
    } catch (error) {
      logger.error('Error eliminando vendedor:', error);
      throw new Error('Error al eliminar el vendedor');
    }
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
      profilePicture: data.profilePicture,
      points: data.points || 0
    };
  }
}
export default VendorService;