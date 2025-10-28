const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'sisgymv2'
  });
}

const db = admin.firestore();

async function makeUserAdmin(email) {
  try {
    // Buscar el usuario por email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    
    console.log(`Usuario encontrado: ${email} (UID: ${uid})`);
    
    // Actualizar el documento del usuario en Firestore
    await db.collection('users').doc(uid).update({
      role: 'admin'
    });
    
    console.log(`✅ Usuario ${email} ahora es admin`);
    
    // Verificar la actualización
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      console.log('Datos del usuario:', userDoc.data());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Obtener el email del argumento de línea de comandos
const email = process.argv[2];

if (!email) {
  console.log('Uso: node makeAdmin.js <email>');
  console.log('Ejemplo: node makeAdmin.js usuario@ejemplo.com');
  process.exit(1);
}

makeUserAdmin(email).then(() => {
  console.log('Proceso completado');
  process.exit(0);
});