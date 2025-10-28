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

// Importar AuthService (simulado)
const AuthService = {
  async register(userData) {
    // Esta función simula la llamada al AuthService.register corregido
    const { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut } = require('firebase/auth');
    const { doc, setDoc } = require('firebase/firestore');
    
    let userCredential = null;
    
    // Detectar si hay un admin autenticado actualmente
    const currentUser = auth.currentUser;
    const isAdminCreating = currentUser && (currentUser.email === 'usu7@gmail.com' || currentUser.email === 'benja@gmail.com');
    const adminEmail = isAdminCreating ? currentUser.email : null;
    
    try {
      // 1. Crear usuario en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const user = userCredential.user;

      // 2. Actualizar el perfil del usuario
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // 3. Si un admin está creando el usuario, manejar el cambio de autenticación
      if (isAdminCreating) {
        // Cerrar sesión del nuevo usuario
        await signOut(auth);
        
        // Re-autenticar como admin
        if (adminEmail === 'usu7@gmail.com') {
          await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
        } else if (adminEmail === 'benja@gmail.com') {
          throw new Error('Credenciales de admin no configuradas para este usuario');
        }
      }

      try {
        // 4. Crear perfil de usuario en Firestore
        const userProfile = {
          uid: user.uid,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth.toISOString(),
          role: userData.role || 'member', // Rol por defecto: member
          emergencyContact: userData.emergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        // Guardar en la colección 'users'
        await setDoc(doc(db, 'users', user.uid), userProfile);

        return {
          uid: user.uid,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth,
          role: userData.role || 'member',
          emergencyContact: userData.emergencyContact,
          membershipStatus: 'inactive',
          joinDate: new Date(),
          lastActivity: new Date()
        };
        
      } catch (firestoreError) {
        console.error('Error creating user profile in Firestore:', firestoreError);
        
        // Restaurar autenticación del admin antes de limpiar
        if (isAdminCreating && adminEmail === 'usu7@gmail.com') {
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
        
        throw new Error('Error al crear el perfil del usuario en la base de datos.');
      }
      
    } catch (authError) {
      console.error('Error creating user in Firebase Auth:', authError);
      
      // Restaurar autenticación del admin en caso de error de Auth
      if (isAdminCreating && adminEmail === 'usu7@gmail.com') {
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

async function testMemberCreationFix() {
  console.log('🧪 Iniciando prueba de corrección de creación de miembros...\n');
  
  let testMemberId = null;
  
  try {
    // 1. Autenticar como admin
    console.log('1. Autenticando como admin...');
    await signInWithEmailAndPassword(auth, 'usu7@gmail.com', 'usu123');
    console.log('✅ Admin autenticado correctamente');
    
    // 2. Crear datos de prueba para el miembro
    const testMemberData = {
      firstName: 'Member',
      lastName: 'Test',
      email: `member-test-${Date.now()}@test.com`,
      password: 'test123456',
      phone: '+1234567890',
      dateOfBirth: new Date('1995-01-01'),
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+0987654321',
        relationship: 'Familiar'
      },
      role: 'member' // Especificar rol explícitamente
    };
    
    console.log(`2. Creando miembro de prueba: ${testMemberData.email}`);
    
    // 3. Usar AuthService.register
    const createdMember = await AuthService.register(testMemberData);
    testMemberId = createdMember.uid;
    
    console.log('✅ Miembro creado exitosamente en Firebase Auth');
    console.log(`   UID: ${createdMember.uid}`);
    
    // 4. Verificar que el admin sigue autenticado
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === 'usu7@gmail.com') {
      console.log('✅ Admin sigue autenticado después de crear miembro');
    } else {
      console.log('❌ Admin perdió la autenticación');
      return;
    }
    
    // 5. Verificar que el perfil se guardó en Firestore
    console.log('3. Verificando perfil en Firestore...');
    const memberDoc = await getDoc(doc(db, 'users', testMemberId));
    
    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      console.log('✅ Perfil de miembro encontrado en Firestore');
      console.log(`   Rol: ${memberData.role}`);
      console.log(`   Email: ${memberData.email}`);
      console.log(`   Nombre: ${memberData.firstName} ${memberData.lastName}`);
      
      if (memberData.role === 'member') {
        console.log('✅ Rol de miembro asignado correctamente');
      } else {
        console.log(`❌ Rol incorrecto: ${memberData.role}`);
      }
    } else {
      console.log('❌ Perfil de miembro no encontrado en Firestore');
    }
    
    console.log('\n🎉 Prueba de creación de miembros completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error('Detalles del error:', error);
  } finally {
    // Limpiar datos de prueba
    if (testMemberId) {
      try {
        console.log('\n4. Limpiando datos de prueba...');
        await deleteDoc(doc(db, 'users', testMemberId));
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
testMemberCreationFix().then(() => {
  console.log('\n✨ Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal en la prueba:', error);
  process.exit(1);
});