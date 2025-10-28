// Script para crear el documento de usuario admin en Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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
const db = getFirestore(app);

async function createAdminUser(uid, email, firstName, lastName) {
  try {
    console.log(`Verificando usuario con UID: ${uid}...`);
    
    // Verificar si el documento ya existe
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      console.log('✅ El documento de usuario ya existe:');
      console.log(userDoc.data());
      
      // Verificar si ya es admin
      const userData = userDoc.data();
      if (userData.role === 'admin') {
        console.log('✅ El usuario ya es admin');
        return;
      } else {
        console.log(`🔄 Actualizando rol de '${userData.role}' a 'admin'...`);
        await setDoc(userRef, { ...userData, role: 'admin' }, { merge: true });
        console.log('✅ Rol actualizado a admin');
      }
    } else {
      console.log('📝 Creando nuevo documento de usuario admin...');
      
      const adminUserData = {
        uid: uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };
      
      await setDoc(userRef, adminUserData);
      console.log('✅ Documento de usuario admin creado exitosamente');
      console.log('Datos creados:', adminUserData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Obtener los parámetros de línea de comandos
const uid = process.argv[2];
const email = process.argv[3];
const firstName = process.argv[4] || 'Admin';
const lastName = process.argv[5] || 'User';

if (!uid || !email) {
  console.log('Uso: node createAdminUser.cjs <uid> <email> [firstName] [lastName]');
  console.log('Ejemplo: node createAdminUser.cjs mewqIJcSBAeHrOOSaS5Cu2X9yX03 benja@gmail.com Benja Nina');
  console.log('\nUIDs disponibles de users.json:');
  console.log('- mewqIJcSBAeHrOOSaS5Cu2X9yX03 (benja@gmail.com)');
  console.log('- 2ogzkZ5oBvU3P4dyEhjJ4PHIBLb2 (usu7@gmail.com)');
  console.log('- 8bDgZtMKK0TUoH26Z7WWdWU6wbo1 (abi@gmail.com)');
  process.exit(1);
}

createAdminUser(uid, email, firstName, lastName).then(() => {
  console.log('🎉 Proceso completado');
  process.exit(0);
});