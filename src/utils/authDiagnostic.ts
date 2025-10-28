import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { UserRole } from '../config/roles.config';

export const runAuthDiagnostic = async () => {
  console.log('🔍 Iniciando diagnóstico de autenticación...');
  
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('✅ Usuario autenticado:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        try {
          // Verificar si existe el documento del usuario en Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ Documento de usuario encontrado:', {
              role: userData.role,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email
            });
            
            // Verificar permisos específicos
            if (userData.role === 'admin') {
              console.log('✅ Usuario tiene rol de ADMIN - Puede crear entrenadores');
            } else {
              console.log('⚠️ Usuario NO tiene rol de admin:', userData.role);
            }
          } else {
            console.log('❌ No se encontró documento de usuario en Firestore');
            console.log('🔧 Esto puede causar errores de permisos');
          }
          
        } catch (error) {
          console.error('❌ Error al verificar documento de usuario:', error);
        }
        
      } else {
        console.log('❌ No hay usuario autenticado');
      }
      
      resolve(true);
    });
  });
};

// Función para verificar permisos específicos de trainers
export const checkTrainerPermissions = async () => {
  console.log('🔍 Verificando permisos específicos para trainers...');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No hay usuario autenticado');
    return;
  }
  
  try {
    // Intentar leer un documento de la colección trainers
    const testDoc = doc(db, 'trainers', 'test');
    await getDoc(testDoc);
    console.log('✅ Permisos de lectura en trainers: OK');
  } catch (error: any) {
    console.log('❌ Error de permisos en trainers:', error.message);
    if (error.code === 'permission-denied') {
      console.log('🔧 Problema de permisos detectado en la colección trainers');
    }
  }
};

// Función para hacer admin al usuario actual (solo para desarrollo)
export const makeCurrentUserAdmin = async () => {
  console.log('🔧 Intentando hacer admin al usuario actual...');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No hay usuario autenticado');
    return;
  }
  
  try {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      role: UserRole.ADMIN
    });
    console.log('✅ Usuario actualizado a admin exitosamente');
    console.log('🔄 Recarga la página para que los cambios tomen efecto');
  } catch (error: any) {
    console.error('❌ Error al hacer admin al usuario:', error);
    if (error.code === 'permission-denied') {
      console.log('🔧 No tienes permisos para actualizar tu propio documento');
      console.log('💡 Necesitas actualizar manualmente en Firebase Console');
    }
  }
};

// Función para verificar el estado actual del usuario
export const getCurrentUserInfo = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No hay usuario autenticado');
    return null;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📋 Información del usuario actual:', {
        uid: user.uid,
        email: user.email,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      return userData;
    } else {
      console.log('❌ No se encontró documento de usuario');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al obtener información del usuario:', error);
    return null;
  }
};

// Función para crear el documento de usuario admin completo
export const createAdminUserDocument = async () => {
  console.log('🔧 Creando documento de usuario admin...');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No hay usuario autenticado');
    return;
  }
  
  try {
    // Verificar si ya existe
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      console.log('✅ El documento ya existe, actualizando a admin...');
      await updateDoc(userRef, {
        role: UserRole.ADMIN,
        lastActivity: new Date().toISOString()
      });
      console.log('✅ Usuario actualizado a admin');
    } else {
      console.log('📝 Creando nuevo documento de usuario admin...');
      
      const adminUserData = {
        uid: user.uid,
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || 'Admin',
        lastName: user.displayName?.split(' ')[1] || 'User',
        role: UserRole.ADMIN,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };
      
      await setDoc(userRef, adminUserData);
      console.log('✅ Documento de usuario admin creado exitosamente');
      console.log('📋 Datos creados:', adminUserData);
    }
    
    console.log('🔄 Recarga la página para que los cambios tomen efecto');
    
  } catch (error: any) {
    console.error('❌ Error al crear documento de usuario admin:', error);
    if (error.code === 'permission-denied') {
      console.log('🔧 Error de permisos. Las reglas temporales pueden no estar funcionando.');
    }
  }
};

// Función para diagnosticar problemas del AuthContext
export const diagnoseAuthContext = async () => {
  console.log('🔍 Diagnosticando AuthContext...');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No hay usuario autenticado en Firebase Auth');
    return;
  }
  
  console.log('✅ Usuario autenticado en Firebase Auth:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName
  });
  
  try {
    // Intentar obtener el documento directamente
    console.log('📝 Intentando obtener documento de Firestore...');
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Documento encontrado en Firestore:', userData);
      
      // Verificar que tiene todos los campos necesarios
      const requiredFields = ['uid', 'email', 'firstName', 'lastName', 'role'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      if (missingFields.length > 0) {
        console.log('⚠️ Campos faltantes en el documento:', missingFields);
      } else {
        console.log('✅ Documento tiene todos los campos requeridos');
      }
      
      // Verificar permisos de lectura
      console.log('📝 Verificando permisos de lectura...');
      try {
        await getDoc(userRef);
        console.log('✅ Permisos de lectura funcionando correctamente');
      } catch (readError) {
        console.error('❌ Error de permisos de lectura:', readError);
      }
      
    } else {
      console.log('❌ Documento NO encontrado en Firestore');
      console.log('🔧 Esto explica el error "Perfil no encontrado"');
    }
    
  } catch (error) {
    console.error('❌ Error al acceder a Firestore:', error);
  }
};

// Exponer funciones globalmente para debugging
if (typeof window !== 'undefined') {
  (window as any).getCurrentUserInfo = getCurrentUserInfo;
  (window as any).makeCurrentUserAdmin = makeCurrentUserAdmin;
  (window as any).createAdminUserDocument = createAdminUserDocument;
  (window as any).diagnoseAuthContext = diagnoseAuthContext;
  (window as any).checkTrainerPermissions = checkTrainerPermissions;
  (window as any).runAuthDiagnostic = runAuthDiagnostic;
}