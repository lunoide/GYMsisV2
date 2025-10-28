import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { TrainerService, MemberService } from '../../services/users';
import { ClassService } from '../../services/classes/classService';
import type { Trainer, TrainerStats } from '../../types/trainer.types';
import type { UserProfile } from '../../types/auth.types';
import type { GymClass, ClassAssignment } from '../../types/class.types';
import { logger } from '../../utils/logger';
const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [trainerData, setTrainerData] = useState<Trainer | null>(null);
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<UserProfile[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<GymClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'classes' | 'schedule' | 'attendance'>('overview');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classMembers, setClassMembers] = useState<UserProfile[]>([]);
  const [attendanceCount, setAttendanceCount] = useState({ present: 0, absent: 0, pointsAssigned: 0 });
  const [showClassInfoModal, setShowClassInfoModal] = useState(false);
  const [selectedClassInfo, setSelectedClassInfo] = useState<GymClass | null>(null);
  // Cargar datos del entrenador
  useEffect(() => {
    const loadTrainerData = async () => {
      if (!user?.uid) return;
      try {
        setLoading(true);
        // Cargar datos del entrenador
        const trainer = await TrainerService.getTrainerById(user.uid);
        setTrainerData(trainer);
        // Cargar estadísticas
        const trainerStats = await TrainerService.getTrainerStats(user.uid);
        setStats(trainerStats);
        // Cargar miembros asignados
        const members = await MemberService.getMembersByTrainer(user.uid);
        setAssignedMembers(members);
        // Cargar clases asignadas
        const classes = await ClassService.getClassesByTrainer(user.uid);
        logger.log('📚 Clases del entrenador:', classes.length, classes);
        // Calcular el enrollment real para cada clase basándose en asignaciones activas
        const classesWithRealEnrollment = await Promise.all(
          classes.map(async (gymClass) => {
            try {
              const classMembers = await ClassService.getClassMembers(gymClass.id);
              return {
                ...gymClass,
                currentEnrollment: classMembers.length
              };
            } catch (error) {
              logger.error(`Error calculando enrollment para clase ${gymClass.id}:`, error);
              return gymClass; // Mantener el valor original si hay error
            }
          })
        );
        setAssignedClasses(classesWithRealEnrollment);
        // Cargar próximas clases
        const upcoming = await ClassService.getUpcomingClassesByTrainer(user.uid);
        // También calcular el enrollment real para las próximas clases
        const upcomingWithRealEnrollment = await Promise.all(
          upcoming.map(async (gymClass) => {
            try {
              const classMembers = await ClassService.getClassMembers(gymClass.id);
              return {
                ...gymClass,
                currentEnrollment: classMembers.length
              };
            } catch (error) {
              logger.error(`Error calculando enrollment para próxima clase ${gymClass.id}:`, error);
              return gymClass; // Mantener el valor original si hay error
            }
          })
        );
        setUpcomingClasses(upcomingWithRealEnrollment);
      } catch (error) {
        logger.error('Error loading trainer data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTrainerData();
  }, [user?.uid]);
  const getDayName = (dayOfWeek: number): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
  };
  const formatTime = (time: string | undefined): string => {
    if (!time) return '--:--';
    return time.slice(0, 5); // HH:MM
  };
  // Función para abrir el modal de información de clase
  const openClassInfoModal = (gymClass: GymClass) => {
    setSelectedClassInfo(gymClass);
    setShowClassInfoModal(true);
  };
  // Función para cerrar el modal de información de clase
  const closeClassInfoModal = () => {
    setShowClassInfoModal(false);
    setSelectedClassInfo(null);
  };
  // Cargar miembros de la clase seleccionada
  const loadClassMembers = async (classId: string) => {
    if (!classId) {
      setClassMembers([]);
      return;
    }
    try {
      logger.log('🔍 Cargando miembros para la clase:', classId);
      // Obtener miembros inscritos específicamente en esta clase
      const classMembers = await ClassService.getClassMembers(classId);
      logger.log('👥 Miembros encontrados:', classMembers.length, classMembers);
      setClassMembers(classMembers);
    } catch (error) {
      logger.error('Error loading class members:', error);
      setClassMembers([]);
    }
  };
  // Manejar selección de clase
  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
    loadClassMembers(classId);
    setAttendanceCount({ present: 0, absent: 0, pointsAssigned: 0 });
  };
  // Registrar asistencia
  const handleMarkAttendance = async (memberId: string) => {
    if (!selectedClassId) {
      alert('Por favor selecciona una clase primero');
      return;
    }
    try {
      const pointsInput = document.querySelector(`input[data-member-id="${memberId}"]`) as HTMLInputElement;
      const points = parseInt(pointsInput?.value || '10');
      // Verificar si el miembro ya está asignado a la clase
      let isAssigned = false;
      try {
        const assignment = await getMemberClassAssignment(selectedClassId, memberId);
        isAssigned = !!assignment;
      } catch (error) {
        logger.log('Error checking assignment:', error);
      }
      // Si no está asignado, asignarlo
      if (!isAssigned) {
        try {
          await assignMemberToClass(selectedClassId, memberId);
        } catch (error) {
          logger.error('Error assigning member:', error);
          alert('Error al asignar miembro a la clase: ' + (error as Error).message);
          return;
        }
      }
      // Verificar si ya registró asistencia
      let hasAttendance = false;
      try {
        const attendance = await getMemberAttendance(selectedClassId, memberId);
        hasAttendance = !!attendance;
      } catch (error) {
        logger.log('Error checking attendance:', error);
      }
      if (hasAttendance) {
        alert('Este miembro ya tiene asistencia registrada para esta clase.');
        return;
      }
      // Registrar asistencia
      await recordAttendance(selectedClassId, memberId);
      // Actualizar puntos del miembro usando el sistema nuevo
      const { UserPointsService } = await import('../../services/user/userPointsService');
      await UserPointsService.addPoints(
        memberId, 
        points,
        `Puntos por asistencia a clase`,
        selectedClassId,
        { classId: selectedClassId, attendanceDate: new Date().toISOString() }
      );
      setAttendanceCount(prev => ({
        present: prev.present + 1,
        absent: prev.absent,
        pointsAssigned: prev.pointsAssigned + points
      }));
      alert(`Asistencia registrada. ${points} puntos asignados.`);
    } catch (error) {
      logger.error('Error recording attendance:', error);
      alert('Error al registrar asistencia: ' + (error as Error).message);
    }
  };
  // Registrar ausencia
  const handleMarkAbsent = async (memberId: string) => {
    if (!selectedClassId) {
      alert('Por favor selecciona una clase primero');
      return;
    }
    try {
      setAttendanceCount(prev => ({
        present: prev.present,
        absent: prev.absent + 1,
        pointsAssigned: prev.pointsAssigned
      }));
      alert('Ausencia registrada.');
    } catch (error) {
      logger.error('Error recording absence:', error);
      alert('Error al registrar ausencia');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Dashboard del Entrenador
                  </h1>
                  <p className="mt-2 text-blue-100">
                    Bienvenido, {trainerData?.firstName} {trainerData?.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-blue-200">Estado</p>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    trainerData?.status === 'active' 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-red-500 text-white shadow-lg'
                  }`}>
                    {trainerData?.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-t-2xl shadow-lg border-t-4 border-blue-500">
          <nav className="flex space-x-1 p-2">
            {[
              { 
                id: 'overview', 
                name: 'Resumen', 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )
              },
              { 
                id: 'classes', 
                name: 'Mis Clases', 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )
              },
              { 
                id: 'attendance', 
                name: 'Asistencia', 
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Clases Activas
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.totalClasses || assignedClasses.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Calificación Promedio
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ingresos del Mes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          ${stats?.monthlyEarnings || '0'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Próximas Clases */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Próximas Clases
                </h3>
                {upcomingClasses.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingClasses.slice(0, 5).map((gymClass, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{gymClass.name}</p>
                          {gymClass.schedule && gymClass.schedule.length > 0 && (
                            <div className="space-y-1">
                              {gymClass.schedule.map((schedule, scheduleIndex) => (
                                <p key={scheduleIndex} className="text-sm text-gray-600">
                                  {getDayName(schedule.dayOfWeek)} - {formatTime(schedule.startTime)} a {formatTime(schedule.endTime)}
                                  {schedule.room && <span className="text-gray-500"> - {schedule.room}</span>}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {gymClass.currentEnrollment}/{gymClass.maxCapacity}
                          </p>
                          <p className="text-xs text-gray-500">inscritos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay clases programadas</p>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'classes' && (
          <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div className="px-6 py-8 sm:p-8">
              <div className="mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Mis Clases
                    </h3>
                    <p className="text-sm text-gray-600">{assignedClasses.length} clases activas</p>
                  </div>
                </div>
              </div>
              {assignedClasses.length > 0 ? (
                <div className="space-y-6">
                  {assignedClasses.map((gymClass) => (
                    <div key={gymClass.id} className="bg-gradient-to-br from-gray-50 to-green-50 border border-green-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">{gymClass.name}</h4>
                              <p className="text-sm text-gray-600">{gymClass.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              {gymClass.category}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {gymClass.difficulty === 'beginner' ? 'Principiante' : 
                               gymClass.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              {gymClass.duration} min
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end lg:ml-4">
                          <button 
                            onClick={() => openClassInfoModal(gymClass)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
                          >
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Información de la Clase
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No tienes clases asignadas aún</h4>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Contacta al administrador para que te asigne clases o solicita crear nuevas clases para comenzar a entrenar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'attendance' && (
          <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
            <div className="px-6 py-8 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Registro de Asistencia
                    </h3>
                    <p className="text-sm text-gray-600">
                      Registra la asistencia y asigna puntos automáticamente
                    </p>
                  </div>
                </div>
              </div>
              {/* Selector de Clase */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Seleccionar Clase
                </label>
                <select 
                   className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gradient-to-r from-gray-50 to-orange-50"
                   value={selectedClassId}
                   onChange={(e) => handleClassSelection(e.target.value)}
                 >
                   <option value="">Selecciona una clase...</option>
                   {upcomingClasses.map((gymClass) => (
                     <option key={gymClass.id} value={gymClass.id}>
                       {gymClass.name} - {new Date(gymClass.createdAt).toLocaleDateString()}
                     </option>
                   ))}
                 </select>
              </div>
              {/* Lista de Miembros para Asistencia */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Miembros Inscritos</h4>
                </div>
                {classMembers.length > 0 ? (
                   <div className="grid gap-4">
                     {classMembers.map((member) => (
                      <div key={member.uid} className="bg-gradient-to-br from-gray-50 to-orange-50 border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                           <div className="flex items-center space-x-4">
                             <div className="flex-shrink-0">
                               <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                                 <span className="text-white font-bold text-lg">
                                   {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                                 </span>
                               </div>
                             </div>
                             <div>
                               <p className="text-lg font-bold text-gray-900">
                                 {member.firstName} {member.lastName}
                               </p>
                               <div className="flex items-center space-x-2">
                                 <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                   <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                 </svg>
                                 <span className="text-sm text-gray-600 font-medium">
                                   Puntos actuales: {member.points || 0}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                             <div className="flex items-center space-x-2 bg-white rounded-xl px-3 py-2 border border-gray-200">
                               <label className="text-sm font-medium text-gray-700">Puntos:</label>
                               <input
                                 type="number"
                                 min="0"
                                 max="100"
                                 defaultValue="10"
                                 data-member-id={member.uid}
                                 className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                               />
                             </div>
                             <button
                               className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-green-700 text-sm font-medium transition-all duration-200 shadow-md"
                               onClick={() => handleMarkAttendance(member.uid)}
                             >
                               <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                               </svg>
                               Presente
                             </button>
                             <button
                               className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-xl hover:from-gray-500 hover:to-gray-600 text-sm font-medium transition-all duration-200 shadow-md"
                               onClick={() => handleMarkAbsent(member.uid)}
                             >
                               <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                               Ausente
                             </button>
                           </div>
                         </div>
                       </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No hay miembros asignados</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Los miembros aparecerán aquí cuando se inscriban a tus clases. Selecciona una clase para ver los miembros inscritos.
                    </p>
                  </div>
                )}
              </div>
              {/* Resumen de Asistencia */}
               <div className="mt-8 bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-200 rounded-2xl p-6">
                 <div className="flex items-center space-x-3 mb-4">
                   <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                     <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                     </svg>
                   </div>
                   <h4 className="text-lg font-bold text-gray-900">Resumen de la Sesión</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                     <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                     </div>
                     <p className="text-2xl font-bold text-green-600">{attendanceCount.present}</p>
                     <p className="text-sm text-gray-600 font-medium">Presentes</p>
                   </div>
                   <div className="bg-white rounded-xl p-4 text-center border border-red-200">
                     <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                       <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </div>
                     <p className="text-2xl font-bold text-red-600">{attendanceCount.absent}</p>
                     <p className="text-sm text-gray-600 font-medium">Ausentes</p>
                   </div>
                   <div className="bg-white rounded-xl p-4 text-center border border-purple-200">
                     <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                       <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                       </svg>
                     </div>
                     <p className="text-2xl font-bold text-purple-600">{attendanceCount.pointsAssigned}</p>
                     <p className="text-sm text-gray-600 font-medium">Puntos Asignados</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal de Información de Clase */}
      {showClassInfoModal && selectedClassInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{selectedClassInfo.name}</h3>
                  <p className="text-blue-100">{selectedClassInfo.description}</p>
                </div>
                <button
                  onClick={closeClassInfoModal}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información General
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categoría:</span>
                      <span className="font-medium">{selectedClassInfo.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dificultad:</span>
                      <span className="font-medium">
                        {selectedClassInfo.difficulty === 'beginner' ? 'Principiante' : 
                         selectedClassInfo.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duración:</span>
                      <span className="font-medium">{selectedClassInfo.duration} minutos</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`font-medium ${selectedClassInfo.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedClassInfo.status === 'active' ? 'Activa' : 
                         selectedClassInfo.status === 'inactive' ? 'Inactiva' : 'Cancelada'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Capacidad
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inscritos:</span>
                      <span className="font-medium">{selectedClassInfo.currentEnrollment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacidad máxima:</span>
                      <span className="font-medium">{selectedClassInfo.maxCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Disponibles:</span>
                      <span className="font-medium">{selectedClassInfo.maxCapacity - selectedClassInfo.currentEnrollment}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Horarios */}
              {selectedClassInfo.schedule && selectedClassInfo.schedule.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Horarios
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedClassInfo.schedule.map((schedule, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{getDayName(schedule.dayOfWeek)}</span>
                          <span className="text-sm text-gray-600">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                        </div>
                        {schedule.room && (
                          <div className="text-sm text-gray-500 mt-1">
                            Sala: {schedule.room}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Equipamiento */}
              {selectedClassInfo.equipment && selectedClassInfo.equipment.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Equipamiento Necesario
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedClassInfo.equipment.map((item, index) => (
                      <span key={index} className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Información de Puntos y Costo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Sistema de Puntos
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Por asignación:</span>
                      <span className="font-medium">{selectedClassInfo.assignmentPoints} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Por asistencia:</span>
                      <span className="font-medium">{selectedClassInfo.attendancePoints} pts</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Costo
                  </h4>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedClassInfo.cost?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>
            {/* Footer del Modal */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  onClick={closeClassInfoModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TrainerDashboard;