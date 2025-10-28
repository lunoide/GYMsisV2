import { FirebaseUsageService } from '../services/analytics/firebaseUsageService';
import { AuthService } from '../services/auth/authService';
import { auth } from '../config/firebase';

/**
 * Diagnóstico para probar el servicio de uso de Firebase
 */
export async function testFirebaseUsageService() {
  console.log('🔍 Iniciando diagnóstico del servicio de uso de Firebase...');
  
  try {
    // 1. Verificar autenticación
    const currentUser = auth.currentUser;
    console.log('👤 Usuario actual:', currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email
    } : 'No autenticado');
    
    if (!currentUser) {
      console.warn('⚠️ No hay usuario autenticado. Algunas métricas pueden fallar.');
    }
    
    // 2. Probar getDatabaseMetrics
    console.log('\n📊 Probando getDatabaseMetrics...');
    try {
      const metrics = await FirebaseUsageService.getDatabaseMetrics();
      console.log('✅ Métricas de base de datos obtenidas:', metrics);
    } catch (error) {
      console.error('❌ Error en getDatabaseMetrics:', error);
    }
    
    // 3. Probar getUsageStats
    console.log('\n📈 Probando getUsageStats...');
    try {
      const stats = await FirebaseUsageService.getUsageStats();
      console.log('✅ Estadísticas de uso obtenidas:', stats);
    } catch (error) {
      console.error('❌ Error en getUsageStats:', error);
    }
    
    // 4. Probar getUsageAlerts
    console.log('\n🚨 Probando getUsageAlerts...');
    try {
      const alerts = await FirebaseUsageService.getUsageAlerts();
      console.log('✅ Alertas de uso obtenidas:', alerts);
    } catch (error) {
      console.error('❌ Error en getUsageAlerts:', error);
    }
    
    // 5. Probar getOptimizationRecommendations
    console.log('\n💡 Probando getOptimizationRecommendations...');
    try {
      const recommendations = await FirebaseUsageService.getOptimizationRecommendations();
      console.log('✅ Recomendaciones de optimización obtenidas:', recommendations);
    } catch (error) {
      console.error('❌ Error en getOptimizationRecommendations:', error);
    }
    
    console.log('\n✅ Diagnóstico del servicio de uso de Firebase completado.');
    
  } catch (error) {
    console.error('❌ Error general en el diagnóstico:', error);
  }
}

/**
 * Diagnóstico con autenticación como admin
 */
export async function testFirebaseUsageServiceWithAuth() {
  console.log('🔐 Iniciando diagnóstico con autenticación de admin...');
  
  try {
    // Intentar autenticarse como admin
    const adminEmail = 'admin@gym.com';
    const adminPassword = 'admin123';
    
    console.log(`🔑 Intentando autenticarse como admin (${adminEmail})...`);
    
    try {
      await AuthService.login({ email: adminEmail, password: adminPassword });
      console.log('✅ Autenticación exitosa como admin');
      
      // Esperar un momento para que la autenticación se propague
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ejecutar el diagnóstico principal
      await testFirebaseUsageService();
      
    } catch (authError) {
      console.error('❌ Error de autenticación:', authError);
      console.log('⚠️ Continuando sin autenticación...');
      await testFirebaseUsageService();
    }
    
  } catch (error) {
    console.error('❌ Error general en el diagnóstico con autenticación:', error);
  }
}

// Hacer las funciones disponibles globalmente para pruebas en consola
if (typeof window !== 'undefined') {
  (window as any).testFirebaseUsageService = testFirebaseUsageService;
  (window as any).testFirebaseUsageServiceWithAuth = testFirebaseUsageServiceWithAuth;
}