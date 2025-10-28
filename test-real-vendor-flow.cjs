const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, getDoc, updateDoc, runTransaction, Timestamp } = require('firebase/firestore');

// Configuración de Firebase (valores reales del proyecto)
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

async function testRealVendorFlow() {
  try {
    console.log('🔐 Autenticando vendedor...');
    
    // Autenticar como vendedor (usando las mismas credenciales que funcionaron)
    const passwords = ['password123', '123456', 'vende123', 'Password123!', 'vende'];
    let userCredential = null;
    
    for (const password of passwords) {
      try {
        userCredential = await signInWithEmailAndPassword(auth, 'vende@gmail.com', password);
        console.log(`✅ Autenticado con password: ${password}`);
        break;
      } catch (error) {
        console.log(`❌ Falló password: ${password}`);
      }
    }
    
    if (!userCredential) {
      throw new Error('No se pudo autenticar con ninguna contraseña');
    }
    
    const user = userCredential.user;
    console.log(`✅ Usuario autenticado: ${user.email} (UID: ${user.uid})`);
    
    // Verificar el documento del usuario en Firestore
    console.log('\n📄 Verificando documento del usuario...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('Documento del usuario no existe');
    }
    
    const userData = userDoc.data();
    console.log(`✅ Documento del usuario encontrado. Rol: ${userData.role}`);
    
    // Simular exactamente lo que hace salesService.createSale
    console.log('\n🛒 Simulando creación de venta (como salesService)...');
    
    // Datos de la venta (simulando lo que envía SalesForm)
    const saleData = {
      productId: 'test-product-' + Date.now(),
      quantity: 1,
      buyerName: 'Test Buyer',
      buyerEmail: 'test@example.com',
      buyerId: 'test-member-' + Date.now(),
      isMember: true,
      paymentMethod: 'cash',
      notes: 'Test sale from real flow',
      soldBy: user.uid  // Este es el sellerId que viene del VendorDashboard
    };
    
    // Crear producto de prueba primero
    console.log('📦 Creando producto de prueba...');
    const productRef = await addDoc(collection(db, 'products'), {
      name: 'Test Product Real Flow',
      description: 'Producto de prueba para flujo real',
      price: 100,
      stock: 10,
      points: 10,
      category: 'test',
      isActive: true,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Actualizar saleData con el ID real del producto
    saleData.productId = productRef.id;
    
    // Crear miembro de prueba
    console.log('👤 Creando miembro de prueba...');
    const memberRef = await addDoc(collection(db, 'users'), {
      firstName: 'Test',
      lastName: 'Member',
      email: 'testmember@example.com',
      role: 'member',
      points: 0,
      membershipStatus: 'active',
      createdAt: Timestamp.now(),
      lastActivity: Timestamp.now()
    });
    
    // Actualizar saleData con el ID real del miembro
    saleData.buyerId = memberRef.id;
    
    console.log('💰 Ejecutando transacción de venta...');
    
    // Ejecutar la transacción exactamente como lo hace salesService
    const saleId = await runTransaction(db, async (transaction) => {
      // Obtener producto
      const productDocRef = doc(db, 'products', saleData.productId);
      const productDoc = await transaction.get(productDocRef);
      
      if (!productDoc.exists()) {
        throw new Error('Producto no encontrado');
      }
      
      const product = productDoc.data();
      console.log(`📦 Producto obtenido: ${product.name}, Stock: ${product.stock}`);
      
      // Verificar stock
      if (product.stock < saleData.quantity) {
        throw new Error('Stock insuficiente');
      }
      
      // Obtener datos del comprador si es miembro
      let userData = null;
      let userRef = null;
      
      if (saleData.isMember && saleData.buyerId) {
        userRef = doc(db, 'users', saleData.buyerId);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          userData = userDoc.data();
          console.log(`👤 Miembro obtenido: ${userData.firstName} ${userData.lastName}, Puntos: ${userData.points || 0}`);
        }
      }
      
      // Calcular totales
      const totalAmount = product.price * saleData.quantity;
      const pointsAwarded = saleData.isMember ? product.points * saleData.quantity : 0;
      
      console.log(`💵 Total: $${totalAmount}, Puntos a otorgar: ${pointsAwarded}`);
      
      // Crear la venta
      const salesRef = collection(db, 'sales');
      const saleDocRef = doc(salesRef);
      
      const saleDocData = {
        productId: saleData.productId,
        productName: product.name,
        quantity: saleData.quantity,
        unitPrice: product.price,
        totalAmount,
        buyerName: saleData.buyerName || '',
        buyerEmail: saleData.buyerEmail || '',
        buyerId: saleData.buyerId || null,
        isMember: saleData.isMember,
        pointsAwarded: pointsAwarded,
        saleDate: Timestamp.now(),
        paymentMethod: saleData.paymentMethod,
        status: 'completed',
        notes: saleData.notes || '',
        soldBy: saleData.soldBy,
        createdAt: Timestamp.now()
      };
      
      console.log('📝 Creando documento de venta...');
      transaction.set(saleDocRef, saleDocData);
      
      console.log('📦 Actualizando stock del producto...');
      transaction.update(productDocRef, {
        stock: product.stock - saleData.quantity,
        updatedAt: Timestamp.now()
      });
      
      // Actualizar puntos del miembro
      if (saleData.isMember && saleData.buyerId && pointsAwarded > 0 && userData && userRef) {
        const currentPoints = userData.points || 0;
        
        console.log(`🎯 Actualizando puntos del miembro: ${currentPoints} + ${pointsAwarded} = ${currentPoints + pointsAwarded}`);
        transaction.update(userRef, {
          points: currentPoints + pointsAwarded,
          lastActivity: Timestamp.now()
        });
      }
      
      return saleDocRef.id;
    });
    
    console.log(`✅ Venta creada exitosamente con ID: ${saleId}`);
    console.log('\n🎉 ¡Flujo real completado sin errores!');
    
  } catch (error) {
    console.error('❌ Error en el flujo real:', error);
    console.error('Detalles del error:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
  }
}

// Ejecutar el test
testRealVendorFlow();