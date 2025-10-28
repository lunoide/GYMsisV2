import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Calendar,
  UserCheck,
  UserX,
  UserPlus,
  AlertTriangle,
  Award,
  Clock,
  Target
} from 'lucide-react';
import { MemberAnalyticsService, type MemberAnalyticsReport } from '../../../services/analytics/memberAnalyticsService';
import { logger } from '../../../utils/logger';
interface MemberReportProps {
  onBack: () => void;
}
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
const MemberReport: React.FC<MemberReportProps> = ({ onBack }) => {
  const [report, setReport] = useState<MemberAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'retention' | 'activity' | 'revenue' | 'demographics' | 'trends'>('overview');
  useEffect(() => {
    loadMemberReport();
  }, []);
  const loadMemberReport = async () => {
    try {
      setLoading(true);
      const reportData = await MemberAnalyticsService.getMemberAnalyticsReport();
      setReport(reportData);
    } catch (error) {
      logger.error('Error loading member report:', error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reporte de miembros...</p>
        </div>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Error al cargar el reporte de miembros</p>
          <button
            onClick={loadMemberReport}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Miembros</p>
              <p className="text-2xl font-bold text-gray-900">{report.membershipStats.totalMembers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Miembros Activos</p>
              <p className="text-2xl font-bold text-green-600">{report.membershipStats.activeMembers}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nuevos Este Mes</p>
              <p className="text-2xl font-bold text-blue-600">{report.membershipStats.newMembersThisMonth}</p>
            </div>
            <UserPlus className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crecimiento</p>
              <p className={`text-2xl font-bold ${report.membershipStats.membershipGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.membershipStats.membershipGrowthRate.toFixed(1)}%
              </p>
            </div>
            {report.membershipStats.membershipGrowthRate >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
          </div>
        </div>
      </div>
      {/* Distribución de estado de membresías */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Estado de Membresías</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Activos', value: report.membershipStats.activeMembers, color: '#10B981' },
                  { name: 'Inactivos', value: report.membershipStats.inactiveMembers, color: '#EF4444' },
                  { name: 'Suspendidos', value: report.membershipStats.suspendedMembers, color: '#F59E0B' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Activos', value: report.membershipStats.activeMembers, color: '#10B981' },
                  { name: 'Inactivos', value: report.membershipStats.inactiveMembers, color: '#EF4444' },
                  { name: 'Suspendidos', value: report.membershipStats.suspendedMembers, color: '#F59E0B' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Recomendaciones */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones</h3>
        <div className="space-y-3">
          {report.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const renderRetentionTab = () => (
    <div className="space-y-6">
      {/* Métricas de retención */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retención Mensual</p>
              <p className="text-2xl font-bold text-green-600">{report.retentionMetrics.monthlyRetentionRate.toFixed(1)}%</p>
            </div>
            <Award className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Abandono</p>
              <p className="text-2xl font-bold text-red-600">{report.retentionMetrics.churnRate.toFixed(1)}%</p>
            </div>
            <UserX className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Renovación</p>
              <p className="text-2xl font-bold text-blue-600">{report.retentionMetrics.renewalRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-purple-600">{Math.round(report.retentionMetrics.averageMembershipDuration)} días</p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
      {/* Distribución por antigüedad */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Antigüedad</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(report.retentionMetrics.membersByTenure).map(([period, count]) => ({
              period: period.replace('months', 'meses').replace('+', '+'),
              count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
  const renderActivityTab = () => (
    <div className="space-y-6">
      {/* Métricas de actividad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clases Promedio por Miembro</p>
              <p className="text-2xl font-bold text-blue-600">{report.activityMetrics.averageClassesPerMember.toFixed(1)}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Asistencia</p>
              <p className="text-2xl font-bold text-green-600">{report.activityMetrics.classAttendanceRate.toFixed(1)}%</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clases Populares</p>
              <p className="text-2xl font-bold text-purple-600">{report.activityMetrics.popularClasses.length}</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
      {/* Miembros más activos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Miembros Más Activos</h3>
          <div className="space-y-3">
            {report.activityMetrics.mostActiveMembers.slice(0, 5).map((member, index) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.classCount} clases</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clases Más Populares</h3>
          <div className="space-y-3">
            {report.activityMetrics.popularClasses.slice(0, 5).map((classItem, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{classItem.className}</p>
                  <p className="text-sm text-gray-600">{classItem.uniqueMembers} miembros únicos</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{classItem.attendanceCount}</p>
                  <p className="text-xs text-gray-500">asistencias</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  const renderRevenueTab = () => (
    <div className="space-y-6">
      {/* Métricas de ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-600">${report.revenueByMember.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio por Miembro</p>
              <p className="text-2xl font-bold text-blue-600">${report.revenueByMember.averageRevenuePerMember.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Miembros</p>
              <p className="text-2xl font-bold text-purple-600">{report.revenueByMember.topSpendingMembers.length}</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
      {/* Ingresos por tipo de membresía */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Tipo de Membresía</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(report.revenueByMember.revenueByMembershipType).map(([type, revenue]) => ({
              type,
              revenue
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Top miembros que más gastan */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Miembros que Más Gastan</h3>
        <div className="space-y-3">
          {report.revenueByMember.topSpendingMembers.slice(0, 10).map((member, index) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-600">{member.membershipType}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">${member.totalSpent.toLocaleString()}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  #{index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const renderDemographicsTab = () => (
    <div className="space-y-6">
      {/* Estadísticas demográficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Edad Promedio</h3>
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{report.demographics.averageAge.toFixed(1)} años</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Edad</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(report.demographics.ageGroups).map(([group, count]) => ({
                    name: group,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(report.demographics.ageGroups).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Desglose detallado por grupos de edad */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose Detallado por Grupos de Edad</h3>
        <div className="space-y-4">
          {Object.entries(report.demographics.ageGroups).map(([group, count], index) => {
            const total = Object.values(report.demographics.ageGroups).reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={group} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium text-gray-900">{group} años</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* Crecimiento mensual */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Crecimiento de Miembros</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.trends.monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="newMembers" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Nuevos Miembros" />
              <Area type="monotone" dataKey="churnedMembers" stackId="2" stroke="#EF4444" fill="#EF4444" name="Miembros Perdidos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Crecimiento de ingresos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ingresos</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.trends.revenueGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Ingresos Totales" />
              <Line type="monotone" dataKey="averagePerMember" stroke="#8B5CF6" strokeWidth={2} name="Promedio por Miembro" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Tabla de tendencias */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Tendencias Mensuales</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nuevos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perdidos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.trends.monthlyGrowth.slice(-6).map((month, index) => {
                const revenueData = report.trends.revenueGrowth.find(r => r.month === month.month);
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{month.newMembers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{month.totalMembers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{month.churnedMembers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${revenueData?.revenue.toLocaleString() || '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Users },
    { id: 'retention', label: 'Retención', icon: Award },
    { id: 'activity', label: 'Actividad', icon: Activity },
    { id: 'revenue', label: 'Ingresos', icon: DollarSign },
    { id: 'demographics', label: 'Demografía', icon: Calendar },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp }
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Volver
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Reporte de Miembros</h1>
            </div>
            <button
              onClick={loadMemberReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'retention' && renderRetentionTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'demographics' && renderDemographicsTab()}
        {activeTab === 'trends' && renderTrendsTab()}
      </div>
    </div>
  );
};
export default MemberReport;