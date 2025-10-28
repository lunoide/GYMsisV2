// Tipos para la gestión de clases del gimnasio

export interface GymClass {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName?: string; // Para mostrar en la UI
  schedule: ClassSchedule[];
  duration: number; // minutos
  maxCapacity: number;
  currentEnrollment: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  status: 'active' | 'inactive' | 'cancelled';
  // Campos de puntos
  assignmentPoints: number; // Puntos que recibe el miembro por asignarse a esta clase
  attendancePoints: number; // Puntos que recibe el miembro por asistir a la clase
  // Campo de costo
  cost: number; // Costo de la clase que debe pagar el miembro
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSchedule {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.
  startTime: string; // formato HH:mm
  endTime: string; // formato HH:mm
  room: string;
}

export interface CreateClassData {
  name: string;
  description: string;
  trainerId: string;
  schedule: ClassSchedule[];
  duration: number;
  maxCapacity: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  assignmentPoints: number;
  attendancePoints: number;
  cost: number;
}

export interface UpdateClassData extends Partial<CreateClassData> {
  id: string;
  status?: 'active' | 'inactive' | 'cancelled';
  currentEnrollment?: number;
}

export interface ClassAssignment {
  id: string;
  classId: string;
  className?: string; // Para mostrar en la UI
  memberId: string;
  memberName?: string; // Para mostrar en la UI
  assignedAt: Date;
  expiresAt: Date; // Nueva fecha de expiración
  duration: number; // Duración en días
  status: 'active' | 'expired' | 'cancelled' | 'completed';
  assignmentPointsEarned: number; // Puntos ganados por asignarse
  attendancePointsEarned: number; // Puntos ganados por asistencia
  totalPointsEarned: number; // Total de puntos ganados
  attendanceCount: number; // Número de veces que asistió
  assignedBy?: string; // ID del admin/trainer que hizo la asignación
  // Campos de pago
  paymentAmount: number; // Monto pagado por la clase
  paymentStatus: 'pending' | 'paid' | 'cancelled'; // Estado del pago
  paidAt?: Date; // Fecha de pago
}

export interface CreateClassAssignmentData {
  classId: string;
  memberId: string;
  duration: number; // Duración en días
  assignedBy?: string; // ID del usuario que hace la asignación
  paymentAmount: number; // Monto del pago
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other'; // Método de pago
  paymentNotes?: string; // Notas del pago
}

export interface ClassAttendance {
  id: string;
  classId: string;
  memberId: string;
  attendedAt: Date;
  pointsEarned: number;
}

export interface ClassStats {
  totalClasses: number;
  activeClasses: number;
  totalEnrollments: number;
  averageAttendance: number;
  totalPointsAwarded: number;
}

// Tipos para la UI
export interface ClassFormData {
  name: string;
  description: string;
  trainerId: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  maxCapacity: number;
  assignmentPoints: number;
  attendancePoints: number;
  cost: number;
  equipment: string[];
  schedule: ClassSchedule[];
}

export const CLASS_CATEGORIES = [
  'Cardio',
  'Fuerza',
  'Flexibilidad',
  'Funcional',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Spinning',
  'Aqua Fitness',
  'Danza',
  'Artes Marciales',
  'Rehabilitación'
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' }
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
] as const;

// Tipos para pagos e ingresos
export type IncomeType = 'class' | 'membership' | 'product' | 'other';

// Tipo de gasto para clasificación
export type ExpenseType = 'staff_payment' | 'product_purchase' | 'other_expense';

// Tipo de transacción que puede ser ingreso o gasto
export type TransactionType = IncomeType | ExpenseType;

export interface ClassPayment {
  id: string;
  assignmentId: string;
  classId: string;
  className: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  transactionType: TransactionType; // Tipo de transacción (ingreso o gasto)
  isExpense: boolean; // true para gastos, false para ingresos
  status: 'completed' | 'pending' | 'cancelled';
  processor?: string; // ID del usuario que procesó el pago
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyIncome {
  id: string;
  year: number;
  month: number; // 1-12
  totalIncome: number;
  totalExpenses: number;
  netIncome: number; // totalIncome - totalExpenses
  classIncome: {
    total: number;
    transactions: number;
  };
  membershipIncome: {
    total: number;
    transactions: number;
  };
  productSales: {
    total: number;
    transactions: number;
  };
  otherIncome: {
    total: number;
    transactions: number;
  };
  staffPayments: {
    total: number;
    transactions: number;
  };
  productPurchases: {
    total: number;
    transactions: number;
  };
  otherExpenses: {
    total: number;
    transactions: number;
  };
  totalTransactions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentData {
  assignmentId: string;
  classId?: string;
  className?: string;
  memberId?: string;
  memberName?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  transactionType: TransactionType; // Tipo de transacción (ingreso o gasto)
  isExpense: boolean; // true para gastos, false para ingresos
  notes?: string;
  processor?: string;
}