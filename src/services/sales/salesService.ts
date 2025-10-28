import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  runTransaction,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { CreateProductSaleData, ProductSale, Product } from '../../types/product.types';
import type { UserProfile } from '../../types/auth.types';
import { logger, criticalLogger } from '../../utils/logger';

export class SalesService {
  private static instance: SalesService;
  private readonly salesCollection = 'sales';
  private readonly productsCollection = 'products';
  private readonly usersCollection = 'users';

  static getInstance(): SalesService {
    if (!SalesService.instance) {
      SalesService.instance = new SalesService();
    }
    return SalesService.instance;
  }

  /**
   * Crear una nueva venta
   */
  async createSale(saleData: CreateProductSaleData): Promise<string> {
    try {
      const saleId = await runTransaction(db, async (transaction) => {
        // TODAS LAS LECTURAS PRIMERO
        
        // Obtener información del producto
        const productRef = doc(db, this.productsCollection, saleData.productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) {
          throw new Error('Producto no encontrado');
        }

        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        
        // Verificar stock disponible
        if (product.stock < saleData.quantity) {
          throw new Error('Stock insuficiente');
        }

        // Si es miembro, obtener información del usuario
        let userData: UserProfile | null = null;
        let userRef: any = null;
        if (saleData.isMember && saleData.buyerId) {
          userRef = doc(db, this.usersCollection, saleData.buyerId);
          const userDoc = await transaction.get(userRef);
          
          if (userDoc.exists()) {
            userData = userDoc.data() as UserProfile;
          }
        }

        // TODAS LAS ESCRITURAS DESPUÉS
        
        // Calcular totales
        const totalAmount = product.price * saleData.quantity;
        const pointsAwarded = saleData.isMember ? product.points * saleData.quantity : 0;

        // Crear la venta usando transaction.set en lugar de addDoc
        const salesRef = collection(db, this.salesCollection);
        const saleDocRef = doc(salesRef); // Genera un nuevo documento con ID automático
        
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
          status: 'completed' as const,
          notes: saleData.notes || '',
          soldBy: saleData.soldBy,
          createdAt: Timestamp.now()
        };

        transaction.set(saleDocRef, saleDocData);

        // Actualizar stock del producto
        transaction.update(productRef, {
          stock: product.stock - saleData.quantity,
          updatedAt: Timestamp.now()
        });

        // Si es miembro, actualizar sus puntos
        if (saleData.isMember && saleData.buyerId && pointsAwarded > 0 && userData && userRef) {
          const currentPoints = userData.points || 0;
          
          transaction.update(userRef, {
            points: currentPoints + pointsAwarded,
            lastActivity: Timestamp.now()
          });
        }

        return { saleId: saleDocRef.id, totalAmount };
      });

      // Actualizar ingresos mensuales fuera de la transacción
      logger.log('🛒 SalesService.createSale: Llamando a updateMonthlyIncome', {
        totalAmount: saleId.totalAmount,
        date: new Date(),
        saleId: saleId.saleId
      });
      await this.updateMonthlyIncome(saleId.totalAmount, new Date());

      return saleId.saleId;
    } catch (error) {
      criticalLogger.error('Error creating sale:', error);
      throw error;
    }
  }

  /**
   * Obtener ventas por vendedor
   */
  async getSalesBySeller(sellerId: string): Promise<ProductSale[]> {
    try {
      const q = query(
        collection(db, this.salesCollection),
        where('soldBy', '==', sellerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        saleDate: doc.data().saleDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as ProductSale[];
    } catch (error) {
      logger.error('Error getting sales by seller:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las ventas (para admin)
   */
  async getAllSales(): Promise<ProductSale[]> {
    try {
      const q = query(
        collection(db, this.salesCollection),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        saleDate: doc.data().saleDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as ProductSale[];
    } catch (error) {
      logger.error('Error getting all sales:', error);
      throw error;
    }
  }

  /**
   * Buscar usuario por email para verificar membresía
   */
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const q = query(
        collection(db, this.usersCollection),
        where('email', '==', email.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      return {
        uid: userDoc.id,
        ...userData,
        dateOfBirth: new Date(userData.dateOfBirth),
        joinDate: new Date(userData.joinDate),
        lastActivity: userData.lastActivity ? new Date(userData.lastActivity) : undefined
      } as UserProfile;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de ventas
   */
  async getSalesStats(sellerId?: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    salesThisMonth: number;
    revenueThisMonth: number;
  }> {
    try {
      let q;
      if (sellerId) {
        q = query(
          collection(db, this.salesCollection),
          where('soldBy', '==', sellerId)
        );
      } else {
        q = query(collection(db, this.salesCollection));
      }
      
      const querySnapshot = await getDocs(q);
      const sales = querySnapshot.docs.map(doc => doc.data());
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      
      const salesThisMonth = sales.filter(sale => {
        const saleDate = sale.saleDate?.toDate() || new Date();
        return saleDate >= startOfMonth;
      }).length;
      
      const revenueThisMonth = sales
        .filter(sale => {
          const saleDate = sale.saleDate?.toDate() || new Date();
          return saleDate >= startOfMonth;
        })
        .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      
      return {
        totalSales,
        totalRevenue,
        salesThisMonth,
        revenueThisMonth
      };
    } catch (error) {
      logger.error('Error getting sales stats:', error);
      throw error;
    }
  }

  /**
   * Actualizar ingresos mensuales por ventas de productos
   */
  private async updateMonthlyIncome(amount: number, date: Date): Promise<void> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthlyIncomeId = `${year}-${month.toString().padStart(2, '0')}`;

      logger.log('🛒 SalesService.updateMonthlyIncome: Iniciando actualización', {
        amount,
        monthlyIncomeId,
        year,
        month
      });

      await runTransaction(db, async (transaction) => {
        const monthlyIncomeRef = doc(db, 'monthlyIncome', monthlyIncomeId);
        const monthlyIncomeDoc = await transaction.get(monthlyIncomeRef);

        if (monthlyIncomeDoc.exists()) {
          // Actualizar documento existente
          transaction.update(monthlyIncomeRef, {
            'productSales.total': increment(amount),
            'productSales.transactions': increment(1),
            totalIncome: increment(amount),
            totalTransactions: increment(1),
            updatedAt: serverTimestamp()
          });
        } else {
          // Crear nuevo documento
          const newMonthlyIncome = {
            year,
            month,
            totalIncome: amount, // Solo ventas de productos por ahora
            classIncome: {
              total: 0,
              transactions: 0
            },
            membershipIncome: {
              total: 0,
              transactions: 0
            },
            productSales: {
              total: amount,
              transactions: 1
            },
            otherIncome: {
              total: 0,
              transactions: 0
            },
            totalTransactions: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          transaction.set(monthlyIncomeRef, newMonthlyIncome);
        }
      });

      logger.log('🛒 SalesService.updateMonthlyIncome: Actualización completada exitosamente', {
        amount,
        monthlyIncomeId
      });
    } catch (error) {
      logger.error('🛒 SalesService.updateMonthlyIncome: Error:', error);
      throw new Error('Error al actualizar los ingresos mensuales');
    }
  }
}

export const salesService = SalesService.getInstance();