// Diagnóstico para probar la creación de perfiles de usuario
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthService } from '../services/auth/authService';
import { UserRole } from '../config/roles.config';
import type { UserProfile } from '../types/auth.types';
export async function testProfileCreation() {
  console.log('🔍 Iniciando diagnóstico de creación de perfiles...');
  try {
    // Paso 1: Crear un usuario de prueba
    console.log('📝 Paso 1: Creando usuario de prueba...');
    const testEmail = `test-${Date.now()}@gym.com`;
    const testPassword = 'test123456';
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    console.log('✅ Usuario creado exitosamente:', user.uid);
    // Paso 2: Crear perfil de usuario
    console.log('📝 Paso 2: Creando perfil de usuario...');
    const testProfile: UserProfile = {
      uid: user.uid,
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      role: UserRole.MEMBER,
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+1234567890',
        relationship: 'Friend'
      },
      membershipStatus: 'inactive',
      membershipType: 'basic',
      joinDate: new Date(),
      points: 0
    };
    console.log('📋 Datos del perfil a crear:', {
      uid: testProfile.uid,
      email: testProfile.email,
      firstName: testProfile.firstName,
      lastName: testProfile.lastName,
      role: testProfile.role
    });
    await AuthService.createUserProfile(user.uid, testProfile);
    console.log('✅ Perfil creado exitosamente');
    // Paso 3: Verificar que el perfil se guardó
    console.log('📝 Paso 3: Verificando perfil guardado...');
    const savedProfile = await AuthService.getUserProfile(user.uid);
    if (savedProfile) {
      console.log('✅ Perfil recuperado exitosamente:', {
        uid: savedProfile.uid,
        email: savedProfile.email,
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
        role: savedProfile.role
      });
    } else {
      console.log('❌ No se pudo recuperar el perfil');
    }
    // Paso 4: Limpiar - eliminar usuario de prueba
    console.log('📝 Paso 4: Limpiando usuario de prueba...');
    await user.delete();
    console.log('✅ Usuario de prueba eliminado');
    console.log('🎉 Diagnóstico de creación de perfiles completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el diagnóstico de creación de perfiles:', error);
    // Intentar cerrar sesión en caso de error
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('❌ Error cerrando sesión:', signOutError);
    }
  }
}
export async function testProfileCreationWithAuth() {
  console.log('🔍 Iniciando diagnóstico de creación de perfiles con autenticación...');
  try {
    // Paso 1: Autenticarse como admin
    console.log('📝 Paso 1: Autenticando como admin...');
    const adminEmail = 'admin@gym.com';
    const adminPassword = 'admin123';
    await AuthService.login({ email: adminEmail, password: adminPassword });
    console.log('✅ Autenticación exitosa como admin');
    // Paso 2: Intentar crear perfil de usuario
    await testProfileCreation();
    // Paso 3: Cerrar sesión
    await signOut(auth);
    console.log('✅ Sesión cerrada');
  } catch (error) {
    console.error('❌ Error en el diagnóstico con autenticación:', error);
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('❌ Error cerrando sesión:', signOutError);
    }
  }
}
// Hacer las funciones disponibles globalmente
(window as any).testProfileCreation = testProfileCreation;
(window as any).testProfileCreationWithAuth = testProfileCreationWithAuth;