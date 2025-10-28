import { 
  collection, 
  getDocs, 
  query, 
  where} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import { PaymentService } from '../payments/paymentService';
import { logger } from '../../utils/logger';
export interface DashboardStats {
  totalMembers: number;
  monthlyIncome: number;
  inactiveMembers: number;
  totalStaff: number;
}
export class DashboardStatsService {
  /**
   * Obtener todas las estadísticas del dashboard
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [totalMembers, monthlyIncome, inactiveMembers, totalStaff] = await Promise.all([
        this.getTotalMembers(),
        this.getMonthlyIncome(),
        this.getInactiveMembers(),
        this.getTotalStaff()
      ]);
      return {
        totalMembers,
        monthlyIncome,
        inactiveMembers,
        totalStaff
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw new Error('Error al obtener las estadísticas del dashboard');
    }
  }
  /**
   * Obtener el total de miembros activos
   */
  static async getTotalMembers(): Promise<number> {
    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER),
        where('membershipStatus', '==', 'active')
      );
      const querySnapshot = await getDocs(membersQuery);
      return querySnapshot.size;
    } catch (error) {
      logger.error('Error getting total members:', error);
      return 0;
    }
  }
  /**
   * Obtener el total de miembros activos (alias para claridad)
   */
  static async getActiveMembers(): Promise<number> {
    return this.getTotalMembers();
  }
  /**
   * Obtener el total de miembros (todos, sin filtrar por estado)
   */
  static async getTotalMembersCount(): Promise<number> {
    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER)
      );
      const querySnapshot = await getDocs(membersQuery);
      return querySnapshot.size;
    } catch (error) {
      logger.error('Error getting total members count:', error);
      return 0;
    }
  }
  /**
   * Obtener los ingresos del mes actual
   */
  static async getMonthlyIncome(): Promise<number> {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
      const monthlyIncome = await PaymentService.getMonthlyIncome(currentYear, currentMonth);
      return monthlyIncome?.totalIncome || 0;
    } catch (error) {
      logger.error('Error getting monthly income:', error);
      return 0;
    }
  }
  /**
   * Obtener el total de miembros inactivos
   */
  static async getInactiveMembers(): Promise<number> {
    try {
      const inactiveMembersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER),
        where('membershipStatus', 'in', ['inactive', 'suspended', 'expired'])
      );
      const querySnapshot = await getDocs(inactiveMembersQuery);
      return querySnapshot.size;
    } catch (error) {
      logger.error('Error getting inactive members:', error);
      return 0;
    }
  }
  /**
   * Obtener el total de personal (entrenadores + administradores)
   */
  static async getTotalStaff(): Promise<number> {
    try {
      const staffQuery = query(
        collection(db, 'users'),
        where('role', 'in', [UserRole.TRAINER, UserRole.ADMIN])
      );
      const querySnapshot = await getDocs(staffQuery);
      return querySnapshot.size;
    } catch (error) {
      logger.error('Error getting total staff:', error);
      return 0;
    }
  }
  /**
   * Obtener estadísticas detalladas de miembros por estado
   */
  static async getMembershipStatusBreakdown(): Promise<{[key: string]: number}> {
    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER)
      );
      const querySnapshot = await getDocs(membersQuery);
      const statusBreakdown: {[key: string]: number} = {
        active: 0,
        inactive: 0,
        suspended: 0,
        expired: 0
      };
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.membershipStatus || 'inactive';
        if (statusBreakdown.hasOwnProperty(status)) {
          statusBreakdown[status]++;
        } else {
          statusBreakdown.inactive++;
        }
      });
      return statusBreakdown;
    } catch (error) {
      logger.error('Error getting membership status breakdown:', error);
      return { active: 0, inactive: 0, suspended: 0, expired: 0 };
    }
  }
  /**
   * Obtener ingresos de los últimos 6 meses
   */
  static async getLastSixMonthsIncome(): Promise<{month: string, income: number}[]> {
    try {
      const currentDate = new Date();
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthlyIncome = await PaymentService.getMonthlyIncome(year, month);
        const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        results.push({
          month: monthName,
          income: monthlyIncome?.totalIncome || 0
        });
      }
      return results;
    } catch (error) {
      logger.error('Error getting last six months income:', error);
      return [];
    }
  }
}
export default DashboardStatsService;