const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Configuración de Firebase (configuración real del proyecto)
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

async function checkVendorDocument() {
  try {
    console.log('🔍 Verificando documento del vendedor en Firestore...');
    
    // 1. Autenticar como vendedor
    console.log('1. Autenticando como vendedor...');
    const vendorEmail = 'vende@gmail.com';
    const vendorPassword = 'vende123';
    
    await signInWithEmailAndPassword(auth, vendorEmail, vendorPassword);
    console.log('✅ Vendedor autenticado:', auth.currentUser.email);
    console.log('   UID:', auth.currentUser.uid);
    
    // 2. Verificar si existe el documento del usuario en Firestore
    console.log('2. Verificando documento en Firestore...');
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('✅ Documento del usuario encontrado en Firestore');
      const userData = userDoc.data();
      console.log('   Datos del usuario:', JSON.stringify(userData, null, 2));
      
      if (userData.role === 'vendor') {
        console.log('✅ El usuario tiene rol de vendedor');
      } else {
        console.log('❌ El usuario NO tiene rol de vendedor. Rol actual:', userData.role);
      }
    } else {
      console.log('❌ Documento del usuario NO encontrado en Firestore');
      console.log('   Esto explica por qué las reglas de seguridad fallan');
      console.log('   La función hasRole() no puede leer el documento del usuario');
    }
    
    // 3. Intentar autenticar como admin para verificar permisos
    console.log('3. Verificando con admin...');
    await signOut(auth);
    
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin autenticado:', auth.currentUser.email);
    
    // Verificar documento del vendedor desde admin
    const adminCheckDoc = await getDoc(userDocRef);
    if (adminCheckDoc.exists()) {
      console.log('✅ Admin puede leer el documento del vendedor');
      console.log('   Datos:', JSON.stringify(adminCheckDoc.data(), null, 2));
    } else {
      console.log('❌ Admin tampoco puede leer el documento del vendedor');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (auth.currentUser) {
      await signOut(auth);
      console.log('🔓 Sesión cerrada');
    }
  }
}

checkVendorDocument();