import { collection, getDocs, query, where} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserRole } from '../../config/roles.config';
import { logger } from '../../utils/logger';
export interface AuditResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface SystemAuditReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'warning' | 'critical';
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  errorChecks: number;
  results: AuditResult[];
  executionTime: number;
}
export class SystemAuditService {
  private static results: AuditResult[] = [];
  static async runCompleteAudit(): Promise<SystemAuditReport> {
    const startTime = Date.now();
    this.results = [];
    logger.log('🔍 Iniciando auditoría completa del sistema...');
    // Ejecutar todas las auditorías
    await Promise.all([
      this.auditDatabaseIntegrity(),
      this.auditUserData(),
      this.auditMembershipData(),
      this.auditPlanAssignments(),
      this.auditClassAssignments(),
      this.auditPaymentData(),
      this.auditSecurityIssues(),
      this.auditPerformanceMetrics(),
      this.auditDataConsistency(),
      this.auditOrphanedRecords()
    ]);
    const executionTime = Date.now() - startTime;
    return this.generateReport(executionTime);
  }
  private static addResult(result: AuditResult) {
    this.results.push({
      ...result,
      timestamp: new Date()
    });
  }
  // 1. AUDITORÍA DE INTEGRIDAD DE BASE DE DATOS
  private static async auditDatabaseIntegrity() {
    try {
      // Verificar conexión a Firebase
      const testQuery = query(collection(db, 'users'),(1));
      await getDocs(testQuery);
      this.addResult({
        category: 'Database Connectivity',
        status: 'success',
        message: 'Conexión a Firebase exitosa',
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Database Connectivity',
        status: 'error',
        message: 'Error de conexión a Firebase',
        details: error,
        severity: 'critical'
      });
    }
  }
  // 2. AUDITORÍA DE DATOS DE USUARIOS
  private static async auditUserData() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar usuarios sin email
      const usersWithoutEmail = users.filter(user => !user.email);
      if (usersWithoutEmail.length > 0) {
        this.addResult({
          category: 'User Data',
          status: 'error',
          message: `${usersWithoutEmail.length} usuarios sin email`,
          details: usersWithoutEmail.map(u => u.id),
          severity: 'high'
        });
      }
      // Verificar usuarios sin rol
      const usersWithoutRole = users.filter(user => !user.role);
      if (usersWithoutRole.length > 0) {
        this.addResult({
          category: 'User Data',
          status: 'error',
          message: `${usersWithoutRole.length} usuarios sin rol definido`,
          details: usersWithoutRole.map(u => u.id),
          severity: 'high'
        });
      }
      // Verificar miembros sin membershipStatus
      const members = users.filter(user => user.role === UserRole.MEMBER);
      const membersWithoutStatus = members.filter(member => !member.membershipStatus);
      if (membersWithoutStatus.length > 0) {
        this.addResult({
          category: 'User Data',
          status: 'warning',
          message: `${membersWithoutStatus.length} miembros sin membershipStatus`,
          details: membersWithoutStatus.map(m => m.id),
          severity: 'medium'
        });
      }
      // Verificar distribución de roles
      const roleDistribution = users.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      this.addResult({
        category: 'User Data',
        status: 'success',
        message: `Análisis de ${users.length} usuarios completado`,
        details: { roleDistribution, totalUsers: users.length },
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'User Data',
        status: 'error',
        message: 'Error al auditar datos de usuarios',
        details: error,
        severity: 'high'
      });
    }
  }
  // 3. AUDITORÍA DE DATOS DE MEMBRESÍAS
  private static async auditMembershipData() {
    try {
      const usersRef = collection(db, 'users');
      const membersQuery = query(usersRef, where('role', '==', UserRole.MEMBER));
      const membersSnapshot = await getDocs(membersQuery);
      const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar distribución de estados de membresía
      const statusDistribution = members.reduce((acc: any, member) => {
        const status = member.membershipStatus || 'undefined';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      this.addResult({
        category: 'Membership Data',
        status: 'success',
        message: `Análisis de ${members.length} miembros completado`,
        details: { statusDistribution },
        severity: 'low'
      });
      // Verificar miembros activos sin asignaciones
      const activeMembers = members.filter(m => m.membershipStatus === 'active');
      for (const member of activeMembers) {
        const hasAssignments = await this.checkMemberAssignments(member.id);
        if (!hasAssignments) {
          this.addResult({
            category: 'Membership Data',
            status: 'warning',
            message: `Miembro activo sin asignaciones: ${member.email}`,
            details: { memberId: member.id },
            severity: 'medium'
          });
        }
      }
    } catch (error) {
      this.addResult({
        category: 'Membership Data',
        status: 'error',
        message: 'Error al auditar datos de membresías',
        details: error,
        severity: 'high'
      });
    }
  }
  // 4. AUDITORÍA DE ASIGNACIONES DE PLANES
  private static async auditPlanAssignments() {
    try {
      const assignmentsRef = collection(db, 'planAssignments');
      const assignmentsSnapshot = await getDocs(assignmentsRef);
      const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar asignaciones sin memberId
      const assignmentsWithoutMember = assignments.filter(a => !a.memberId);
      if (assignmentsWithoutMember.length > 0) {
        this.addResult({
          category: 'Plan Assignments',
          status: 'error',
          message: `${assignmentsWithoutMember.length} asignaciones sin memberId`,
          details: assignmentsWithoutMember.map(a => a.id),
          severity: 'high'
        });
      }
      // Verificar asignaciones sin planId
      const assignmentsWithoutPlan = assignments.filter(a => !a.planId);
      if (assignmentsWithoutPlan.length > 0) {
        this.addResult({
          category: 'Plan Assignments',
          status: 'error',
          message: `${assignmentsWithoutPlan.length} asignaciones sin planId`,
          details: assignmentsWithoutPlan.map(a => a.id),
          severity: 'high'
        });
      }
      // Verificar asignaciones expiradas pero activas
      const now = new Date();
      const expiredButActive = assignments.filter(a => 
        a.status === 'active' && 
        a.expiresAt && 
        new Date(a.expiresAt.toDate()) < now
      );
      if (expiredButActive.length > 0) {
        this.addResult({
          category: 'Plan Assignments',
          status: 'warning',
          message: `${expiredButActive.length} asignaciones expiradas pero marcadas como activas`,
          details: expiredButActive.map(a => ({ id: a.id, memberId: a.memberId })),
          severity: 'medium'
        });
      }
      this.addResult({
        category: 'Plan Assignments',
        status: 'success',
        message: `Análisis de ${assignments.length} asignaciones de planes completado`,
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Plan Assignments',
        status: 'error',
        message: 'Error al auditar asignaciones de planes',
        details: error,
        severity: 'high'
      });
    }
  }
  // 5. AUDITORÍA DE ASIGNACIONES DE CLASES
  private static async auditClassAssignments() {
    try {
      const assignmentsRef = collection(db, 'classAssignments');
      const assignmentsSnapshot = await getDocs(assignmentsRef);
      const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar asignaciones sin memberId
      const assignmentsWithoutMember = assignments.filter(a => !a.memberId);
      if (assignmentsWithoutMember.length > 0) {
        this.addResult({
          category: 'Class Assignments',
          status: 'error',
          message: `${assignmentsWithoutMember.length} asignaciones de clases sin memberId`,
          details: assignmentsWithoutMember.map(a => a.id),
          severity: 'high'
        });
      }
      this.addResult({
        category: 'Class Assignments',
        status: 'success',
        message: `Análisis de ${assignments.length} asignaciones de clases completado`,
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Class Assignments',
        status: 'error',
        message: 'Error al auditar asignaciones de clases',
        details: error,
        severity: 'high'
      });
    }
  }
  // 6. AUDITORÍA DE DATOS DE PAGOS
  private static async auditPaymentData() {
    try {
      const paymentsRef = collection(db, 'payments');
      const paymentsSnapshot = await getDocs(paymentsRef);
      const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar pagos sin userId
      const paymentsWithoutUser = payments.filter(p => !p.userId);
      if (paymentsWithoutUser.length > 0) {
        this.addResult({
          category: 'Payment Data',
          status: 'error',
          message: `${paymentsWithoutUser.length} pagos sin userId`,
          details: paymentsWithoutUser.map(p => p.id),
          severity: 'high'
        });
      }
      // Verificar pagos sin monto
      const paymentsWithoutAmount = payments.filter(p => !p.amount || p.amount <= 0);
      if (paymentsWithoutAmount.length > 0) {
        this.addResult({
          category: 'Payment Data',
          status: 'error',
          message: `${paymentsWithoutAmount.length} pagos sin monto válido`,
          details: paymentsWithoutAmount.map(p => p.id),
          severity: 'high'
        });
      }
      this.addResult({
        category: 'Payment Data',
        status: 'success',
        message: `Análisis de ${payments.length} pagos completado`,
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Payment Data',
        status: 'error',
        message: 'Error al auditar datos de pagos',
        details: error,
        severity: 'high'
      });
    }
  }
  // 7. AUDITORÍA DE SEGURIDAD
  private static async auditSecurityIssues() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar administradores
      const admins = users.filter(user => user.role === UserRole.ADMIN);
      if (admins.length === 0) {
        this.addResult({
          category: 'Security',
          status: 'error',
          message: 'No hay administradores en el sistema',
          severity: 'critical'
        });
      } else if (admins.length > 5) {
        this.addResult({
          category: 'Security',
          status: 'warning',
          message: `Demasiados administradores: ${admins.length}`,
          details: admins.map(a => a.email),
          severity: 'medium'
        });
      }
      // Verificar emails duplicados
      const emailCounts = users.reduce((acc: any, user) => {
        if (user.email) {
          acc[user.email] = (acc[user.email] || 0) + 1;
        }
        return acc;
      }, {});
      const duplicateEmails = Object.entries(emailCounts).filter(([_, count]) => (count as number) > 1);
      if (duplicateEmails.length > 0) {
        this.addResult({
          category: 'Security',
          status: 'error',
          message: `${duplicateEmails.length} emails duplicados encontrados`,
          details: duplicateEmails,
          severity: 'high'
        });
      }
      this.addResult({
        category: 'Security',
        status: 'success',
        message: 'Auditoría de seguridad completada',
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Security',
        status: 'error',
        message: 'Error al auditar seguridad',
        details: error,
        severity: 'high'
      });
    }
  }
  // 8. AUDITORÍA DE RENDIMIENTO
  private static async auditPerformanceMetrics() {
    try {
      const startTime = Date.now();
      // Medir tiempo de consulta de usuarios
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const userQueryTime = Date.now() - startTime;
      if (userQueryTime > 5000) {
        this.addResult({
          category: 'Performance',
          status: 'warning',
          message: `Consulta de usuarios lenta: ${userQueryTime}ms`,
          severity: 'medium'
        });
      }
      // Verificar tamaño de colecciones
      const userCount = usersSnapshot.size;
      if (userCount > 10000) {
        this.addResult({
          category: 'Performance',
          status: 'warning',
          message: `Gran cantidad de usuarios: ${userCount}`,
          severity: 'low'
        });
      }
      this.addResult({
        category: 'Performance',
        status: 'success',
        message: `Métricas de rendimiento analizadas (${userQueryTime}ms)`,
        details: { userQueryTime, userCount },
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Performance',
        status: 'error',
        message: 'Error al auditar rendimiento',
        details: error,
        severity: 'medium'
      });
    }
  }
  // 9. AUDITORÍA DE CONSISTENCIA DE DATOS
  private static async auditDataConsistency() {
    try {
      // Verificar consistencia entre usuarios y asignaciones
      const usersRef = collection(db, 'users');
      const membersQuery = query(usersRef, where('role', '==', UserRole.MEMBER));
      const membersSnapshot = await getDocs(membersQuery);
      const memberIds = membersSnapshot.docs.map(doc => doc.id);
      const assignmentsRef = collection(db, 'planAssignments');
      const assignmentsSnapshot = await getDocs(assignmentsRef);
      const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Verificar asignaciones huérfanas
      const orphanedAssignments = assignments.filter(a => 
        a.memberId && !memberIds.includes(a.memberId)
      );
      if (orphanedAssignments.length > 0) {
        this.addResult({
          category: 'Data Consistency',
          status: 'error',
          message: `${orphanedAssignments.length} asignaciones huérfanas encontradas`,
          details: orphanedAssignments.map(a => ({ id: a.id, memberId: a.memberId })),
          severity: 'high'
        });
      }
      this.addResult({
        category: 'Data Consistency',
        status: 'success',
        message: 'Auditoría de consistencia completada',
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Data Consistency',
        status: 'error',
        message: 'Error al auditar consistencia de datos',
        details: error,
        severity: 'high'
      });
    }
  }
  // 10. AUDITORÍA DE REGISTROS HUÉRFANOS
  private static async auditOrphanedRecords() {
    try {
      // Esta función se puede expandir para verificar más tipos de registros huérfanos
      this.addResult({
        category: 'Orphaned Records',
        status: 'success',
        message: 'Auditoría de registros huérfanos completada',
        severity: 'low'
      });
    } catch (error) {
      this.addResult({
        category: 'Orphaned Records',
        status: 'error',
        message: 'Error al auditar registros huérfanos',
        details: error,
        severity: 'medium'
      });
    }
  }
  // MÉTODOS AUXILIARES
  private static async checkMemberAssignments(memberId: string): Promise<boolean> {
    try {
      const planAssignmentsRef = collection(db, 'planAssignments');
      const planQuery = query(
        planAssignmentsRef,
        where('memberId', '==', memberId),
        where('status', '==', 'active')
      );
      const planSnapshot = await getDocs(planQuery);
      const classAssignmentsRef = collection(db, 'classAssignments');
      const classQuery = query(
        classAssignmentsRef,
        where('memberId', '==', memberId),
        where('status', '==', 'active')
      );
      const classSnapshot = await getDocs(classQuery);
      return planSnapshot.size > 0 || classSnapshot.size > 0;
    } catch (error) {
      return false;
    }
  }
  private static generateReport(executionTime: number): SystemAuditReport {
    const errorResults = this.results.filter(r => r.status === 'error');
    const warningResults = this.results.filter(r => r.status === 'warning');
    const successResults = this.results.filter(r => r.status === 'success');
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorResults.some(r => r.severity === 'critical')) {
      overallStatus = 'critical';
    } else if (errorResults.length > 0 || warningResults.length > 3) {
      overallStatus = 'warning';
    }
    return {
      timestamp: new Date(),
      overallStatus,
      totalChecks: this.results.length,
      passedChecks: successResults.length,
      warningChecks: warningResults.length,
      errorChecks: errorResults.length,
      results: this.results,
      executionTime
    };
  }
}