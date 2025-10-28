import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  orderBy,
  Timestamp,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PaymentService } from '../payments/paymentService';
import { MemberService } from '../users/memberService';
import { MemberStatusService } from '../users/memberStatusService';
import { logger } from '../../utils/logger';
import type { 
  MembershipPlan, 
  CreatePlanData, 
  PlanAssignment,
  CreatePlanAssignmentData,
  PlanStats
} from '../../types/plan.types';
export class PlanService {
  private static readonly PLANS_COLLECTION = 'membershipPlans';
  private static readonly ASSIGNMENTS_COLLECTION = 'planAssignments';
  // Obtener planes con estadísticas (solo planes no archivados)
  static async getPlans(): Promise<MembershipPlan[]> {
    try {
      // Filtrar planes que no estén archivados
      const plansQuery = query(
        collection(db, 'membershipPlans'),
        where('status', '!=', 'archived')
      );
      const plansSnapshot = await getDocs(plansQuery);
      const plans: MembershipPlan[] = [];
      for (const doc of plansSnapshot.docs) {
        const data = doc.data();
        // Obtener estadísticas del plan
        const assignmentsSnapshot = await getDocs(
          query(
            collection(db, 'planAssignments'),
            where('planId', '==', doc.id)
          )
        );
        const plan: MembershipPlan = {
          id: doc.id,
          name: data.name,
          description: data.description,
          duration: data.duration,
          durationType: data.durationType,
          cost: data.cost,
          assignmentPoints: data.assignmentPoints,
          features: data.features || [],
          status: data.status,
          isActive: data.isActive ?? (data.status === 'active'), // Mapear isActive o derivar de status
          totalAssignments: assignmentsSnapshot.size,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        };
        plans.push(plan);
      }
      return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error('Error getting plans:', error);
      throw new Error('Error al obtener los planes');
    }
  }
  // Crear un nuevo plan
  static async createPlan(planData: CreatePlanData): Promise<string> {
    try {
      const planDoc = {
        ...planData,
        status: 'active',
        createdAt:Timestamp.now(),
        updatedAt:Timestamp.now()
      };
      const docRef = await addDoc(collection(db, this.PLANS_COLLECTION), planDoc);
      return docRef.id;
    } catch (error) {
      logger.error('Error creando plan:', error);
      throw new Error('Error al crear el plan');
    }
  }
  // Obtener todos los planes
  static async getAllPlans(): Promise<MembershipPlan[]> {
    try {
      const plansQuery = query(
        collection(db, this.PLANS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(plansQuery);
      const plans: MembershipPlan[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          duration: data.duration,
          durationType: data.durationType,
          cost: data.cost,
          assignmentPoints: data.assignmentPoints,
          features: data.features || [],
          status: data.status,
          isActive: data.isActive ?? (data.status === 'active'),
          totalAssignments: 0, // Se puede calcular después si es necesario
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          createdBy: data.createdBy
        });
      });
      return plans;
    } catch (error) {
      logger.error('Error obteniendo planes:', error);
      throw new Error('Error al cargar los planes');
    }
  }
  // Obtener planes activos
  static async getActivePlans(): Promise<MembershipPlan[]> {
    try {
      const plansQuery = query(
        collection(db, this.PLANS_COLLECTION),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(plansQuery);
      const plans: MembershipPlan[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          duration: data.duration,
          durationType: data.durationType,
          cost: data.cost,
          assignmentPoints: data.assignmentPoints,
          features: data.features || [],
          status: data.status,
          isActive: data.isActive ?? (data.status === 'active'),
          totalAssignments: 0, // Se puede calcular después si es necesario
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          createdBy: data.createdBy
        });
      });
      return plans;
    } catch (error) {
      logger.error('Error obteniendo planes activos:', error);
      throw new Error('Error al cargar los planes activos');
    }
  }
  // Obtener un plan por ID
  static async getPlanById(planId: string): Promise<MembershipPlan | null> {
    try {
      const planDoc = await getDoc(doc(db, this.PLANS_COLLECTION, planId));
      if (!planDoc.exists()) {
        return null;
      }
      const data = planDoc.data();
      return {
        id: planDoc.id,
        name: data.name,
        description: data.description,
        duration: data.duration,
        durationType: data.durationType,
        cost: data.cost,
        assignmentPoints: data.assignmentPoints,
        features: data.features || [],
        status: data.status,
        isActive: data.isActive ?? (data.status === 'active'),
        totalAssignments: 0, // Se puede calcular después si es necesario
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        createdBy: data.createdBy
      };
    } catch (error) {
      logger.error('Error obteniendo plan:', error);
      throw new Error('Error al cargar el plan');
    }
  }
  // Actualizar un plan
  static async updatePlan(planId: string, updateData: Partial<CreatePlanData>): Promise<void> {
    try {
      const planRef = doc(db, this.PLANS_COLLECTION, planId);
      await updateDoc(planRef, {
        ...updateData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      logger.error('Error actualizando plan:', error);
      throw new Error('Error al actualizar el plan');
    }
  }
  // Eliminar un plan (cambiar estado a archived)
  static async deletePlan(planId: string): Promise<void> {
    try {
      const planRef = doc(db, this.PLANS_COLLECTION, planId);
      await updateDoc(planRef, {
        status: 'archived',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      logger.error('Error eliminando plan:', error);
      throw new Error('Error al eliminar el plan');
    }
  }
  // Asignar plan a un miembro
  static async assignPlanToMember(assignmentData: CreatePlanAssignmentData): Promise<string> {
    try {
      // Verificar que el plan existe
      const plan = await this.getPlanById(assignmentData.planId);
      if (!plan) {
        throw new Error('Plan no encontrado');
      }
      // Verificar que el miembro existe
      const member = await MemberService.getMemberById(assignmentData.memberId);
      if (!member) {
        throw new Error('Miembro no encontrado');
      }
      // Verificar si el miembro ya tiene una asignación activa de este plan
      const existingAssignment = await this.getMemberActivePlanAssignment(
        assignmentData.planId, 
        assignmentData.memberId
      );
      // Si existe una asignación activa, la cancelamos automáticamente para permitir la reasignación
      if (existingAssignment) {
        logger.log(`Cancelando asignación activa existente para permitir reasignación: ${existingAssignment.id}`);
        await this.cancelPlanAssignment(existingAssignment.id);
      }
      // Calcular fecha de expiración
      const assignedAt = new Date();
      const expiresAt = new Date(assignedAt);
      if (plan.durationType === 'days') {
        expiresAt.setDate(expiresAt.getDate() + plan.duration);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + plan.duration);
      }
      // Crear la asignación
      const assignment = {
        planId: assignmentData.planId,
        planName: plan.name,
        memberId: assignmentData.memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        assignedAt:Timestamp.fromDate(assignedAt),
        expiresAt:Timestamp.fromDate(expiresAt),
        status: 'active',
        assignedBy: assignmentData.assignedBy,
        paymentAmount: assignmentData.paymentAmount,
        paymentStatus: 'paid',
        paidAt:Timestamp.now(),
        pointsEarned: plan.assignmentPoints
      };
      const assignmentRef = await addDoc(collection(db, this.ASSIGNMENTS_COLLECTION), assignment);
      // Actualizar puntos del miembro usando el sistema nuevo
      const { UserPointsService } = await import('../user/userPointsService');
      await UserPointsService.addPoints(
        assignmentData.memberId, 
        plan.assignmentPoints,
        `Puntos por asignación a plan: ${plan.name}`,
        assignmentRef.id,
        { planId: plan.id, planName: plan.name }
      );
      // Registrar el pago
      await PaymentService.createPayment({
        assignmentId: assignmentRef.id,
        memberId: assignmentData.memberId,
        memberName: assignment.memberName,
        amount: assignmentData.paymentAmount,
        paymentMethod: assignmentData.paymentMethod,
        transactionType: 'membership',
        isExpense: false,
        notes: assignmentData.paymentNotes || `Pago por plan: ${plan.name}`,
        processor: assignmentData.assignedBy
      });
      // Activar automáticamente al miembro
      await MemberStatusService.activateMember(assignmentData.memberId);
      return assignmentRef.id;
    } catch (error) {
      logger.error('Error asignando plan:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al asignar el plan');
    }
  }
  // Obtener asignación activa de un miembro para un plan específico
  private static async getMemberActivePlanAssignment(planId: string, memberId: string): Promise<PlanAssignment | null> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('planId', '==', planId),
        where('memberId', '==', memberId),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      if (querySnapshot.empty) {
        return null;
      }
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        planId: data.planId,
        planName: data.planName,
        memberId: data.memberId,
        memberName: data.memberName,
        assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt),
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
        status: data.status,
        assignedBy: data.assignedBy,
        paymentAmount: data.paymentAmount,
        paymentStatus: data.paymentStatus,
        paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined,
        pointsEarned: data.pointsEarned
      };
    } catch (error) {
      logger.error('Error obteniendo asignación activa:', error);
      return null;
    }
  }
  // Obtener asignaciones de un plan
  static async getPlanAssignments(planId: string): Promise<PlanAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('planId', '==', planId),
        orderBy('assignedAt', 'desc')
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments: PlanAssignment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          planId: data.planId,
          planName: data.planName,
          memberId: data.memberId,
          memberName: data.memberName,
          assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          status: data.status,
          assignedBy: data.assignedBy,
          paymentAmount: data.paymentAmount,
          paymentStatus: data.paymentStatus,
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined,
          pointsEarned: data.pointsEarned
        });
      });
      return assignments;
    } catch (error) {
      logger.error('Error obteniendo asignaciones del plan:', error);
      throw new Error('Error al cargar las asignaciones del plan');
    }
  }
  // Obtener asignaciones de un miembro
  static async getMemberPlanAssignments(memberId: string): Promise<PlanAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('memberId', '==', memberId),
        orderBy('assignedAt', 'desc')
      );
      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments: PlanAssignment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        assignments.push({
          id: doc.id,
          planId: data.planId,
          planName: data.planName,
          memberId: data.memberId,
          memberName: data.memberName,
          assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt),
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
          status: data.status,
          assignedBy: data.assignedBy,
          paymentAmount: data.paymentAmount,
          paymentStatus: data.paymentStatus,
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined,
          pointsEarned: data.pointsEarned
        });
      });
      return assignments;
    } catch (error) {
      logger.error('Error obteniendo asignaciones del miembro:', error);
      throw new Error('Error al cargar las asignaciones del miembro');
    }
  }
  // Cancelar asignación de plan
  static async cancelPlanAssignment(assignmentId: string): Promise<void> {
    try {
      const assignmentRef = doc(db, this.ASSIGNMENTS_COLLECTION, assignmentId);
      await updateDoc(assignmentRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      logger.error('Error cancelando asignación:', error);
      throw new Error('Error al cancelar la asignación');
    }
  }
  // Actualizar asignaciones expiradas
  static async updateExpiredAssignments(): Promise<void> {
    try {
      const now =Timestamp.now();
      const assignmentsQuery = query(
        collection(db, this.ASSIGNMENTS_COLLECTION),
        where('status', '==', 'active'),
        where('expiresAt', '<=', now)
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
      const updatePromises = querySnapshot.docs.map(doc =>(doc.ref, { status: 'expired' })
      );
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
  // Obtener estadísticas de planes
  static async getPlanStats(): Promise<PlanStats> {
    try {
      // Obtener todos los planes
      const plansSnapshot = await getDocs(collection(db, this.PLANS_COLLECTION));
      const activePlansSnapshot = await getDocs(
        query(collection(db, this.PLANS_COLLECTION), where('status', '==', 'active'))
      );
      // Obtener todas las asignaciones
      const assignmentsSnapshot = await getDocs(collection(db, this.ASSIGNMENTS_COLLECTION));
      const activeAssignmentsSnapshot = await getDocs(
        query(collection(db, this.ASSIGNMENTS_COLLECTION), where('status', '==', 'active'))
      );
      // Calcular ingresos
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.paymentStatus === 'paid' && data.paymentAmount) {
          totalRevenue += data.paymentAmount;
          const assignedAt = data.assignedAt?.toDate ? data.assignedAt.toDate() : new Date(data.assignedAt);
          if (assignedAt.getMonth() === currentMonth && assignedAt.getFullYear() === currentYear) {
            monthlyRevenue += data.paymentAmount;
          }
        }
      });
      return {
        totalPlans: plansSnapshot.size,
        activePlans: activePlansSnapshot.size,
        totalAssignments: assignmentsSnapshot.size,
        activeAssignments: activeAssignmentsSnapshot.size,
        totalRevenue,
        monthlyRevenue
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      throw new Error('Error al cargar las estadísticas');
    }
  }
}