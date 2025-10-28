const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD82kmGrbC5a-TkA_66l2rA9C1ZrAyQKoc",
  authDomain: "sisgymv2.firebaseapp.com",
  projectId: "sisgymv2",
  storageBucket: "sisgymv2.firebasestorage.app",
  messagingSenderId: "1097281584097",
  appId: "1:1097281584097:web:4565f8d54ae9968bb170a0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testTrainerCreation() {
  console.log('🔐 Iniciando prueba de creación de entrenadores...\n');
  
  try {
    // 1. Autenticar como admin
    console.log('👤 Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log(`✅ Admin autenticado: ${adminCredential.user.email}`);
    console.log(`   UID: ${adminCredential.user.uid}\n`);
    
    // 2. Crear un nuevo entrenador
    const trainerEmail = `trainer-test-${Date.now()}@gym.com`;
    const trainerPassword = 'TrainerPassword123!';
    
    console.log('👨‍🏫 Creando nuevo entrenador...');
    console.log(`   Email: ${trainerEmail}`);
    console.log(`   Contraseña: ${trainerPassword}`);
    
    const trainerCredential = await createUserWithEmailAndPassword(auth, trainerEmail, trainerPassword);
    console.log(`✅ Usuario creado en Firebase Auth`);
    console.log(`   UID: ${trainerCredential.user.uid}\n`);
    
    // 3. Crear perfil de entrenador en Firestore
    console.log('📝 Creando perfil en Firestore...');
    const trainerProfile = {
      uid: trainerCredential.user.uid,
      email: trainerEmail,
      role: 'trainer',
      firstName: 'Entrenador',
      lastName: 'Prueba',
      phone: '+1234567890',
      specialties: ['Fitness General', 'Cardio'],
      certifications: ['Certificación Básica'],
      experience: '2 años',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminCredential.user.uid
    };
    
    await setDoc(doc(db, 'users', trainerCredential.user.uid), trainerProfile);
    console.log(`✅ Perfil creado en Firestore\n`);
    
    // 4. Verificar que el perfil se creó correctamente
    console.log('🔍 Verificando perfil creado...');
    const profileDoc = await getDoc(doc(db, 'users', trainerCredential.user.uid));
    
    if (profileDoc.exists()) {
      const profile = profileDoc.data();
      console.log(`✅ Perfil verificado:`);
      console.log(`   Nombre: ${profile.firstName} ${profile.lastName}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Rol: ${profile.role}`);
      console.log(`   Estado: ${profile.status}`);
      console.log(`   Especialidades: ${profile.specialties.join(', ')}`);
      console.log(`   Creado por: ${profile.createdBy}\n`);
    } else {
      console.log(`❌ No se pudo encontrar el perfil en Firestore\n`);
    }
    
    // 5. Probar login del nuevo entrenador
    console.log('🔐 Probando login del nuevo entrenador...');
    
    // Cerrar sesión del admin primero
    await auth.signOut();
    console.log('🚪 Sesión de admin cerrada');
    
    // Intentar login como entrenador
    const trainerLoginCredential = await signInWithEmailAndPassword(auth, trainerEmail, trainerPassword);
    console.log(`✅ Login de entrenador exitoso!`);
    console.log(`   Email: ${trainerLoginCredential.user.email}`);
    console.log(`   UID: ${trainerLoginCredential.user.uid}\n`);
    
    console.log('🎉 ¡Prueba de creación de entrenador EXITOSA!');
    console.log('✅ Todas las operaciones completadas correctamente:');
    console.log('   - Autenticación de admin');
    console.log('   - Creación de usuario en Firebase Auth');
    console.log('   - Creación de perfil en Firestore');
    console.log('   - Verificación de perfil');
    console.log('   - Login de entrenador');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.code || error.message);
    
    if (error.code === 'permission-denied') {
      console.error('   🚫 Error de permisos en Firestore');
      console.error('   💡 Verificar reglas de Firestore');
    } else if (error.code === 'auth/email-already-in-use') {
      console.error('   📧 El email ya está en uso');
    } else if (error.code === 'auth/weak-password') {
      console.error('   🔒 La contraseña es muy débil');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   📧 Email inválido');
    }
    
    console.error('\n   Stack trace:', error.stack);
  }
}

testTrainerCreation();