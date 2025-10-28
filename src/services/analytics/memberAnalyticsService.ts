import { 
  collection, 
  getDocs, 
  query, 
  where} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import { MemberService } from '../users/memberService';
import { PaymentService } from '../payments/paymentService';
import type { UserProfile } from '../../types/auth.types';
import type { PlanAssignment } from '../../types/plan.types';
import type { ClassAssignment } from '../../types/class.types';
import { logger } from '../../utils/logger';
// Interfaces para el análisis de miembros
export interface MembershipStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  suspendedMembers: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  membershipGrowthRate: number;
}
export interface RetentionMetrics {
  monthlyRetentionRate: number;
  averageMembershipDuration: number; // en días
  churnRate: number;
  renewalRate: number;
  membersByTenure: {
    '0-3months': number;
    '3-6months': number;
    '6-12months': number;
    '12+months': number;
  };
}
export interface MembershipTypeBreakdown {
  [membershipType: string]: {
    count: number;
    percentage: number;
    averageRevenue: number;
    retentionRate: number;
  };
}
export interface ActivityMetrics {
  averageClassesPerMember: number;
  mostActiveMembers: Array<{
    id: string;
    name: string;
    classCount: number;
    lastActivity: Date;
  }>;
  leastActiveMembers: Array<{
    id: string;
    name: string;
    classCount: number;
    lastActivity: Date | null;
  }>;
  classAttendanceRate: number;
  popularClasses: Array<{
    className: string;
    attendanceCount: number;
    uniqueMembers: number;
  }>;
}
export interface RevenueByMember {
  totalRevenue: number;
  averageRevenuePerMember: number;
  topSpendingMembers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    membershipType: string;
  }>;
  revenueByMembershipType: {
    [membershipType: string]: number;
  };
}
export interface MemberDemographics {
  ageGroups: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '55+': number;
  };
  averageAge: number;
  genderDistribution?: {
    male: number;
    female: number;
    other: number;
  };
}
export interface MemberAnalyticsReport {
  membershipStats: MembershipStats;
  retentionMetrics: RetentionMetrics;
  membershipTypeBreakdown: MembershipTypeBreakdown;
  activityMetrics: ActivityMetrics;
  revenueByMember: RevenueByMember;
  demographics: MemberDemographics;
  trends: {
    monthlyGrowth: Array<{
      month: string;
      newMembers: number;
      totalMembers: number;
      churnedMembers: number;
    }>;
    revenueGrowth: Array<{
      month: string;
      revenue: number;
      averagePerMember: number;
    }>;
  };
  recommendations: string[];
}
export class MemberAnalyticsService {
  /**
   * Obtener el reporte completo de análisis de miembros
   */
  static async getMemberAnalyticsReport(): Promise<MemberAnalyticsReport> {
    try {
      const [
        membershipStats,
        retentionMetrics,
        membershipTypeBreakdown,
        activityMetrics,
        revenueByMember,
        demographics,
        trends
      ] = await Promise.all([
        this.getMembershipStats(),
        this.getRetentionMetrics(),
        this.getMembershipTypeBreakdown(),
        this.getActivityMetrics(),
        this.getRevenueByMember(),
        this.getMemberDemographics(),
        this.getTrends()
      ]);
      const recommendations = this.generateRecommendations({
        membershipStats,
        retentionMetrics,
        activityMetrics,
        revenueByMember
      });
      return {
        membershipStats,
        retentionMetrics,
        membershipTypeBreakdown,
        activityMetrics,
        revenueByMember,
        demographics,
        trends,
        recommendations
      };
    } catch (error) {
      logger.error('Error getting member analytics report:', error);
      throw new Error('Error al obtener el reporte de análisis de miembros');
    }
  }
  /**
   * Obtener estadísticas de membresías
   */
  static async getMembershipStats(): Promise<MembershipStats> {
    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER)
      );
      const querySnapshot = await getDocs(membersQuery);
      const members = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.membershipStatus === 'active').length;
      const inactiveMembers = members.filter(m => m.membershipStatus === 'inactive').length;
      const suspendedMembers = members.filter(m => m.membershipStatus === 'suspended').length;
      // Calcular nuevos miembros este mes y el mes pasado
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const newMembersThisMonth = members.filter(m => 
        new Date(m.joinDate) >= thisMonthStart
      ).length;
      const newMembersLastMonth = members.filter(m => {
        const joinDate = new Date(m.joinDate);
        return joinDate >= lastMonthStart && joinDate <= lastMonthEnd;
      }).length;
      const membershipGrowthRate = newMembersLastMonth > 0 
        ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
        : newMembersThisMonth > 0 ? 100 : 0;
      return {
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        newMembersThisMonth,
        newMembersLastMonth,
        membershipGrowthRate
      };
    } catch (error) {
      logger.error('Error getting membership stats:', error);
      throw error;
    }
  }
  /**
   * Obtener métricas de retención
   */
  static async getRetentionMetrics(): Promise<RetentionMetrics> {
    try {
      // Obtener todos los miembros y sus asignaciones de planes
      const members = await MemberService.getAllMembers();
      const allPlanAssignments = await this.getAllPlanAssignments();
      // Calcular duración promedio de membresía
      const now = new Date();
      let totalDuration = 0;
      let membersWithDuration = 0;
      const membersByTenure = {
        '0-3months': 0,
        '3-6months': 0,
        '6-12months': 0,
        '12+months': 0
      };
      members.forEach(member => {
        const joinDate = new Date(member.joinDate);
        const durationInDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        if (durationInDays >= 0) {
          totalDuration += durationInDays;
          membersWithDuration++;
          // Categorizar por tenure
          if (durationInDays <= 90) {
            membersByTenure['0-3months']++;
          } else if (durationInDays <= 180) {
            membersByTenure['3-6months']++;
          } else if (durationInDays <= 365) {
            membersByTenure['6-12months']++;
          } else {
            membersByTenure['12+months']++;
          }
        }
      });
      const averageMembershipDuration = membersWithDuration > 0 
        ? totalDuration / membersWithDuration 
        : 0;
      // Calcular tasa de retención mensual (simplificado)
      const activeMembers = members.filter(m => m.membershipStatus === 'active').length;
      const totalMembers = members.length;
      const monthlyRetentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
      // Calcular tasa de churn (simplificado)
      const inactiveMembers = members.filter(m => m.membershipStatus === 'inactive').length;
      const churnRate = totalMembers > 0 ? (inactiveMembers / totalMembers) * 100 : 0;
      // Calcular tasa de renovación basada en planes expirados vs renovados
      const expiredPlans = allPlanAssignments.filter(p => p.status === 'expired').length;
      const activePlans = allPlanAssignments.filter(p => p.status === 'active').length;
      const renewalRate = (expiredPlans + activePlans) > 0 
        ? (activePlans / (expiredPlans + activePlans)) * 100 
        : 0;
      return {
        monthlyRetentionRate,
        averageMembershipDuration,
        churnRate,
        renewalRate,
        membersByTenure
      };
    } catch (error) {
      logger.error('Error getting retention metrics:', error);
      throw error;
    }
  }
  /**
   * Obtener desglose por tipo de membresía
   */
  static async getMembershipTypeBreakdown(): Promise<MembershipTypeBreakdown> {
    try {
      const members = await MemberService.getAllMembers();
      const payments = await PaymentService.getAllPayments();
      const breakdown: MembershipTypeBreakdown = {};
      const totalMembers = members.length;
      // Agrupar por tipo de membresía
      const membershipGroups: { [key: string]: UserProfile[] } = {};
      members.forEach(member => {
        const type = member.membershipType || 'Sin asignar';
        if (!membershipGroups[type]) {
          membershipGroups[type] = [];
        }
        membershipGroups[type].push(member);
      });
      // Calcular métricas para cada tipo
      for (const [type, typeMembers] of Object.entries(membershipGroups)) {
        const count = typeMembers.length;
        const percentage = totalMembers > 0 ? (count / totalMembers) * 100 : 0;
        // Calcular ingresos promedio para este tipo
        const memberIds = typeMembers.map(m => m.uid);
        const typePayments = payments.filter(p => memberIds.includes(p.memberId));
        const totalRevenue = typePayments.reduce((sum, p) => sum + p.amount, 0);
        const averageRevenue = count > 0 ? totalRevenue / count : 0;
        // Calcular tasa de retención para este tipo
        const activeInType = typeMembers.filter(m => m.membershipStatus === 'active').length;
        const retentionRate = count > 0 ? (activeInType / count) * 100 : 0;
        breakdown[type] = {
          count,
          percentage,
          averageRevenue,
          retentionRate
        };
      }
      return breakdown;
    } catch (error) {
      logger.error('Error getting membership type breakdown:', error);
      throw error;
    }
  }
  /**
   * Obtener métricas de actividad
   */
  static async getActivityMetrics(): Promise<ActivityMetrics> {
    try {
      const members = await MemberService.getAllMembers();
      const allClassAssignments = await this.getAllClassAssignments();
      // Calcular promedio de clases por miembro
      const totalClasses = allClassAssignments.length;
      const averageClassesPerMember = members.length > 0 ? totalClasses / members.length : 0;
      // Obtener miembros más activos
      const memberClassCounts: { [memberId: string]: { member: UserProfile; classCount: number } } = {};
      members.forEach(member => {
        memberClassCounts[member.uid] = {
          member,
          classCount: 0
        };
      });
      allClassAssignments.forEach(assignment => {
        if (memberClassCounts[assignment.memberId]) {
          memberClassCounts[assignment.memberId].classCount++;
        }
      });
      const sortedByActivity = Object.values(memberClassCounts)
        .sort((a, b) => b.classCount - a.classCount);
      const mostActiveMembers = sortedByActivity.slice(0, 10).map(item => ({
        id: item.member.uid,
        name: `${item.member.firstName} ${item.member.lastName}`,
        classCount: item.classCount,
        lastActivity: item.member.lastActivity || new Date()
      }));
      const leastActiveMembers = sortedByActivity.slice(-10).map(item => ({
        id: item.member.uid,
        name: `${item.member.firstName} ${item.member.lastName}`,
        classCount: item.classCount,
        lastActivity: item.member.lastActivity || null
      }));
      // Calcular tasa de asistencia a clases (simplificado)
      const totalPossibleAttendances = allClassAssignments.length;
      const actualAttendances = allClassAssignments.filter(a => a.attendanceCount && a.attendanceCount > 0).length;
      const classAttendanceRate = totalPossibleAttendances > 0 
        ? (actualAttendances / totalPossibleAttendances) * 100 
        : 0;
      // Clases más populares
      const classPopularity: { [className: string]: { attendanceCount: number; uniqueMembers: Set<string> } } = {};
      allClassAssignments.forEach(assignment => {
        const className = assignment.className || 'Clase sin nombre';
        if (!classPopularity[className]) {
          classPopularity[className] = {
            attendanceCount: 0,
            uniqueMembers: new Set()
          };
        }
        classPopularity[className].attendanceCount += assignment.attendanceCount || 0;
        classPopularity[className].uniqueMembers.add(assignment.memberId);
      });
      const popularClasses = Object.entries(classPopularity)
        .map(([className, data]) => ({
          className,
          attendanceCount: data.attendanceCount,
          uniqueMembers: data.uniqueMembers.size
        }))
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
        .slice(0, 10);
      return {
        averageClassesPerMember,
        mostActiveMembers,
        leastActiveMembers,
        classAttendanceRate,
        popularClasses
      };
    } catch (error) {
      logger.error('Error getting activity metrics:', error);
      throw error;
    }
  }
  /**
   * Obtener análisis de ingresos por miembro
   */
  static async getRevenueByMember(): Promise<RevenueByMember> {
    try {
      const members = await MemberService.getAllMembers();
      const payments = await PaymentService.getAllPayments();
      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const averageRevenuePerMember = members.length > 0 ? totalRevenue / members.length : 0;
      // Calcular gasto total por miembro
      const memberSpending: { [memberId: string]: { member: UserProfile; totalSpent: number } } = {};
      members.forEach(member => {
        memberSpending[member.uid] = {
          member,
          totalSpent: 0
        };
      });
      payments.forEach(payment => {
        if (memberSpending[payment.memberId]) {
          memberSpending[payment.memberId].totalSpent += payment.amount;
        }
      });
      // Top miembros que más gastan
      const topSpendingMembers = Object.values(memberSpending)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(item => ({
          id: item.member.uid,
          name: `${item.member.firstName} ${item.member.lastName}`,
          totalSpent: item.totalSpent,
          membershipType: item.member.membershipType || 'Sin asignar'
        }));
      // Ingresos por tipo de membresía
      const revenueByMembershipType: { [membershipType: string]: number } = {};
      Object.values(memberSpending).forEach(item => {
        const type = item.member.membershipType || 'Sin asignar';
        if (!revenueByMembershipType[type]) {
          revenueByMembershipType[type] = 0;
        }
        revenueByMembershipType[type] += item.totalSpent;
      });
      return {
        totalRevenue,
        averageRevenuePerMember,
        topSpendingMembers,
        revenueByMembershipType
      };
    } catch (error) {
      logger.error('Error getting revenue by member:', error);
      throw error;
    }
  }
  /**
   * Obtener demografía de miembros
   */
  static async getMemberDemographics(): Promise<MemberDemographics> {
    try {
      const members = await MemberService.getAllMembers();
      const ageGroups = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '55+': 0
      };
      let totalAge = 0;
      let membersWithAge = 0;
      members.forEach(member => {
        if (member.dateOfBirth) {
          const birthDate = new Date(member.dateOfBirth);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          totalAge += age;
          membersWithAge++;
          if (age >= 18 && age <= 25) {
            ageGroups['18-25']++;
          } else if (age >= 26 && age <= 35) {
            ageGroups['26-35']++;
          } else if (age >= 36 && age <= 45) {
            ageGroups['36-45']++;
          } else if (age >= 46 && age <= 55) {
            ageGroups['46-55']++;
          } else if (age > 55) {
            ageGroups['55+']++;
          }
        }
      });
      const averageAge = membersWithAge > 0 ? totalAge / membersWithAge : 0;
      return {
        ageGroups,
        averageAge
      };
    } catch (error) {
      logger.error('Error getting member demographics:', error);
      throw error;
    }
  }
  /**
   * Obtener tendencias de crecimiento
   */
  static async getTrends(): Promise<{
    monthlyGrowth: Array<{
      month: string;
      newMembers: number;
      totalMembers: number;
      churnedMembers: number;
    }>;
    revenueGrowth: Array<{
      month: string;
      revenue: number;
      averagePerMember: number;
    }>;
  }> {
    try {
      const members = await MemberService.getAllMembers();
      const payments = await PaymentService.getAllPayments();
      // Generar datos para los últimos 12 meses
      const monthlyGrowth = [];
      const revenueGrowth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        // Nuevos miembros en este mes
        const newMembers = members.filter(m => {
          const joinDate = new Date(m.joinDate);
          return joinDate >= monthStart && joinDate <= monthEnd;
        }).length;
        // Total de miembros hasta este mes
        const totalMembers = members.filter(m => {
          const joinDate = new Date(m.joinDate);
          return joinDate <= monthEnd;
        }).length;
        // Miembros que se dieron de baja (simplificado - los que se volvieron inactivos)
        const churnedMembers = members.filter(m => {
          const lastActivity = m.lastActivity ? new Date(m.lastActivity) : null;
          return lastActivity && lastActivity >= monthStart && lastActivity <= monthEnd && 
                 m.membershipStatus === 'inactive';
        }).length;
        monthlyGrowth.push({
          month: monthName,
          newMembers,
          totalMembers,
          churnedMembers
        });
        // Ingresos del mes
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.paymentDate);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        });
        const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        const averagePerMember = totalMembers > 0 ? revenue / totalMembers : 0;
        revenueGrowth.push({
          month: monthName,
          revenue,
          averagePerMember
        });
      }
      return {
        monthlyGrowth,
        revenueGrowth
      };
    } catch (error) {
      logger.error('Error getting trends:', error);
      throw error;
    }
  }
  /**
   * Generar recomendaciones basadas en los datos
   */
  private static generateRecommendations(data: {
    membershipStats: MembershipStats;
    retentionMetrics: RetentionMetrics;
    activityMetrics: ActivityMetrics;
    revenueByMember: RevenueByMember;
  }): string[] {
    const recommendations: string[] = [];
    // Recomendaciones basadas en retención
    if (data.retentionMetrics.churnRate > 20) {
      recommendations.push('La tasa de abandono es alta (>20%). Considera implementar programas de retención y encuestas de satisfacción.');
    }
    if (data.retentionMetrics.monthlyRetentionRate < 80) {
      recommendations.push('La retención mensual es baja (<80%). Revisa la calidad del servicio y la experiencia del cliente.');
    }
    // Recomendaciones basadas en actividad
    if (data.activityMetrics.classAttendanceRate < 60) {
      recommendations.push('La asistencia a clases es baja (<60%). Considera revisar horarios, variedad de clases y comunicación.');
    }
    if (data.activityMetrics.averageClassesPerMember < 2) {
      recommendations.push('El promedio de clases por miembro es bajo. Implementa incentivos para aumentar la participación.');
    }
    // Recomendaciones basadas en crecimiento
    if (data.membershipStats.membershipGrowthRate < 5) {
      recommendations.push('El crecimiento de membresías es lento (<5%). Considera campañas de marketing y programas de referidos.');
    }
    // Recomendaciones basadas en ingresos
    if (data.revenueByMember.averageRevenuePerMember < 1000) {
      recommendations.push('Los ingresos promedio por miembro son bajos. Evalúa la estructura de precios y servicios adicionales.');
    }
    // Recomendaciones generales
    if (data.membershipStats.suspendedMembers > data.membershipStats.totalMembers * 0.1) {
      recommendations.push('Hay muchos miembros suspendidos (>10%). Revisa las políticas de suspensión y ofrece planes de recuperación.');
    }
    if (recommendations.length === 0) {
      recommendations.push('¡Excelente! Los indicadores están en rangos saludables. Mantén el buen trabajo y continúa monitoreando.');
    }
    return recommendations;
  }
  /**
   * Métodos auxiliares para obtener datos de otras colecciones
   */
  private static async getAllPlanAssignments(): Promise<PlanAssignment[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'planAssignments'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        assignedAt: doc.data().assignedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date()
      })) as PlanAssignment[];
    } catch (error) {
      logger.error('Error getting plan assignments:', error);
      return [];
    }
  }
  private static async getAllClassAssignments(): Promise<ClassAssignment[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'classAssignments'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        assignedAt: doc.data().assignedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date()
      })) as ClassAssignment[];
    } catch (error) {
      logger.error('Error getting class assignments:', error);
      return [];
    }
  }
}
export default MemberAnalyticsService;