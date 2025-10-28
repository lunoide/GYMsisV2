const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD82kmGrbC5a-TkA_66l2rA9C1ZrAyQKoc",
  authDomain: "sisgymv2.firebaseapp.com",
  projectId: "sisgymv2",
  storageBucket: "sisgymv2.firebasestorage.app",
  messagingSenderId: "1097281584097",
  appId: "1:1097281584097:web:4565f8d54ae9968bb170a0"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function debugAdminPermissions() {
  console.log('🔍 Debuggeando permisos del admin...\n');
  
  try {
    // 1. Autenticar como admin
    console.log('👤 Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    const adminUser = adminCredential.user;
    
    console.log(`✅ Admin autenticado: ${adminUser.email}`);
    console.log(`   UID: ${adminUser.uid}`);
    console.log(`   Email verificado: ${adminUser.emailVerified}`);
    console.log(`   Proveedor: ${adminUser.providerData[0]?.providerId || 'N/A'}\n`);
    
    // 2. Verificar token del usuario
    console.log('🔑 Verificando token del usuario...');
    const idToken = await adminUser.getIdToken();
    const tokenResult = await adminUser.getIdTokenResult();
    
    console.log(`   Token válido: ${!!idToken}`);
    console.log(`   Claims personalizados:`, tokenResult.claims);
    console.log(`   Email en token: ${tokenResult.claims.email}\n`);
    
    // 3. Verificar documento en colección users
    console.log('📄 Verificando documento en colección users...');
    const userDocRef = doc(db, 'users', adminUser.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ Documento de usuario encontrado:');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Rol: ${userData.role}`);
        console.log(`   Nombre: ${userData.firstName} ${userData.lastName}`);
        console.log(`   Activo: ${userData.isActive !== false ? 'Sí' : 'No'}\n`);
      } else {
        console.log('❌ No se encontró documento de usuario en Firestore');
        console.log('   Esto podría causar problemas con las reglas de seguridad\n');
        
        // Crear documento de usuario para el admin
        console.log('🔧 Creando documento de usuario para el admin...');
        const adminUserData = {
          uid: adminUser.uid,
          email: adminUser.email,
          firstName: 'Admin',
          lastName: 'Sistema',
          role: 'admin',
          isActive: true,
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        await setDoc(userDocRef, adminUserData);
        console.log('✅ Documento de usuario creado para el admin\n');
      }
    } catch (userDocError) {
      console.error('❌ Error accediendo al documento de usuario:', userDocError.message);
      console.log('   Esto indica un problema con las reglas de Firestore\n');
    }
    
    // 4. Probar creación directa en colección trainers
    console.log('🧪 Probando creación directa en colección trainers...');
    const testTrainerId = 'test-trainer-' + Date.now();
    const testTrainerData = {
      id: testTrainerId,
      firstName: 'Test',
      lastName: 'Trainer',
      email: `test-${Date.now()}@gym.com`,
      phone: '+1234567890',
      specialties: ['Test'],
      certifications: [],
      experience: 1,
      hourlyRate: 25,
      bio: 'Test trainer for debugging',
      availability: [],
      assignedClasses: [],
      status: 'active',
      hireDate: new Date()
    };
    
    try {
      await setDoc(doc(db, 'trainers', testTrainerId), testTrainerData);
      console.log('✅ Creación directa en trainers exitosa');
      console.log('   Las reglas de Firestore permiten al admin crear entrenadores\n');
    } catch (trainerCreateError) {
      console.error('❌ Error creando en trainers:', trainerCreateError.message);
      console.log('   Las reglas de Firestore NO permiten al admin crear entrenadores');
      console.log('   Código de error:', trainerCreateError.code);
      
      if (trainerCreateError.code === 'permission-denied') {
        console.log('\n🔍 Análisis del error de permisos:');
        console.log('   1. Verificar que isAdminByEmail() funcione correctamente');
        console.log('   2. Verificar que el email coincida exactamente');
        console.log('   3. Verificar que las reglas estén desplegadas');
      }
    }
    
    // 5. Verificar reglas específicas
    console.log('\n📋 Verificando condiciones de las reglas:');
    console.log(`   Email del usuario: "${adminUser.email}"`);
    console.log(`   ¿Es usu7@gmail.com?: ${adminUser.email === 'usu7@gmail.com'}`);
    console.log(`   ¿Es benja@gmail.com?: ${adminUser.email === 'benja@gmail.com'}`);
    
  } catch (error) {
    console.error('\n💥 Error en el debug:', error.message);
  }
}

// Ejecutar el debug
debugAdminPermissions()
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug falló:', error.message);
    process.exit(1);
  });