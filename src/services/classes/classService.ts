import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MemberService } from '../users/memberService';
import { PaymentService } from '../payments/paymentService';
import { MemberStatusService } from '../users/memberStatusService';
import type { 
  GymClass, 
  CreateClassData, 
  UpdateClassData, 
  ClassAttendance,
  ClassAssignment,
  CreateClassAssignmentData 
} from '../../types/class.types';
import {sanitizeObject, SANITIZATION_CONFIGS } from '../../utils/sanitization';
import { logger, criticalLogger } from '../../utils/logger';
export class ClassService {
  private static readonly COLLECTION_NAME = 'classes';
  private static readonly ASSIGNMENTS_COLLECTION = 'classAssignments';
  private static readonly ATTENDANCE_COLLECTION = 'classAttendance';
  // Crear una nueva clase
  static async createClass(classData: CreateClassData): Promise<string> {
    try {
      // Sanitize class data before creating
      const sanitizedData = sanitizeObject(classData, SANITIZATION_CONFIGS.text);
      const classDoc = {
        ...sanitizedData,
        currentEnrollment: 0,
        status: 'active' as const,
        createdAt:Timestamp.now(),
        updatedAt:Timestamp.now()
      };
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), classDoc);
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating class:', error);
      throw new Error('Error al crear la clase');
    }
  }
  // Obtener todas las clases
  static async getAllClasses(): Promise<GymClass[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as GymClass[];
    } catch (error) {
      logger.error('Error getting classes:', error);
      throw new Error('Error al obtener las clases');
    }
  }
  // Obtener clases por entrenador
  static async getClassesByTrainer(trainerId: string): Promise<GymClass[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('trainerId', '==', trainerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as GymClass[];
    } catch (error) {
      logger.error('Error getting classes by trainer:', error);
      throw new Error('Error al obtener las clases del entrenador');
    }
  }
  // Obtener una clase por ID
  static async getClassById(classId: string): Promise<GymClass | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, classId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
        } as GymClass;
      }
      return null;
    } catch (error) {
      logger.error('Error getting class:', error);
      throw new Error('Error al obtener la clase');
    }
  }
  // Actualizar una clase
  static async updateClass(classData: UpdateClassData): Promise<void> {
    try {
      const { id, ...updateData } = classData;
      // Sanitize update data before processing
      const sanitizedData = sanitizeObject(updateData, SANITIZATION_CONFIGS.text);
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      logger.error('Error updating class:', error);
      throw new Error('Error al actualizar la clase');
    }
  }
  // Eliminar una clase
  static async deleteClass(classId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, classId);
      await(docRef);
    } catch (error) {
      criticalLogger.error('Error deleting class:', error);
      throw new Error('Error al eliminar la clase');
    }
  }
  // Asignar un miembro a una clase
  static async assignMemberToClass(classId: string, memberId: string): Promise<void> {
    try {
      // Verificar que la clase existe y tiene cupo
      const gymClass = await this.getClassById(classId);
      if (!gymClass) {
        throw new Error('La clase no existe');
      }
      if (gymClass.currentEnrollment >= gymClass.maxCapacity) {
        throw new Error('La clase está llena');
      }
      // Verificar que el miembro no esté ya asignado
      const existingAssignment = await this.getMemberClassAssignment(classId, memberId);
      if (existingAssignment) {
        throw new Error('El miembro ya está asignado a esta clase');
      }
      // Crear la asignación
      const assignment: Omit<ClassAssignment, 'id'> = {
        classId,
        memberId,
        assignedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        duration: 30,
        status: 'active',
        assignmentPointsEarned: gymClass.assignmentPoints,
        attendancePointsEarned: 0,
        totalPointsEarned: gymClass.assignmentPoints,
        attendanceCount: 0,
        paymentAmount: 0,
        paymentStatus: 'pending'
      };
      await addDoc(collection(db, this.ASSIGNMENTS_COLLECTION), {
        ...assignment,
        assignedAt:Timestamp.now()
      });
      // Actualizar el conteo de inscripciones
      await this.updateClass({
        id: classId,
        currentEnrollment: gymClass.currentEnrollment + 1
      });
    } catch (error) {
      logger.error('Error assigning member to class:', error);
      throw error;
    }
  }
  // Registrar asistencia a una clase
  static async recordAttendance(classId: string, memberId: string): Promise<void> {
    try {
      const gymClass = await this.getClassById(classId);
      if (!gymClass) {
        throw new Error('La clase no existe');
      }
      // Verificar que el miembro esté asignado a la clase
      const assignment = await this.getMemberClassAssignment(classId, memberId);
      if (!assignment) {
        throw new Error('El miembro no está asignado a esta clase');
      }
      // Verificar que no haya registrado asistencia previamente
      const existingAttendance = await this.getMemberAttendance(classId, memberId);
      if (existingAttendance) {
        throw new Error('La asistencia ya fue registrada');
      }
      // Registrar asistencia
      const attendance: Omit<ClassAttendance, 'id'> = {
        classId,
        memberId,
        attendedAt: new Date(),
        pointsEarned: gymClass.attendancePoints
      };
      await addDoc(collection(db, this.ATTENDANCE_COLLECTION), {
        ...attendance,
        attendedAt:Timestamp.now()
      });
    } catch (error) {
      logger.error('Error recording attendance:', error);
      throw error;
    }
  }
  // Obtener asignación de un miembro a una clase
  static async getMemberClassAssignment(classId: string, memberId: string): Promise<ClassAssignment | null> {
    try {
      const q = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('classId', '==', classId),
        where('memberId', '==', memberId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          assignedAt: doc.data().assignedAt?.toDate() || new Date()
        } as ClassAssignment;
      }
      return null;
    } catch (error) {
      logger.error('Error getting member class assignment:', error);
      return null;
    }
  }
  // Obtener asistencia de un miembro a una clase
  static async getMemberAttendance(classId: string, memberId: string): Promise<ClassAttendance | null> {
    try {
      const q = query(
        collection(db, this.ATTENDANCE_COLLECTION),
        where('classId', '==', classId),
        where('memberId', '==', memberId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          attendedAt: doc.data().attendedAt?.toDate() || new Date()
        } as ClassAttendance;
      }
      return null;
    } catch (error) {
      logger.error('Error getting member attendance:', error);
      return null;
    }
  }
  // Obtener clases asignadas a un miembro
  static async getMemberClasses(memberId: string): Promise<GymClass[]> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('memberId', '==', memberId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const classIds: string[] = [];
      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        classIds.push(data.classId);
      });
      if (classIds.length === 0) {
        return [];
      }
      // Obtener las clases
      const classes: GymClass[] = [];
      for (const classId of classIds) {
        const gymClass = await this.getClassById(classId);
        if (gymClass) {
          classes.push(gymClass);
        }
      }
      return classes;
    } catch (error) {
      logger.error('Error obteniendo clases del miembro:', error);
      throw new Error('Error al cargar las clases del miembro');
    }
  }
  // Crear asignación de clase con duración personalizada
  static async createClassAssignment(assignmentData: CreateClassAssignmentData): Promise<string> {
    try {
      // Verificar que la clase existe
      const gymClass = await this.getClassById(assignmentData.classId);
      if (!gymClass) {
        throw new Error('La clase no existe');
      }
      // Verificar que el miembro existe
      const member = await MemberService.getMemberById(assignmentData.memberId);
      if (!member) {
        throw new Error('El miembro no existe');
      }
      // Verificar si ya existe una asignación activa
      const existingAssignment = await this.getMemberClassAssignment(
        assignmentData.classId, 
        assignmentData.memberId
      );
      if (existingAssignment && existingAssignment.status === 'active') {
        throw new Error('El miembro ya está asignado a esta clase');
      }
      // Calcular fecha de expiración
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + assignmentData.duration);
      // Crear la asignación
      const assignment: Omit<ClassAssignment, 'id'> = {
        classId: assignmentData.classId,
        className: gymClass.name,
        memberId: assignmentData.memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        assignedAt: new Date(),
        expiresAt,
        duration: assignmentData.duration,
        status: 'active',
        assignmentPointsEarned: gymClass.assignmentPoints,
        attendancePointsEarned: 0,
        totalPointsEarned: gymClass.assignmentPoints,
        attendanceCount: 0,
        assignedBy: assignmentData.assignedBy,
        paymentAmount: assignmentData.paymentAmount,
        paymentStatus: 'paid',
        paidAt: new Date()
      };
      const docRef = await addDoc(collection(db, this.ASSIGNMENTS_COLLECTION), {
        ...assignment,
        assignedAt:Timestamp.fromDate(assignment.assignedAt),
        expiresAt:Timestamp.fromDate(assignment.expiresAt)
      });
      // Registrar el pago
      await PaymentService.createPayment({
        assignmentId: docRef.id,
        classId: assignmentData.classId,
        className: gymClass.name,
        memberId: assignmentData.memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        amount: assignmentData.paymentAmount,
        paymentMethod: assignmentData.paymentMethod,
        transactionType: 'class',
        isExpense: false,
        notes: assignmentData.paymentNotes,
        processor: assignmentData.assignedBy || 'system'
      });
      // Actualizar puntos del miembro usando el sistema nuevo
      const { UserPointsService } = await import('../user/userPointsService');
      await UserPointsService.addPoints(
        assignmentData.memberId, 
        gymClass.assignmentPoints,
        `Puntos por asignación a clase: ${gymClass.name}`,
        docRef.id,
        { classId: assignmentData.classId, className: gymClass.name }
      );
      // Actualizar enrollment de la clase
      await this.updateClass({
        id: assignmentData.classId,
        currentEnrollment: (gymClass.currentEnrollment || 0) + 1
      });
      // Activar automáticamente al miembro
      await MemberStatusService.activateMember(assignmentData.memberId);
      return docRef.id;
    } catch (error) {
      logger.error('Error creando asignación de clase:', error);
      throw error;
    }
  }
  // Obtener todas las asignaciones de una clase
  static async getClassAssignments(classId: string): Promise<ClassAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('classId', '==', classId),
        orderBy('assignedAt', 'desc')
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments: ClassAssignment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          classId: data.classId,
          className: data.className,
          memberId: data.memberId,
          memberName: data.memberName,
          assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          duration: data.duration,
          status: data.status,
          assignmentPointsEarned: data.assignmentPointsEarned || 0,
          attendancePointsEarned: data.attendancePointsEarned || 0,
          totalPointsEarned: data.totalPointsEarned || 0,
          attendanceCount: data.attendanceCount || 0,
          assignedBy: data.assignedBy,
          paymentAmount: data.paymentAmount || 0,
          paymentStatus: data.paymentStatus || 'pending',
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined
        });
      });
      return assignments;
    } catch (error) {
      logger.error('Error obteniendo asignaciones de clase:', error);
      throw new Error('Error al cargar las asignaciones de la clase');
    }
  }
  // Obtener asignaciones de un miembro
  static async getMemberAssignments(memberId: string): Promise<ClassAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('memberId', '==', memberId),
        orderBy('assignedAt', 'desc')
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments: ClassAssignment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          classId: data.classId,
          className: data.className,
          memberId: data.memberId,
          memberName: data.memberName,
          assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          duration: data.duration,
          status: data.status,
          assignmentPointsEarned: data.assignmentPointsEarned || 0,
          attendancePointsEarned: data.attendancePointsEarned || 0,
          totalPointsEarned: data.totalPointsEarned || 0,
          attendanceCount: data.attendanceCount || 0,
          assignedBy: data.assignedBy,
          paymentAmount: data.paymentAmount || 0,
          paymentStatus: data.paymentStatus || 'pending',
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined
        });
      });
      return assignments;
    } catch (error) {
      logger.error('Error obteniendo asignaciones del miembro:', error);
      throw new Error('Error al cargar las asignaciones del miembro');
    }
  }
  // Cancelar asignación de clase
  static async cancelClassAssignment(assignmentId: string): Promise<void> {
    try {
      const assignmentRef = doc(db, this.ASSIGNMENTS_COLLECTION, assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);
      if (!assignmentDoc.exists()) {
        throw new Error('Asignación no encontrada');
      }
      const assignmentData = assignmentDoc.data();
      await updateDoc(assignmentRef, {
        status: 'cancelled'
      });
      // Restar puntos del miembro si es necesario
      if (assignmentData.assignmentPointsEarned > 0) {
        await MemberService.updateMemberPoints(
          assignmentData.memberId, 
          -assignmentData.assignmentPointsEarned
        );
      }
      // Actualizar enrollment de la clase
      const gymClass = await this.getClassById(assignmentData.classId);
      if (gymClass && gymClass.currentEnrollment > 0) {
        await this.updateClass({
          id: assignmentData.classId,
          currentEnrollment: gymClass.currentEnrollment - 1
        });
      }
    } catch (error) {
      logger.error('Error cancelando asignación:', error);
      throw new Error('Error al cancelar la asignación');
    }
  }
  // Verificar y actualizar asignaciones expiradas
  static async updateExpiredAssignments(): Promise<void> {
    try {
      const now = new Date();
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('status', '==', 'active'),
        where('expiresAt', '<=',Timestamp.fromDate(now))
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      // Obtener los IDs únicos de miembros afectados
      const affectedMemberIds = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.memberId) {
          affectedMemberIds.add(data.memberId);
        }
      });
      // Actualizar el estado de las asignaciones a expiradas
      const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
        const assignmentRef = doc(db, this.ASSIGNMENTS_COLLECTION, docSnapshot.id);
        await updateDoc(assignmentRef, {
          status: 'expired'
        });
      });
      await Promise.all(updatePromises);
      // Sincronizar el estado de los miembros afectados
      const syncPromises = Array.from(affectedMemberIds).map(memberId => 
        MemberStatusService.syncMemberStatus(memberId)
      );
      await Promise.all(syncPromises);
    } catch (error) {
      logger.error('Error actualizando asignaciones expiradas:', error);
      throw new Error('Error al actualizar asignaciones expiradas');
    }
  }
  // Obtener próximas clases de un entrenador
  static async getUpcomingClassesByTrainer(trainerId: string): Promise<GymClass[]> {
    try {
      // Por ahora, retornamos las clases del entrenador ordenadas por fecha de creación
      // En una implementación futura se puede agregar filtrado por fecha
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('trainerId', '==', trainerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as GymClass[];
    } catch (error) {
      logger.error('Error getting upcoming classes by trainer:', error);
      throw new Error('Error al obtener las próximas clases del entrenador');
    }
  }
  // Obtener miembros inscritos en una clase específica
  static async getClassMembers(classId: string): Promise<any[]> {
    try {
      // Obtener asignaciones activas de la clase
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('classId', '==', classId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const memberIds = new Set<string>();
      // Recopilar IDs únicos de miembros
      assignmentsSnapshot.forEach(doc => {
        const data = doc.data();
        memberIds.add(data.memberId);
      });
      if (memberIds.size === 0) {
        return [];
      }
      // Obtener los datos de los miembros
      const members: any[] = [];
      for (const memberId of memberIds) {
        const member = await MemberService.getMemberById(memberId);
        if (member) {
          members.push(member);
        }
      }
      return members;
    } catch (error) {
      logger.error('Error getting class members:', error);
      throw new Error('Error al obtener los miembros de la clase');
    }
  }
}
