import { 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger, criticalLogger } from '../../utils/logger';
export interface RewardRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rewardId: string;
  rewardName: string;
  rewardPointsCost: number;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
  processedDate?: Date;
  processedBy?: string;
  adminNotes?: string;
  userNotes?: string;
}
export interface CreateRewardRequestData {
  userId: string;
  userName: string;
  userEmail: string;
  rewardId: string;
  rewardName: string;
  rewardPointsCost: number;
  userNotes?: string;
}
export interface ProcessRequestData {
  status: 'approved' | 'rejected';
  adminNotes?: string;
  processedBy: string;
}
export class RewardRequestsService {
  private static readonly COLLECTION_NAME = 'rewardRequests';
  /**
   * Crear una nueva solicitud de intercambio
   */
  static async createRequest(data: CreateRewardRequestData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...data,
        status: 'pending',
        requestDate: serverTimestamp(),
        processedDate: null,
        processedBy: null,
        adminNotes: null
      });
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating reward request:', error);
      throw error;
    }
  }
  /**
   * Obtener todas las solicitudes (para administradores)
   */
  static async getAllRequests(): Promise<RewardRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests: RewardRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rewardId: data.rewardId,
          rewardName: data.rewardName,
          rewardPointsCost: data.rewardPointsCost,
          status: data.status,
          requestDate: data.requestDate?.toDate() || new Date(),
          processedDate: data.processedDate?.toDate(),
          processedBy: data.processedBy,
          adminNotes: data.adminNotes,
          userNotes: data.userNotes
        });
      });
      return requests;
    } catch (error) {
      logger.error('Error getting all requests:', error);
      throw error;
    }
  }
  /**
   * Obtener solicitudes por estado
   */
  static async getRequestsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<RewardRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', status),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests: RewardRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rewardId: data.rewardId,
          rewardName: data.rewardName,
          rewardPointsCost: data.rewardPointsCost,
          status: data.status,
          requestDate: data.requestDate?.toDate() || new Date(),
          processedDate: data.processedDate?.toDate(),
          processedBy: data.processedBy,
          adminNotes: data.adminNotes,
          userNotes: data.userNotes
        });
      });
      return requests;
    } catch (error) {
      logger.error('Error getting requests by status:', error);
      throw error;
    }
  }
  /**
   * Obtener solicitudes de un usuario específico
   */
  static async getUserRequests(userId: string): Promise<RewardRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests: RewardRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rewardId: data.rewardId,
          rewardName: data.rewardName,
          rewardPointsCost: data.rewardPointsCost,
          status: data.status,
          requestDate: data.requestDate?.toDate() || new Date(),
          processedDate: data.processedDate?.toDate(),
          processedBy: data.processedBy,
          adminNotes: data.adminNotes,
          userNotes: data.userNotes
        });
      });
      return requests;
    } catch (error) {
      logger.error('Error getting user requests:', error);
      throw error;
    }
  }
  /**
   * Procesar una solicitud (aprobar o rechazar)
   */
  static async processRequest(
    requestId: string, 
    processData: ProcessRequestData
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      await updateDoc(docRef, {
        status: processData.status,
        processedDate: serverTimestamp(),
        processedBy: processData.processedBy,
        adminNotes: processData.adminNotes || null
      });
    } catch (error) {
      logger.error('Error processing request:', error);
      throw error;
    }
  }
  /**
   * Obtener una solicitud específica por ID
   */
  static async getRequestById(requestId: string): Promise<RewardRequest | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rewardId: data.rewardId,
          rewardName: data.rewardName,
          rewardPointsCost: data.rewardPointsCost,
          status: data.status,
          requestDate: data.requestDate?.toDate() || new Date(),
          processedDate: data.processedDate?.toDate(),
          processedBy: data.processedBy,
          adminNotes: data.adminNotes,
          userNotes: data.userNotes
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting request by ID:', error);
      throw error;
    }
  }
  /**
   * Obtener estadísticas de solicitudes
   */
  static async getRequestsStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        switch (data.status) {
          case 'pending':
            pending++;
            break;
          case 'approved':
            approved++;
            break;
          case 'rejected':
            rejected++;
            break;
        }
      });
      return { total, pending, approved, rejected };
    } catch (error) {
      logger.error('Error getting requests stats:', error);
      throw error;
    }
  }
}