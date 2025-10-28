// Diagnóstico para probar la carga de entrenadores
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { TrainerService } from '../services/users/trainerService';
export async function testTrainerLoading() {
  console.log('🔍 Iniciando diagnóstico de carga de entrenadores...');
  try {
    // Paso 1: Autenticarse como admin
    console.log('📝 Paso 1: Autenticando como admin...');
    const adminEmail = 'admin@gym.com';
    const adminPassword = 'admin123';
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✅ Autenticación exitosa como admin');
    // Paso 2: Intentar cargar entrenadores
    console.log('📝 Paso 2: Cargando entrenadores...');
    const trainers = await TrainerService.getAllTrainers();
    console.log(`✅ Entrenadores cargados exitosamente: ${trainers.length} encontrados`);
    if (trainers.length > 0) {
      console.log('📋 Primeros entrenadores encontrados:');
      trainers.slice(0, 3).forEach((trainer, index) => {
        console.log(`  ${index + 1}. ${trainer.firstName} ${trainer.lastName} (${trainer.email})`);
      });
    } else {
      console.log('⚠️ No se encontraron entrenadores. Creando uno de prueba...');
      // Crear un entrenador de prueba
      const testTrainerData = {
        firstName: 'Carlos',
        lastName: 'Entrenador',
        email: 'carlos.trainer@gym.com',
        password: 'trainer123',
        phone: '+1234567890',
        specialties: ['Fitness', 'Cardio'],
        certifications: ['Certificación Nacional'],
        experience: 5,
        hourlyRate: 50,
        bio: 'Entrenador de prueba'
      };
      try {
        const newTrainer = await TrainerService.createTrainer(testTrainerData);
        console.log('✅ Entrenador de prueba creado:', newTrainer.firstName, newTrainer.lastName);
        // Verificar que aparece en la lista
        const updatedTrainers = await TrainerService.getAllTrainers();
        console.log(`✅ Lista actualizada: ${updatedTrainers.length} entrenadores`);
      } catch (createError) {
        console.error('❌ Error creando entrenador de prueba:', createError);
      }
    }
    // Paso 3: Cerrar sesión
    await signOut(auth);
    console.log('✅ Sesión cerrada');
    console.log('🎉 Diagnóstico de entrenadores completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el diagnóstico de entrenadores:', error);
    // Intentar cerrar sesión en caso de error
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('❌ Error cerrando sesión:', signOutError);
    }
  }
}
// Hacer la función disponible globalmente
(window as any).testTrainerLoading = testTrainerLoading;