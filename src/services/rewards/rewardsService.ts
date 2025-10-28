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
  runTransaction,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserPointsService } from '../user/userPointsService';
import { logger, criticalLogger } from '../../utils/logger';
export interface RewardItem {
  id: string;
  name: string;
  type: 'product' | 'discount' | 'service';
  pointsCost: number;
  description: string;
  isActive: boolean;
  stock?: number;
  discountPercentage?: number;
  category?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateRewardData {
  name: string;
  type: 'product' | 'discount' | 'service';
  pointsCost: number;
  description: string;
  isActive?: boolean;
  stock?: number;
  discountPercentage?: number;
  category?: string;
  image?: string;
}
export interface UpdateRewardData extends Partial<CreateRewardData> {
  updatedAt?: Date;
}
export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  status: 'pending' | 'completed' | 'cancelled';
  redeemedAt: Date;
  completedAt?: Date;
}
export interface CreateRedemptionData {
  userId: string;
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
}
const REWARDS_COLLECTION = 'rewards';
const REDEMPTIONS_COLLECTION = 'redemptions';
export class RewardsService {
  // Crear una nueva recompensa
  static async createReward(data: CreateRewardData): Promise<string> {
    try {
      const rewardData = {
        ...data,
        isActive: data.isActive ?? true,
        createdAt:Timestamp.now(),
        updatedAt:Timestamp.now()
      };
      const docRef = await addDoc(collection(db, REWARDS_COLLECTION), rewardData);
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating reward:', error);
      throw new Error('Error al crear la recompensa');
    }
  }
  // Obtener todas las recompensas
  static async getRewards(): Promise<RewardItem[]> {
    try {
      const q = query(
        collection(db, REWARDS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const rewards: RewardItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        rewards.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          pointsCost: data.pointsCost,
          description: data.description,
          isActive: data.isActive,
          stock: data.stock,
          discountPercentage: data.discountPercentage,
          category: data.category,
          image: data.image,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      return rewards;
    } catch (error) {
      logger.error('Error getting rewards:', error);
      throw new Error('Error al obtener las recompensas');
    }
  }
  // Obtener recompensas activas
  static async getActiveRewards(): Promise<RewardItem[]> {
    try {
      const q = query(
        collection(db, REWARDS_COLLECTION),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const rewards: RewardItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        rewards.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          pointsCost: data.pointsCost,
          description: data.description,
          isActive: data.isActive,
          stock: data.stock,
          discountPercentage: data.discountPercentage,
          category: data.category,
          image: data.image,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      return rewards;
    } catch (error) {
      logger.error('Error getting active rewards:', error);
      throw new Error('Error al obtener las recompensas activas');
    }
  }
  // Obtener una recompensa por ID
  static async getRewardById(id: string): Promise<RewardItem | null> {
    try {
      const docRef = doc(db, REWARDS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          type: data.type,
          pointsCost: data.pointsCost,
          description: data.description,
          isActive: data.isActive,
          stock: data.stock,
          discountPercentage: data.discountPercentage,
          category: data.category,
          image: data.image,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting reward by ID:', error);
      throw new Error('Error al obtener la recompensa');
    }
  }
  // Actualizar una recompensa
  static async updateReward(id: string, data: UpdateRewardData): Promise<void> {
    try {
      const docRef = doc(db, REWARDS_COLLECTION, id);
      const updateData = {
        ...data,
        updatedAt:Timestamp.now()
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      logger.error('Error updating reward:', error);
      throw new Error('Error al actualizar la recompensa');
    }
  }
  // Eliminar una recompensa
  static async deleteReward(id: string): Promise<void> {
    try {
      const docRef = doc(db, REWARDS_COLLECTION, id);
      await(docRef);
    } catch (error) {
      criticalLogger.error('Error deleting reward:', error);
      throw new Error('Error al eliminar la recompensa');
    }
  }
  // Canjear una recompensa
  static async redeemReward(data: CreateRedemptionData): Promise<string> {
    try {
      // Verificar que la recompensa existe y está activa
      const reward = await this.getRewardById(data.rewardId);
      if (!reward || !reward.isActive) {
        throw new Error('La recompensa no está disponible');
      }
      // Verificar stock si es un producto
      if (reward.type === 'product' && reward.stock !== undefined && reward.stock <= 0) {
        throw new Error('No hay stock disponible');
      }
      // Crear el registro de canje
      const redemptionData = {
        ...data,
        status: 'pending' as const,
        redeemedAt:Timestamp.now()
      };
      const docRef = await addDoc(collection(db, REDEMPTIONS_COLLECTION), redemptionData);
      // Actualizar stock si es un producto
      if (reward.type === 'product' && reward.stock !== undefined) {
        await this.updateReward(data.rewardId, {
          stock: reward.stock - 1
        });
      }
      return docRef.id;
    } catch (error) {
      logger.error('Error redeeming reward:', error);
      throw error;
    }
  }
  // Obtener canjes de un usuario
  static async getUserRedemptions(userId: string): Promise<RewardRedemption[]> {
    try {
      const q = query(
        collection(db, REDEMPTIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('redeemedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const redemptions: RewardRedemption[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        redemptions.push({
          id: doc.id,
          userId: data.userId,
          rewardId: data.rewardId,
          rewardName: data.rewardName,
          pointsUsed: data.pointsUsed,
          status: data.status,
          redeemedAt: data.redeemedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate()
        });
      });
      return redemptions;
    } catch (error) {
      logger.error('Error getting user redemptions:', error);
      throw new Error('Error al obtener los canjes del usuario');
    }
  }
  // Completar un canje
  static async completeRedemption(redemptionId: string): Promise<void> {
    try {
      const docRef = doc(db, REDEMPTIONS_COLLECTION, redemptionId);
      await updateDoc(docRef, {
        status: 'completed',
        completedAt:Timestamp.now()
      });
    } catch (error) {
      logger.error('Error completing redemption:', error);
      throw new Error('Error al completar el canje');
    }
  }
  // Cancelar un canje
  static async cancelRedemption(redemptionId: string): Promise<void> {
    try {
      const docRef = doc(db, REDEMPTIONS_COLLECTION, redemptionId);
      await updateDoc(docRef, {
        status: 'cancelled'
      });
    } catch (error) {
      logger.error('Error cancelling redemption:', error);
      throw new Error('Error al cancelar el canje');
    }
  }
  // Obtener estadísticas de recompensas
  static async getRewardsStats(): Promise<{
    totalRewards: number;
    activeRewards: number;
    totalRedemptions: number;
    pendingRedemptions: number;
  }> {
    try {
      // Obtener todas las recompensas
      const rewardsSnapshot = await getDocs(collection(db, REWARDS_COLLECTION));
      const totalRewards = rewardsSnapshot.size;
      // Obtener recompensas activas
      const activeRewardsQuery = query(
        collection(db, REWARDS_COLLECTION),
        where('isActive', '==', true)
      );
      const activeRewardsSnapshot = await getDocs(activeRewardsQuery);
      const activeRewards = activeRewardsSnapshot.size;
      // Obtener todos los canjes
      const redemptionsSnapshot = await getDocs(collection(db, REDEMPTIONS_COLLECTION));
      const totalRedemptions = redemptionsSnapshot.size;
      // Obtener canjes pendientes
      const pendingRedemptionsQuery = query(
        collection(db, REDEMPTIONS_COLLECTION),
        where('status', '==', 'pending')
      );
      const pendingRedemptionsSnapshot = await getDocs(pendingRedemptionsQuery);
      const pendingRedemptions = pendingRedemptionsSnapshot.size;
      return {
        totalRewards,
        activeRewards,
        totalRedemptions,
        pendingRedemptions
      };
    } catch (error) {
      logger.error('Error getting rewards stats:', error);
      throw new Error('Error al obtener las estadísticas de recompensas');
    }
  }
  /**
   * Canje real de recompensa que valida puntos, actualiza stock y registra transacciones
   */
  static async redeemRewardWithPoints(
    userId: string, 
    rewardId: string
  ): Promise<{ success: boolean; message: string; redemptionId?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Obtener la recompensa
        const rewardRef = doc(db, REWARDS_COLLECTION, rewardId);
        const rewardDoc = await transaction.get(rewardRef);
        if (!rewardDoc.exists()) {
          return { success: false, message: 'La recompensa no existe' };
        }
        const rewardData = rewardDoc.data();
        const reward: RewardItem = {
          id: rewardDoc.id,
          name: rewardData.name,
          type: rewardData.type,
          pointsCost: rewardData.pointsCost,
          description: rewardData.description,
          isActive: rewardData.isActive,
          stock: rewardData.stock,
          discountPercentage: rewardData.discountPercentage,
          category: rewardData.category,
          image: rewardData.image,
          createdAt: rewardData.createdAt?.toDate() || new Date(),
          updatedAt: rewardData.updatedAt?.toDate() || new Date()
        };
        // 2. Validar que la recompensa esté activa
        if (!reward.isActive) {
          return { success: false, message: 'Esta recompensa no está disponible' };
        }
        // 3. Validar stock si aplica
        if (reward.stock !== undefined && reward.stock <= 0) {
          return { success: false, message: 'No hay stock disponible para esta recompensa' };
        }
        // 4. Verificar que el usuario tenga suficientes puntos
        const userPoints = await UserPointsService.getUserPoints(userId);
        if (!userPoints || userPoints.availablePoints < reward.pointsCost) {
          return { 
            success: false, 
            message: `Puntos insuficientes. Necesitas ${reward.pointsCost} puntos, tienes ${userPoints?.availablePoints || 0}` 
          };
        }
        // 5. Actualizar stock si aplica
        if (reward.stock !== undefined) {
          transaction.update(rewardRef, {
            stock: increment(-1),
            updatedAt:Timestamp.now()
          });
        }
        // 6. Crear el registro de canje
        const redemptionData = {
          userId,
          rewardId,
          rewardName: reward.name,
          pointsUsed: reward.pointsCost,
          status: 'pending' as const,
          redeemedAt:Timestamp.now()
        };
        const redemptionRef = doc(collection(db, REDEMPTIONS_COLLECTION));
        transaction.set(redemptionRef, redemptionData);
        // 7. Actualizar puntos del usuario (esto se hace fuera de la transacción)
        // porque UserPointsService maneja su propia transacción
        const pointsRedeemed = await UserPointsService.redeemPoints(
          userId,
          reward.pointsCost,
          `Canje de recompensa: ${reward.name}`,
          rewardId,
          { rewardType: reward.type, category: reward.category }
        );
        if (!pointsRedeemed) {
          return { success: false, message: 'Error al procesar los puntos' };
        }
        return { 
          success: true, 
          message: `¡Has canjeado exitosamente: ${reward.name}!`,
          redemptionId: redemptionRef.id
        };
      });
    } catch (error) {
      logger.error('Error in redeemRewardWithPoints:', error);
      return { 
        success: false, 
        message: 'Error al procesar el canje. Inténtalo de nuevo.' 
      };
    }
  }
}