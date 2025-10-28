import { 
  doc, 
  getDoc,
  setDoc,
  increment, 
  collection, 
  addDoc, 
  query, 
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger, criticalLogger } from '../../utils/logger';
import { PlanService } from '../plans/planService';
import { ClassService } from '../classes/classService';
export interface UserPoints {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  earnedPoints: number;
  redeemedPoints: number;
  lastUpdated: Date;
}
export interface PointTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  amount: number;
  description: string;
  relatedId?: string; // ID de la recompensa canjeada, membresía, etc.
  createdAt: Date;
  metadata?: Record<string, any>;
}
export interface CreatePointTransactionData {
  userId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  amount: number;
  description: string;
  relatedId?: string;
  metadata?: Record<string, any>;
}
export class UserPointsService {
  private static readonly COLLECTION_NAME = 'userPoints';
  private static readonly TRANSACTIONS_COLLECTION = 'pointTransactions';
  /**
   * Obtener los puntos de un usuario
   */
  static async getUserPoints(userId: string): Promise<UserPoints | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          userId,
          totalPoints: data.totalPoints || 0,
          availablePoints: data.availablePoints || 0,
          earnedPoints: data.earnedPoints || 0,
          redeemedPoints: data.redeemedPoints || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting user points:', error);
      throw error;
    }
  }
  /**
   * Inicializar puntos para un nuevo usuario
   */
  static async initializeUserPoints(userId: string): Promise<UserPoints> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const initialData = {
        totalPoints: 0,
        availablePoints: 0,
        earnedPoints: 0,
        redeemedPoints: 0,
        lastUpdated: serverTimestamp()
      };
      await setDoc(docRef, initialData);
      return {
        userId,
        totalPoints: 0,
        availablePoints: 0,
        earnedPoints: 0,
        redeemedPoints: 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error initializing user points:', error);
      throw error;
    }
  }
  /**
   * Agregar puntos a un usuario
   */
  static async addPoints(
    userId: string, 
    points: number, 
    description: string,
    relatedId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      // Verificar si el documento existe
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        // Si no existe, inicializar el documento primero
        logger.log(`Inicializando documento userPoints para usuario: ${userId}`);
        await this.initializeUserPoints(userId);
      }
      // Actualizar puntos del usuario
      await(docRef, {
        totalPoints: increment(points),
        availablePoints: increment(points),
        earnedPoints: increment(points),
        lastUpdated: server()
      });
      // Crear transacción
      await this.createTransaction({
        userId,
        type: 'earned',
        amount: points,
        description,
        relatedId,
        metadata
      });
    } catch (error) {
      logger.error('Error adding points:', error);
      throw error;
    }
  }
  /**
   * Redimir puntos (restar puntos disponibles)
   */
  static async redeemPoints(
    userId: string, 
    points: number, 
    description: string,
    relatedId?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Verificar que el usuario tenga suficientes puntos
      const userPoints = await this.getUserPoints(userId);
      if (!userPoints || userPoints.availablePoints < points) {
        return false;
      }
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      // Actualizar puntos del usuario
      await(docRef, {
        availablePoints: increment(-points),
        redeemedPoints: increment(points),
        lastUpdated: server()
      });
      // Crear transacción
      await this.createTransaction({
        userId,
        type: 'redeemed',
        amount: points,
        description,
        relatedId,
        metadata
      });
      return true;
    } catch (error) {
      logger.error('Error redeeming points:', error);
      throw error;
    }
  }
  /**
   * Crear una transacción de puntos
   */
  static async createTransaction(data: CreatePointTransactionData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.TRANSACTIONS_COLLECTION), {
        ...data,
        createdAt: server()
      });
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating point transaction:', error);
      throw error;
    }
  }
  /**
   * Obtener historial de transacciones de un usuario
   */
  static async getUserTransactions(
    userId: string,Count: number = 50
  ): Promise<PointTransaction[]> {
    try {
      const q = query(
        collection(db, this.TRANSACTIONS_COLLECTION),
        where('userId', '==', userId),('createdAt', 'desc'),(Count)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          relatedId: data.relatedId,
          createdAt: data.createdAt?.toDate() || new Date(),
          metadata: data.metadata
        };
      });
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      throw error;
    }
  }
  /**
   * Obtener estadísticas de puntos de un usuario
   */
  static async getUserPointsStats(userId: string): Promise<{
    totalEarned: number;
    totalRedeemed: number;
    currentBalance: number;
    transactionCount: number;
  }> {
    try {
      const userPoints = await this.getUserPoints(userId);
      const transactions = await this.getUserTransactions(userId);
      return {
        totalEarned: userPoints?.earnedPoints || 0,
        totalRedeemed: userPoints?.redeemedPoints || 0,
        currentBalance: userPoints?.availablePoints || 0,
        transactionCount: transactions.length
      };
    } catch (error) {
      logger.error('Error getting user points stats:', error);
      throw error;
    }
  }
  /**
   * Sincronizar puntos del sistema legacy con el nuevo sistema
   * Calcula los puntos totales del miembro desde todas las fuentes y los sincroniza
   */
  static async syncLegacyPoints(userId: string): Promise<UserPoints> {
    try {
      // Importar servicios necesarios
      const { MemberService } = await import('../users/memberService');
      const {} = await import('../plans/planService');
      const {} = await import('../classes/classService');
      // Obtener datos del miembro
      const memberData = await MemberService.getMemberById(userId);
      // Obtener asignaciones de planes y clases
      const [planAssignments, classAssignments] = await Promise.all([PlanService.getMemberPlanAssignments(userId), ClassService.getMemberAssignments(userId)
      ]);
      // Calcular puntos totales del sistema legacy
      const profilePoints = memberData?.points || 0;
      const assignmentPoints = classAssignments.reduce((total, assignment) => 
        total + (assignment.totalPointsEarned || 0), 0
      ) + planAssignments.reduce((total, assignment) => 
        total + (assignment.pointsEarned || 0), 0
      );
      const totalLegacyPoints = profilePoints + assignmentPoints;
      // Verificar si ya existen puntos en el nuevo sistema
      let userPoints = await this.getUserPoints(userId);
      if (!userPoints) {
        // Si no existen, crear con los puntos del sistema legacy
        userPoints = await this.initializeUserPoints(userId);
        if (totalLegacyPoints > 0) {
          const docRef = doc(db, this.COLLECTION_NAME, userId);
          await(docRef, {
            totalPoints: totalLegacyPoints,
            availablePoints: totalLegacyPoints,
            earnedPoints: totalLegacyPoints,
            lastUpdated: server()
          });
          // Crear transacción de sincronización
          await this.createTransaction({
            userId,
            type: 'earned',
            amount: totalLegacyPoints,
            description: 'Sincronización de puntos del sistema legacy',
            metadata: { 
              profilePoints, 
              assignmentPoints,
              syncDate: new Date().toISOString()
            }
          });
          // Actualizar el objeto local
          userPoints.totalPoints = totalLegacyPoints;
          userPoints.availablePoints = totalLegacyPoints;
          userPoints.earnedPoints = totalLegacyPoints;
        }
      } else {
        // Si ya existen, verificar si necesitan sincronización
        // Comparar con earnedPoints (puntos ganados) en lugar de totalPoints
        const currentEarned = userPoints.earnedPoints;
        if (totalLegacyPoints > currentEarned) {
          const pointsToAdd = totalLegacyPoints - currentEarned;
          const docRef = doc(db, this.COLLECTION_NAME, userId);
          await(docRef, {
            availablePoints: increment(pointsToAdd),
            earnedPoints: totalLegacyPoints,
            lastUpdated: server()
          });
          // Crear transacción de sincronización
          await this.createTransaction({
            userId,
            type: 'earned',
            amount: pointsToAdd,
            description: 'Actualización de sincronización de puntos legacy',
            metadata: { 
              previousEarned: currentEarned,
              newEarned: totalLegacyPoints,
              profilePoints, 
              assignmentPoints,
              syncDate: new Date().toISOString()
            }
          });
          // Actualizar el objeto local
          userPoints.availablePoints += pointsToAdd;
          userPoints.earnedPoints = totalLegacyPoints;
        }
      }
      return userPoints;
    } catch (error) {
      logger.error('Error syncing legacy points:', error);
      throw error;
    }
  }
}