// Script para hacer admin a un usuario usando Firestore directamente
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Configuración de Firebase (misma que en el proyecto)
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
const db = getFirestore(app);

async function makeUserAdminByUID(uid) {
  try {
    console.log(`Actualizando usuario con UID: ${uid} a admin...`);
    
    // Actualizar el documento del usuario en Firestore
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role: 'admin'
    });
    
    console.log(`✅ Usuario con UID ${uid} ahora es admin`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Obtener el UID del argumento de línea de comandos
const uid = process.argv[2];

if (!uid) {
  console.log('Uso: node makeAdminFirestore.js <uid>');
  console.log('Ejemplo: node makeAdminFirestore.js mewqIJcSBAeHrOOSaS5Cu2X9yX03');
  console.log('\nUIDs disponibles de users.json:');
  console.log('- mewqIJcSBAeHrOOSaS5Cu2X9yX03 (benja@gmail.com)');
  console.log('- 2ogzkZ5oBvU3P4dyEhjJ4PHIBLb2 (usu7@gmail.com)');
  console.log('- 8bDgZtMKK0TUoH26Z7WWdWU6wbo1 (abi@gmail.com)');
  process.exit(1);
}

makeUserAdminByUID(uid).then(() => {
  console.log('Proceso completado');
  process.exit(0);
});