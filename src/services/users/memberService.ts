import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where,
  orderBy} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import type { UserProfile } from '../../types/auth.types';
import {sanitizeObject, SANITIZATION_CONFIGS } from '../../utils/sanitization';
import { logger } from '../../utils/logger';
import { Timestamp } from 'firebase/firestore';
const COLLECTION_NAME = 'users';
export class MemberService {
  // Obtener todos los miembros (usuarios con rol 'member')
  static async getAllMembers(): Promise<UserProfile[]> {
    try {
      const membersQuery = query(
        collection(db, COLLECTION_NAME),
        where('role', '==', UserRole.MEMBER),
        orderBy('firstName', 'asc')
      );
      const querySnapshot = await getDocs(membersQuery);
      const members: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          uid: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : new Date(data.dateOfBirth),
          role: data.role,
          emergencyContact: data.emergencyContact,
          membershipStatus: data.membershipStatus,
          membershipType: data.membershipType,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(data.joinDate),
          lastActivity: data.lastActivity?.toDate ? data.lastActivity.toDate() : undefined,
          profilePicture: data.profilePicture,
          points: data.points || 0
        });
      });
      return members;
    } catch (error) {
      logger.error('Error obteniendo miembros:', error);
      throw new Error('Error al cargar la lista de miembros');
    }
  }
  // Obtener un miembro por ID
  static async getMemberById(memberId: string): Promise<UserProfile | null> {
    try {
      const memberDoc = await getDoc(doc(db, COLLECTION_NAME, memberId));
      if (!memberDoc.exists()) {
        return null;
      }
      const data = memberDoc.data();
      return {
        uid: memberDoc.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : new Date(data.dateOfBirth),
        role: data.role,
        emergencyContact: data.emergencyContact,
        membershipStatus: data.membershipStatus,
        membershipType: data.membershipType,
        joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(data.joinDate),
        lastActivity: data.lastActivity?.toDate ? data.lastActivity.toDate() : undefined,
        profilePicture: data.profilePicture,
        points: data.points || 0
      };
    } catch (error) {
      logger.error('Error obteniendo miembro:', error);
      throw new Error('Error al cargar el miembro');
    }
  }
  // Obtener miembros activos
  static async getActiveMembers(): Promise<UserProfile[]> {
    try {
      const membersQuery = query(
        collection(db, COLLECTION_NAME),
        where('role', '==', UserRole.MEMBER),
        where('membershipStatus', '==', 'active'),('firstName', 'asc')
      );
      const querySnapshot = await getDocs(membersQuery);
      const members: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          uid: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : new Date(data.dateOfBirth),
          role: data.role,
          emergencyContact: data.emergencyContact,
          membershipStatus: data.membershipStatus,
          membershipType: data.membershipType,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(data.joinDate),
          lastActivity: data.lastActivity?.toDate ? data.lastActivity.toDate() : undefined,
          profilePicture: data.profilePicture,
          points: data.points || 0
        });
      });
      return members;
    } catch (error) {
      logger.error('Error obteniendo miembros activos:', error);
      throw new Error('Error al cargar miembros activos');
    }
  }
  // Actualizar puntos de un miembro
  static async updateMemberPoints(memberId: string, pointsToAdd: number): Promise<void> {
    try {
      const memberRef = doc(db, COLLECTION_NAME, memberId);
      const memberDoc = await getDoc(memberRef);
      if (!memberDoc.exists()) {
        throw new Error('Miembro no encontrado');
      }
      const currentData = memberDoc.data();
      const currentPoints = currentData.points || 0;
      const newPoints = currentPoints + pointsToAdd;
      await(memberRef, {
        points: newPoints,
        lastActivity:Timestamp.now()
      });
    } catch (error) {
      logger.error('Error actualizando puntos del miembro:', error);
      throw new Error('Error al actualizar puntos del miembro');
    }
  }
  // Buscar miembros por nombre
  static async searchMembersByName(searchTerm: string): Promise<UserProfile[]> {
    try {
      // Sanitize search term to prevent injection attacks
      const sanitizedSearchTerm =(searchTerm);
      if (!sanitizedSearchTerm || sanitizedSearchTerm.length < 2) {
        return [];
      }
      const allMembers = await this.getAllMembers();
      const searchLower = sanitizedSearchTerm.toLowerCase();
      return allMembers.filter(member => 
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      logger.error('Error buscando miembros:', error);
      throw new Error('Error al buscar miembros');
    }
  }
  // Actualizar información de un miembro
  static async updateMember(memberId: string, updateData: Partial<UserProfile>): Promise<void> {
    try {
      const memberRef = doc(db, COLLECTION_NAME, memberId);
      // Sanitize user data before updating
      const sanitizedData = sanitizeObject(updateData, SANITIZATION_CONFIGS.text);
      // Convertir fechas apara Firestore
      const firestoreData: any = { ...sanitizedData };
      if (sanitizedData.dateOfBirth) {
        firestoreData.dateOfBirth =Timestamp.fromDate(sanitizedData.dateOfBirth);
      }
      if (sanitizedData.joinDate) {
        firestoreData.joinDate =Timestamp.fromDate(sanitizedData.joinDate);
      }
      if (sanitizedData.lastActivity) {
        firestoreData.lastActivity =Timestamp.fromDate(sanitizedData.lastActivity);
      }
      await(memberRef, firestoreData);
    } catch (error) {
      logger.error('Error actualizando miembro:', error);
      throw new Error('Error al actualizar la información del miembro');
    }
  }
  // Eliminar un miembro
  static async deleteMember(memberId: string): Promise<void> {
    try {
      const memberRef = doc(db, COLLECTION_NAME, memberId);
      await(memberRef);
    } catch (error) {
      logger.error('Error eliminando miembro:', error);
      throw new Error('Error al eliminar el miembro');
    }
  }
  // Obtener miembros asignados a un entrenador
  static async getMembersByTrainer(trainerId: string): Promise<UserProfile[]> {
    try {
      // Obtener asignaciones de clases del entrenador
      const assignmentsQuery = query(
        collection(db, 'class_assignments'),
        where('trainerId', '==', trainerId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const memberIds = new Set<string>();
      // Recopilar IDs únicos de miembros
      assignmentsSnapshot.forEach(doc => {
        const data = doc.data() as any;
        memberIds.add(data.memberId);
      });
      if (memberIds.size === 0) {
        return [];
      }
      // Obtener los datos de los miembros
      const members: UserProfile[] = [];
      for (const memberId of memberIds) {
        const member = await this.getMemberById(memberId);
        if (member) {
          members.push(member);
        }
      }
      return members;
    } catch (error) {
      logger.error('Error getting members by trainer:', error);
      throw new Error('Error al obtener los miembros del entrenador');
    }
  }
}
export const MemberServiceDefault = MemberService;