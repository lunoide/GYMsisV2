// Script para probar el registro corregido
// Ejecutar en la consola del navegador

async function testRegistrationFixed() {
  console.log('🧪 PROBANDO REGISTRO CORREGIDO');
  
  try {
    // Importar módulos necesarios
    const { AuthService } = await import('./src/services/auth/authService.ts');
    const { db } = await import('./src/config/firebase.ts');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const testData = {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '1234567890',
        relationship: 'Friend'
      }
    };
    
    console.log('📧 Datos de prueba:', { ...testData, password: '[HIDDEN]' });
    
    console.log('🚀 Iniciando registro...');
    const result = await AuthService.register(testData);
    console.log('✅ Registro exitoso en AuthService:', result);
    
    console.log('🔍 Verificando en Firestore...');
    const docRef = doc(db, 'users', result.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ ¡ÉXITO! Usuario encontrado en Firestore:', docSnap.data());
      console.log('🎉 El problema ha sido resuelto');
    } else {
      console.error('❌ Usuario NO encontrado en Firestore');
    }
    
  } catch (error) {
    console.error('❌ Error durante el registro:', error);
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

// Hacer disponible globalmente
window.testRegistrationFixed = testRegistrationFixed;

console.log('📋 Script cargado. Ejecuta: testRegistrationFixed()');