import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { MemberService } from '../../services/users/memberService';
import { UserPointsService } from '../../services/user/userPointsService';
import { PlanService } from '../../services/plans/planService';
import { ClassService } from '../../services/classes/classService';
import MemberProgress from './MemberProgress';
import ChangePasswordModal from './ChangePasswordModal';
import { useSafeDisplay } from '../../hooks/useSafeDisplay';
import { Activity, CheckCircle, XCircle, Calendar, Star, Award, Bell, BookOpen, Settings, TrendingUp } from 'lucide-react';
import type { UserProfile } from '../../types/auth.types';
import type { PlanAssignment } from '../../types/plan.types';
import type { ClassAssignment } from '../../types/class.types';
import { logger } from '../../utils/logger';
interface MemberStats {
  workoutsThisMonth: number;
  totalWorkouts: number;
  membershipDaysLeft: number;
  favoriteClass: string;
}
interface MemberDashboardData {
  member: UserProfile | null;
  isActive: boolean;
  planDaysLeft: number | null;
  favoriteClass: string | null;
  points: number;
  planAssignments: PlanAssignment[];
  classAssignments: ClassAssignment[];
}
const MemberDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { safeText, safeNotification } = useSafeDisplay();
  const [dashboardData, setDashboardData] = useState<MemberDashboardData>({
    member: null,
    isActive: false,
    planDaysLeft: null,
    favoriteClass: null,
    points: 0,
    planAssignments: [],
    classAssignments: []
  });
  const [loading, setLoading] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  // Cargar datos del miembro
  const loadMemberData = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      // Obtener datos del miembro
      const memberData = await MemberService.getMemberById(user.uid);
      // Obtener asignaciones de planes
      const planAssignments = await PlanService.getMemberPlanAssignments(user.uid);
      // Obtener asignaciones de clases
      const classAssignments = await ClassService.getMemberAssignments(user.uid);
      // Calcular días restantes del plan activo
      let planDaysLeft = null;
      const activePlan = planAssignments.find(plan => 
        plan.status === 'active' && new Date(plan.expiresAt) > new Date()
      );
      if (activePlan) {
        const today = new Date();
        const expirationDate = new Date(activePlan.expiresAt);
        planDaysLeft = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      // Determinar clase favorita (la que más asistencias tiene)
      let favoriteClass = null;
      if (classAssignments.length > 0) {
        const classWithMostAttendance = classAssignments.reduce((prev, current) => 
          (current.attendanceCount || 0) > (prev.attendanceCount || 0) ? current : prev
        );
        favoriteClass = classWithMostAttendance.className || null;
      }
      // Obtener puntos del sistema sincronizado
      let totalPoints = 0;
      try {
        // Primero sincronizar puntos legacy con el nuevo sistema
        const syncedPoints = await UserPointsService.syncLegacyPoints(user.uid);
        totalPoints = syncedPoints.availablePoints;
      } catch (error) {
        logger.error('Error syncing points:', error);
        // Fallback al cálculo legacy si falla la sincronización
        const profilePoints = memberData?.points || 0;
        const assignmentPoints = classAssignments.reduce((total, assignment) => 
          total + (assignment.totalPointsEarned || 0), 0
        ) + planAssignments.reduce((total, assignment) => 
          total + (assignment.pointsEarned || 0), 0
        );
        totalPoints = profilePoints + assignmentPoints;
      }
      // Determinar si está activo (tiene planes o clases activas)
      const isActive = planAssignments.some(plan => 
        plan.status === 'active' && new Date(plan.expiresAt) > new Date()
      ) || classAssignments.some(classAssignment => 
        classAssignment.status === 'active' && new Date(classAssignment.expiresAt) > new Date()
      );
      setDashboardData({
        member: memberData,
        isActive,
        planDaysLeft,
        favoriteClass,
        points: totalPoints,
        planAssignments,
        classAssignments
      });
    } catch (error) {
      logger.error('Error cargando datos del miembro:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadMemberData();
  }, [user?.uid]);
  // Función para calcular días restantes hasta una fecha
  const calculateDaysRemaining = (expirationDate: string | Date): number => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const timeDiff = expDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };
  // Función para generar notificaciones dinámicas basadas en vencimientos
  const generateExpirationNotifications = () => {
    const notifications: Array<{id: number, type: 'info' | 'warning' | 'success', message: string, time: string}> = [];
    let notificationId = 1;
    let hasExpirationWarnings = false;
    // Verificar vencimientos de planes
    dashboardData.planAssignments.forEach((plan) => {
      if (plan.expiresAt && plan.status === 'active') {
        const daysRemaining = calculateDaysRemaining(plan.expiresAt);
        if (daysRemaining <= 0) {
          notifications.push({
            id: notificationId++,
            type: 'warning',
            message: `⚠️ Tu plan "${plan.planName}" ha expirado. ¡Renueva ahora para continuar disfrutando de nuestros servicios!`,
            time: 'Ahora'
          });
          hasExpirationWarnings = true;
        } else if (daysRemaining <= 3) {
          notifications.push({
            id: notificationId++,
            type: 'warning',
            message: `⏰ Tu plan "${plan.planName}" vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}. ¡Renueva pronto para evitar interrupciones!`,
            time: 'Ahora'
          });
          hasExpirationWarnings = true;
        } else if (daysRemaining <= 7) {
          notifications.push({
            id: notificationId++,
            type: 'info',
            message: `📅 Tu plan "${plan.planName}" vence en ${daysRemaining} días. Considera renovar pronto.`,
            time: 'Ahora'
          });
        }
      } else if (plan.status === 'expired') {
        notifications.push({
          id: notificationId++,
          type: 'warning',
          message: `❌ Tu plan "${plan.planName}" está expirado. Contacta al gimnasio para renovar.`,
          time: 'Ahora'
        });
        hasExpirationWarnings = true;
      }
    });
    // Verificar vencimientos de clases
    dashboardData.classAssignments.forEach((classAssignment) => {
      if (classAssignment.expiresAt && classAssignment.status === 'active') {
        const daysRemaining = calculateDaysRemaining(classAssignment.expiresAt);
        if (daysRemaining <= 0) {
          notifications.push({
            id: notificationId++,
            type: 'warning',
            message: `⚠️ Tu acceso a la clase "${classAssignment.className}" ha expirado.`,
            time: 'Ahora'
          });
          hasExpirationWarnings = true;
        } else if (daysRemaining <= 3) {
          notifications.push({
            id: notificationId++,
            type: 'warning',
            message: `⏰ Tu acceso a "${classAssignment.className}" vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}.`,
            time: 'Ahora'
          });
          hasExpirationWarnings = true;
        } else if (daysRemaining <= 7) {
          notifications.push({
            id: notificationId++,
            type: 'info',
            message: `📅 Tu acceso a "${classAssignment.className}" vence en ${daysRemaining} días.`,
            time: 'Ahora'
          });
        }
      } else if (classAssignment.status === 'expired') {
        notifications.push({
          id: notificationId++,
          type: 'warning',
          message: `❌ Tu acceso a la clase "${classAssignment.className}" ha expirado.`,
          time: 'Ahora'
        });
        hasExpirationWarnings = true;
      }
    });
    // Agregar notificación de puntos si es relevante y no hay advertencias críticas
    if (dashboardData.points > 0 && !hasExpirationWarnings) {
      notifications.push({
        id: notificationId++,
        type: 'success',
        message: `🎉 Tienes ${dashboardData.points} puntos disponibles. ¡Úsalos en nuestra tienda de recompensas!`,
        time: '1 hora'
      });
    }
    // Notificación de bienvenida si el usuario está activo y no hay problemas
    if (notifications.length === 0 && dashboardData.isActive) {
      notifications.push({
        id: notificationId++,
        type: 'success',
        message: '✅ ¡Todo está al día! No tienes vencimientos próximos. ¡Sigue así!',
        time: 'Ahora'
      });
    }
    // Si el usuario no está activo, mostrar notificación informativa
    if (!dashboardData.isActive) {
      notifications.unshift({
        id: 0,
        type: 'warning',
        message: '⚠️ Tu membresía está inactiva. Contacta al gimnasio para reactivar tu cuenta.',
        time: 'Ahora'
      });
    }
    return notifications;
  };
  // Generar notificaciones dinámicas
  const notifications = generateExpirationNotifications();
  // Datos de ejemplo - en una implementación real vendrían de una API
  const memberStats: MemberStats = {
    workoutsThisMonth: 12,
    totalWorkouts: 156,
    membershipDaysLeft: 23,
    favoriteClass: 'CrossFit'
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  // Mostrar componente de progreso si está activo
  if (showProgress) {
    return <MemberProgress onBack={() => setShowProgress(false)} />;
  }
  if (!user || user.role !== 'member') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-bold text-white">
                    ¡Hola, {safeText(profile?.firstName || user.email || 'Usuario')}!
                  </h1>
                  <div className="bg-green-400 rounded-full p-1">
                    <CheckCircle className="w-5 h-5 text-green-800" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                    <Star className="w-4 h-4 text-yellow-300" />
                  </div>
                  <p className="text-blue-100 text-sm">
                    Bienvenido a tu dashboard de miembro
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Estado Activo/Inactivo */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden shadow-lg rounded-xl border border-green-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {loading ? (
                    <div className="w-12 h-12 bg-gradient-to-r from-green-200 to-emerald-300 rounded-full animate-pulse"></div>
                  ) : dashboardData.isActive ? (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-3">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-full p-3">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-green-700 truncate">
                      Estado
                    </dt>
                    <dd className={`text-xl font-bold ${loading ? 'text-gray-400' : dashboardData.isActive ? 'text-green-700' : 'text-red-600'}`}>
                      {loading ? 'Cargando...' : dashboardData.isActive ? 'Activo' : 'Inactivo'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {/* Días restantes del plan */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden shadow-lg rounded-xl border border-blue-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {loading ? (
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full p-3">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-blue-700 truncate">
                      Plan
                    </dt>
                    <dd className={`text-xl font-bold ${loading ? 'text-gray-400' : 'text-blue-700'}`}>
                      {loading ? 'Cargando...' : dashboardData.planDaysLeft !== null 
                        ? `${dashboardData.planDaysLeft} días` 
                        : 'Sin plan'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {/* Clase favorita */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 overflow-hidden shadow-lg rounded-xl border border-yellow-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {loading ? (
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-200 to-amber-300 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-3">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-yellow-700 truncate">
                      Clase favorita
                    </dt>
                    <dd className={`text-xl font-bold ${loading ? 'text-gray-400' : 'text-yellow-700'}`}>
                      {loading ? 'Cargando...' : safeText(dashboardData.favoriteClass || 'Sin clases')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {/* Puntos acumulados */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 overflow-hidden shadow-lg rounded-xl border border-purple-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {loading ? (
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-200 to-violet-300 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-full p-3">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-purple-700 truncate">
                      Puntos
                    </dt>
                    <dd className={`text-xl font-bold ${loading ? 'text-gray-400' : 'text-purple-700'}`}>
                      {loading ? 'Cargando...' : dashboardData.points}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mis Planes Asignados */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-100 shadow-xl rounded-2xl border border-indigo-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="px-6 py-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full p-3 mr-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-indigo-900">
                    Mis Planes Asignados
                  </h3>
                  <p className="text-sm text-indigo-600">Planes activos y disponibles</p>
                </div>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-gradient-to-r from-indigo-200 to-purple-300 rounded-lg w-3/4 mb-3"></div>
                        <div className="h-4 bg-gradient-to-r from-indigo-100 to-purple-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : dashboardData.planAssignments.length > 0 ? (
                  dashboardData.planAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-indigo-200/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-indigo-900 mb-2">
                            {safeText(assignment.planName || 'Plan sin nombre')}
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm text-indigo-700">
                              Estado: <span className={`font-semibold ${
                                assignment.status === 'active' ? 'text-green-600' : 
                                assignment.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {assignment.status === 'active' ? 'Activo' : 
                                 assignment.status === 'expired' ? 'Expirado' : 'Pendiente'}
                              </span>
                            </p>
                            <p className="text-xs text-indigo-600">
                              Puntos ganados: {assignment.pointsEarned || 0}
                            </p>
                            {assignment.expiresAt && (
                              <p className="text-xs text-indigo-600">
                                Expira: {new Date(assignment.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 
                            assignment.status === 'expired' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {assignment.status === 'active' ? 'Activo' : 
                             assignment.status === 'expired' ? 'Expirado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                      <Calendar className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                      <p className="text-indigo-700 text-sm font-medium">No tienes planes asignados</p>
                      <p className="text-indigo-500 text-xs mt-1">Los planes aparecerán aquí cuando te asignen alguno</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Mis Clases Asignadas */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 shadow-xl rounded-2xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="px-6 py-8">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full p-3 mr-4">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900">
                    Mis Clases Asignadas
                  </h3>
                  <p className="text-sm text-blue-600">Clases activas y programadas</p>
                </div>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-gradient-to-r from-blue-200 to-cyan-300 rounded-lg w-3/4 mb-3"></div>
                        <div className="h-4 bg-gradient-to-r from-blue-100 to-cyan-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : dashboardData.classAssignments.length > 0 ? (
                  dashboardData.classAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-200/50 hover:bg-white/90 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-blue-900 mb-2">
                            {safeText(assignment.className || 'Clase sin nombre')}
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm text-blue-700">
                              Estado: <span className={`font-semibold ${
                                assignment.status === 'active' ? 'text-green-600' : 
                                assignment.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {assignment.status === 'active' ? 'Activa' : 
                                 assignment.status === 'expired' ? 'Expirada' : 'Pendiente'}
                              </span>
                            </p>
                            <p className="text-xs text-blue-600">
                              Asistencias: {assignment.attendanceCount || 0}
                            </p>
                            <p className="text-xs text-blue-600">
                              Puntos ganados: {assignment.totalPointsEarned || 0}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 
                            assignment.status === 'expired' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {assignment.status === 'active' ? 'Activa' : 
                             assignment.status === 'expired' ? 'Expirada' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                      <BookOpen className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                      <p className="text-blue-700 text-sm font-medium">No tienes clases asignadas</p>
                      <p className="text-blue-500 text-xs mt-1">Las clases aparecerán aquí cuando te asignen a alguna</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Notificaciones */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <Bell className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Notificaciones
                </h3>
              </div>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                    notification.type === 'info' ? 'bg-blue-50 border-blue-400' :
                    notification.type === 'success' ? 'bg-green-50 border-green-400' :
                    'bg-yellow-50 border-yellow-400'
                  }`}>
                    <div className="flex items-start">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">Hace {notification.time}</p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors text-sm">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-br from-white to-gray-50 shadow-xl rounded-2xl border border-gray-100">
          <div className="px-6 py-8 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Acciones Rápidas
                </h3>
                <p className="text-sm text-gray-600">Gestiona tu perfil y progreso</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => setShowProgress(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Mi Progreso</div>
                    <div className="text-xs text-purple-100">Ver estadísticas</div>
                  </div>
                </div>
              </button>
              <button 
                onClick={() => setShowChangePassword(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-slate-500 to-gray-600 text-white py-4 px-6 rounded-xl hover:from-slate-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Configuración</div>
                    <div className="text-xs text-slate-100">Cambiar contraseña</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal de Progreso */}
      {showProgress && (
        <MemberProgress 
          onBack={() => setShowProgress(false)} 
        />
      )}
      {/* Modal de Cambio de Contraseña */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
};
export default MemberDashboard;