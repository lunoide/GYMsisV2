// Script simple para probar el registro de usuarios
// Ejecutar en la consola del navegador

async function testUserRegistration() {
  console.log('🧪 Probando registro de usuario...');
  
  const testData = {
    email: `test-user-${Date.now()}@example.com`,
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
    console.log('📝 Datos de prueba:', testData);
    
    // Usar AuthService para registrar
    const result = await AuthService.register(testData);
    
    console.log('✅ Registro exitoso!');
    console.log('📊 Resultado:', result);
    console.log('🆔 UID del usuario:', result.uid);
    console.log('📧 Email:', result.email);
    
    // Verificar en Firestore
    const userDoc = await getDoc(doc(db, 'users', result.uid));
    if (userDoc.exists()) {
      console.log('✅ Usuario encontrado en Firestore:', userDoc.data());
    } else {
      console.error('❌ Usuario NO encontrado en Firestore');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error en el registro:', error);
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    throw error;
  }
}

// Hacer disponible globalmente
window.testUserRegistration = testUserRegistration;

console.log('🔧 Script de prueba cargado. Ejecuta: testUserRegistration()');