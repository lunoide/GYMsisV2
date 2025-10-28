// Script de prueba para registrar un miembro
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuración de Firebase (usar la misma del proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyBJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ", // Placeholder - usar la real
  authDomain: "sisgymv2.firebaseapp.com",
  projectId: "sisgymv2",
  storageBucket: "sisgymv2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para registrar un miembro de prueba
async function testMemberRegistration() {
  try {
    console.log('Iniciando registro de miembro de prueba...');
    
    const testData = {
      email: 'miembro.prueba@test.com',
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

    // 1. Crear usuario en Firebase Auth
    console.log('Creando usuario en Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      testData.email,
      testData.password
    );
    
    const user = userCredential.user;
    console.log('Usuario creado en Auth:', user.uid);

    // 2. Actualizar perfil en Firebase Auth
    console.log('Actualizando perfil en Firebase Auth...');
    await updateProfile(user, {
      displayName: `${testData.firstName} ${testData.lastName}`
    });

    // 3. Crear perfil en Firestore
    console.log('Creando perfil en Firestore...');
    const userProfile = {
      uid: user.uid,
      email: testData.email,
      firstName: testData.firstName,
      lastName: testData.lastName,
      dateOfBirth: testData.dateOfBirth.toISOString(),
      role: 'member',
      emergencyContact: testData.emergencyContact,
      membershipStatus: 'inactive',
      joinDate: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      points: 0
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('Perfil creado en Firestore exitosamente');
    
    console.log('✅ Registro completado exitosamente');
    console.log('UID del usuario:', user.uid);
    console.log('Email:', testData.email);
    
  } catch (error) {
    console.error('❌ Error durante el registro:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
  }
}

// Ejecutar la prueba
testMemberRegistration();