const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

// Configuración de Firebase (usando las mismas credenciales que la app)
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

async function diagnoseAuthIssues() {
  console.log('🔍 Iniciando diagnóstico de problemas de autenticación...\n');

  try {
    // 1. Verificar usuarios en Firestore
    console.log('📊 Verificando usuarios en Firestore...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`Total de usuarios en Firestore: ${usersSnapshot.size}\n`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`Usuario: ${userData.firstName} ${userData.lastName}`);
      console.log(`  UID: ${doc.id}`);
      console.log(`  Email: ${userData.email}`);
      console.log(`  Rol: ${userData.role}`);
      console.log(`  Estado: ${userData.membershipStatus}`);
      console.log('');
    });

    // 2. Intentar login con el admin
    console.log('🔐 Probando login del admin...');
    try {
      const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'password123');
      console.log('✅ Login del admin exitoso');
      console.log(`  UID: ${adminCredential.user.uid}`);
      console.log(`  Email: ${adminCredential.user.email}`);
      
      // Verificar perfil en Firestore
      const adminDocRef = doc(db, 'users', adminCredential.user.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        console.log('✅ Perfil del admin encontrado en Firestore');
        console.log(`  Rol: ${adminDoc.data().role}`);
      } else {
        console.log('❌ Perfil del admin NO encontrado en Firestore');
      }
      
      await auth.signOut();
    } catch (adminError) {
      console.log('❌ Error en login del admin:', adminError.message);
    }

    // 3. Buscar entrenadores y probar login
    console.log('\n🏃‍♂️ Buscando entrenadores...');
    const trainers = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'trainer') {
        trainers.push({ uid: doc.id, ...userData });
      }
    });

    console.log(`Entrenadores encontrados: ${trainers.length}`);
    
    for (const trainer of trainers) {
      console.log(`\nProbando login del entrenador: ${trainer.firstName} ${trainer.lastName}`);
      console.log(`  Email: ${trainer.email}`);
      
      // Intentar login con contraseñas comunes
      const commonPasswords = ['password123', '123456', 'trainer123'];
      
      for (const password of commonPasswords) {
        try {
          const trainerCredential = await signInWithEmailAndPassword(auth, trainer.email, password);
          console.log(`✅ Login exitoso con contraseña: ${password}`);
          console.log(`  UID: ${trainerCredential.user.uid}`);
          await auth.signOut();
          break;
        } catch (trainerError) {
          console.log(`❌ Falló con contraseña "${password}": ${trainerError.code}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

diagnoseAuthIssues();