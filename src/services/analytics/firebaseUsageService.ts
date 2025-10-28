import { 
  collection, 
  getDocs, 
  query, 
  where} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
export interface FirebaseUsageStats {
  // Estadísticas de lecturas
  totalReads: number;
  readsToday: number;
  readsThisMonth: number;
  // Estadísticas de escrituras
  totalWrites: number;
  writesToday: number;
  writesThisMonth: number;
  // Límites de Firebase (plan Spark gratuito)
  dailyReadLimit: number;
  dailyWriteLimit: number;
  monthlyReadLimit: number;
  monthlyWriteLimit: number;
  // Porcentajes de uso
  dailyReadUsage: number;
  dailyWriteUsage: number;
  monthlyReadUsage: number;
  monthlyWriteUsage: number;
  // Colecciones más activas
  mostActiveCollections: Array<{
    name: string;
    reads: number;
    writes: number;
  }>;
  // Tendencias por hora
  hourlyTrends: Array<{
    hour: number;
    reads: number;
    writes: number;
  }>;
}
export interface DatabaseMetrics {
  totalDocuments: number;
  totalCollections: number;
  storageUsed: number; // En MB
  storageLimit: number; // En MB
  storageUsage: number; // Porcentaje
}
export class FirebaseUsageService {
  // Límites del plan gratuito de Firebase (Spark)
  private static readonly SPARK_LIMITS = {
    dailyReads: 50000,
    dailyWrites: 20000,
    monthlyReads: 1500000,
    monthlyWrites: 600000,
    storage: 1024 // 1GB en MB
  };
  /**
   * Obtener estadísticas de uso de Firebase
   * Nota: En un entorno real, estas métricas vendrían de Firebase Analytics o Admin SDK
   * Para este ejemplo, simularemos las métricas basadas en la actividad de las colecciones
   */
  static async getUsageStats(): Promise<FirebaseUsageStats> {
    try {
      // Simular métricas de uso basadas en la actividad actual
      const metrics = await this.calculateUsageMetrics();
      return {
        totalReads: metrics.estimatedReads,
        readsToday: metrics.readsToday,
        readsThisMonth: metrics.readsThisMonth,
        totalWrites: metrics.estimatedWrites,
        writesToday: metrics.writesToday,
        writesThisMonth: metrics.writesThisMonth,
        dailyReadLimit: this.SPARK_LIMITS.dailyReads,
        dailyWriteLimit: this.SPARK_LIMITS.dailyWrites,
        monthlyReadLimit: this.SPARK_LIMITS.monthlyReads,
        monthlyWriteLimit: this.SPARK_LIMITS.monthlyWrites,
        dailyReadUsage: (metrics.readsToday / this.SPARK_LIMITS.dailyReads) * 100,
        dailyWriteUsage: (metrics.writesToday / this.SPARK_LIMITS.dailyWrites) * 100,
        monthlyReadUsage: (metrics.readsThisMonth / this.SPARK_LIMITS.monthlyReads) * 100,
        monthlyWriteUsage: (metrics.writesThisMonth / this.SPARK_LIMITS.monthlyWrites) * 100,
        mostActiveCollections: metrics.activeCollections,
        hourlyTrends: metrics.hourlyTrends
      };
    } catch (error) {
      logger.error('Error getting Firebase usage stats:', error);
      throw error;
    }
  }
  /**
   * Obtener métricas de la base de datos
   */
  static async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Solo usar colecciones que realmente existen según las reglas de Firestore
      const collections = [
        'users', 'classes', 'classAssignments', 'membershipPlans', 
        'planAssignments', 'payments', 'products', 'sales', 
        'rewards', 'rewardRequests', 'redemptions', 'userPoints', 
        'pointTransactions', 'auditLogs', 'monthlyIncome'
      ];
      let totalDocuments = 0;
      // Contar documentos en cada colección
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          totalDocuments += snapshot.size;
        } catch (collectionError) {
          logger.warn(`No se pudo acceder a la colección ${collectionName}:`, collectionError);
          // Continuar con las demás colecciones
        }
      }
      // Estimar uso de almacenamiento (aproximado)
      const estimatedStorageUsed = totalDocuments * 0.5; // ~0.5KB por documento promedio
      return {
        totalDocuments,
        totalCollections: collections.length,
        storageUsed: estimatedStorageUsed / 1024, // Convertir a MB
        storageLimit: this.SPARK_LIMITS.storage,
        storageUsage: (estimatedStorageUsed / 1024 / this.SPARK_LIMITS.storage) * 100
      };
    } catch (error) {
      logger.error('Error getting database metrics:', error);
      throw error;
    }
  }
  /**
   * Calcular métricas de uso estimadas
   */
  private static async calculateUsageMetrics() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Obtener actividad de las principales colecciones (solo las que existen)
    const collections = ['users', 'payments', 'sales', 'products', 'classes'];
    const activeCollections = [];
    let totalDocs = 0;
    let recentActivity = 0;
    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        const docCount = snapshot.size;
        totalDocs += docCount;
        // Estimar actividad reciente basada en documentos con timestamps
        let recentDocs = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt || data.updatedAt || data.paymentDate || data.saleDate) {
            const timestamp = data.createdAt || data.updatedAt || data.paymentDate || data.saleDate;
            let date: Date;
            if (timestamp && typeof timestamp.toDate === 'function') {
              date = timestamp.toDate();
            } else if (timestamp instanceof Date) {
              date = timestamp;
            } else {
              return;
            }
            if (date >= startOfDay) {
              recentDocs++;
            }
          }
        });
        recentActivity += recentDocs;
        activeCollections.push({
          name: collectionName,
          reads: docCount * 2, // Estimación: 2 lecturas por documento
          writes: Math.floor(docCount * 0.1) // Estimación: 10% de escrituras
        });
      } catch (error) {
        logger.error(`Error processing collection ${collectionName}:`, error);
      }
    }
    // Estimaciones basadas en la actividad
    const estimatedReads = totalDocs * 3; // 3 lecturas promedio por documento
    const estimatedWrites = totalDocs * 0.2; // 20% de escrituras
    const readsToday = recentActivity * 5; // Factor de actividad diaria
    const writesToday = recentActivity * 1; // Escrituras del día
    const readsThisMonth = readsToday * 15; // Estimación mensual
    const writesThisMonth = writesToday * 15;
    // Generar tendencias por hora (simuladas)
    const hourlyTrends = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      reads: Math.floor(Math.random() * 100) + 50,
      writes: Math.floor(Math.random() * 30) + 10
    }));
    return {
      estimatedReads,
      estimatedWrites,
      readsToday,
      writesToday,
      readsThisMonth,
      writesThisMonth,
      activeCollections: activeCollections.sort((a, b) => (b.reads + b.writes) - (a.reads + a.writes)),
      hourlyTrends
    };
  }
  /**
   * Obtener alertas de uso
   */
  static async getUsageAlerts(): Promise<Array<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    percentage: number;
  }>> {
    const stats = await this.getUsageStats();
    const alerts = [];
    // Alertas de lecturas diarias
    if (stats.dailyReadUsage > 80) {
      alerts.push({
        type: 'danger' as const,
        message: `Uso de lecturas diarias: ${stats.dailyReadUsage.toFixed(1)}%`,
        percentage: stats.dailyReadUsage
      });
    } else if (stats.dailyReadUsage > 60) {
      alerts.push({
        type: 'warning' as const,
        message: `Uso de lecturas diarias: ${stats.dailyReadUsage.toFixed(1)}%`,
        percentage: stats.dailyReadUsage
      });
    }
    // Alertas de escrituras diarias
    if (stats.dailyWriteUsage > 80) {
      alerts.push({
        type: 'danger' as const,
        message: `Uso de escrituras diarias: ${stats.dailyWriteUsage.toFixed(1)}%`,
        percentage: stats.dailyWriteUsage
      });
    } else if (stats.dailyWriteUsage > 60) {
      alerts.push({
        type: 'warning' as const,
        message: `Uso de escrituras diarias: ${stats.dailyWriteUsage.toFixed(1)}%`,
        percentage: stats.dailyWriteUsage
      });
    }
    // Alertas mensuales
    if (stats.monthlyReadUsage > 70) {
      alerts.push({
        type: 'warning' as const,
        message: `Uso mensual de lecturas: ${stats.monthlyReadUsage.toFixed(1)}%`,
        percentage: stats.monthlyReadUsage
      });
    }
    if (stats.monthlyWriteUsage > 70) {
      alerts.push({
        type: 'warning' as const,
        message: `Uso mensual de escrituras: ${stats.monthlyWriteUsage.toFixed(1)}%`,
        percentage: stats.monthlyWriteUsage
      });
    }
    return alerts;
  }
  /**
   * Obtener recomendaciones de optimización
   */
  static async getOptimizationRecommendations(): Promise<string[]> {
    const stats = await this.getUsageStats();
    const recommendations = [];
    if (stats.dailyReadUsage > 50) {
      recommendations.push('Considera implementar caché local para reducir lecturas repetidas');
      recommendations.push('Optimiza las consultas para obtener solo los datos necesarios');
    }
    if (stats.dailyWriteUsage > 50) {
      recommendations.push('Implementa escrituras en lote para operaciones múltiples');
      recommendations.push('Considera usar transacciones para operaciones relacionadas');
    }
    if (stats.monthlyReadUsage > 60) {
      recommendations.push('Evalúa migrar a un plan de pago de Firebase');
      recommendations.push('Implementa paginación en listados largos');
    }
    // Recomendaciones basadas en colecciones más activas
    const topCollection = stats.mostActiveCollections[0];
    if (topCollection && (topCollection.reads + topCollection.writes) > 1000) {
      recommendations.push(`La colección "${topCollection.name}" tiene alta actividad. Considera optimizar sus consultas`);
    }
    return recommendations;
  }
}