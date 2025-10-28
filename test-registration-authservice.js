// Script para probar el registro usando AuthService directamente
// Ejecutar en la consola del navegador

async function testRegistrationWithAuthService() {
  console.log('🧪 PROBANDO REGISTRO CON AUTHSERVICE');
  
  // Importar AuthService
  const { AuthService } = await import('./src/services/auth/authService.ts');
  
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
  
  try {
    console.log('🚀 Iniciando registro...');
    const result = await AuthService.register(testData);
    console.log('✅ Registro exitoso:', result);
    
    // Verificar en Firestore
    const { db } = await import('./src/config/firebase.ts');
    const { doc, getDoc } = await import('firebase/firestore');
    
    console.log('🔍 Verificando en Firestore...');
    const docRef = doc(db, 'users', result.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ Usuario encontrado en Firestore:', docSnap.data());
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
window.testRegistrationWithAuthService = testRegistrationWithAuthService;

console.log('📋 Script cargado. Ejecuta: testRegistrationWithAuthService()');