import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { MemberService } from '../services/users/memberService';
// Función para probar consultas de miembros con autenticación
export const testMembersWithAuth = async () => {
  try {
    console.log('🔐 Iniciando prueba con autenticación...');
    // Intentar autenticarse como admin (necesitarás credenciales válidas)
    const adminEmail = prompt('Ingresa email de admin:');
    const adminPassword = prompt('Ingresa contraseña de admin:');
    if (!adminEmail || !adminPassword) {
      console.log('❌ Credenciales no proporcionadas');
      return;
    }
    console.log('🔑 Autenticando como admin...');
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✅ Autenticado como:', userCredential.user.email);
    // Ahora probar la consulta de miembros
    console.log('👥 Consultando miembros...');
    const members = await MemberService.getAllMembers();
    console.log(`📊 Miembros encontrados: ${members.length}`);
    if (members.length > 0) {
      console.table(members.map(m => ({
        uid: m.uid,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        membershipStatus: m.membershipStatus,
        joinDate: m.joinDate
      })));
    } else {
      console.log('⚠️ No se encontraron miembros');
    }
    // Cerrar sesión
    await signOut(auth);
    console.log('🚪 Sesión cerrada');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Código:', error.code);
    if (error.code === 'auth/user-not-found') {
      console.log('💡 El usuario admin no existe');
    } else if (error.code === 'auth/wrong-password') {
      console.log('💡 Contraseña incorrecta');
    } else if (error.code === 'permission-denied') {
      console.log('💡 Sin permisos para acceder a los datos');
    }
  }
};
// Función para verificar el estado actual de autenticación
export const checkAuthStatus = () => {
  const user = auth.currentUser;
  if (user) {
    console.log('👤 Usuario autenticado:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
  } else {
    console.log('🚫 No hay usuario autenticado');
  }
};
// Hacer disponibles en la consola
(window as any).testMembersWithAuth = testMembersWithAuth;
(window as any).checkAuthStatus = checkAuthStatus;
console.log('💡 Funciones disponibles: testMembersWithAuth(), checkAuthStatus()');