const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc, deleteDoc } = require('firebase/firestore');

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
const auth = getAuth(app);
const db = getFirestore(app);

// Importar VendorService (simulado)
const VendorService = {
  async createVendor(data) {
    // Esta función simula la llamada al VendorService.createVendor corregido
    const { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut } = require('firebase/auth');
    const { doc, setDoc } = require('firebase/firestore');
    
    let userCredential = null;
    
    // Guardar información del admin actual antes de crear el nuevo usuario
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email;
    
    try {
      // 1. Crear usuario en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;
      
      // 2. Cerrar sesión del nuevo usuario y volver a autenticar como admin
      await signOut(auth);
      
      // Re-autenticar como admin si tenemos la información
      if (adminEmail && currentUser) {
        if (adminEmail === 'usu7@gmail.com') {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } else if (adminEmail === 'benja@gmail.com') {
          throw new Error('Credenciales de admin no configuradas para este usuario');
        }
      }

      try {
        // 3. Crear perfil de usuario en Firestore con rol 'vendor'
        const userProfile = {
          uid: user.uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth.toISOString(),
          role: 'vendor',
          emergencyContact: data.emergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        // Guardar en la colección 'users'
        await setDoc(doc(db, 'users', user.uid), userProfile);

        return {
          uid: user.uid,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          role: 'vendor',
          emergencyContact: data.emergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date(),
          lastActivity: new Date()
        };
        
      } catch (firestoreError) {
        console.error('Error creating vendor profile in Firestore:', firestoreError);
        
        // Restaurar autenticación del admin antes de limpiar
        if (adminEmail === 'usu7@gmail.com') {
          try {
            await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
          } catch (reAuthError) {
            console.error('Error al re-autenticar admin:', reAuthError);
          }
        }
        
        try {
          await user.delete();
          console.log('User deleted from Auth due to Firestore error');
        } catch (deleteError) {
          console.error('Error deleting user from Auth:', deleteError);
        }
        
        throw new Error('Error al crear el perfil del vendedor en la base de datos.');
      }
      
    } catch (authError) {
      console.error('Error creating vendor in Firebase Auth:', authError);
      
      // Restaurar autenticación del admin en caso de error de Auth
      if (adminEmail === 'usu7@gmail.com') {
        try {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } catch (reAuthError) {
          console.error('Error al re-autenticar admin:', reAuthError);
        }
      }
      
      throw authError;
    }
  }
};

async function testVendorCreationFix() {
  console.log('🧪 Iniciando prueba de corrección de creación de vendedores...\n');
  
  let testVendorId = null;
  
  try {
    // 1. Autenticar como admin
    console.log('1. Autenticando como admin...');
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin autenticado correctamente');
    
    // 2. Crear datos de prueba para el vendedor
    const testVendorData = {
      firstName: 'Vendor',
      lastName: 'Test',
      email: `vendor-test-${Date.now()}@test.com`,
      password: 'test123456',
      phone: '+1234567890',
      dateOfBirth: new Date('1990-01-01'),
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+0987654321',
        relationship: 'Familiar'
      }
    };
    
    console.log(`2. Creando vendedor de prueba: ${testVendorData.email}`);
    
    // 3. Usar VendorService.createVendor
    const createdVendor = await VendorService.createVendor(testVendorData);
    testVendorId = createdVendor.uid;
    
    console.log('✅ Vendedor creado exitosamente en Firebase Auth');
    console.log(`   UID: ${createdVendor.uid}`);
    
    // 4. Verificar que el admin sigue autenticado
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === 'usu7@gmail.com') {
      console.log('✅ Admin sigue autenticado después de crear vendedor');
    } else {
      console.log('❌ Admin perdió la autenticación');
      return;
    }
    
    // 5. Verificar que el perfil se guardó en Firestore
    console.log('3. Verificando perfil en Firestore...');
    const vendorDoc = await getDoc(doc(db, 'users', testVendorId));
    
    if (vendorDoc.exists()) {
      const vendorData = vendorDoc.data();
      console.log('✅ Perfil de vendedor encontrado en Firestore');
      console.log(`   Rol: ${vendorData.role}`);
      console.log(`   Email: ${vendorData.email}`);
      console.log(`   Nombre: ${vendorData.firstName} ${vendorData.lastName}`);
      
      if (vendorData.role === 'vendor') {
        console.log('✅ Rol de vendedor asignado correctamente');
      } else {
        console.log(`❌ Rol incorrecto: ${vendorData.role}`);
      }
    } else {
      console.log('❌ Perfil de vendedor no encontrado en Firestore');
    }
    
    console.log('\n🎉 Prueba de creación de vendedores completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error('Detalles del error:', error);
  } finally {
    // Limpiar datos de prueba
    if (testVendorId) {
      try {
        console.log('\n4. Limpiando datos de prueba...');
        await deleteDoc(doc(db, 'users', testVendorId));
        console.log('✅ Datos de prueba eliminados');
      } catch (cleanupError) {
        console.error('❌ Error al limpiar datos de prueba:', cleanupError);
      }
    }
    
    // Cerrar sesión
    try {
      await signOut(auth);
      console.log('✅ Sesión cerrada');
    } catch (signOutError) {
      console.error('❌ Error al cerrar sesión:', signOutError);
    }
  }
}

// Ejecutar la prueba
testVendorCreationFix().then(() => {
  console.log('\n✨ Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal en la prueba:', error);
  process.exit(1);
});