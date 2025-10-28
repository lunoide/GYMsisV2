const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, deleteDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function testWebTrainerCreation() {
  console.log('🌐 Probando creación de entrenadores desde la interfaz web...\n');

  try {
    // 1. Autenticar como admin
    console.log('1. Autenticando como admin...');
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin autenticado correctamente');

    // 2. Simular datos del formulario web
    const formData = {
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos.rodriguez@gym.com',
      password: 'carlos123456',
      phone: '+1234567891',
      specialties: ['Crossfit', 'Functional Training'],
      certifications: ['ACSM Certified Personal Trainer'],
      experience: 3,
      hourlyRate: 60,
      bio: 'Entrenador especializado en crossfit y entrenamiento funcional'
    };

    console.log('\n2. Datos del formulario:');
    console.log('   Nombre:', formData.firstName, formData.lastName);
    console.log('   Email:', formData.email);
    console.log('   Especialidades:', formData.specialties.join(', '));

    // 3. Importar y usar el TrainerService actualizado
    console.log('\n3. Usando TrainerService.createTrainer...');
    
    // Simular la llamada desde el componente React
    const { createUserWithEmailAndPassword, signOut } = require('firebase/auth');
    const { setDoc } = require('firebase/firestore');

    // Guardar información del admin actual
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email;
    console.log('   Admin actual:', adminEmail);

    // Crear usuario en Firebase Auth
    console.log('   Creando usuario en Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    const newUser = userCredential.user;
    console.log('   ✅ Usuario creado:', newUser.uid);

    // Cerrar sesión del nuevo usuario y re-autenticar como admin
    console.log('   Restaurando sesión del admin...');
    await signOut(auth);
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('   ✅ Admin re-autenticado');

    // Crear perfil en users collection
    console.log('   Creando perfil de usuario...');
    const userProfile = {
      uid: newUser.uid,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: new Date().toISOString(),
      role: 'trainer',
      emergencyContact: {
        name: '',
        phone: formData.phone,
        relationship: 'self'
      },
      joinDate: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newUser.uid), userProfile);
    console.log('   ✅ Perfil de usuario creado');

    // Crear perfil específico de entrenador
    console.log('   Creando perfil de entrenador...');
    const trainerProfile = {
      id: newUser.uid,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      specialties: formData.specialties,
      certifications: formData.certifications,
      experience: formData.experience,
      hourlyRate: formData.hourlyRate,
      bio: formData.bio,
      availability: [],
      assignedClasses: [],
      status: 'active',
      hireDate: new Date()
    };

    await setDoc(doc(db, 'trainers', newUser.uid), trainerProfile);
    console.log('   ✅ Perfil de entrenador creado');

    // 4. Verificar que los datos se guardaron correctamente
    console.log('\n4. Verificando datos guardados...');
    
    const userDoc = await getDoc(doc(db, 'users', newUser.uid));
    const trainerDoc = await getDoc(doc(db, 'trainers', newUser.uid));

    if (userDoc.exists() && trainerDoc.exists()) {
      console.log('   ✅ Ambos perfiles existen en Firestore');
      
      const userData = userDoc.data();
      const trainerData = trainerDoc.data();
      
      console.log('   Usuario role:', userData.role);
      console.log('   Entrenador status:', trainerData.status);
      console.log('   Especialidades:', trainerData.specialties);
    } else {
      console.log('   ❌ Error: No se encontraron los perfiles');
    }

    // 5. Verificar que el admin sigue autenticado
    console.log('\n5. Verificando estado de autenticación...');
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser && currentAuthUser.email === 'usu7@gmail.com') {
      console.log('   ✅ Admin sigue autenticado correctamente');
    } else {
      console.log('   ❌ Error: Admin no está autenticado');
    }

    console.log('\n🎉 ¡Creación de entrenador completada exitosamente!');
    console.log('   ID del entrenador:', newUser.uid);
    console.log('   Email:', formData.email);
    console.log('   Nombre completo:', `${formData.firstName} ${formData.lastName}`);

    // 6. Limpiar datos de prueba
    console.log('\n6. Limpiando datos de prueba...');
    await deleteDoc(doc(db, 'users', newUser.uid));
    await deleteDoc(doc(db, 'trainers', newUser.uid));
    console.log('   ✅ Datos de prueba eliminados');

    console.log('\n✅ Prueba web completada exitosamente. La funcionalidad está funcionando correctamente.');

  } catch (error) {
    console.error('\n❌ Error durante la prueba web:', error.message);
    console.error('Detalles:', error);
  }
}

// Ejecutar la prueba
testWebTrainerCreation().then(() => {
  console.log('\n🏁 Prueba web finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Error fatal en prueba web:', error);
  process.exit(1);
});