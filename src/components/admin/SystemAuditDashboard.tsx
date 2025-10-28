import React, { useState, useEffect } from 'react';
import { SystemAuditService } from '../../services/audit/systemAuditService';
import { auditReportService } from '../../services/audit/auditReportService';
import type { SystemAuditReport, AuditResult } from '../../services/audit/systemAuditService';
import type { AuditReportHistory } from '../../services/audit/auditReportService';
import { logger } from '../../utils/logger';
import { 
  Shield, 
  Database, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
interface SystemAuditDashboardProps {
  onBack: () => void;
}
const SystemAuditDashboard: React.FC<SystemAuditDashboardProps> = ({ onBack }) => {
  const [auditReport, setAuditReport] = useState<SystemAuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [reportHistory, setReportHistory] = useState<AuditReportHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reportStats, setReportStats] = useState<any>(null);
  useEffect(() => {
    // Cargar historial y estadísticas al montar el componente
    loadReportData();
  }, []);
  const loadReportData = () => {
    const history = auditReportService.getReportHistory();
    const stats = auditReportService.getReportStatistics();
    setReportHistory(history);
    setReportStats(stats);
    // Cargar el último reporte si existe
    const latestReport = auditReportService.getLatestReport();
    if (latestReport && latestReport.status === 'completed') {
      setAuditReport(latestReport.report);
    }
  };
  const runAudit = async () => {
    setIsRunning(true);
    try {
      const reportHistory = await auditReportService.runScheduledAudit();
      if (reportHistory.status === 'completed') {
        setAuditReport(reportHistory.report);
      }
      // Recargar datos después de la auditoría
      loadReportData();
    } catch (error) {
      logger.error('Error ejecutando auditoría:', error);
    } finally {
      setIsRunning(false);
    }
  };
  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };
  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };
  const exportReportJSON = (reportId: string) => {
    const jsonData = auditReportService.exportReport(reportId);
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${reportId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  const exportReportCSV = (reportId: string) => {
    const csvData = auditReportService.exportReportCSV(reportId);
    if (csvData) {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  const loadHistoricalReport = (reportId: string) => {
    const report = reportHistory.find(r => r.id === reportId);
    if (report && report.status === 'completed') {
      setAuditReport(report.report);
      setShowHistory(false);
    }
  };
  const getOverallStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
    }
  };
  const categories = auditReport ? 
    ['all', ...Array.from(new Set(auditReport.results.map(r => r.category)))] : 
    ['all'];
  const filteredResults = auditReport?.results.filter(result => 
    selectedCategory === 'all' || result.category === selectedCategory
  ) || [];
  const exportReport = () => {
    if (!auditReport) return;
    const reportData = {
      timestamp: auditReport.timestamp,
      overallStatus: auditReport.overallStatus,
      summary: {
        totalChecks: auditReport.totalChecks,
        passedChecks: auditReport.passedChecks,
        warningChecks: auditReport.warningChecks,
        errorChecks: auditReport.errorChecks,
        executionTime: auditReport.executionTime
      },
      results: auditReport.results
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-600 mt-2">
            Análisis completo de integridad, seguridad y rendimiento
          </p>
        </div>
        <div className="flex gap-3">
          {auditReport && (
            <button
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar Reporte
            </button>
          )}
          <button
            onClick={runAudit}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Ejecutando...' : 'Ejecutar Auditoría'}
          </button>
        </div>
      </div>
      {/* Estado de la auditoría */}
      {auditReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Estado General */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Estado General</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {auditReport.overallStatus}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full ${getOverallStatusColor(auditReport.overallStatus)}`}>
                <Shield className="w-6 h-6 text-white m-3" />
              </div>
            </div>
          </div>
          {/* Verificaciones Exitosas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verificaciones Exitosas</p>
                <p className="text-2xl font-bold text-green-600">
                  {auditReport.passedChecks}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          {/* Advertencias */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Advertencias</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {auditReport.warningChecks}
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          {/* Errores */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Errores</p>
                <p className="text-2xl font-bold text-red-600">
                  {auditReport.errorChecks}
                </p>
              </div>
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>
      )}
      {/* Información de ejecución */}
      {auditReport && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Última ejecución</p>
                <p className="font-medium">
                  {auditReport.timestamp.toLocaleString('es-ES')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Tiempo de ejecución</p>
                <p className="font-medium">{auditReport.executionTime}ms</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Total de verificaciones</p>
                <p className="font-medium">{auditReport.totalChecks}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Filtros de categoría */}
      {auditReport && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtrar por Categoría</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'Todas' : category}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Resultados detallados */}
      {auditReport && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Resultados Detallados
              {selectedCategory !== 'all' && ` - ${selectedCategory}`}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredResults.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{result.message}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(result.severity)}`}>
                          {result.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.category}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                            Ver detalles
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.timestamp?.toLocaleTimeString('es-ES')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Estado inicial */}
      {!auditReport && !isRunning && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Auditoría del Sistema
          </h3>
          <p className="text-gray-600 mb-6">
            Ejecuta una auditoría completa para analizar la integridad, seguridad y rendimiento del sistema.
          </p>
          <button
            onClick={runAudit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Auditoría
          </button>
        </div>
      )}
      {/* Estado de carga */}
      {isRunning && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ejecutando Auditoría...
          </h3>
          <p className="text-gray-600">
            Analizando la base de datos y verificando la integridad del sistema.
          </p>
        </div>
      )}
    </div>
  );
};
export default SystemAuditDashboard;