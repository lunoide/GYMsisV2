import { AuthService } from '../services/auth';
import { MemberService } from '../services/users/memberService';
import { makeUserAdminByUID } from './createAdmin';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { RegisterData } from '../types/auth.types';
// Función completa para configurar admin y probar el sistema
export const setupAdminAndTestMembers = async () => {
  try {
    console.log('🚀 Iniciando configuración completa del sistema...');
    const adminEmail = 'admin@gym.com';
    const adminPassword = 'AdminPassword123!';
    // Paso 1: Intentar autenticarse con admin existente
    console.log('🔍 Verificando si existe admin...');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('✅ Admin ya existe:', userCredential.user.email);
      await signOut(auth);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log('👤 Admin no existe, creando...');
        // Paso 2: Crear usuario admin
        const adminData: RegisterData = {
          email: adminEmail,
          password: adminPassword,
          firstName: 'Admin',
          lastName: 'Sistema',
          dateOfBirth: new Date('1990-01-01'),
          emergencyContact: {
            name: 'Sistema',
            phone: '+56912345678',
            relationship: 'Sistema'
          }
        };
        const adminUser = await AuthService.register(adminData);
        console.log('✅ Admin creado:', adminUser.email);
        // Paso 3: Cambiar rol a admin
        console.log('🔧 Cambiando rol a admin...');
        await makeUserAdminByUID(adminUser.uid);
        console.log('✅ Rol cambiado a admin');
        // Cerrar sesión del registro
        await signOut(auth);
      } else {
        throw authError;
      }
    }
    // Paso 4: Autenticarse como admin
    console.log('🔑 Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✅ Autenticado como admin:', adminCredential.user.email);
    // Paso 5: Probar consulta de miembros
    console.log('👥 Consultando miembros...');
    const members = await MemberService.getAllMembers();
    console.log(`📊 Miembros encontrados: ${members.length}`);
    if (members.length > 0) {
      console.log('📋 Lista de miembros:');
      console.table(members.map(m => ({
        uid: m.uid,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        membershipStatus: m.membershipStatus
      })));
    } else {
      console.log('⚠️ No se encontraron miembros');
      // Paso 6: Crear un miembro de prueba
      console.log('👤 Creando miembro de prueba...');
      await signOut(auth); // Cerrar sesión de admin
      const memberData: RegisterData = {
        email: `miembro.prueba.${Date.now()}@test.com`,
        password: 'MemberPassword123!',
        firstName: 'Juan',
        lastName: 'Pérez',
        dateOfBirth: new Date('1995-05-15'),
        emergencyContact: {
          name: 'María Pérez',
          phone: '+56987654321',
          relationship: 'Hermana'
        }
      };
      const memberUser = await AuthService.register(memberData);
      console.log('✅ Miembro de prueba creado:', memberUser.email);
      // Volver a autenticarse como admin
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      // Consultar miembros nuevamente
      console.log('🔄 Consultando miembros después de crear uno nuevo...');
      const updatedMembers = await MemberService.getAllMembers();
      console.log(`📊 Miembros encontrados ahora: ${updatedMembers.length}`);
      if (updatedMembers.length > 0) {
        console.table(updatedMembers.map(m => ({
          uid: m.uid,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          membershipStatus: m.membershipStatus
        })));
      }
    }
    // Cerrar sesión
    await signOut(auth);
    console.log('✅ Prueba completada exitosamente');
  } catch (error: any) {
    console.error('❌ Error durante la configuración:', error.message);
    console.error('Código:', error.code);
    // Intentar cerrar sesión en caso de error
    try {
      await signOut(auth);
    } catch (signOutError) {
      // Ignorar errores de cierre de sesión
    }
  }
};
// Hacer disponible en la consola
(window as any).setupAdminAndTestMembers = setupAdminAndTestMembers;
console.log('💡 Función setupAdminAndTestMembers() disponible en la consola');