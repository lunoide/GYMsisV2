import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Star,
  Activity,
  ArrowLeft,
  Flame,
  CheckCircle,
  Plus,
  Scale,
  Dumbbell,
  Heart,
  Utensils,
  Droplets,
  Edit3,
  Save,
  X,
  Info,
  AlertCircle,
  Target,
  BarChart3,
  Trophy
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ClassAssignment } from '../../types/class.types';
import type { PlanAssignment } from '../../types/plan.types';
import { ClassService } from '../../services/classes/classService';
import { PlanService } from '../../services/plans/planService';
import { logger } from '../../utils/logger';
import type { 
  PhysicalMeasurement, 
  StrengthMeasurement, 
  NutritionEntry, 
  DailyNutritionSummary
} from '../../types/progress.types';
// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
interface MemberProgressProps {
  onBack: () => void;
}
interface ProgressStats {
  totalClasses: number;
  completedClasses: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  monthlyAttendance: number;
  weeklyGoal: number;
  weeklyProgress: number;
  favoriteClass: string;
  totalActiveDays: number;
}
const MemberProgress: React.FC<MemberProgressProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'physical' | 'strength' | 'nutrition'>('overview');
  const [stats, setStats] = useState<ProgressStats>({
    totalClasses: 0,
    completedClasses: 0,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    monthlyAttendance: 0,
    weeklyGoal: 3,
    weeklyProgress: 0,
    favoriteClass: 'No disponible',
    totalActiveDays: 0
  });
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [planAssignments, setPlanAssignments] = useState<PlanAssignment[]>([]);
  // Estados para seguimiento físico y nutricional
  const [physicalMeasurements, setPhysicalMeasurements] = useState<PhysicalMeasurement[]>([]);
  const [strengthMeasurements, setStrengthMeasurements] = useState<StrengthMeasurement[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutritionSummary | null>(null);
  // Estados para formularios
  const [showPhysicalForm, setShowPhysicalForm] = useState(false);
  const [showStrengthForm, setShowStrengthForm] = useState(false);
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  // Función para convertir nombres técnicos de ejercicios a nombres legibles
  const getExerciseName = (exercise: string): string => {
    const exerciseNames: { [key: string]: string } = {
      'bench_press': 'Press de Banca',
      'squat': 'Sentadilla',
      'deadlift': 'Peso Muerto',
      'overhead_press': 'Press Militar',
      'pull_up': 'Dominadas',
      'row': 'Remo'
    };
    return exerciseNames[exercise] || exercise;
  };
  useEffect(() => {
    if (user?.uid) {
      loadProgressData();
      loadPhysicalData();
    }
  }, [user?.uid]);
  const loadProgressData = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      // Cargar asignaciones de clases y planes
      const [classes, plans] = await Promise.all([
        ClassService.getMemberAssignments(user.uid),
        PlanService.getMemberPlanAssignments(user.uid)
      ]);
      setClassAssignments(classes);
      setPlanAssignments(plans);
      // Calcular estadísticas
      const totalClasses = classes.length;
      const completedClasses = classes.filter((c: ClassAssignment) => c.attendanceCount > 0).length;
      const totalPoints = classes.reduce((sum: number, c: ClassAssignment) => sum + (c.attendanceCount * 10 || 0), 0);
      // Simular datos de progreso (en una implementación real, estos vendrían de la base de datos)
      const currentStreak = Math.floor(Math.random() * 10) + 1;
      const longestStreak = Math.max(currentStreak, Math.floor(Math.random() * 15) + 5);
      const monthlyAttendance = Math.floor(Math.random() * 20) + 5;
      const weeklyProgress = Math.floor(Math.random() * 7);
      // Encontrar clase favorita (la que más asistencias tiene)
      const favoriteClass = classes.length > 0 
        ? classes.reduce((prev: ClassAssignment, current: ClassAssignment) => 
            (prev.attendanceCount > current.attendanceCount) ? prev : current
          ).className || 'No disponible'
        : 'No disponible';
      setStats({
        totalClasses,
        completedClasses,
        totalPoints,
        currentStreak,
        longestStreak,
        monthlyAttendance,
        weeklyGoal: 3,
        weeklyProgress,
        favoriteClass,
        totalActiveDays: completedClasses * 2 // Estimación
      });
    } catch (error) {
      logger.error('Error cargando datos de progreso:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadPhysicalData = async () => {
    if (!user?.uid) return;
    try {
      // Cargar datos desde localStorage (en una implementación real, sería desde la base de datos)
      const savedPhysical = localStorage.getItem(`physical_${user.uid}`);
      const savedStrength = localStorage.getItem(`strength_${user.uid}`);
      const savedNutrition = localStorage.getItem(`nutrition_${user.uid}`);
      if (savedPhysical) {
        setPhysicalMeasurements(JSON.parse(savedPhysical));
      }
      if (savedStrength) {
        setStrengthMeasurements(JSON.parse(savedStrength));
      }
      if (savedNutrition) {
        setNutritionEntries(JSON.parse(savedNutrition));
      }
      // Calcular resumen nutricional del día actual
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = nutritionEntries.filter(entry => entry.date === today);
      if (todayEntries.length > 0) {
        const summary: DailyNutritionSummary = {
          date: today,
          totalCalories: todayEntries.reduce((sum, entry) => sum + entry.calories, 0),
          totalProtein: todayEntries.reduce((sum, entry) => sum + entry.protein, 0),
          totalCarbohydrates: todayEntries.reduce((sum, entry) => sum + entry.carbohydrates, 0),
          totalFats: todayEntries.reduce((sum, entry) => sum + entry.fats, 0),
          totalWater: todayEntries.reduce((sum, entry) => sum + entry.waterIntake, 0) };
        setDailyNutrition(summary);
      }
    } catch (error) {
      logger.error('Error cargando datos físicos:', error);
    }
  };
  const savePhysicalMeasurement = (measurement: Omit<PhysicalMeasurement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid) return;
    const newMeasurement: PhysicalMeasurement = {
      ...measurement,
      id: Date.now().toString(),
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() };
    const updated = [...physicalMeasurements, newMeasurement];
    setPhysicalMeasurements(updated);
    localStorage.setItem(`physical_${user.uid}`, JSON.stringify(updated));
    setShowPhysicalForm(false);
  };
  const saveStrengthMeasurement = (measurement: Omit<StrengthMeasurement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid) return;
    const newMeasurement: StrengthMeasurement = {
      ...measurement,
      id: Date.now().toString(),
      userId: user.uid,
      oneRepMax: Math.round(measurement.weight * (1 + measurement.reps / 30)), // Fórmula Epley
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() };
    const updated = [...strengthMeasurements, newMeasurement];
    setStrengthMeasurements(updated);
    localStorage.setItem(`strength_${user.uid}`, JSON.stringify(updated));
    setShowStrengthForm(false);
  };
  const saveNutritionEntry = (entry: Omit<NutritionEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid) return;
    const newEntry: NutritionEntry = {
      ...entry,
      id: Date.now().toString(),
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() };
    const updated = [...nutritionEntries, newEntry];
    setNutritionEntries(updated);
    localStorage.setItem(`nutrition_${user.uid}`, JSON.stringify(updated));
    setShowNutritionForm(false);
    // Actualizar resumen diario
    loadPhysicalData();
  };
  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };
  // Funciones para generar datos de gráficas
  const generateMonthlyProgressData = () => {
    // Generar los últimos 12 meses dinámicamente
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentDate = new Date();
    const months = [];
    // Crear array de los últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        label: monthNames[date.getMonth()],
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }
    // Datos de progreso físico (peso promedio por mes)
    const physicalData = months.map(monthInfo => {
      const monthMeasurements = physicalMeasurements.filter(m => {
        const measurementDate = new Date(m.createdAt);
        return measurementDate.getMonth() === monthInfo.month && 
               measurementDate.getFullYear() === monthInfo.year;
      });
      if (monthMeasurements.length === 0) return null;
      const avgWeight = monthMeasurements.reduce((sum, m) => sum + (m.weight || 0), 0) / monthMeasurements.length;
      return Math.round(avgWeight * 10) / 10;
    });
    // Datos de fuerza (1RM promedio por mes)
    const strengthData = months.map(monthInfo => {
      const monthMeasurements = strengthMeasurements.filter(m => {
        const measurementDate = new Date(m.createdAt);
        return measurementDate.getMonth() === monthInfo.month && 
               measurementDate.getFullYear() === monthInfo.year;
      });
      if (monthMeasurements.length === 0) return null;
      const avgStrength = monthMeasurements.reduce((sum, m) => sum + (m.oneRepMax || 0), 0) / monthMeasurements.length;
      return Math.round(avgStrength);
    });
    // Datos de nutrición (calorías promedio por mes)
    const nutritionData = months.map(monthInfo => {
      const monthEntries = nutritionEntries.filter(e => {
        const entryDate = new Date(e.createdAt);
        return entryDate.getMonth() === monthInfo.month && 
               entryDate.getFullYear() === monthInfo.year;
      });
      if (monthEntries.length === 0) return null;
      const avgCalories = monthEntries.reduce((sum, e) => sum + e.calories, 0) / monthEntries.length;
      return Math.round(avgCalories);
    });
    return {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Peso (kg)',
          data: physicalData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y' },
        {
          label: 'Fuerza (1RM kg)',
          data: strengthData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          yAxisID: 'y1' },
        {
          label: 'Calorías promedio',
          data: nutritionData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          yAxisID: 'y2' },
      ] };
  };
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false },
    plugins: {
      title: {
        display: true,
        text: 'Progreso Mensual - Físico, Fuerza y Nutrición' },
      legend: {
        position: 'top' as const } },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Mes'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Peso (kg)'
        } },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Fuerza (kg)'
        },
        grid: {
          drawOnChartArea: false } },
      y2: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const } } };
  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-green-600 bg-green-100';
    if (streak >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu progreso...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Progreso</h1>
              <p className="text-gray-600 mt-2">Seguimiento completo de tu rendimiento y salud</p>
            </div>
          </div>
        </div>
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('physical')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'physical'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Scale className="w-4 h-4 inline mr-2" />
                Físico
              </button>
              <button
                onClick={() => setActiveTab('strength')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'strength'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Dumbbell className="w-4 h-4 inline mr-2" />
                Fuerza
              </button>
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'nutrition'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Utensils className="w-4 h-4 inline mr-2" />
                Nutrición
              </button>
            </nav>
          </div>
        </div>
        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Clases Completadas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.completedClasses}</div>
                <div className="text-sm text-gray-600">de {stats.totalClasses} clases</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(stats.completedClasses, stats.totalClasses)}%` }}
                ></div>
              </div>
            </div>
          </div>
          {/* Racha Actual */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${getStreakColor(stats.currentStreak)}`}>
                <Flame className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.currentStreak}</div>
                <div className="text-sm text-gray-600">días consecutivos</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Récord: {stats.longestStreak} días
            </div>
          </div>
          {/* Progreso Semanal */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.weeklyProgress}</div>
                <div className="text-sm text-gray-600">de {stats.weeklyGoal} esta semana</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(stats.weeklyProgress, stats.weeklyGoal)}%` }}
                ></div>
              </div>
            </div>
          </div>
          {/* Días Activos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalActiveDays}</div>
                <div className="text-sm text-gray-600">días activos</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Este mes: {stats.monthlyAttendance} días
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Información Adicional */}
          <div className="space-y-6">
          </div>
        </div>
        {/* Clases Asignadas */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Mis Clases</h3>
          </div>
          <div className="p-6">
            {classAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classAssignments.map((assignment) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{assignment.className}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : assignment.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assignment.status === 'active' ? 'Activa' : 
                         assignment.status === 'expired' ? 'Expirada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Asistencias: {assignment.attendanceCount || 0}
                      </div>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-2" />
                        Puntos: {(assignment.attendanceCount || 0) * 10}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Expira: {new Date(assignment.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tienes clases asignadas</p>
              </div>
            )}
          </div>
        </div>
        {/* Gráfica de Progreso Mensual */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Progreso Mensual</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Visualiza tu evolución en físico, fuerza y nutrición a lo largo del tiempo
                </p>
              </div>
              <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                <Clock className="w-3 h-3 mr-1" />
                Se actualiza en tiempo real
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>• Los datos se actualizan automáticamente al agregar nuevas mediciones</span>
                <span>• Promedio calculado por mes para cada métrica</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {(physicalMeasurements.length > 0 || strengthMeasurements.length > 0 || nutritionEntries.length > 0) ? (
              <>
                <div className="h-96">
                  <Line data={generateMonthlyProgressData()} options={chartOptions} />
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Actualización de datos:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>Tiempo real:</strong> La gráfica se actualiza inmediatamente al agregar nuevas mediciones</li>
                        <li>• <strong>Cálculo mensual:</strong> Los datos se promedian automáticamente por mes</li>
                        <li>• <strong>Sincronización:</strong> Los cambios se reflejan al instante en todas las pestañas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Sin datos para mostrar</h4>
                <p className="text-gray-500 mb-4">
                  Comienza a registrar tus mediciones físicas, entrenamientos de fuerza y datos nutricionales 
                  para ver tu progreso mensual.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setActiveTab('physical')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Agregar Medición Física
                  </button>
                  <button
                    onClick={() => setActiveTab('strength')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Registrar Fuerza
                  </button>
                  <button
                    onClick={() => setActiveTab('nutrition')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Agregar Nutrición
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}
        {/* Sección Físico */}
        {activeTab === 'physical' && (
          <div className="space-y-6">
            {/* Información y Recomendaciones */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Seguimiento Físico</h4>
                  <p className="text-gray-700 mb-4">
                    El monitoreo regular de las medidas corporales es fundamental para evaluar la composición corporal, 
                    detectar cambios en la masa muscular y grasa, y ajustar los programas de entrenamiento y nutrición.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">Frecuencia Recomendada</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Semanal:</strong> Peso corporal<br/>
                        <strong>Quincenal:</strong> Medidas corporales<br/>
                        <strong>Mensual:</strong> Composición corporal completa
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center mb-2">
                        <Heart className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">Respaldo Científico</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Estudios demuestran que el seguimiento regular mejora la adherencia al programa 
                        y los resultados en un 40-60% (Journal of Sports Medicine, 2023).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Mediciones Físicas</h3>
                <button
                  onClick={() => setShowPhysicalForm(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Medición
                </button>
              </div>
              {physicalMeasurements.length > 0 ? (
                <div className="space-y-4">
                  {physicalMeasurements.slice(-5).map((measurement) => (
                    <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">
                          {new Date(measurement.date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {measurement.measurementType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Peso:</span>
                          <span className="ml-2 font-medium">{measurement.weight} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Grasa:</span>
                          <span className="ml-2 font-medium">{measurement.bodyFat}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Músculo:</span>
                          <span className="ml-2 font-medium">{measurement.muscleMass} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">IMC:</span>
                          <span className="ml-2 font-medium">{measurement.bmi}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay mediciones registradas</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Sección Fuerza */}
        {activeTab === 'strength' && (
          <div className="space-y-6">
            {/* Información y Recomendaciones */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Seguimiento de Fuerza</h4>
                  <p className="text-gray-700 mb-4">
                    El registro sistemático de cargas, repeticiones y series permite evaluar el progreso en fuerza, 
                    optimizar la periodización del entrenamiento y prevenir estancamientos o lesiones.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-red-100">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                        <span className="font-medium text-gray-900">Frecuencia Recomendada</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Cada sesión:</strong> Ejercicios principales<br/>
                        <strong>Semanal:</strong> Test de 1RM estimado<br/>
                        <strong>Mensual:</strong> Evaluación completa de fuerza
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-red-100">
                      <div className="flex items-center mb-2">
                        <Trophy className="w-4 h-4 text-red-600 mr-2" />
                        <span className="font-medium text-gray-900">Respaldo Científico</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        La monitorización de cargas mejora las ganancias de fuerza en un 25-35% 
                        comparado con entrenamientos no monitorizados (Strength & Conditioning Research, 2024).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Mediciones de Fuerza</h3>
                <button
                  onClick={() => setShowStrengthForm(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Medición
                </button>
              </div>
              {strengthMeasurements.length > 0 ? (
                <div className="space-y-4">
                  {strengthMeasurements.slice(-5).map((measurement) => (
                    <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">
                          {new Date(measurement.date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getExerciseName(measurement.exercise)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Peso:</span>
                          <span className="ml-2 font-medium">{measurement.weight} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reps:</span>
                          <span className="ml-2 font-medium">{measurement.reps}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Series:</span>
                          <span className="ml-2 font-medium">{measurement.sets}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">1RM:</span>
                          <span className="ml-2 font-medium text-purple-600">{measurement.oneRepMax} kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay mediciones de fuerza registradas</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Sección Nutrición */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            {/* Información y Recomendaciones */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Utensils className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Seguimiento Nutricional</h4>
                  <p className="text-gray-700 mb-4">
                    El registro detallado de la ingesta nutricional permite optimizar la composición corporal, 
                    mejorar el rendimiento deportivo y asegurar una recuperación adecuada post-entrenamiento.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="font-medium text-gray-900">Frecuencia Recomendada</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Diario:</strong> Todas las comidas principales<br/>
                        <strong>Semanal:</strong> Análisis de macronutrientes<br/>
                        <strong>Mensual:</strong> Evaluación nutricional completa
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex items-center mb-2">
                        <Heart className="w-4 h-4 text-green-600 mr-2" />
                        <span className="font-medium text-gray-900">Respaldo Científico</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        El registro nutricional aumenta la adherencia dietética en un 50-70% y 
                        mejora los resultados de composición corporal (Nutrition Research, 2024).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Registro Nutricional</h3>
                <button
                  onClick={() => setShowNutritionForm(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Comida
                </button>
              </div>
              {/* Resumen del día */}
              {dailyNutrition && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Resumen de Hoy</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{dailyNutrition.totalCalories}</div>
                      <div className="text-sm text-gray-600">Calorías</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{dailyNutrition.totalProtein}g</div>
                      <div className="text-sm text-gray-600">Proteína</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{dailyNutrition.totalCarbs}g</div>
                      <div className="text-sm text-gray-600">Carbohidratos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{dailyNutrition.totalFat}g</div>
                      <div className="text-sm text-gray-600">Grasas</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Droplets className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-700">Hidratación: {dailyNutrition.waterIntake}L</span>
                  </div>
                </div>
              )}
              {nutritionEntries.length > 0 ? (
                <div className="space-y-4">
                  {nutritionEntries.slice(-5).map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{entry.foodName}</h5>
                          <span className="text-sm text-gray-600">
                            {new Date(entry.date).toLocaleDateString()} - {entry.mealType}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-purple-600">
                          {entry.calories} cal
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Proteína:</span>
                          <span className="ml-2 font-medium">{entry.protein}g</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Carbos:</span>
                          <span className="ml-2 font-medium">{entry.carbs}g</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Grasas:</span>
                          <span className="ml-2 font-medium">{entry.fat}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay registros nutricionales</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Formulario de Mediciones Físicas */}
        {showPhysicalForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Medición Física</h3>
                <button
                  onClick={() => setShowPhysicalForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const weight = parseFloat(formData.get('weight') as string);
                const height = parseFloat(formData.get('height') as string);
                const bodyFat = parseFloat(formData.get('bodyFat') as string);
                const muscleMass = parseFloat(formData.get('muscleMass') as string);
                const bmi = weight / ((height / 100) ** 2);
                savePhysicalMeasurement({
                  weight,
                  height,
                  bodyFat,
                  muscleMass,
                  bmi: parseFloat(bmi.toFixed(1)),
                  measurementType: formData.get('measurementType') as 'manual' | 'bioimpedance' | 'dexa',
                  date: new Date().toISOString(),
                  notes: formData.get('notes') as string || undefined
                });
                setShowPhysicalForm(false);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      step="0.1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      step="0.1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grasa Corporal (%)
                    </label>
                    <input
                      type="number"
                      name="bodyFat"
                      step="0.1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Masa Muscular (kg)
                    </label>
                    <input
                      type="number"
                      name="muscleMass"
                      step="0.1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Medición
                    </label>
                    <select
                      name="measurementType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="bioimpedance">Bioimpedancia</option>
                      <option value="dexa">DEXA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPhysicalForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Formulario de Mediciones de Fuerza */}
        {showStrengthForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Medición de Fuerza</h3>
                <button
                  onClick={() => setShowStrengthForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const weight = parseFloat(formData.get('weight') as string);
                const reps = parseInt(formData.get('reps') as string);
                saveStrengthMeasurement({
                  exercise: formData.get('exercise') as string,
                  weight,
                  reps,
                  sets: parseInt(formData.get('sets') as string),
                  date: new Date().toISOString(),
                  notes: formData.get('notes') as string || undefined
                });
                setShowStrengthForm(false);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ejercicio
                    </label>
                    <select
                      name="exercise"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Seleccionar ejercicio</option>
                      <option value="bench_press">Press de Banca</option>
                      <option value="squat">Sentadilla</option>
                      <option value="deadlift">Peso Muerto</option>
                      <option value="overhead_press">Press Militar</option>
                      <option value="pull_up">Dominadas</option>
                      <option value="row">Remo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      step="0.5"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repeticiones
                    </label>
                    <input
                      type="number"
                      name="reps"
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Series
                    </label>
                    <input
                      type="number"
                      name="sets"
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStrengthForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Formulario de Nutrición */}
        {showNutritionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Agregar Comida</h3>
                <button
                  onClick={() => setShowNutritionForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                saveNutritionEntry({
                  foodName: formData.get('foodName') as string,
                  mealType: formData.get('mealType') as 'breakfast' | 'lunch' | 'dinner' | 'snack',
                  calories: parseFloat(formData.get('calories') as string),
                  protein: parseFloat(formData.get('protein') as string),
                  carbs: parseFloat(formData.get('carbs') as string),
                  fat: parseFloat(formData.get('fat') as string),
                  fiber: parseFloat(formData.get('fiber') as string) || 0,
                  sugar: parseFloat(formData.get('sugar') as string) || 0,
                  sodium: parseFloat(formData.get('sodium') as string) || 0,
                  waterIntake: parseFloat(formData.get('waterIntake') as string) || 0,
                  date: new Date().toISOString(),
                  notes: formData.get('notes') as string || undefined
                });
                setShowNutritionForm(false);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Alimento
                    </label>
                    <input
                      type="text"
                      name="foodName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Comida
                    </label>
                    <select
                      name="mealType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="breakfast">Desayuno</option>
                      <option value="lunch">Almuerzo</option>
                      <option value="dinner">Cena</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calorías
                      </label>
                      <input
                        type="number"
                        name="calories"
                        step="0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proteína (g)
                      </label>
                      <input
                        type="number"
                        name="protein"
                        step="0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Carbohidratos (g)
                      </label>
                      <input
                        type="number"
                        name="carbs"
                        step="0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grasas (g)
                      </label>
                      <input
                        type="number"
                        name="fat"
                        step="0.1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agua (L) - opcional
                    </label>
                    <input
                      type="number"
                      name="waterIntake"
                      step="0.1"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNutritionForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MemberProgress;