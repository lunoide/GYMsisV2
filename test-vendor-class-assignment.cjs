const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJGKJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ",
  authDomain: "gymsisv2.firebaseapp.com",
  projectId: "gymsisv2",
  storageBucket: "gymsisv2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testVendorClassAssignment() {
  try {
    console.log('🧪 Iniciando prueba de asignación de clases por vendedor...');

    // 1. Buscar un vendedor existente
    console.log('📋 Buscando vendedor existente...');
    const vendorsQuery = query(collection(db, 'users'), where('role', '==', 'vendor'));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    
    if (vendorsSnapshot.empty) {
      console.log('❌ No se encontraron vendedores en la base de datos');
      return;
    }

    const vendorDoc = vendorsSnapshot.docs[0];
    const vendorData = vendorDoc.data();
    console.log(`✅ Vendedor encontrado: ${vendorData.email} (${vendorData.firstName} ${vendorData.lastName})`);

    // 2. Buscar un miembro existente
    console.log('📋 Buscando miembro existente...');
    const membersQuery = query(collection(db, 'users'), where('role', '==', 'member'));
    const membersSnapshot = await getDocs(membersQuery);
    
    if (membersSnapshot.empty) {
      console.log('❌ No se encontraron miembros en la base de datos');
      return;
    }

    const memberDoc = membersSnapshot.docs[0];
    const memberData = memberDoc.data();
    console.log(`✅ Miembro encontrado: ${memberData.email} (${memberData.firstName} ${memberData.lastName})`);

    // 3. Buscar una clase existente
    console.log('📋 Buscando clase existente...');
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    
    if (classesSnapshot.empty) {
      console.log('❌ No se encontraron clases en la base de datos');
      return;
    }

    const classDoc = classesSnapshot.docs[0];
    const classData = classDoc.data();
    console.log(`✅ Clase encontrada: ${classData.name}`);

    // 4. Autenticar como vendedor
    console.log('🔐 Autenticando como vendedor...');
    
    // Nota: En un entorno real, necesitarías las credenciales del vendedor
    // Para esta prueba, vamos a simular la autenticación
    console.log('⚠️  Simulando autenticación de vendedor...');

    // 5. Intentar crear una asignación de clase
    console.log('📝 Intentando crear asignación de clase...');
    
    const classAssignmentData = {
      memberId: memberDoc.id,
      classId: classDoc.id,
      assignedBy: vendorDoc.id,
      assignedAt: new Date(),
      status: 'active',
      notes: 'Asignación de prueba por vendedor'
    };

    // Intentar crear en la colección classAssignments
    try {
      const assignmentRef = await addDoc(collection(db, 'classAssignments'), classAssignmentData);
      console.log(`✅ Asignación de clase creada exitosamente: ${assignmentRef.id}`);
      console.log('📊 Datos de la asignación:', classAssignmentData);
    } catch (error) {
      console.log('❌ Error al crear asignación de clase:', error.message);
      console.log('🔍 Código de error:', error.code);
      
      if (error.code === 'permission-denied') {
        console.log('🚫 PROBLEMA IDENTIFICADO: El vendedor no tiene permisos para crear asignaciones de clase');
        console.log('💡 Solución requerida: Actualizar reglas de Firestore para permitir a vendedores crear asignaciones');
      }
    }

    // 6. Verificar también la colección class_assignments (por si hay dos colecciones)
    console.log('📝 Verificando colección class_assignments...');
    try {
      const assignmentRef2 = await addDoc(collection(db, 'class_assignments'), classAssignmentData);
      console.log(`✅ Asignación en class_assignments creada exitosamente: ${assignmentRef2.id}`);
    } catch (error) {
      console.log('❌ Error en class_assignments:', error.message);
    }

  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

// Ejecutar la prueba
testVendorClassAssignment()
  .then(() => {
    console.log('🏁 Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });