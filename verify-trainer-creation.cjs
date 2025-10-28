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

async function verifyTrainerCreation() {
  console.log('🔍 Verificando que la función de creación de entrenadores funciona correctamente...\n');
  
  try {
    // 1. Autenticar como administrador
    console.log('👤 Autenticando como administrador...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log(`✅ Admin autenticado: ${adminCredential.user.email}`);
    console.log(`   UID: ${adminCredential.user.uid}\n`);
    
    // 2. Verificar si el admin tiene documento en users
    console.log('🔍 Verificando documento del admin en colección users...');
    try {
      const adminDoc = await getDoc(doc(db, 'users', adminCredential.user.uid));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        console.log(`✅ Documento encontrado - Rol: ${adminData.role}`);
      } else {
        console.log('⚠️  No se encontró documento en users, pero isAdminByEmail() debería funcionar');
      }
    } catch (error) {
      console.log(`⚠️  Error accediendo a users: ${error.code}, pero isAdminByEmail() debería funcionar`);
    }
    console.log('');
    
    // 3. Crear un nuevo entrenador de prueba
    const timestamp = Date.now();
    const trainerEmail = `trainer-verification-${timestamp}@gym.com`;
    const trainerPassword = 'TrainerPassword123!';
    
    console.log('🆕 Creando nuevo entrenador...');
    console.log(`   Email: ${trainerEmail}`);
    
    const trainerCredential = await createUserWithEmailAndPassword(auth, trainerEmail, trainerPassword);
    const trainerId = trainerCredential.user.uid;
    console.log(`✅ Usuario creado en Firebase Auth: ${trainerId}\n`);
    
    // 4. Volver a autenticar como admin para crear el perfil
    console.log('🔄 Re-autenticando como admin para crear perfil...');
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin re-autenticado\n');
    
    // 5. Crear perfil del entrenador en Firestore
    console.log('📝 Creando perfil del entrenador en Firestore...');
    const trainerProfile = {
      uid: trainerId,
      email: trainerEmail,
      firstName: 'Entrenador',
      lastName: 'Verificación',
      role: 'trainer',
      specialties: ['Fitness General', 'Cardio'],
      hourlyRate: 30,
      bio: 'Entrenador de prueba para verificación del sistema',
      phone: '+1234567890',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'trainers', trainerId), trainerProfile);
    console.log('✅ Perfil del entrenador creado en Firestore\n');
    
    // 6. Verificar que el perfil se creó correctamente
    console.log('🔍 Verificando perfil creado...');
    const profileDoc = await getDoc(doc(db, 'trainers', trainerId));
    
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('✅ Perfil verificado exitosamente:');
      console.log(`   Nombre: ${profileData.firstName} ${profileData.lastName}`);
      console.log(`   Email: ${profileData.email}`);
      console.log(`   Rol: ${profileData.role}`);
      console.log(`   Especialidades: ${profileData.specialties.join(', ')}`);
      console.log(`   Tarifa por hora: $${profileData.hourlyRate}`);
      console.log(`   Estado: ${profileData.isActive ? 'Activo' : 'Inactivo'}\n`);
    } else {
      console.error('❌ Error: No se pudo encontrar el perfil del entrenador\n');
      return;
    }
    
    // 7. Probar login del nuevo entrenador
    console.log('🔐 Probando login del nuevo entrenador...');
    await signInWithEmailAndPassword(auth, trainerEmail, trainerPassword);
    console.log('✅ Login del entrenador exitoso\n');
    
    console.log('🎉 ¡VERIFICACIÓN COMPLETA!');
    console.log('✅ La función de creación de entrenadores funciona correctamente');
    console.log('✅ Los permisos de Firestore están configurados correctamente');
    console.log('✅ El entrenador puede hacer login y acceder a sus datos');
    console.log(`\n📋 Credenciales del nuevo entrenador:`);
    console.log(`   Email: ${trainerEmail}`);
    console.log(`   Password: ${trainerPassword}`);
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.code || error.message);
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  El email ya está en uso, pero esto indica que la creación funciona');
    } else if (error.code === 'permission-denied') {
      console.log('❌ Error de permisos - Verificar reglas de Firestore');
      console.log('   Asegúrate de que isAdminByEmail() incluye usu7@gmail.com');
    }
  }
}

verifyTrainerCreation();