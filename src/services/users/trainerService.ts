import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs, getDoc, query, where, orderBy, updateDoc} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import type { CreateTrainerData, Trainer, UpdateTrainerData } from '../../types/trainer.types';
import type { FirestoreUserProfile } from '../../types/auth.types';
import { logger, criticalLogger } from '../../utils/logger';
export class TrainerService {
  // Crear un nuevo entrenador con cuenta de Firebase Auth y perfil en Firestore
  static async createTrainer(data: CreateTrainerData): Promise<Trainer> {
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
        // 3. Crear perfil de usuario en Firestore con rol 'trainer'
        const userProfile: FirestoreUserProfile = {
          uid: user.uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date().toISOString(), // Fecha por defecto, se puede actualizar después
          role: UserRole.TRAINER,
          emergencyContact: {
            name: '',
            phone: data.phone,
            relationship: 'self'
          },
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        // Guardar en la colección 'users'
        await setDoc(doc(db, 'users', user.uid), userProfile);
        // 4. Crear perfil específico de entrenador en la colección 'trainers'
        const trainerProfile: Trainer = {
          id: user.uid,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          specialties: data.specialties,
          certifications: data.certifications,
          experience: data.experience,
          hourlyRate: data.hourlyRate,
          bio: data.bio || '',
          availability: [],
          assignedClasses: [],
          status: 'active',
          hireDate: new Date()
        };
        // Guardar en la colección 'trainers'
        await setDoc(doc(db, 'trainers', user.uid), trainerProfile);
        logger.log('Trainer created successfully:', trainerProfile);
        return trainerProfile;
      } catch (firestoreError) {
        // Si hay error en Firestore pero el usuario ya fue creado en Auth, 
        // intentamos eliminar el usuario de Auth para mantener consistencia
        criticalLogger.error('Error creating trainer profile in Firestore:', firestoreError);
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
        throw new Error('Error al crear el perfil del entrenador en la base de datos.');
      }
    } catch (authError: any) {
      criticalLogger.error('Error creating trainer in Firebase Auth:', authError);
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
        throw new Error('Este email ya está registrado. Por favor, usa otro email.');
      } else if (authError.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
      } else if (authError.code === 'auth/invalid-email') {
        throw new Error('El email proporcionado no es válido.');
      } else if (authError.message && authError.message.includes('perfil del entrenador')) {
        // Re-lanzar errores de Firestore tal como están
        throw authError;
      } else {
        throw new Error('Error al crear la cuenta del entrenador. Por favor, intenta de nuevo.');
      }
    }
  }
  // Obtener todos los entrenadores
  static async getAllTrainers(): Promise<Trainer[]> {
    try {
      const trainersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.TRAINER),
        orderBy('firstName', 'asc')
      );
      const querySnapshot = await getDocs(trainersQuery);
      const trainers: Trainer[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trainers.push({
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || '',
          specialties: data.specialties || data.specializations || [],
          certifications: data.certifications || [],
          experience: data.experience || 0,
          hourlyRate: data.hourlyRate || 0,
          availability: data.availability || [],
          assignedClasses: data.assignedClasses || [],
          status: data.status || 'active',
          hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : new Date(data.hireDate || data.joinDate),
          profileImage: data.profilePicture || data.profileImage,
          bio: data.bio || ''
        } as Trainer);
      });
      return trainers;
    } catch (error) {
      logger.error('Error fetching trainers:', error);
      throw new Error('Error al obtener los entrenadores.');
    }
  }
  // Actualizar un entrenador
  static async updateTrainer(trainerId: string, data: UpdateTrainerData): Promise<void> {
    try {
      const trainerRef = doc(db, 'trainers', trainerId);
      const userRef = doc(db, 'users', trainerId);
      // Actualizar en la colección 'trainers'
      await updateDoc(trainerRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      // Actualizar campos relevantes en la colección 'users'
      const userUpdates: any = {
        updatedAt: new Date().toISOString()
      };
      if (data.firstName) userUpdates.firstName = data.firstName;
      if (data.lastName) userUpdates.lastName = data.lastName;
      if (data.phone) userUpdates.phone = data.phone;
      await updateDoc(userRef, userUpdates);
    } catch (error) {
      logger.error('Error updating trainer:', error);
      throw new Error('Error al actualizar el entrenador.');
    }
  }
  // Eliminar un entrenador (desactivar en lugar de eliminar completamente)
  static async deleteTrainer(trainerId: string): Promise<void> {
    try {
      const trainerRef = doc(db, 'trainers', trainerId);
      const userRef = doc(db, 'users', trainerId);
      // Marcar como inactivo en lugar de eliminar
      await(trainerRef, {
        status: 'inactive',
        updatedAt: new Date().toISOString()
      });
      await(userRef, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      criticalLogger.error('Error deleting trainer:', error);
      throw new Error('Error al eliminar el entrenador.');
    }
  }
  // Obtener un entrenador específico
  static async getTrainer(trainerId: string): Promise<Trainer | null> {
    try {
      const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
      if (!trainerDoc.exists()) {
        return null;
      }
      const data = trainerDoc.data();
      return {
        ...data,
        id: trainerDoc.id,
        hireDate: data.hireDate?.toDate() || new Date()
      } as Trainer;
    } catch (error) {
      logger.error('Error fetching trainer:', error);
      throw new Error('Error al obtener el entrenador.');
    }
  }
  // Alias para getTrainer (para compatibilidad con TrainerDashboard)
  static async getTrainerById(trainerId: string): Promise<Trainer | null> {
    return this.getTrainer(trainerId);
  }
  // Obtener estadísticas del entrenador
  static async getTrainerStats(trainerId: string): Promise<any> {
    try {
      // Obtener clases asignadas
      const classesQuery = query(
        collection(db, 'classes'),
        where('trainerId', '==', trainerId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const totalClasses = classesSnapshot.size;
      // Obtener asignaciones de miembros a clases del entrenador
      const assignmentsQuery = query(
        collection(db, 'class_assignments'),
        where('trainerId', '==', trainerId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      // Contar miembros únicos
      const uniqueMembers = new Set();
      assignmentsSnapshot.forEach(doc => {
        const data = doc.data() as any;
        uniqueMembers.add(data.memberId);
      });
      const totalMembers = uniqueMembers.size;
      // Calcular ganancias mensuales estimadas (basado en clases y tarifa por hora)
      const trainer = await this.getTrainer(trainerId);
      const hourlyRate = trainer?.hourlyRate || 0;
      const estimatedHoursPerMonth = totalClasses * 4 * 1; // Asumiendo 1 hora por clase, 4 semanas por mes
      const monthlyEarnings = estimatedHoursPerMonth * hourlyRate;
      return {
        totalClasses,
        totalMembers,
        averageRating: 4.5, // Valor por defecto, se puede implementar un sistema de calificaciones
        monthlyEarnings
      };
    } catch (error) {
      logger.error('Error getting trainer stats:', error);
      throw new Error('Error al obtener las estadísticas del entrenador.');
    }
  }
  // Asignar disponibilidad a un entrenador
  static async updateTrainerAvailability(trainerId: string, availability: any[]): Promise<void> {
    try {
      const trainerRef = doc(db, 'trainers', trainerId);
      await(trainerRef, {
        availability,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating trainer availability:', error);
      throw new Error('Error al actualizar la disponibilidad del entrenador.');
    }
  }
  // Asignar clases a un entrenador
  static async assignClassesToTrainer(trainerId: string, classIds: string[]): Promise<void> {
    try {
      const trainerRef = doc(db, 'trainers', trainerId);
      await(trainerRef, {
        assignedClasses: classIds,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error assigning classes to trainer:', error);
      throw new Error('Error al asignar clases al entrenador.');
    }
  }
}
export default TrainerService;