import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Server, 
  HardDrive,
  Eye,
  Edit,
  Clock,
  BarChart3,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react';
import { FirebaseUsageService, type FirebaseUsageStats, type DatabaseMetrics } from '../../services/analytics/firebaseUsageService';
import { logger } from '../../utils/logger';
interface DatabaseUsageAnalysisProps {
  onBack: () => void;
}
const DatabaseUsageAnalysis: React.FC<DatabaseUsageAnalysisProps> = ({ onBack }) => {
  const [usageStats, setUsageStats] = useState<FirebaseUsageStats | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [alerts, setAlerts] = useState<Array<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    percentage: number;
  }>>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'trends' | 'recommendations'>('overview');
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [stats, metrics, alertsData, recommendationsData] = await Promise.all([
        FirebaseUsageService.getUsageStats(),
        FirebaseUsageService.getDatabaseMetrics(),
        FirebaseUsageService.getUsageAlerts(),
        FirebaseUsageService.getOptimizationRecommendations()
      ]);
      setUsageStats(stats);
      setDatabaseMetrics(metrics);
      setAlerts(alertsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      logger.error('Error loading database usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600 bg-red-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 40) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando análisis de uso...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Database className="w-8 h-8 mr-3 text-blue-600" />
                  Análisis de Uso de Base de Datos
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitoreo de escrituras, lecturas y límites de Firebase
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Activity className="w-4 h-4 mr-2" />
              Actualizar
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
              Alertas de Uso
            </h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'danger' 
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                      : 'bg-blue-50 border-blue-400 text-blue-700'
                  }`}
                >
                  <div className="flex items-center">
                    {alert.type === 'danger' ? (
                      <AlertCircle className="w-5 h-5 mr-2" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 mr-2" />
                    ) : (
                      <Info className="w-5 h-5 mr-2" />
                    )}
                    <span className="font-medium">{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Resumen', icon: BarChart3 },
                { id: 'details', name: 'Detalles', icon: Database },
                { id: 'trends', name: 'Tendencias', icon: TrendingUp },
                { id: 'recommendations', name: 'Recomendaciones', icon: Zap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
        {/* Contenido de las tabs */}
        {activeTab === 'overview' && usageStats && databaseMetrics && (
          <div className="space-y-8">
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Lecturas diarias */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Eye className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">Lecturas Hoy</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageStats.dailyReadUsage)}`}>
                    {usageStats.dailyReadUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Usadas</span>
                    <span className="font-medium">{usageStats.readsToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Límite</span>
                    <span className="font-medium">{usageStats.dailyReadLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getProgressBarColor(usageStats.dailyReadUsage)}`}
                      style={{ width: `${Math.min(usageStats.dailyReadUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {/* Escrituras diarias */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Edit className="w-6 h-6 text-green-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">Escrituras Hoy</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageStats.dailyWriteUsage)}`}>
                    {usageStats.dailyWriteUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Usadas</span>
                    <span className="font-medium">{usageStats.writesToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Límite</span>
                    <span className="font-medium">{usageStats.dailyWriteLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getProgressBarColor(usageStats.dailyWriteUsage)}`}
                      style={{ width: `${Math.min(usageStats.dailyWriteUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {/* Documentos totales */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Server className="w-6 h-6 text-purple-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">Documentos</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium">{databaseMetrics.totalDocuments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Colecciones</span>
                    <span className="font-medium">{databaseMetrics.totalCollections}</span>
                  </div>
                </div>
              </div>
              {/* Almacenamiento */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <HardDrive className="w-6 h-6 text-orange-600 mr-2" />
                    <h3 className="text-sm font-medium text-gray-900">Almacenamiento</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(databaseMetrics.storageUsage)}`}>
                    {databaseMetrics.storageUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Usado</span>
                    <span className="font-medium">{databaseMetrics.storageUsed.toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Límite</span>
                    <span className="font-medium">{databaseMetrics.storageLimit} MB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getProgressBarColor(databaseMetrics.storageUsage)}`}
                      style={{ width: `${Math.min(databaseMetrics.storageUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Uso mensual */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Uso Mensual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Lecturas Mensuales</span>
                    <span className="text-sm text-gray-600">{usageStats.monthlyReadUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${getProgressBarColor(usageStats.monthlyReadUsage)}`}
                      style={{ width: `${Math.min(usageStats.monthlyReadUsage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{usageStats.readsThisMonth.toLocaleString()}</span>
                    <span>{usageStats.monthlyReadLimit.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Escrituras Mensuales</span>
                    <span className="text-sm text-gray-600">{usageStats.monthlyWriteUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${getProgressBarColor(usageStats.monthlyWriteUsage)}`}
                      style={{ width: `${Math.min(usageStats.monthlyWriteUsage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{usageStats.writesThisMonth.toLocaleString()}</span>
                    <span>{usageStats.monthlyWriteLimit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'details' && usageStats && (
          <div className="space-y-8">
            {/* Colecciones más activas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Colecciones Más Activas</h3>
              <div className="space-y-4">
                {usageStats.mostActiveCollections.map((collection, index) => (
                  <div key={collection.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">{collection.name}</h4>
                        <p className="text-sm text-gray-600">
                          {collection.reads.toLocaleString()} lecturas • {collection.writes.toLocaleString()} escrituras
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {(collection.reads + collection.writes).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">operaciones</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'trends' && usageStats && (
          <div className="space-y-8">
            {/* Tendencias por hora */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Actividad por Hora (Últimas 24h)</h3>
              <div className="grid grid-cols-12 gap-2">
                {usageStats.hourlyTrends.map((trend) => (
                  <div key={trend.hour} className="text-center">
                    <div className="mb-2">
                      <div 
                        className="bg-blue-500 rounded-t"
                        style={{ 
                          height: `${Math.max((trend.reads / 200) * 60, 4)}px`,
                          marginBottom: '2px'
                        }}
                        title={`Lecturas: ${trend.reads}`}
                      ></div>
                      <div 
                        className="bg-green-500 rounded-b"
                        style={{ 
                          height: `${Math.max((trend.writes / 50) * 30, 2)}px`
                        }}
                        title={`Escrituras: ${trend.writes}`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">{trend.hour}h</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4 space-x-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Lecturas</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Escrituras</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'recommendations' && (
          <div className="space-y-8">
            {/* Recomendaciones */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Recomendaciones de Optimización
              </h3>
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <CheckCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">¡Excelente! Tu uso de Firebase está optimizado.</p>
                </div>
              )}
            </div>
            {/* Información del plan */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-900 mb-4">Plan Firebase Spark (Gratuito)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-blue-800 mb-2">Límites Diarios:</h5>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 50,000 lecturas</li>
                    <li>• 20,000 escrituras</li>
                    <li>• 10,000 eliminaciones</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-2">Límites Mensuales:</h5>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 1.5M lecturas</li>
                    <li>• 600K escrituras</li>
                    <li>• 1GB almacenamiento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default DatabaseUsageAnalysis;