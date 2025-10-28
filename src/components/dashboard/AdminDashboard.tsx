import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { TrainerManagement, MemberManagement, MemberManagementDetailed } from '../admin';
import { PlanManagement, PlanAssignment } from '../plans';
import { UserForm, SalesForm } from '../forms';
import { Modal } from '../ui';
import DashboardStatsService from '../../services/analytics/dashboardStatsService';
import ProductManagement from '../admin/ProductManagement';
import ProductList from '../admin/ProductList';
import RewardsManagement from '../admin/RewardsManagement';
import RewardRequestsManagement from '../admin/RewardRequestsManagement';
import VendorManagement from '../admin/VendorManagement';
import StaffManagement from '../admin/StaffManagement';
import PasswordChange from '../admin/PasswordChange';
import StaffPayment from '../admin/StaffPayment';
import { FinancialReportComponent } from '../admin/FinancialReport';
import { SalesService } from '../../services/sales/salesService';
import DatabaseUsageAnalysis from '../admin/DatabaseUsageAnalysis';
import MemberReport from '../admin/reports/MemberReport';
import MemberStatusSyncUtility from '../../utils/syncMembersStatus';
import { MemberStatusDiagnostic } from '../../utils/memberStatusDiagnostic';
import { useSafeDisplay } from '../../hooks/useSafeDisplay';
import { logger } from '../../utils/logger';
const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { safeText, safeFullName } = useSafeDisplay();
  const [showTrainerManagement, setShowTrainerManagement] = useState(false);
  const [showPlanManagement, setShowPlanManagement] = useState(false);
  const [showPlanAssignment, setShowPlanAssignment] = useState(false);
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showDetailedMemberManagement, setShowDetailedMemberManagement] = useState(false);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [showRewardsManagement, setShowRewardsManagement] = useState(false);
  const [showRewardRequestsManagement, setShowRewardRequestsManagement] = useState(false);
  const [showVendorManagement, setShowVendorManagement] = useState(false);
  const [showStaffManagement, setShowStaffManagement] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showFinancialReport, setShowFinancialReport] = useState(false);
  const [showDatabaseUsage, setShowDatabaseUsage] = useState(false);
  const [showMemberReport, setShowMemberReport] = useState(false);
  const [showStaffPayment, setShowStaffPayment] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [isSyncingMembers, setIsSyncingMembers] = useState(false);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  // Estado para las estadísticas
  const [stats, setStats] = useState({
    activeMembers: 0,
    totalMembers: 0,
    monthlyIncome: 0,
    totalStaff: 0,
    inactiveMembers: 0,
    totalSales: 0,
    monthlySalesRevenue: 0,
    isLoading: true
  });
  // Cargar estadísticas al montar el componente
  useEffect(() => {
    const loadStats = async () => {
      try {
        const salesService = new SalesService();
        const [activeMembers, totalMembers, income, staff, inactive, salesStats] = await Promise.all([
          DashboardStatsService.getActiveMembers(),
          DashboardStatsService.getTotalMembersCount(),
          DashboardStatsService.getMonthlyIncome(),
          DashboardStatsService.getTotalStaff(),
          DashboardStatsService.getInactiveMembers(),
          salesService.getSalesStats()
        ]);
        setStats({
          activeMembers: activeMembers,
          totalMembers: totalMembers,
          monthlyIncome: income,
          totalStaff: staff,
          inactiveMembers: inactive,
          totalSales: salesStats.totalSales,
          monthlySalesRevenue: salesStats.revenueThisMonth,
          isLoading: false
        });
      } catch (error) {
        logger.error('Error loading dashboard stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    loadStats();
  }, []);
  // Función para sincronizar el estado de todos los miembros
  const handleSyncMembers = async () => {
    setIsSyncingMembers(true);
    try {
      const result = await MemberStatusSyncUtility.fullSync();
      if (result.success) {
        alert(`Sincronización exitosa!\n${result.syncResult.message}\n${result.deactivationResult.message}`);
        // Recargar las estadísticas después de la sincronización
        const salesService = new SalesService();
        const [activeMembers, totalMembers, income, staff, inactive, salesStats] = await Promise.all([
          DashboardStatsService.getActiveMembers(),
          DashboardStatsService.getTotalMembersCount(),
          DashboardStatsService.getMonthlyIncome(),
          DashboardStatsService.getTotalStaff(),
          DashboardStatsService.getInactiveMembers(),
          salesService.getSalesStats()
        ]);
        setStats({
          activeMembers: activeMembers,
          totalMembers: totalMembers,
          monthlyIncome: income,
          totalStaff: staff,
          inactiveMembers: inactive,
          totalSales: salesStats.totalSales,
          monthlySalesRevenue: salesStats.revenueThisMonth,
          isLoading: false
        });
      } else {
        alert(`Error en la sincronización:\n${result.syncResult.error || result.deactivationResult.error}`);
      }
    } catch (error) {
      logger.error('Error durante la sincronización:', error);
      alert('Error inesperado durante la sincronización');
    } finally {
      setIsSyncingMembers(false);
    }
  };
  // Función para ejecutar diagnóstico de miembros
  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      logger.log('🔍 Ejecutando diagnóstico de estado de miembros...');
      const diagnostic = await MemberStatusDiagnostic.checkConsistency();
      // Mostrar resultados en un alert
      const message = `
📊 DIAGNÓSTICO DE MIEMBROS:
Total de miembros: ${diagnostic.totalMembers}
Miembros activos: ${diagnostic.activeMembers}
Miembros inactivos: ${diagnostic.inactiveMembers}
Sin estado definido: ${diagnostic.undefinedStatusMembers}
Distribución por estado:
${Object.entries(diagnostic.statusDistribution)
  .map(([status, count]) => `• ${status}: ${count}`)
  .join('\n')}
Ver consola para más detalles.
      `;
      alert(message);
    } catch (error) {
      logger.error('Error en el diagnóstico:', error);
      alert('Error al ejecutar el diagnóstico. Ver consola para detalles.');
    } finally {
      setIsRunningDiagnostic(false);
    }
  };
  // Verificar que el usuario tenga rol de admin
  if (!user || !profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Bienvenido, {safeFullName(profile.firstName, profile.lastName)}
            </p>
          </div>
        </div>
        {/* Estadísticas Principales */}
        <div className="space-y-8 lg:space-y-12 mb-8 lg:mb-12">
          {/* Estadísticas de Membresía */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Estadísticas de Membresía</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Miembros */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-blue-700">Total Miembros</p>
                    <p className="text-2xl lg:text-3xl font-bold text-blue-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-blue-200 rounded h-8 w-16 inline-block"></span>
                      ) : (
                        stats.totalMembers.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Miembros Activos */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6 border border-emerald-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-emerald-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-emerald-700">Miembros Activos</p>
                    <p className="text-2xl lg:text-3xl font-bold text-emerald-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-emerald-200 rounded h-8 w-16 inline-block"></span>
                      ) : (
                        stats.activeMembers.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Miembros Inactivos */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-red-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-red-700">Miembros Inactivos</p>
                    <p className="text-2xl lg:text-3xl font-bold text-red-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-red-200 rounded h-8 w-16 inline-block"></span>
                      ) : (
                        stats.inactiveMembers.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Estadísticas Financieras y Operativas */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Estadísticas Financieras y Operativas</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Ingresos Mensuales */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-green-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-green-700">Ingresos Mensuales</p>
                    <p className="text-2xl lg:text-3xl font-bold text-green-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-green-200 rounded h-8 w-20 inline-block"></span>
                      ) : (
                        `$${stats.monthlyIncome.toLocaleString()}`
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Ingreso de Ventas */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-orange-700">Ingreso de Ventas</p>
                    <p className="text-2xl lg:text-3xl font-bold text-orange-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-orange-200 rounded h-8 w-20 inline-block"></span>
                      ) : (
                        `$${stats.monthlySalesRevenue.toLocaleString()}`
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Personal */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-purple-700">Personal</p>
                    <p className="text-2xl lg:text-3xl font-bold text-purple-900">
                      {stats.isLoading ? (
                        <span className="animate-pulse bg-purple-200 rounded h-8 w-16 inline-block"></span>
                      ) : (
                        stats.totalStaff.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Secciones Principales */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8 lg:mb-12">
          {/* Gestión de Usuarios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Gestión de Usuarios</h3>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="space-y-3 sm:space-y-4">
                <button 
                  onClick={() => setShowMemberManagement(true)}
                  className="w-full text-left p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 hover:border-blue-200 border border-gray-200 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-900">Gestión de Miembros</h4>
                        <p className="text-sm text-gray-600 group-hover:text-blue-700">Ver, editar y eliminar miembros</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <button 
                  onClick={() => setShowStaffManagement(true)}
                  className="w-full text-left p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-purple-50 hover:to-purple-100 hover:border-purple-200 border border-gray-200 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200 transition-colors">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-900">Personal</h4>
                        <p className="text-sm text-gray-600 group-hover:text-purple-700">Entrenadores y vendedores</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <button 
                  onClick={() => setShowPasswordChange(true)}
                  className="w-full text-left p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-green-100 hover:border-green-200 border border-gray-200 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200 transition-colors">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-900">Cambio de Contraseña</h4>
                        <p className="text-sm text-gray-600 group-hover:text-green-700">Actualizar contraseña del administrador</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Reportes y Análisis */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reportes y Análisis</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Reportes Financieros */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Reportes Financieros
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowFinancialReport(true)}
                    className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 border border-blue-200"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h5 className="font-semibold text-gray-900">Reporte Financiero</h5>
                        <p className="text-sm text-gray-600">Análisis de ingresos y gastos detallado</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              {/* Análisis de Datos */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Análisis de Datos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowDatabaseUsage(true)}
                    className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h5 className="font-semibold text-gray-900">Análisis de Uso</h5>
                        <p className="text-sm text-gray-600">Estadísticas de actividad del sistema</p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setShowMemberReport(true)}
                    className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h5 className="font-semibold text-gray-900">Reporte de Miembros</h5>
                        <p className="text-sm text-gray-600">Análisis de membresías y retención</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Acciones Rápidas */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Acciones Rápidas</h3>
          {/* Gestión de Usuarios */}
          <div className="mb-8">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Gestión de Usuarios
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                onClick={() => setShowNewMemberModal(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Nuevo Miembro</span>
                </div>
              </button>
              <button 
                onClick={() => setShowDetailedMemberManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Gestión de Miembros</span>
                </div>
              </button>
              <button 
                onClick={() => setShowTrainerManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Gestión de Entrenadores</span>
                </div>
              </button>
              <button 
                onClick={() => setShowVendorManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Gestión de Vendedores</span>
                </div>
              </button>
            </div>
          </div>
          {/* Planes y Membresías */}
          <div className="mb-8">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Planes y Membresías
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <button 
                onClick={() => setShowPlanManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Crear Plan</span>
                </div>
              </button>
              <button 
                onClick={() => setShowPlanAssignment(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Asignar Plan</span>
                </div>
              </button>
            </div>
          </div>
          {/* Productos y Ventas */}
          <div className="mb-8">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Productos y Ventas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => setShowProductManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Agregar Producto</span>
                </div>
              </button>
              <button 
                onClick={() => setShowProductList(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Gestión de Productos</span>
                </div>
              </button>
              <button 
                onClick={() => setShowSalesForm(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Realizar Ventas</span>
                </div>
              </button>
              <button 
                onClick={() => setShowStaffPayment(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Realizar Pagos</span>
                </div>
              </button>
            </div>
          </div>
          {/* Recompensas y Canjes */}
          <div className="mb-8">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recompensas y Canjes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <button 
                onClick={() => setShowRewardsManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Gestión de Canje</span>
                </div>
              </button>
              <button 
                onClick={() => setShowRewardRequestsManagement(true)}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Solicitudes de Canje</span>
                </div>
              </button>
            </div>
          </div>
          {/* Herramientas del Sistema */}
          <div className="mb-8">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Herramientas del Sistema
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <button 
                onClick={handleSyncMembers}
                disabled={isSyncingMembers}
                className={`p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                  isSyncingMembers ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    {isSyncingMembers ? (
                      <svg className="w-5 h-5 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {isSyncingMembers ? 'Sincronizando...' : 'Sincronizar Estados'}
                  </span>
                </div>
              </button>
              <button
                onClick={handleRunDiagnostic}
                disabled={isRunningDiagnostic}
                className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow ${
                  isRunningDiagnostic ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    {isRunningDiagnostic ? (
                      <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {isRunningDiagnostic ? 'Diagnosticando...' : 'Diagnóstico DB'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal de Gestión de Entrenadores */}
       {showTrainerManagement && (
         <TrainerManagement 
           isOpen={showTrainerManagement}
           onClose={() => setShowTrainerManagement(false)} 
         />
       )}
      {/* Modal de Gestión de Planes */}
       {showPlanManagement && (
         <PlanManagement 
           isOpen={showPlanManagement}
           onClose={() => setShowPlanManagement(false)} 
         />
       )}
      {/* Modal de Asignación de Planes */}
       {showPlanAssignment && (
         <PlanAssignment 
           isOpen={showPlanAssignment}
           onClose={() => setShowPlanAssignment(false)} 
           onAssignmentComplete={() => {
             // Aquí podrías agregar lógica para refrescar datos si es necesario
             logger.log('Plan asignado exitosamente');
           }}
         />
       )}
      {/* Modal de Nuevo Miembro */}
       {showNewMemberModal && (
         <Modal
           isOpen={showNewMemberModal}
           onClose={() => setShowNewMemberModal(false)}
           title="Registrar Nuevo Miembro"
           size="lg"
         >
           <UserForm
             onSuccess={() => {
               setShowNewMemberModal(false);
               // Refrescar estadísticas después de crear un nuevo miembro
               const loadStats = async () => {
                 try {
                   const salesService = new SalesService();
                   const [activeMembers, totalMembers, income, staff, inactive, salesStats] = await Promise.all([
                     DashboardStatsService.getActiveMembers(),
                     DashboardStatsService.getTotalMembersCount(),
                     DashboardStatsService.getMonthlyIncome(),
                     DashboardStatsService.getTotalStaff(),
                     DashboardStatsService.getInactiveMembers(),
                     salesService.getSalesStats()
                   ]);
                   setStats({
                     activeMembers: activeMembers,
                     totalMembers: totalMembers,
                     monthlyIncome: income,
                     totalStaff: staff,
                     inactiveMembers: inactive,
                     totalSales: salesStats.totalSales,
                     monthlySalesRevenue: salesStats.revenueThisMonth,
                     isLoading: false
                   });
                 } catch (error) {
                   logger.error('Error loading dashboard stats:', error);
                 }
               };
               loadStats();
               alert('¡Miembro registrado exitosamente!');
             }}
           />
          </Modal>
        )}
      {/* Modal de Gestión de Miembros */}
       {showMemberManagement && (
         <MemberManagement 
           isOpen={showMemberManagement}
           onClose={() => setShowMemberManagement(false)} 
         />
       )}
      {/* Modal de Gestión Detallada de Miembros */}
       {showDetailedMemberManagement && (
         <MemberManagementDetailed 
           isOpen={showDetailedMemberManagement}
           onClose={() => setShowDetailedMemberManagement(false)} 
         />
       )}
      {/* Modal de Gestión de Productos */}
       {showProductManagement && (
         <ProductManagement 
           isOpen={showProductManagement}
           onClose={() => setShowProductManagement(false)}
           onSuccess={() => {
             // Opcional: recargar estadísticas si es necesario
             logger.log('Producto agregado exitosamente');
           }}
         />
       )}
      {/* Modal de Lista de Productos */}
       {showProductList && (
         <ProductList 
           isOpen={showProductList}
           onClose={() => setShowProductList(false)}
         />
       )}
      {/* Modal de Gestión de Canje */}
       {showRewardsManagement && (
         <RewardsManagement 
           onClose={() => setShowRewardsManagement(false)}
         />
       )}
      {/* Modal de Gestión de Solicitudes de Intercambio */}
       {showRewardRequestsManagement && (
         <Modal
           isOpen={showRewardRequestsManagement}
           onClose={() => setShowRewardRequestsManagement(false)}
           title="Gestión de Solicitudes de Intercambio"
           size="full"
         >
           <RewardRequestsManagement />
         </Modal>
       )}
      {/* Modal de Gestión de Vendedores */}
       {showVendorManagement && (
         <VendorManagement 
           isOpen={showVendorManagement}
           onClose={() => setShowVendorManagement(false)} 
         />
       )}
      {/* Modal de Gestión de Personal */}
       {showStaffManagement && (
         <StaffManagement 
           isOpen={showStaffManagement}
           onClose={() => setShowStaffManagement(false)} 
         />
       )}
      {/* Modal de Cambio de Contraseña */}
       {showPasswordChange && (
         <PasswordChange 
           isOpen={showPasswordChange}
           onClose={() => setShowPasswordChange(false)} 
         />
       )}
      {/* Reporte Financiero */}
       {showFinancialReport && (
         <div className="fixed inset-0 bg-white z-50 overflow-auto">
           <FinancialReportComponent 
             onBack={() => setShowFinancialReport(false)}
           />
         </div>
       )}
      {/* Análisis de Uso de Base de Datos */}
       {showDatabaseUsage && (
         <div className="fixed inset-0 bg-white z-50 overflow-auto">
           <DatabaseUsageAnalysis 
             onBack={() => setShowDatabaseUsage(false)}
           />
         </div>
       )}
      {/* Reporte de Miembros */}
       {showMemberReport && (
         <div className="fixed inset-0 bg-white z-50 overflow-auto">
           <MemberReport 
             onBack={() => setShowMemberReport(false)}
           />
         </div>
       )}
      {/* Modal de Ventas */}
       {showSalesForm && user && (
         <SalesForm
           onSaleComplete={() => {
             setShowSalesForm(false);
             // Recargar estadísticas después de una venta
             const loadStats = async () => {
               try {
                 const salesService = new SalesService();
                 const [activeMembers, totalMembers, income, staff, inactive, salesStats] = await Promise.all([
                   DashboardStatsService.getActiveMembers(),
                   DashboardStatsService.getTotalMembersCount(),
                   DashboardStatsService.getMonthlyIncome(),
                   DashboardStatsService.getTotalStaff(),
                   DashboardStatsService.getInactiveMembers(),
                   salesService.getSalesStats()
                 ]);
                 setStats({
                   activeMembers: activeMembers,
                   totalMembers: totalMembers,
                   monthlyIncome: income,
                   totalStaff: staff,
                   inactiveMembers: inactive,
                   totalSales: salesStats.totalSales,
                   monthlySalesRevenue: salesStats.revenueThisMonth,
                   isLoading: false
                 });
               } catch (error) {
                 logger.error('Error loading dashboard stats:', error);
               }
             };
             loadStats();
           }}
           onCancel={() => setShowSalesForm(false)}
           sellerId={user.uid}
         />
       )}
       <StaffPayment 
         isOpen={showStaffPayment}
         onClose={() => setShowStaffPayment(false)} 
       />
    </div>
  );
};
export default AdminDashboard;