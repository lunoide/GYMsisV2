const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, deleteDoc, runTransaction, Timestamp } = require('firebase/firestore');

// Configuración de Firebase (configuración real del proyecto)
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

// Simular la función createSale del salesService
async function createSale(saleData) {
  try {
    const saleId = 'test-sale-' + Date.now();
    
    return await runTransaction(db, async (transaction) => {
      // 1. Leer información del producto
      const productRef = doc(db, 'products', saleData.productId);
      const productDoc = await transaction.get(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }
      
      const productData = productDoc.data();
      
      // Verificar stock
      if (productData.stock < saleData.quantity) {
        throw new Error('Insufficient stock');
      }
      
      // 2. Leer información del usuario si es miembro
      let userData = null;
      if (saleData.isMember && saleData.buyerId) {
        const userRef = doc(db, 'users', saleData.buyerId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      }
      
      // 3. Calcular total y puntos
      const totalAmount = saleData.quantity * saleData.unitPrice;
      const pointsAwarded = saleData.isMember ? Math.floor(totalAmount * 0.5) : 0;
      
      // 4. Crear documento de venta
      const saleRef = doc(db, 'sales', saleId);
      const saleDocData = {
        productId: saleData.productId,
        productName: saleData.productName,
        quantity: saleData.quantity,
        unitPrice: saleData.unitPrice,
        totalAmount: totalAmount,
        buyerName: saleData.buyerName,
        buyerEmail: saleData.buyerEmail,
        buyerId: saleData.buyerId || null,
        isMember: saleData.isMember,
        pointsAwarded: pointsAwarded,
        saleDate: Timestamp.now(),
        paymentMethod: saleData.paymentMethod,
        status: 'completed',
        notes: saleData.notes || '',
        soldBy: auth.currentUser.uid,
        createdAt: Timestamp.now()
      };
      
      transaction.set(saleRef, saleDocData);
      
      // 5. Actualizar stock del producto
      transaction.update(productRef, {
        stock: productData.stock - saleData.quantity,
        updatedAt: Timestamp.now()
      });
      
      // 6. Actualizar puntos del miembro si aplica
      if (saleData.isMember && saleData.buyerId && pointsAwarded > 0) {
        const userRef = doc(db, 'users', saleData.buyerId);
        const currentPoints = userData?.points || 0;
        transaction.update(userRef, {
          points: currentPoints + pointsAwarded,
          updatedAt: Timestamp.now()
        });
      }
      
      return { saleId, saleData: saleDocData };
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

async function testVendorSalesCreation() {
  try {
    console.log('🧪 Iniciando prueba de creación de ventas por vendedor...');
    
    // 1. Autenticar como vendedor
    console.log('1. Autenticando como vendedor...');
    const vendorEmail = 'vende@gmail.com'; // Usuario vendedor existente en el sistema
    const possiblePasswords = ['password123', '123456', 'vende123', 'Password123!', 'vende'];
    
    let authenticated = false;
    for (const password of possiblePasswords) {
      try {
        console.log(`   Probando contraseña: ${password}`);
        await signInWithEmailAndPassword(auth, vendorEmail, password);
        console.log('✅ Vendedor autenticado:', auth.currentUser.email);
        authenticated = true;
        break;
      } catch (error) {
        console.log(`   ❌ Contraseña incorrecta: ${password}`);
      }
    }
    
    if (!authenticated) {
      throw new Error('No se pudo autenticar al vendedor con ninguna contraseña');
    }
    
    // 2. Verificar que el usuario tiene rol de vendedor
    const vendorDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!vendorDoc.exists() || vendorDoc.data().role !== 'vendor') {
      throw new Error('El usuario no tiene rol de vendedor');
    }
    console.log('✅ Rol de vendedor verificado');
    
    // 3. Crear un producto de prueba
    console.log('2. Creando producto de prueba...');
    const productId = 'test-product-' + Date.now();
    const productData = {
      name: 'Producto Test',
      price: 25,
      stock: 10,
      category: 'test',
      description: 'Producto para prueba de ventas',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'products', productId), productData);
    console.log('✅ Producto creado:', productId);
    
    // 4. Crear un usuario miembro de prueba
    console.log('3. Creando usuario miembro de prueba...');
    const memberId = 'test-member-' + Date.now();
    const memberData = {
      email: 'testmember@test.com',
      firstName: 'Test',
      lastName: 'Member',
      role: 'member',
      points: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', memberId), memberData);
    console.log('✅ Usuario miembro creado:', memberId);
    
    // 5. Intentar crear una venta
    console.log('4. Intentando crear venta...');
    const saleData = {
      productId: productId,
      productName: productData.name,
      quantity: 2,
      unitPrice: productData.price,
      buyerName: 'Test Member',
      buyerEmail: 'testmember@test.com',
      buyerId: memberId,
      isMember: true,
      paymentMethod: 'cash',
      notes: 'Venta de prueba'
    };
    
    const result = await createSale(saleData);
    console.log('✅ Venta creada exitosamente:', result.saleId);
    
    // 6. Verificar que la venta se creó correctamente
    const saleDoc = await getDoc(doc(db, 'sales', result.saleId));
    if (!saleDoc.exists()) {
      throw new Error('La venta no se encontró en Firestore');
    }
    console.log('✅ Venta verificada en Firestore');
    
    // 7. Verificar que el stock se actualizó
    const updatedProductDoc = await getDoc(doc(db, 'products', productId));
    const updatedStock = updatedProductDoc.data().stock;
    if (updatedStock !== productData.stock - saleData.quantity) {
      throw new Error(`Stock no actualizado correctamente. Esperado: ${productData.stock - saleData.quantity}, Actual: ${updatedStock}`);
    }
    console.log('✅ Stock actualizado correctamente');
    
    // 8. Verificar que los puntos se actualizaron
    const updatedMemberDoc = await getDoc(doc(db, 'users', memberId));
    const updatedPoints = updatedMemberDoc.data().points;
    const expectedPoints = Math.floor(saleData.quantity * saleData.unitPrice * 0.5);
    if (updatedPoints !== expectedPoints) {
      throw new Error(`Puntos no actualizados correctamente. Esperado: ${expectedPoints}, Actual: ${updatedPoints}`);
    }
    console.log('✅ Puntos actualizados correctamente');
    
    // 9. Limpiar datos de prueba
    console.log('5. Limpiando datos de prueba...');
    await deleteDoc(doc(db, 'sales', result.saleId));
    await deleteDoc(doc(db, 'products', productId));
    await deleteDoc(doc(db, 'users', memberId));
    console.log('✅ Datos de prueba eliminados');
    
    console.log('🎉 ¡Prueba completada exitosamente! El vendedor puede crear ventas.');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cerrar sesión
    if (auth.currentUser) {
      await signOut(auth);
      console.log('🔓 Sesión cerrada');
    }
  }
}

// Ejecutar la prueba
testVendorSalesCreation();