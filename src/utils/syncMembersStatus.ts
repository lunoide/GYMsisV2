import MemberStatusService from '../services/users/memberStatusService';
/**
 * Utilidad para sincronizar el estado de todos los miembros
 * Esta función verifica las asignaciones activas de cada miembro
 * y actualiza su membershipStatus en consecuencia
 */
export class MemberStatusSyncUtility {
  /**
   * Sincroniza el estado de todos los miembros
   * @returns Promise con el resultado de la sincronización
   */
  static async syncAllMembers(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      console.log('Iniciando sincronización de estados de miembros...');
      await MemberStatusService.syncAllMembersStatus();
      console.log('Sincronización completada exitosamente');
      return {
        success: true,
        message: 'Todos los estados de miembros han sido sincronizados correctamente'
      };
    } catch (error) {
      console.error('Error durante la sincronización:', error);
      return {
        success: false,
        message: 'Error durante la sincronización de miembros',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  /**
   * Desactiva miembros que no tienen asignaciones activas
   * @returns Promise con la lista de miembros desactivados
   */
  static async deactivateInactiveMembers(): Promise<{
    success: boolean;
    deactivatedMembers: string[];
    message: string;
    error?: string;
  }> {
    try {
      console.log('Desactivando miembros sin asignaciones activas...');
      const deactivatedMembers = await MemberStatusService.deactivateInactiveMembers();
      console.log(`${deactivatedMembers.length} miembros desactivados`);
      return {
        success: true,
        deactivatedMembers,
        message: `${deactivatedMembers.length} miembros han sido desactivados por no tener asignaciones activas`
      };
    } catch (error) {
      console.error('Error durante la desactivación:', error);
      return {
        success: false,
        deactivatedMembers: [],
        message: 'Error durante la desactivación de miembros inactivos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  /**
   * Ejecuta una sincronización completa (sincroniza y luego desactiva inactivos)
   * @returns Promise con el resultado completo
   */
  static async fullSync(): Promise<{
    success: boolean;
    syncResult: any;
    deactivationResult: any;
    message: string;
  }> {
    console.log('Iniciando sincronización completa...');
    const syncResult = await this.syncAllMembers();
    const deactivationResult = await this.deactivateInactiveMembers();
    const success = syncResult.success && deactivationResult.success;
    return {
      success,
      syncResult,
      deactivationResult,
      message: success 
        ? 'Sincronización completa exitosa' 
        : 'Sincronización completa con errores'
    };
  }
}
export default MemberStatusSyncUtility;