const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

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

async function diagnoseTrainerLogin() {
  console.log('🔍 Diagnosticando problemas de login de entrenadores...\n');

  try {
    // 1. Primero autenticarse como admin
    console.log('🔐 Autenticando como admin...');
    const adminCredential = await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'password123');
    console.log('✅ Admin autenticado exitosamente');
    
    // 2. Buscar entrenadores en Firestore
    console.log('\n📊 Buscando entrenadores en Firestore...');
    const usersRef = collection(db, 'users');
    const trainersQuery = query(usersRef, where('role', '==', 'trainer'));
    const trainersSnapshot = await getDocs(trainersQuery);
    
    console.log(`Entrenadores encontrados: ${trainersSnapshot.size}`);
    
    const trainers = [];
    trainersSnapshot.forEach((doc) => {
      const data = doc.data();
      trainers.push({
        uid: doc.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role
      });
      console.log(`- ${data.firstName} ${data.lastName} (${data.email})`);
    });
    
    // 3. Cerrar sesión del admin
    await auth.signOut();
    console.log('\n🚪 Sesión de admin cerrada');
    
    // 4. Intentar login con cada entrenador
    if (trainers.length > 0) {
      console.log('\n🧪 Probando login de entrenadores...');
      
      for (const trainer of trainers) {
        console.log(`\n👤 Probando login para: ${trainer.firstName} ${trainer.lastName}`);
        console.log(`   Email: ${trainer.email}`);
        
        // Intentar con contraseñas comunes
        const passwords = ['password123', '123456', 'trainer123', 'Password123!'];
        
        for (const password of passwords) {
          try {
            console.log(`   🔑 Probando contraseña: ${password}`);
            const trainerCredential = await signInWithEmailAndPassword(auth, trainer.email, password);
            console.log(`   ✅ LOGIN EXITOSO con contraseña: ${password}`);
            console.log(`   UID: ${trainerCredential.user.uid}`);
            
            // Verificar perfil en Firestore
            const profileDoc = await getDoc(doc(db, 'users', trainerCredential.user.uid));
            if (profileDoc.exists()) {
              console.log(`   ✅ Perfil encontrado en Firestore`);
              console.log(`   Rol: ${profileDoc.data().role}`);
            } else {
              console.log(`   ❌ Perfil NO encontrado en Firestore`);
            }
            
            await auth.signOut();
            break; // Salir del bucle de contraseñas si el login fue exitoso
            
          } catch (loginError) {
            console.log(`   ❌ Falló con "${password}": ${loginError.code} - ${loginError.message}`);
            
            // Si es un error específico, mostrar más detalles
            if (loginError.code === 'auth/user-not-found') {
              console.log(`   ⚠️  El usuario no existe en Firebase Auth`);
            } else if (loginError.code === 'auth/wrong-password') {
              console.log(`   ⚠️  Contraseña incorrecta`);
            } else if (loginError.code === 'auth/invalid-credential') {
              console.log(`   ⚠️  Credenciales inválidas`);
            }
          }
        }
      }
    } else {
      console.log('⚠️ No se encontraron entrenadores para probar');
    }
    
    // 5. Crear un entrenador de prueba para verificar el proceso completo
    console.log('\n🧪 Creando entrenador de prueba...');
    
    // Primero autenticarse como admin nuevamente
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'password123');
    
    const testEmail = `trainer-test-${Date.now()}@test.com`;
    const testPassword = 'TestTrainer123!';
    
    try {
      console.log(`📝 Creando usuario en Firebase Auth: ${testEmail}`);
      const testUserCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log(`✅ Usuario creado en Firebase Auth: ${testUserCredential.user.uid}`);
      
      // Intentar login inmediatamente
      await auth.signOut();
      console.log(`🔑 Probando login inmediato con: ${testEmail}`);
      
      const loginCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log(`✅ Login inmediato exitoso: ${loginCredential.user.uid}`);
      
      await auth.signOut();
      
    } catch (testError) {
      console.log(`❌ Error creando/probando entrenador de prueba: ${testError.code} - ${testError.message}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Código:', error.code);
  }
}

diagnoseTrainerLogin();