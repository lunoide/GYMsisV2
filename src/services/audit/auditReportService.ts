import { SystemAuditService } from './systemAuditService';
import type { SystemAuditReport } from './systemAuditService';
import { logger } from '../../utils/logger';
export interface AuditScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  notifications: boolean;
  emailRecipients: string[];
}
export interface AuditReportHistory {
  id: string;
  timestamp: Date;
  report: SystemAuditReport;
  overallScore: number;
  criticalIssues: number;
}
export class AuditReportService {
  private static instance: AuditReportService;
  private reportHistory: AuditReportHistory[] = [];
  private constructor() {
    // Constructor privado para singleton
  }
  static getInstance(): AuditReportService {
    if (!AuditReportService.instance) {
      AuditReportService.instance = new AuditReportService();
    }
    return AuditReportService.instance;
  }
  async runScheduledAudit(): Promise<SystemAuditReport | null> {
    try {
      logger.log('🔄 Ejecutando auditoría programada...');
      const report = await SystemAuditService.runCompleteAudit();
      // Guardar en historial
      const historyEntry: AuditReportHistory = {
        id: Date.now().toString(),
        timestamp: new Date(),
        report,
        overallScore: this.calculateOverallScore(report),
        criticalIssues: report.results.filter(r => r.severity === 'critical').length
      };
      this.reportHistory.unshift(historyEntry);
      // Mantener solo los últimos 50 reportes
      if (this.reportHistory.length > 50) {
        this.reportHistory = this.reportHistory.slice(0, 50);
      }
      // Verificar si hay problemas críticos
      await this.checkCriticalIssues(report);
      logger.log('✅ Auditoría programada completada');
      return report;
    } catch (error) {
      logger.error('❌ Error en auditoría automática:', error);
      return null;
    }
  }
  private async checkCriticalIssues(report: SystemAuditReport): Promise<void> {
    const criticalIssues = report.results.filter(r => r.severity === 'critical');
    if (criticalIssues.length > 0) {
      logger.warn(`⚠️ Se encontraron ${criticalIssues.length} problemas críticos`);
      // Aquí se podría implementar notificaciones por email, Slack, etc.
      await this.sendCriticalAlert(criticalIssues);
    }
  }
  private async sendCriticalAlert(criticalIssues: any[]): Promise<void> {
    // Implementación de alertas críticas
    logger.log('🚨 Enviando alerta de problemas críticos:', criticalIssues);
  }
  getReportHistory(): AuditReportHistory[] {
    return [...this.reportHistory];
  }
  getLatestReport(): AuditReportHistory | null {
    return this.reportHistory.length > 0 ? this.reportHistory[0] : null;
  }
  getReportById(id: string): AuditReportHistory | null {
    return this.reportHistory.find(report => report.id === id) || null;
  }
  getReportStatistics() {
    if (this.reportHistory.length === 0) {
      return {
        totalReports: 0,
        averageScore: 0,
        trendDirection: 'stable' as const,
        lastRunTime: null,
        criticalIssuesCount: 0
      };
    }
    const scores = this.reportHistory.map(r => r.overallScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Calcular tendencia (últimos 5 reportes vs anteriores)
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.reportHistory.length >= 5) {
      const recent = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const older = scores.slice(5, 10).reduce((a, b) => a + b, 0) / Math.min(5, scores.slice(5).length);
      if (recent > older + 5) trendDirection = 'improving';
      else if (recent < older - 5) trendDirection = 'declining';
    }
    return {
      totalReports: this.reportHistory.length,
      averageScore,
      trendDirection,
      lastRunTime: this.reportHistory[0]?.timestamp || null,
      criticalIssuesCount: this.reportHistory[0]?.criticalIssues || 0
    };
  }
  private calculateOverallScore(report: SystemAuditReport): number {
    if (report.totalChecks === 0) return 0;
    const baseScore = (report.passedChecks / report.totalChecks) * 100;
    // Penalizar por severidad
    const criticalPenalty = report.results.filter(r => r.severity === 'critical').length * 20;
    const highPenalty = report.results.filter(r => r.severity === 'high').length * 10;
    const mediumPenalty = report.results.filter(r => r.severity === 'medium').length * 5;
    const finalScore = Math.max(0, baseScore - criticalPenalty - highPenalty - mediumPenalty);
    return Math.round(finalScore);
  }
  async exportReportJSON(reportId: string): Promise<string | null> {
    const report = this.getReportById(reportId);
    if (!report) return null;
    return JSON.stringify(report, null, 2);
  }
  async exportReportCSV(reportId: string): Promise<string | null> {
    const report = this.getReportById(reportId);
    if (!report) return null;
    const headers = ['Categoría', 'Estado', 'Severidad', 'Mensaje', ''];
    const rows = report.report.results.map(result => [
      result.category,
      result.status,
      result.severity,
      result.message,
      result.timestamp?.toISOString() || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    return csvContent;
  }
  clearHistory(): void {
    this.reportHistory = [];
  }
}
// Instancia singleton
export const auditReportService = AuditReportService.getInstance();