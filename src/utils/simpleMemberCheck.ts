import { collection, getDocs, query, where} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../config/roles.config';
// Función simple para verificar miembros en Firestore
export const checkMembers = async () => {
  try {
    console.log('🔍 Verificando miembros en Firestore...');
    // Consulta directa a la colección users
    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    console.log(`📊 Total de usuarios en la colección: ${allUsersSnapshot.size}`);
    if (allUsersSnapshot.size > 0) {
      const allUsers: any[] = [];
      allUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        allUsers.push({
          id: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          membershipStatus: data.membershipStatus,
          joinDate: data.joinDate
        });
      });
      console.table(allUsers);
      // Filtrar solo miembros
      const members = allUsers.filter(user => user.role === UserRole.MEMBER);
      console.log(`👥 Miembros encontrados: ${members.length}`);
      if (members.length > 0) {
        console.log('📋 Lista de miembros:');
        console.table(members);
      } else {
        console.warn('⚠️ No se encontraron usuarios con rol "member"');
      }
      // Verificar roles únicos
      const uniqueRoles = [...new Set(allUsers.map(u => u.role))];
      console.log('🏷️ Roles encontrados:', uniqueRoles);
    } else {
      console.warn('⚠️ No hay usuarios en la base de datos');
    }
    // Intentar consulta con filtro (como lo hace MemberService)
    try {
      console.log('🔍 Probando consulta con filtro de rol...');
      const membersQuery = query(
        collection(db, 'users'),
        where('role', '==', UserRole.MEMBER),('firstName', 'asc')
      );
      const membersSnapshot = await getDocs(membersQuery);
      console.log(`👥 Miembros encontrados con consulta filtrada: ${membersSnapshot.size}`);
      if (membersSnapshot.size > 0) {
        const filteredMembers: any[] = [];
        membersSnapshot.forEach((doc) => {
          const data = doc.data();
          filteredMembers.push({
            id: doc.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role
          });
        });
        console.table(filteredMembers);
      }
    } catch (queryError: any) {
      console.error('❌ Error en consulta filtrada:', queryError.message);
      if (queryError.code === 'failed-precondition') {
        console.log('💡 Posible problema: Falta índice compuesto para la consulta');
      }
    }
  } catch (error: any) {
    console.error('❌ Error general:', error.message);
    console.error('Código de error:', error.code);
  }
};
// Hacer disponible en la consola
(window as any).checkMembers = checkMembers;
console.log('💡 Función checkMembers() disponible en la consola');