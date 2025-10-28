const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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

async function testAdminCredentials() {
  console.log('🔐 Probando diferentes credenciales de admin...\n');
  
  // Lista de posibles credenciales de admin basadas en la información proporcionada
  const adminCredentials = [
    { email: 'usu7@gmail.com', passwords: ['password123', '123456', 'admin123', 'Password123!', 'usu123'] },
    { email: 'benja@gmail.com', passwords: ['password123', '123456', 'admin123', 'Password123!', 'benja123'] },
    { email: 'admin@gym.com', passwords: ['password123', '123456', 'admin123', 'Password123!', 'AdminPassword123!'] }
  ];
  
  for (const admin of adminCredentials) {
    console.log(`👤 Probando usuario: ${admin.email}`);
    
    for (const password of admin.passwords) {
      try {
        console.log(`   🔑 Probando contraseña: ${password}`);
        const userCredential = await signInWithEmailAndPassword(auth, admin.email, password);
        
        console.log(`   ✅ LOGIN EXITOSO!`);
        console.log(`   UID: ${userCredential.user.uid}`);
        console.log(`   Email: ${userCredential.user.email}`);
        console.log(`   Email verificado: ${userCredential.user.emailVerified}`);
        console.log(`   Fecha de creación: ${userCredential.user.metadata.creationTime}`);
        
        // Cerrar sesión para probar el siguiente
        await auth.signOut();
        console.log(`   🚪 Sesión cerrada\n`);
        
        // Si encontramos credenciales válidas, salir del bucle
        return { email: admin.email, password: password, uid: userCredential.user.uid };
        
      } catch (error) {
        console.log(`   ❌ Falló: ${error.code}`);
        
        if (error.code === 'auth/user-not-found') {
          console.log(`   ⚠️  Usuario no existe en Firebase Auth`);
          break; // No probar más contraseñas para este email
        } else if (error.code === 'auth/wrong-password') {
          console.log(`   ⚠️  Contraseña incorrecta`);
        } else if (error.code === 'auth/invalid-credential') {
          console.log(`   ⚠️  Credenciales inválidas`);
        } else if (error.code === 'auth/too-many-requests') {
          console.log(`   ⚠️  Demasiados intentos, esperando...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    console.log(''); // Línea en blanco entre usuarios
  }
  
  console.log('❌ No se encontraron credenciales válidas de admin');
  return null;
}

testAdminCredentials()
  .then(result => {
    if (result) {
      console.log('🎉 Credenciales de admin encontradas:');
      console.log(`   Email: ${result.email}`);
      console.log(`   Contraseña: ${result.password}`);
      console.log(`   UID: ${result.uid}`);
    }
  })
  .catch(error => {
    console.error('❌ Error general:', error.message);
  });