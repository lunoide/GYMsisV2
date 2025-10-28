export interface PhysicalMeasurement {
  id: string;
  userId: string;
  date: string;
  weight?: number; // kg
  bodyFatPercentage?: number; // %
  muscleMass?: number; // kg
  visceralFat?: number; // level
  bmi?: number;
  waistCircumference?: number; // cm
  chestCircumference?: number; // cm
  armCircumference?: number; // cm
  thighCircumference?: number; // cm
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrengthMeasurement {
  id: string;
  userId: string;
  date: string;
  exercise: string;
  weight: number; // kg
  reps: number;
  sets: number;
  oneRepMax?: number; // calculated 1RM
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionEntry {
  id: string;
  userId: string;
  date: string;
  calories: number;
  protein: number; // g
  carbohydrates: number; // g
  fats: number; // g
  fiber?: number; // g
  sugar?: number; // g
  sodium?: number; // mg
  waterIntake: number; // ml
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFats: number;
  totalWater: number;
  calorieGoal?: number;
  proteinGoal?: number;
  carbGoal?: number;
  fatGoal?: number;
  waterGoal?: number;
}

export interface ProgressGoals {
  userId: string;
  weightGoal?: number;
  bodyFatGoal?: number;
  muscleMassGoal?: number;
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbGoal?: number;
  dailyFatGoal?: number;
  dailyWaterGoal?: number;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressStats {
  totalMeasurements: number;
  weightChange: number; // kg change from first to last measurement
  bodyFatChange: number; // % change
  muscleMassChange: number; // kg change
  averageCaloriesPerDay: number;
  averageWaterIntake: number;
  consistencyScore: number; // percentage of days with data
  strengthProgress: {
    exercise: string;
    initialMax: number;
    currentMax: number;
    improvement: number;
  }[];
}

export type MeasurementType = 'weight' | 'bodyFat' | 'muscleMass' | 'strength' | 'nutrition';

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ProgressChartData {
  type: MeasurementType;
  data: ChartDataPoint[];
  goal?: number;
  unit: string;
  title: string;
}