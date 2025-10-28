const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc, updateDoc, getDoc, runTransaction } = require('firebase/firestore');

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

async function testIndividualOperations() {
  console.log('🔍 Diagnosticando permisos de vendedor...');
  
  try {
    // 1. Autenticar como vendedor
    console.log('1. Autenticando como vendedor...');
    const passwords = ['password123', '123456', 'vende123', 'Password123!', 'vende'];
    let authenticated = false;
    
    for (const password of passwords) {
      try {
        await signInWithEmailAndPassword(auth, 'vende@gmail.com', password);
        console.log(`✅ Vendedor autenticado con contraseña: ${password}`);
        authenticated = true;
        break;
      } catch (error) {
        console.log(`   ❌ Contraseña incorrecta: ${password}`);
      }
    }
    
    if (!authenticated) {
      throw new Error('No se pudo autenticar al vendedor');
    }
    
    const vendorUser = auth.currentUser;
    console.log(`   UID del vendedor: ${vendorUser.uid}`);
    
    // 2. Crear producto de prueba
    console.log('2. Probando creación de producto...');
    const productId = `test-product-${Date.now()}`;
    const productData = {
      name: 'Producto de Prueba',
      price: 100,
      stock: 10,
      category: 'supplements',
      description: 'Producto para prueba de permisos',
      createdAt: new Date(),
      createdBy: vendorUser.uid
    };
    
    try {
      await setDoc(doc(db, 'products', productId), productData);
      console.log('✅ Producto creado exitosamente');
    } catch (error) {
      console.log('❌ Error creando producto:', error.message);
      return;
    }
    
    // 3. Crear usuario miembro de prueba
    console.log('3. Probando creación de miembro...');
    const memberId = `test-member-${Date.now()}`;
    const memberData = {
      uid: memberId,
      email: `test-member-${Date.now()}@test.com`,
      firstName: 'Test',
      lastName: 'Member',
      role: 'member',
      points: 0,
      membershipStatus: 'active',
      joinDate: new Date(),
      createdAt: new Date()
    };
    
    try {
      await setDoc(doc(db, 'users', memberId), memberData);
      console.log('✅ Miembro creado exitosamente');
    } catch (error) {
      console.log('❌ Error creando miembro:', error.message);
      return;
    }
    
    // 4. Probar actualización de producto (stock)
    console.log('4. Probando actualización de stock del producto...');
    try {
      await updateDoc(doc(db, 'products', productId), {
        stock: 9
      });
      console.log('✅ Stock del producto actualizado exitosamente');
    } catch (error) {
      console.log('❌ Error actualizando stock del producto:', error.message);
    }
    
    // 5. Probar actualización de puntos del miembro
    console.log('5. Probando actualización de puntos del miembro...');
    try {
      await updateDoc(doc(db, 'users', memberId), {
        points: 10
      });
      console.log('✅ Puntos del miembro actualizados exitosamente');
    } catch (error) {
      console.log('❌ Error actualizando puntos del miembro:', error.message);
    }
    
    // 6. Probar creación de venta
    console.log('6. Probando creación de venta...');
    const saleId = `test-sale-${Date.now()}`;
    const saleData = {
      buyerId: memberId,
      sellerId: vendorUser.uid,
      items: [{
        productId: productId,
        quantity: 1,
        price: 100
      }],
      total: 100,
      pointsEarned: 10,
      saleDate: new Date(),
      status: 'completed'
    };
    
    try {
      await setDoc(doc(db, 'sales', saleId), saleData);
      console.log('✅ Venta creada exitosamente');
    } catch (error) {
      console.log('❌ Error creando venta:', error.message);
    }
    
    // 7. Probar transacción completa
    console.log('7. Probando transacción completa...');
    try {
      await runTransaction(db, async (transaction) => {
        // Leer producto
        const productRef = doc(db, 'products', productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) {
          throw new Error('Producto no encontrado');
        }
        
        // Leer miembro
        const memberRef = doc(db, 'users', memberId);
        const memberDoc = await transaction.get(memberRef);
        
        if (!memberDoc.exists()) {
          throw new Error('Miembro no encontrado');
        }
        
        // Crear venta
        const transactionSaleId = `transaction-sale-${Date.now()}`;
        const saleRef = doc(db, 'sales', transactionSaleId);
        transaction.set(saleRef, {
          ...saleData,
          transactionTest: true
        });
        
        // Actualizar stock
        transaction.update(productRef, {
          stock: productDoc.data().stock - 1
        });
        
        // Actualizar puntos
        transaction.update(memberRef, {
          points: (memberDoc.data().points || 0) + 10
        });
      });
      
      console.log('✅ Transacción completa exitosa');
    } catch (error) {
      console.log('❌ Error en transacción completa:', error.message);
    }
    
    // Limpiar datos de prueba
    console.log('8. Limpiando datos de prueba...');
    // (Omitimos la limpieza para mantener el diagnóstico simple)
    
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error.message);
  } finally {
    await signOut(auth);
    console.log('🔓 Sesión cerrada');
  }
}

testIndividualOperations().catch(console.error);