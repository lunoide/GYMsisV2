// Tipos para la gestión de entrenadores

export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialties: string[];
  certifications: string[];
  experience: number; // años de experiencia
  hourlyRate: number;
  availability: TrainerAvailability[];
  assignedClasses: string[]; // IDs de las clases asignadas
  status: 'active' | 'inactive' | 'on_leave';
  hireDate: Date;
  profileImage?: string;
  bio?: string;
}

export interface TrainerAvailability {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.
  startTime: string; // formato HH:mm
  endTime: string; // formato HH:mm
}

export interface TrainerClass {
  id: string;
  name: string;
  description: string;
  duration: number; // minutos
  maxCapacity: number;
  trainerId: string;
  schedule: ClassSchedule[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
}

export interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

export interface CreateTrainerData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  specialties: string[];
  certifications: string[];
  experience: number;
  hourlyRate: number;
  bio?: string;
}

export interface UpdateTrainerData extends Partial<CreateTrainerData> {
  id: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

export interface AssignClassData {
  trainerId: string;
  classId: string;
  schedule: ClassSchedule[];
}

export interface TrainerStats {
  totalClasses: number;
  totalMembers: number;
  averageRating: number;
  monthlyEarnings: number;
}