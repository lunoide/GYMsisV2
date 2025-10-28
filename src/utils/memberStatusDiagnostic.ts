import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../config/roles.config';
export class MemberStatusDiagnostic {
  /**
   * Diagnóstico completo del estado de los miembros
   */
  static async runDiagnostic() {
    console.log('🔍 Iniciando diagnóstico de estado de miembros...');
    try {
      // Obtener todos los miembros
      const allMembersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER)
      );
      const allMembersSnapshot = await getDocs(allMembersQuery);
      const allMembers = allMembersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      console.log(`📊 Total de miembros en la base de datos: ${allMembers.length}`);
      // Agrupar por membershipStatus
      const statusGroups: { [key: string]: any[] } = {};
      allMembers.forEach((member: any) => {
        const status = member.membershipStatus || 'undefined';
        if (!statusGroups[status]) {
          statusGroups[status] = [];
        }
        statusGroups[status].push(member);
      });
      console.log('\n📈 Distribución por membershipStatus:');
      Object.entries(statusGroups).forEach(([status, members]) => {
        console.log(`  ${status}: ${members.length} miembros`);
        // Mostrar algunos ejemplos
        if (members.length > 0) {
          console.log(`    Ejemplos:`);
          members.slice(0, 3).forEach(member => {
            console.log(`      - ${member.name || member.email} (ID: ${member.id})`);
          });
        }
      });
      // Verificar miembros activos específicamente
      const activeMembersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER),
        where('membershipStatus', '==', 'active')
      );
      const activeMembersSnapshot = await getDocs(activeMembersQuery);
      console.log(`\n✅ Miembros con membershipStatus = 'active': ${activeMembersSnapshot.size}`);
      // Verificar miembros inactivos
      const inactiveMembersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER),
        where('membershipStatus', 'in', ['inactive', 'suspended', 'expired'])
      );
      const inactiveMembersSnapshot = await getDocs(inactiveMembersQuery);
      console.log(`❌ Miembros inactivos (inactive/suspended/expired): ${inactiveMembersSnapshot.size}`);
      // Verificar miembros sin membershipStatus definido
      const undefinedStatusMembers = allMembers.filter((member: any) => 
        !member.membershipStatus || member.membershipStatus === undefined
      );
      console.log(`⚠️  Miembros sin membershipStatus definido: ${undefinedStatusMembers.length}`);
      if (undefinedStatusMembers.length > 0) {
        console.log('    Ejemplos de miembros sin status:');
        undefinedStatusMembers.slice(0, 3).forEach((member: any) => {
          console.log(`      - ${member.name || member.email} (ID: ${member.id})`);
        });
      }
      return {
        totalMembers: allMembers.length,
        activeMembers: activeMembersSnapshot.size,
        inactiveMembers: inactiveMembersSnapshot.size,
        undefinedStatusMembers: undefinedStatusMembers.length,
        statusDistribution: Object.fromEntries(
          Object.entries(statusGroups).map(([status, members]) => [status, members.length])
        )
      };
    } catch (error) {
      console.error('❌ Error en el diagnóstico:', error);
      throw error;
    }
  }
  /**
   * Verificar la consistencia de los datos
   */
  static async checkConsistency() {
    const diagnostic = await this.runDiagnostic();
    console.log('\n🔍 Verificación de consistencia:');
    const expectedTotal = diagnostic.activeMembers + diagnostic.inactiveMembers + diagnostic.undefinedStatusMembers;
    if (expectedTotal === diagnostic.totalMembers) {
      console.log('✅ Los números son consistentes');
    } else {
      console.log('❌ Inconsistencia detectada:');
      console.log(`   Total esperado: ${expectedTotal}`);
      console.log(`   Total real: ${diagnostic.totalMembers}`);
      console.log(`   Diferencia: ${diagnostic.totalMembers - expectedTotal}`);
    }
    return diagnostic;
  }
}