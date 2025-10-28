import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { RegisterData, UserProfile, FirestoreUserProfile } from '../types/auth.types';
import type { UserRole } from '../config/roles.config';
import { sanitizeText, sanitizeEmail } from '../utils/sanitization';

export class RegistrationDebugger {
  
  static async debugRegistration(testData?: Partial<RegisterData>): Promise<void> {
    const data: RegisterData = {
      email: testData?.email || `test${Date.now()}@example.com`,
      password: testData?.password || 'TestPassword123!',
      firstName: testData?.firstName || 'Test',
      lastName: testData?.lastName || 'User',
      dateOfBirth: testData?.dateOfBirth || new Date('1990-01-01'),
      emergencyContact: testData?.emergencyContact || {
        name: 'Emergency Contact',
        phone: '1234567890',
        relationship: 'Friend'
      }
    };

    console.log('🔍 INICIANDO DEBUG DE REGISTRO');
    console.log('📧 Datos de prueba:', { ...data, password: '[HIDDEN]' });

    try {
      // PASO 1: Crear usuario en Firebase Auth
      console.log('\n📝 PASO 1: Creando usuario en Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log('✅ Usuario creado en Auth:', user.uid);

      // PASO 2: Actualizar perfil en Auth
      console.log('\n👤 PASO 2: Actualizando perfil en Auth...');
      await updateProfile(user, {
        displayName: `${data.firstName} ${data.lastName}`
      });
      console.log('✅ Perfil actualizado en Auth');

      // PASO 3: Preparar datos para Firestore
      console.log('\n🗃️ PASO 3: Preparando datos para Firestore...');
      const sanitizedData = {
        email: sanitizeEmail(data.email),
        firstName: sanitizeText(data.firstName),
        lastName: sanitizeText(data.lastName),
        dateOfBirth: data.dateOfBirth.toISOString(),
        emergencyContact: {
          name: sanitizeText(data.emergencyContact.name),
          phone: sanitizeText(data.emergencyContact.phone),
          relationship: sanitizeText(data.emergencyContact.relationship)
        }
      };

      const userProfile: FirestoreUserProfile = {
        uid: user.uid,
        email: sanitizedData.email,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        dateOfBirth: sanitizedData.dateOfBirth,
        emergencyContact: sanitizedData.emergencyContact,
        role: 'member' as UserRole,
        membershipStatus: 'inactive',
        joinDate: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      console.log('📋 Datos preparados para Firestore:', userProfile);

      // PASO 4: Verificar permisos antes de guardar
      console.log('\n🔐 PASO 4: Verificando estado de autenticación...');
      console.log('Usuario autenticado:', !!auth.currentUser);
      console.log('UID del usuario:', auth.currentUser?.uid);
      console.log('UID coincide:', auth.currentUser?.uid === user.uid);

      // PASO 5: Intentar guardar en Firestore
      console.log('\n💾 PASO 5: Guardando en Firestore...');
      const docRef = doc(db, 'users', user.uid);
      
      try {
        await setDoc(docRef, userProfile);
        console.log('✅ Documento guardado exitosamente en Firestore');
      } catch (firestoreError) {
        console.error('❌ Error al guardar en Firestore:', firestoreError);
        console.error('Código de error:', (firestoreError as any).code);
        console.error('Mensaje de error:', (firestoreError as any).message);
        throw firestoreError;
      }

      // PASO 6: Verificar que se guardó correctamente
      console.log('\n🔍 PASO 6: Verificando que se guardó...');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('✅ Documento encontrado en Firestore');
        console.log('📄 Datos guardados:', docSnap.data());
      } else {
        console.error('❌ Documento NO encontrado en Firestore');
      }

      console.log('\n🎉 REGISTRO COMPLETADO EXITOSAMENTE');

    } catch (error: unknown) {
      console.error('\n💥 ERROR DURANTE EL REGISTRO:');
      console.error('Tipo:', (error as Error).constructor.name);
      console.error('Código:', (error as any).code);
      console.error('Mensaje:', (error as Error).message);
      console.error('Stack:', (error as Error).stack);
      
      // Limpiar usuario de Auth si se creó pero falló Firestore
      if (auth.currentUser) {
        console.log('\n🧹 Limpiando usuario de Auth...');
        try {
          await auth.currentUser.delete();
          console.log('✅ Usuario eliminado de Auth');
        } catch (deleteError) {
          console.error('❌ Error al eliminar usuario de Auth:', deleteError);
        }
      }
    }
  }

  static async testFirestoreConnection(): Promise<void> {
    console.log('🔗 PROBANDO CONEXIÓN A FIRESTORE');
    
    try {
      // Intentar leer una colección existente
      const testDoc = doc(db, 'users', 'test-connection');
      const docSnap = await getDoc(testDoc);
      
      console.log('✅ Conexión a Firestore exitosa');
      console.log('📄 Documento de prueba existe:', docSnap.exists());
      
    } catch (error) {
      console.error('❌ Error de conexión a Firestore:', error);
    }
  }

  static async testAuthState(): Promise<void> {
    console.log('🔐 PROBANDO ESTADO DE AUTENTICACIÓN');
    
    console.log('Usuario actual:', auth.currentUser);
    console.log('UID:', auth.currentUser?.uid);
    console.log('Email:', auth.currentUser?.email);
    console.log('Email verificado:', auth.currentUser?.emailVerified);
  }
}

// Exportar para uso en consola
(window as any).RegistrationDebugger = RegistrationDebugger;

export default RegistrationDebugger;