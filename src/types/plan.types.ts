// Tipos para planes de membresía

export type PlanDurationType = 'days' | 'months';

export type PlanStatus = 'active' | 'inactive' | 'archived';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  duration: number; // Cantidad de tiempo
  durationType: PlanDurationType; // Tipo de duración
  cost: number; // Costo del plan
  assignmentPoints: number; // Puntos que recibe el miembro al asignarse
  features: string[]; // Características del plan
  status: PlanStatus;
  isActive: boolean; // Si el plan está activo
  totalAssignments: number; // Total de asignaciones del plan
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreatePlanData {
  name: string;
  description: string;
  duration: number;
  durationType: PlanDurationType;
  cost: number;
  assignmentPoints: number;
  features: string[];
  isActive: boolean;
}

export interface UpdatePlanData extends Partial<CreatePlanData> {
  id: string;
}

// Tipos para asignación de planes a miembros
export interface PlanAssignment {
  id: string;
  planId: string;
  planName: string;
  memberId: string;
  memberName: string;
  assignedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'cancelled';
  assignedBy: string;
  paymentAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  pointsEarned: number;
}

export interface CreatePlanAssignmentData {
  planId: string;
  memberId: string;
  assignedBy: string;
  paymentAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  paymentNotes?: string;
}

// Tipos para estadísticas de planes
export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  totalAssignments: number;
  activeAssignments: number;
  totalRevenue: number;
  monthlyRevenue: number;
}