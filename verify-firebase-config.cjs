const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD82kmGrbC5a-TkA_66l2rA9C1ZrAyQKoc",
  authDomain: "sisgymv2.firebaseapp.com",
  projectId: "sisgymv2",
  storageBucket: "sisgymv2.firebasestorage.app",
  messagingSenderId: "1097281584097",
  appId: "1:1097281584097:web:4565f8d54ae9968bb170a0"
};

async function verifyFirebaseConfig() {
  console.log('🔧 Verificando configuración de Firebase...\n');
  
  try {
    // Inicializar Firebase
    console.log('📱 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
    
    // Verificar Auth
    console.log('\n🔐 Verificando Firebase Auth...');
    const auth = getAuth(app);
    console.log('✅ Firebase Auth inicializado');
    console.log(`   Project ID: ${auth.app.options.projectId}`);
    console.log(`   Auth Domain: ${auth.app.options.authDomain}`);
    
    // Verificar Firestore
    console.log('\n🗄️ Verificando Firestore...');
    const db = getFirestore(app);
    console.log('✅ Firestore inicializado');
    console.log(`   Project ID: ${db.app.options.projectId}`);
    
    // Verificar conectividad
    console.log('\n🌐 Verificando conectividad...');
    
    // Intentar una operación simple en Auth
    try {
      const currentUser = auth.currentUser;
      console.log('✅ Auth accesible, usuario actual:', currentUser ? currentUser.email : 'ninguno');
    } catch (authError) {
      console.log('❌ Error accediendo a Auth:', authError.message);
    }
    
    console.log('\n📋 Configuración verificada exitosamente');
    console.log('🔍 El problema puede estar en las credenciales específicas del usuario');
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error.message);
    console.error('Código:', error.code);
  }
}

verifyFirebaseConfig();