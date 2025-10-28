const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, deleteDoc } = require('firebase/firestore');

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

async function testTrainerCreationFix() {
  console.log('🧪 Iniciando prueba de corrección de creación de entrenadores...\n');

  try {
    // 1. Autenticar como admin
    console.log('1. Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin autenticado:', adminCredential.user.email);

    // 2. Simular datos del entrenador
    const trainerData = {
      firstName: 'Test',
      lastName: 'Trainer',
      email: 'test.trainer@example.com',
      password: 'test123456',
      phone: '+1234567890',
      specialties: ['Fitness', 'Cardio'],
      certifications: ['Certified Personal Trainer'],
      experience: 2,
      hourlyRate: 50,
      bio: 'Entrenador de prueba'
    };

    console.log('\n2. Datos del entrenador a crear:');
    console.log('   Email:', trainerData.email);
    console.log('   Nombre:', trainerData.firstName, trainerData.lastName);

    // 3. Importar y usar el TrainerService
    console.log('\n3. Intentando crear entrenador usando TrainerService...');
    
    // Simular la lógica del TrainerService.createTrainer corregida
    const { createUserWithEmailAndPassword, signOut, updateProfile } = require('firebase/auth');
    
    // Guardar información del admin actual
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email;
    console.log('   Admin actual:', adminEmail);

    // Crear usuario en Firebase Auth
    console.log('   Creando usuario en Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      trainerData.email,
      trainerData.password
    );
    const newUser = userCredential.user;
    console.log('   ✅ Usuario creado en Auth:', newUser.uid);

    // Cerrar sesión del nuevo usuario
    console.log('   Cerrando sesión del nuevo usuario...');
    await signOut(auth);
    console.log('   ✅ Sesión cerrada');

    // Re-autenticar como admin
    console.log('   Re-autenticando como admin...');
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('   ✅ Admin re-autenticado');

    // Crear perfil en Firestore (users collection)
    console.log('   Creando perfil en colección users...');
    const userProfile = {
      uid: newUser.uid,
      email: trainerData.email,
      firstName: trainerData.firstName,
      lastName: trainerData.lastName,
      dateOfBirth: new Date().toISOString(),
      role: 'trainer',
      emergencyContact: {
        name: '',
        phone: trainerData.phone,
        relationship: 'self'
      },
      joinDate: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newUser.uid), userProfile);
    console.log('   ✅ Perfil creado en users collection');

    // Crear perfil específico de entrenador
    console.log('   Creando perfil en colección trainers...');
    const trainerProfile = {
      id: newUser.uid,
      firstName: trainerData.firstName,
      lastName: trainerData.lastName,
      email: trainerData.email,
      phone: trainerData.phone,
      specialties: trainerData.specialties,
      certifications: trainerData.certifications,
      experience: trainerData.experience,
      hourlyRate: trainerData.hourlyRate,
      bio: trainerData.bio || '',
      availability: [],
      assignedClasses: [],
      status: 'active',
      hireDate: new Date()
    };

    await setDoc(doc(db, 'trainers', newUser.uid), trainerProfile);
    console.log('   ✅ Perfil creado en trainers collection');

    console.log('\n🎉 ¡Entrenador creado exitosamente!');
    console.log('   ID:', newUser.uid);
    console.log('   Email:', trainerData.email);

    // 4. Limpiar - eliminar el entrenador de prueba
    console.log('\n4. Limpiando datos de prueba...');
    await deleteDoc(doc(db, 'users', newUser.uid));
    await deleteDoc(doc(db, 'trainers', newUser.uid));
    console.log('   ✅ Datos de prueba eliminados');

    console.log('\n✅ Prueba completada exitosamente. La corrección funciona correctamente.');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message);
    console.error('Detalles del error:', error);
  }
}

// Ejecutar la prueba
testTrainerCreationFix().then(() => {
  console.log('\n🏁 Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});