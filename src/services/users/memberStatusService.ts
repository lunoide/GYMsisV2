import { doc,collection, query, where, getDocs} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { Timestamp } from 'firebase/firestore';
type MembershipStatus = 'active' | 'inactive' | 'suspended';
export class MemberStatusService {
  /**
   * Actualiza el estado de membresía de un usuario
   */
  static async updateMembershipStatus(
    userId: string, 
    status: MembershipStatus
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        membershipStatus: status,
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error actualizando estado de membresía:', error);
      logger.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        userId,
        status
      });
      // Si es un error de red, no lanzar excepción para evitar bloquear la UI
      if ((error as any)?.code === 'unavailable' || (error as any)?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
        logger.warn('Error de red detectado, continuando sin actualizar estado');
        return;
      }
      throw new Error('No se pudo actualizar el estado de membresía');
    }
  }
  /**
   * Activa un miembro cuando se le asigna un plan o clase
   */
  static async activateMember(userId: string): Promise<void> {
    await this.updateMembershipStatus(userId, 'active');
  }
  /**
   * Verifica si un miembro tiene asignaciones activas (planes o clases)
   */
  static async hasActiveAssignments(userId: string): Promise<boolean> {
    try {
      const now =Timestamp.now();
      // Verificar planes activos
      const plansQuery = query(
        collection(db, 'planAssignments'),
        where('memberId', '==', userId),
        where('status', '==', 'active'),
        where('expiresAt', '>', now)
      );
      const plansSnapshot = await getDocs(plansQuery);
      if (!plansSnapshot.empty) {
        return true;
      }
      // Verificar clases activas
      const classesQuery = query(
        collection(db, 'classAssignments'),
        where('memberId', '==', userId),
        where('status', '==', 'active'),
        where('expiresAt', '>', now)
      );
      const classesSnapshot = await getDocs(classesQuery);
      return !classesSnapshot.empty;
    } catch (error) {
      logger.error('Error verificando asignaciones activas:', error);
      return false;
    }
  }
  /**
   * Sincroniza el estado de un miembro basado en sus asignaciones activas
   */
  static async syncMemberStatus(userId: string): Promise<void> {
    try {
      const hasActive = await this.hasActiveAssignments(userId);
      if (hasActive) {
        await this.activateMember(userId);
      } else {
        await this.updateMembershipStatus(userId, 'inactive');
      }
    } catch (error) {
      logger.error('Error sincronizando estado del miembro:', error);
      throw new Error('No se pudo sincronizar el estado del miembro');
    }
  }
  /**
   * Sincroniza el estado de todos los miembros
   * Esta función puede ser llamada periódicamente para mantener los estados actualizados
   */
  static async syncAllMembersStatus(): Promise<void> {
    try {
      // Obtener todos los usuarios con rol 'member'
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'member')
      );
      const usersSnapshot = await getDocs(usersQuery);
      // Procesar cada miembro
      const syncPromises = usersSnapshot.docs.map(doc => 
        this.syncMemberStatus(doc.id)
      );
      await Promise.all(syncPromises);
      logger.log('Sincronización de estados completada');
    } catch (error) {
      logger.error('Error en sincronización masiva:', error);
      throw new Error('No se pudo completar la sincronización masiva');
    }
  }
  /**
   * Desactiva miembros que no tienen asignaciones activas
   */
  static async deactivateInactiveMembers(): Promise<string[]> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'member'),
        where('membershipStatus', '==', 'active')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const deactivatedMembers: string[] = [];
      for (const userDoc of usersSnapshot.docs) {
        const hasActive = await this.hasActiveAssignments(userDoc.id);
        if (!hasActive) {
          await this.updateMembershipStatus(userDoc.id, 'inactive');
          deactivatedMembers.push(userDoc.id);
        }
      }
      return deactivatedMembers;
    } catch (error) {
      logger.error('Error desactivando miembros inactivos:', error);
      throw new Error('No se pudo completar la desactivación de miembros');
    }
  }
}
export default MemberStatusService;