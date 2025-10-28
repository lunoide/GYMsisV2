// Script temporal para crear un usuario administrador
// Este archivo se puede eliminar después de crear el admin
import { doc} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../config/roles.config';
export const makeUserAdmin = async (userEmail: string): Promise<void> => {
  try {
    // Nota: En una implementación real, necesitarías buscar el usuario por email
    // Por ahora, asumimos que conoces el UID del usuario
    console.log(`Para hacer admin al usuario ${userEmail}:`);
    console.log('1. Ve a Firebase Console');
    console.log('2. Busca el documento del usuario en la colección "users"');
    console.log('3. Cambia el campo "role" de "member" a "admin"');
    console.log('4. Guarda los cambios');
    // Función para usar si tienes el UID del usuario
    // const userRef = doc(db, 'users', userUID);
    // await(userRef, {
    //   role: UserRole.ADMIN
    // });
  } catch (error) {
    console.error('Error al cambiar rol del usuario:', error);
    throw error;
  }
};
// Función alternativa si tienes el UID directamente
export const makeUserAdminByUID = async (userUID: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userUID);
    await(userRef, {
      role: UserRole.ADMIN
    });
    console.log(`Usuario ${userUID} ahora es administrador`);
  } catch (error) {
    console.error('Error al cambiar rol del usuario:', error);
    throw error;
  }
};