const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function testTrainerStats() {
  console.log('🔐 Probando acceso a estadísticas del entrenador...\n');
  
  try {
    // 1. Autenticar como el entrenador de prueba
    const trainerEmail = 'trainer-test-1761526967930@gym.com';
    const trainerPassword = 'TrainerPassword123!';
    
    console.log('👤 Autenticando como entrenador...');
    console.log(`   Email: ${trainerEmail}`);
    
    const trainerCredential = await signInWithEmailAndPassword(auth, trainerEmail, trainerPassword);
    console.log(`✅ Entrenador autenticado: ${trainerCredential.user.email}`);
    console.log(`   UID: ${trainerCredential.user.uid}\n`);
    
    const trainerId = trainerCredential.user.uid;
    
    // 2. Probar acceso a la colección 'classes'
    console.log('📚 Probando acceso a colección "classes"...');
    try {
      const classesQuery = query(
        collection(db, 'classes'),
        where('trainerId', '==', trainerId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      console.log(`✅ Acceso exitoso a "classes": ${classesSnapshot.size} clases encontradas\n`);
    } catch (error) {
      console.error(`❌ Error accediendo a "classes": ${error.code || error.message}\n`);
    }
    
    // 3. Probar acceso a la colección 'class_assignments'
    console.log('📋 Probando acceso a colección "class_assignments"...');
    try {
      const assignmentsQuery = query(
        collection(db, 'class_assignments'),
        where('trainerId', '==', trainerId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      console.log(`✅ Acceso exitoso a "class_assignments": ${assignmentsSnapshot.size} asignaciones encontradas\n`);
    } catch (error) {
      console.error(`❌ Error accediendo a "class_assignments": ${error.code || error.message}\n`);
    }
    
    // 4. Simular la función getTrainerStats completa
    console.log('📊 Simulando función getTrainerStats completa...');
    try {
      // Obtener clases asignadas
      const classesQuery = query(
        collection(db, 'classes'),
        where('trainerId', '==', trainerId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const totalClasses = classesSnapshot.size;

      // Obtener asignaciones de miembros a clases del entrenador
      const assignmentsQuery = query(
        collection(db, 'class_assignments'),
        where('trainerId', '==', trainerId),
        where('status', '==', 'active')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      // Contar miembros únicos
      const uniqueMembers = new Set();
      assignmentsSnapshot.forEach(doc => {
        const data = doc.data();
        uniqueMembers.add(data.memberId);
      });
      const totalMembers = uniqueMembers.size;

      // Calcular estadísticas
      const hourlyRate = 25; // Valor por defecto
      const estimatedHoursPerMonth = totalClasses * 4 * 1; // Asumiendo 1 hora por clase, 4 semanas por mes
      const monthlyEarnings = estimatedHoursPerMonth * hourlyRate;

      const stats = {
        totalClasses,
        totalMembers,
        averageRating: 4.5,
        monthlyEarnings
      };
      
      console.log(`✅ Estadísticas calculadas exitosamente:`);
      console.log(`   Total de clases: ${stats.totalClasses}`);
      console.log(`   Total de miembros: ${stats.totalMembers}`);
      console.log(`   Calificación promedio: ${stats.averageRating}`);
      console.log(`   Ganancias mensuales estimadas: $${stats.monthlyEarnings}\n`);
      
    } catch (error) {
      console.error(`❌ Error en getTrainerStats: ${error.code || error.message}\n`);
    }
    
    console.log('🎉 ¡Prueba de estadísticas del entrenador completada!');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.code || error.message);
    console.error('   Stack trace:', error.stack);
  }
}

testTrainerStats();