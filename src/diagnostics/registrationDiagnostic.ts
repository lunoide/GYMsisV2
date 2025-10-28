import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { AuthService } from '../services/auth';
import type { RegisterData } from '../types/auth.types';

// Función para limpiar usuarios de prueba
async function cleanupTestUser(email: string) {
  try {
    // Intentar eliminar el usuario si existe
    const user = auth.currentUser;
    if (user && user.email === email) {
      await user.delete();
      console.log('✅ Usuario de prueba eliminado de Auth');
    }
  } catch (error) {
    console.log('ℹ️ No se pudo eliminar usuario de Auth (puede que no exista):', error);
  }
}

// Función para verificar las reglas de Firestore
async function testFirestoreRules() {
  console.log('\n🔍 Verificando reglas de Firestore...');
  
  try {
    // Intentar leer la colección users
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    console.log(`✅ Acceso a colección 'users' exitoso. Documentos encontrados: ${snapshot.size}`);
    
    // Verificar si podemos crear un documento de prueba
    const testDocRef = doc(db, 'users', 'test-permissions');
    await setDoc(testDocRef, {
      test: true,
      timestamp: new Date()
    });
    console.log('✅ Escritura en colección users permitida');
    
    // Limpiar documento de prueba
    await deleteDoc(testDocRef);
    console.log('✅ Eliminación en colección users permitida');
    
  } catch (error) {
    console.error('❌ Error con reglas de Firestore:', error);
    return false;
  }
  
  return true;
}

// Función para probar el registro manual paso a paso
async function testManualRegistration() {
  console.log('\n🧪 Probando registro manual paso a paso...');
  
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Juan',
    lastName: 'Pérez',
    dateOfBirth: new Date('1990-01-01'),
    emergencyContact: {
      name: 'María Pérez',
      phone: '+1234567890',
      relationship: 'Hermana'
    }
  };

  try {
    // Paso 1: Crear usuario en Firebase Auth
    console.log('📝 Paso 1: Creando usuario en Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      testData.email,
      testData.password
    );
    const user = userCredential.user;
    console.log(`✅ Usuario creado en Auth con UID: ${user.uid}`);

    // Paso 2: Actualizar perfil en Firebase Auth
    console.log('📝 Paso 2: Actualizando perfil en Firebase Auth...');
    await updateProfile(user, {
      displayName: `${testData.firstName} ${testData.lastName}`
    });
    console.log('✅ Perfil actualizado en Auth');

    // Paso 3: Crear documento en Firestore
    console.log('📝 Paso 3: Creando documento en Firestore...');
    const userProfile = {
      uid: user.uid,
      email: testData.email,
      firstName: testData.firstName,
      lastName: testData.lastName,
      dateOfBirth: testData.dateOfBirth,
      role: 'member',
      emergencyContact: testData.emergencyContact,
      membershipStatus: 'inactive',
      joinDate: new Date(),
      lastActivity: new Date(),
      points: 0
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, userProfile);
    console.log('✅ Documento creado en Firestore');

    // Paso 4: Verificar que el documento se guardó correctamente
    console.log('📝 Paso 4: Verificando documento en Firestore...');
    const savedDoc = await getDoc(userDocRef);
    if (savedDoc.exists()) {
      console.log('✅ Documento verificado en Firestore:', savedDoc.data());
    } else {
      console.error('❌ Documento no encontrado en Firestore');
    }

    // Limpiar
    await signOut(auth);
    console.log('✅ Registro manual completado exitosamente');
    
    return { success: true, uid: user.uid, email: testData.email };

  } catch (error) {
    console.error('❌ Error en registro manual:', error);
    return { success: false, error };
  }
}

// Función para probar el registro usando AuthService
async function testAuthServiceRegistration() {
  console.log('\n🔧 Probando registro usando AuthService...');
  
  const testData: RegisterData = {
    email: `authservice-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Ana',
    lastName: 'García',
    dateOfBirth: new Date('1992-05-15'),
    emergencyContact: {
      name: 'Carlos García',
      phone: '+1234567891',
      relationship: 'Padre'
    }
  };

  try {
    console.log('📝 Llamando AuthService.register...');
    const result = await AuthService.register(testData);
    console.log('✅ AuthService.register completado:', result);

    // Verificar que el usuario se creó en Firestore
    if (result && result.uid) {
      console.log('📝 Verificando documento en Firestore...');
      const userDocRef = doc(db, 'users', result.uid);
      const savedDoc = await getDoc(userDocRef);
      
      if (savedDoc.exists()) {
        console.log('✅ Documento encontrado en Firestore:', savedDoc.data());
      } else {
        console.error('❌ Documento NO encontrado en Firestore');
      }
    }

    await signOut(auth);
    return { success: true, result };

  } catch (error) {
    console.error('❌ Error en AuthService.register:', error);
    console.error('Código de error:', (error as any).code);
    console.error('Mensaje:', (error as any).message);
    return { success: false, error };
  }
}

// Función para verificar el estado actual de la base de datos
async function checkDatabaseState() {
  console.log('\n📊 Verificando estado actual de la base de datos...');
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`📈 Total de usuarios en la base de datos: ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      console.log('👥 Usuarios existentes:');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.firstName} ${data.lastName} (${data.email}) - Rol: ${data.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al verificar estado de la base de datos:', error);
  }
}

// Función principal de diagnóstico
export async function runRegistrationDiagnostic() {
  console.log('🚀 Iniciando diagnóstico de registro de usuarios...');
  console.log('================================================');
  
  // 1. Verificar estado de la base de datos
  await checkDatabaseState();
  
  // 2. Verificar reglas de Firestore
  const rulesOk = await testFirestoreRules();
  if (!rulesOk) {
    console.log('⚠️ Hay problemas con las reglas de Firestore. Continuando con las pruebas...');
  }
  
  // 3. Probar registro manual
  const manualResult = await testManualRegistration();
  
  // 4. Probar registro con AuthService
  const authServiceResult = await testAuthServiceRegistration();
  
  // 5. Verificar estado final
  await checkDatabaseState();
  
  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
  console.log('================================================');
  console.log(`🔐 Reglas de Firestore: ${rulesOk ? '✅ OK' : '❌ ERROR'}`);
  console.log(`🔧 Registro manual: ${manualResult.success ? '✅ OK' : '❌ ERROR'}`);
  console.log(`🚀 AuthService: ${authServiceResult.success ? '✅ OK' : '❌ ERROR'}`);
  
  if (!manualResult.success || !authServiceResult.success) {
    console.log('\n🔍 PROBLEMAS DETECTADOS:');
    if (!manualResult.success) {
      console.log('- Registro manual falló:', manualResult.error);
    }
    if (!authServiceResult.success) {
      console.log('- AuthService falló:', authServiceResult.error);
    }
  }
  
  return {
    firestoreRules: rulesOk,
    manualRegistration: manualResult,
    authServiceRegistration: authServiceResult
  };
}

// Función para probar solo AuthService (más rápida)
export async function quickAuthServiceTest() {
  console.log('⚡ Prueba rápida de AuthService...');
  return await testAuthServiceRegistration();
}

// Función para limpiar usuarios de prueba
export async function cleanupTestUsers() {
  console.log('🧹 Limpiando usuarios de prueba...');
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let cleaned = 0;
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      if (data.email && (data.email.includes('test-') || data.email.includes('authservice-test-'))) {
        await deleteDoc(docSnapshot.ref);
        cleaned++;
        console.log(`🗑️ Eliminado: ${data.email}`);
      }
    }
    
    console.log(`✅ ${cleaned} usuarios de prueba eliminados`);
    
  } catch (error) {
    console.error('❌ Error al limpiar usuarios de prueba:', error);
  }
}

// Exportar para uso en consola del navegador
(window as any).registrationDiagnostic = {
  runFull: runRegistrationDiagnostic,
  quickTest: quickAuthServiceTest,
  cleanup: cleanupTestUsers,
  checkDatabase: checkDatabaseState
};

console.log('🔧 Diagnóstico de registro cargado. Usa:');
console.log('- registrationDiagnostic.runFull() - Diagnóstico completo');
console.log('- registrationDiagnostic.quickTest() - Prueba rápida de AuthService');
console.log('- registrationDiagnostic.checkDatabase() - Ver estado de la BD');
console.log('- registrationDiagnostic.cleanup() - Limpiar usuarios de prueba');