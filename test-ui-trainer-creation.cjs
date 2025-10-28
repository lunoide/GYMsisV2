const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, getDocs, query, where } = require('firebase/firestore');

// Configuración de Firebase (misma que en la app)
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

// Simular exactamente lo que hace TrainerService.createTrainer
async function simulateUITrainerCreation() {
  console.log('🧪 Simulando creación de entrenador desde la interfaz web...\n');
  
  try {
    // 1. Autenticar como admin (como lo haría la interfaz)
    console.log('👤 Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log(`✅ Admin autenticado: ${adminCredential.user.email}\n`);
    
    // 2. Datos del formulario (simulando lo que envía AddTrainerForm)
    const formData = {
      firstName: 'Entrenador',
      lastName: 'UI Test',
      email: `trainer-ui-test-${Date.now()}@gym.com`,
      password: 'TestPassword123!',
      phone: '+1234567890',
      specialties: ['Fitness General', 'Cardio'],
      certifications: ['Certificación Básica'],
      experience: 2,
      hourlyRate: 35,
      bio: 'Entrenador creado desde la interfaz de prueba'
    };
    
    console.log('📝 Datos del formulario:');
    console.log(`   Nombre: ${formData.firstName} ${formData.lastName}`);
    console.log(`   Email: ${formData.email}`);
    console.log(`   Especialidades: ${formData.specialties.join(', ')}`);
    console.log(`   Experiencia: ${formData.experience} años`);
    console.log(`   Tarifa: $${formData.hourlyRate}/hora\n`);
    
    // 3. Validaciones (como las hace handleAddTrainer)
    console.log('🔍 Ejecutando validaciones...');
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      throw new Error('El nombre y apellido son obligatorios');
    }
    
    if (!formData.email.trim()) {
      throw new Error('El email es obligatorio');
    }
    
    if (!formData.password || formData.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    if (formData.specialties.length === 0) {
      throw new Error('Debe agregar al menos una especialidad');
    }
    
    console.log('✅ Validaciones pasadas\n');
    
    // 4. Simular TrainerService.createTrainer paso a paso
    console.log('🔄 Iniciando proceso de creación...');
    
    let userCredential = null;
    
    try {
      // Paso 1: Crear usuario en Firebase Auth
      console.log('   📧 Creando usuario en Firebase Auth...');
      userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      console.log(`   ✅ Usuario creado: ${user.uid}`);
      
      try {
        // Paso 2: Actualizar perfil de Firebase Auth
        console.log('   👤 Actualizando perfil de Firebase Auth...');
        await updateProfile(user, {
          displayName: `${formData.firstName} ${formData.lastName}`
        });
        console.log('   ✅ Perfil de Auth actualizado');
        
        // Paso 3: Crear perfil de usuario en colección 'users'
        console.log('   📄 Creando perfil en colección users...');
        const userProfile = {
          uid: user.uid,
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
        
        await setDoc(doc(db, 'users', user.uid), userProfile);
        console.log('   ✅ Perfil de usuario creado');
        
        // Paso 4: Crear perfil específico de entrenador
        console.log('   🏋️ Creando perfil en colección trainers...');
        const trainerProfile = {
          id: user.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          specialties: formData.specialties,
          certifications: formData.certifications,
          experience: formData.experience,
          hourlyRate: formData.hourlyRate,
          bio: formData.bio || '',
          availability: [],
          assignedClasses: [],
          status: 'active',
          hireDate: new Date()
        };
        
        await setDoc(doc(db, 'trainers', user.uid), trainerProfile);
        console.log('   ✅ Perfil de entrenador creado');
        
        console.log('\n🎉 ¡Entrenador creado exitosamente!');
        console.log(`   ID: ${trainerProfile.id}`);
        console.log(`   Nombre: ${trainerProfile.firstName} ${trainerProfile.lastName}`);
        console.log(`   Email: ${trainerProfile.email}`);
        
        // 5. Verificar que aparece en la lista de entrenadores
        console.log('\n🔍 Verificando que aparece en la lista...');
        const trainersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'trainer')
        );
        
        const querySnapshot = await getDocs(trainersQuery);
        console.log(`✅ Total de entrenadores en la base de datos: ${querySnapshot.size}`);
        
        // Buscar nuestro entrenador específico
        let found = false;
        querySnapshot.forEach((doc) => {
          if (doc.id === user.uid) {
            found = true;
            console.log(`✅ Entrenador encontrado en la lista: ${doc.data().firstName} ${doc.data().lastName}`);
          }
        });
        
        if (!found) {
          console.log('⚠️ Entrenador no encontrado en la lista');
        }
        
        return trainerProfile;
        
      } catch (firestoreError) {
        console.error('❌ Error en Firestore:', firestoreError);
        
        // Intentar limpiar el usuario de Auth
        try {
          await user.delete();
          console.log('🧹 Usuario eliminado de Auth debido al error de Firestore');
        } catch (deleteError) {
          console.error('❌ Error eliminando usuario de Auth:', deleteError);
        }
        
        throw new Error('Error al crear el perfil del entrenador en la base de datos.');
      }
      
    } catch (authError) {
      console.error('❌ Error en Firebase Auth:', authError);
      
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error('Este email ya está registrado. Por favor, usa otro email.');
      } else if (authError.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
      } else if (authError.code === 'auth/invalid-email') {
        throw new Error('El email proporcionado no es válido.');
      } else {
        throw new Error('Error al crear la cuenta del entrenador. Por favor, intenta de nuevo.');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Error en la simulación:', error.message);
    throw error;
  }
}

// Ejecutar la prueba
simulateUITrainerCreation()
  .then(() => {
    console.log('\n✅ Simulación completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Simulación falló:', error.message);
    process.exit(1);
  });