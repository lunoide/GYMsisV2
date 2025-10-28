import { AuthService } from '../services/auth';
import { MemberService } from '../services/users/memberService';
import type { RegisterData } from '../types/auth.types';
export interface DiagnosticResult {
  success: boolean;
  step: string;
  error?: string;
  data?: any;
}
export class MemberRegistrationDiagnostic {
  static async testMemberRegistration(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    // Datos de prueba
    const testData: RegisterData = {
      email: `test.member.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Juan',
      lastName: 'Pérez',
      dateOfBirth: new Date('1990-01-01'),
      emergencyContact: {
        name: 'María Pérez',
        phone: '+56912345678',
        relationship: 'Hermana'
      }
    };
    try {
      // Paso 1: Intentar registrar el miembro
      results.push({
        success: true,
        step: 'Iniciando registro',
        data: { email: testData.email }
      });
      const user = await AuthService.register(testData);
      results.push({
        success: true,
        step: 'Usuario registrado en Firebase Auth',
        data: { uid: user.uid, email: user.email }
      });
      // Paso 2: Verificar que el perfil se guardó en Firestore
      await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
      const profile = await MemberService.getMemberById(user.uid);
      if (profile) {
        results.push({
          success: true,
          step: 'Perfil encontrado en Firestore',
          data: {
            uid: profile.uid,
            email: profile.email,
            role: profile.role,
            firstName: profile.firstName,
            lastName: profile.lastName
          }
        });
      } else {
        results.push({
          success: false,
          step: 'Perfil NO encontrado en Firestore',
          error: 'El perfil no se guardó correctamente en Firestore'
        });
      }
      // Paso 3: Verificar que aparece en la lista de miembros
      const allMembers = await MemberService.getAllMembers();
      const memberInList = allMembers.find(m => m.uid === user.uid);
      if (memberInList) {
        results.push({
          success: true,
          step: 'Miembro aparece en lista de miembros',
          data: { totalMembers: allMembers.length }
        });
      } else {
        results.push({
          success: false,
          step: 'Miembro NO aparece en lista de miembros',
          error: 'El miembro no se encuentra en la consulta getAllMembers()'
        });
      }
    } catch (error: any) {
      results.push({
        success: false,
        step: 'Error durante el registro',
        error: error.message || 'Error desconocido',
        data: { errorCode: error.code }
      });
    }
    return results;
  }
  static async checkExistingMembers(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    try {
      const members = await MemberService.getAllMembers();
      results.push({
        success: true,
        step: 'Consulta de miembros existentes',
        data: {
          totalMembers: members.length,
          members: members.map(m => ({
            uid: m.uid,
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName,
            role: m.role,
            membershipStatus: m.membershipStatus
          }))
        }
      });
      if (members.length === 0) {
        results.push({
          success: false,
          step: 'No hay miembros en la base de datos',
          error: 'La consulta no devuelve ningún miembro'
        });
      }
    } catch (error: any) {
      results.push({
        success: false,
        step: 'Error al consultar miembros existentes',
        error: error.message || 'Error desconocido'
      });
    }
    return results;
  }
  static logResults(results: DiagnosticResult[]): void {
    console.group('🔍 Diagnóstico de Registro de Miembros');
    results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${result.step}`);
      if (result.error) {
        console.error(`   Error: ${result.error}`);
      }
      if (result.data) {
        console.log('   Datos:', result.data);
      }
    });
    console.groupEnd();
  }
}
// Función para usar en la consola del navegador
(window as any).testMemberRegistration = async () => {
  console.log('🚀 Iniciando diagnóstico de registro de miembros...');
  // Primero verificar miembros existentes
  const existingResults = await MemberRegistrationDiagnostic.checkExistingMembers();
  MemberRegistrationDiagnostic.logResults(existingResults);
  // Luego probar registro nuevo
  const registrationResults = await MemberRegistrationDiagnostic.testMemberRegistration();
  MemberRegistrationDiagnostic.logResults(registrationResults);
  return { existingResults, registrationResults };
};
console.log('💡 Diagnóstico cargado. Usa testMemberRegistration() en la consola para probar.');