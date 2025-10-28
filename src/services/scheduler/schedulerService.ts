import { MemberStatusService } from '../users/memberStatusService';
import { logger } from '../../utils/logger';
import { PlanService } from '../plans/planService';
export class SchedulerService {
  private static intervals: Map<string, number> = new Map();
  /**
   * Inicia el scheduler para ejecutar tareas automáticas
   */
  static startScheduler(): void {
    // Ejecutar cada 30 minutos la sincronización de asignaciones expiradas
    this.scheduleTask('expiredAssignments', this.updateExpiredAssignments, 30 * 60 * 1000);
    // Ejecutar cada 6 horas la sincronización completa de estados de miembros
    this.scheduleTask('memberStatusSync', this.syncAllMemberStatuses, 6 * 60 * 60 * 1000);
    logger.log('Scheduler iniciado - Tareas programadas activas');
  }
  /**
   * Detiene el scheduler y todas las tareas programadas
   */
  static stopScheduler(): void {
    this.intervals.forEach((interval, taskName) => {
      clearInterval(interval);
      logger.log(`Tarea programada '${taskName}' detenida`);
    });
    this.intervals.clear();
    logger.log('Scheduler detenido');
  }
  /**
   * Programa una tarea para ejecutarse en intervalos regulares
   */
  private static scheduleTask(taskName: string, task: () => Promise<void>, intervalMs: number): void {
    // Ejecutar inmediatamente la primera vez
    task().catch(error => {
      logger.error(`Error en tarea inicial '${taskName}':`, error);
    });
    // Programar ejecuciones regulares
    const interval = setInterval(async () => {
      try {
        await task();
        logger.log(`Tarea '${taskName}' ejecutada exitosamente`);
      } catch (error) {
        logger.error(`Error en tarea programada '${taskName}':`, error);
      }
    }, intervalMs);
    this.intervals.set(taskName, interval as any);
    logger.log(`Tarea '${taskName}' programada cada ${intervalMs / 1000} segundos`);
  }
  /**
   * Actualiza todas las asignaciones expiradas de planes y clases
   */
  private static async updateExpiredAssignments(): Promise<void> {
    logger.log('Iniciando actualización de asignaciones expiradas...');
    try {
      // Actualizar asignaciones de planes expiradas
      await updateExpiredAssignments();
      logger.log('Asignaciones de planes expiradas actualizadas');
      // Actualizar asignaciones de clases expiradas
      await updateExpiredAssignments();
      logger.log('Asignaciones de clases expiradas actualizadas');
    } catch (error) {
      logger.error('Error actualizando asignaciones expiradas:', error);
      throw error;
    }
  }
  /**
   * Sincroniza el estado de todos los miembros
   */
  private static async syncAllMemberStatuses(): Promise<void> {
    logger.log('Iniciando sincronización completa de estados de miembros...');
    try {
      await MemberStatusService.syncAllMembersStatus();
      logger.log('Sincronización completa de estados de miembros completada');
    } catch (error) {
      logger.error('Error en sincronización completa de estados:', error);
      throw error;
    }
  }
  /**
   * Ejecuta manualmente la sincronización de asignaciones expiradas
   */
  static async runExpiredAssignmentsSync(): Promise<void> {
    await this.updateExpiredAssignments();
  }
  /**
   * Ejecuta manualmente la sincronización completa de estados
   */
  static async runFullMemberStatusSync(): Promise<void> {
    await this.syncAllMemberStatuses();
  }
  /**
   * Obtiene el estado actual del scheduler
   */
  static getSchedulerStatus(): { isRunning: boolean; activeTasks: string[] } {
    return {
      isRunning: this.intervals.size > 0,
      activeTasks: Array.from(this.intervals.keys())
    };
  }
}
export default SchedulerService;