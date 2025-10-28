import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc,
  query, 
  where,
  orderBy,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { logger, criticalLogger } from '../../utils/logger';
import type { 
  Product, 
  CreateProductData, 
  UpdateProductData,
  ProductSale,
  CreateProductSaleData,
  ProductStats,
  PostimagesResponse
} from '../../types/product.types';
export class ProductService {
  private static readonly PRODUCTS_COLLECTION = 'products';
  private static readonly SALES_COLLECTION = 'productSales';
  private static readonly MONTHLY_INCOME_COLLECTION = 'monthlyIncome';
  /**
   * Crear un nuevo producto
   */
  static async createProduct(productData: CreateProductData): Promise<string> {
    try {
      const product: Omit<Product, 'id'> = {
        ...productData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await addDoc(collection(db, this.PRODUCTS_COLLECTION), product);
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating product:', error);
      throw new Error('Error al crear el producto');
    }
  }
  /**
   * Obtener todos los productos
   */
  static async getProducts(): Promise<Product[]> {
    try {
      const q = query(
        collection(db, this.PRODUCTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Product));
    } catch (error) {
      logger.error('Error getting products:', error);
      throw new Error('Error al obtener los productos');
    }
  }
  /**
   * Obtener productos activos
   */
  static async getActiveProducts(): Promise<Product[]> {
    try {
      const q = query(
        collection(db, this.PRODUCTS_COLLECTION),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Product));
    } catch (error) {
      logger.error('Error getting active products:', error);
      throw new Error('Error al obtener los productos activos');
    }
  }
  /**
   * Obtener un producto por ID
   */
  static async getProductById(productId: string): Promise<Product | null> {
    try {
      const productDoc = await getDoc(doc(db, this.PRODUCTS_COLLECTION, productId));
      if (!productDoc.exists()) {
        return null;
      }
      const data = productDoc.data();
      return {
        id: productDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Product;
    } catch (error) {
      logger.error('Error getting product:', error);
      throw new Error('Error al obtener el producto');
    }
  }
  /**
   * Actualizar un producto
   */
  static async updateProduct(productId: string, updateData: UpdateProductData): Promise<void> {
    try {
      const productRef = doc(db, this.PRODUCTS_COLLECTION, productId);
      await updateDoc(productRef, {
        ...updateData,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating product:', error);
      throw new Error('Error al actualizar el producto');
    }
  }
  /**
   * Eliminar un producto
   */
  static async deleteProduct(productId: string): Promise<void> {
    try {
      await(doc(db, this.PRODUCTS_COLLECTION, productId));
    } catch (error) {
      criticalLogger.error('Error deleting product:', error);
      throw new Error('Error al eliminar el producto');
    }
  }
  /**
   * Registrar una venta de producto
   */
  static async createProductSale(saleData: CreateProductSaleData): Promise<string> {
    try {
      // Obtener el producto para verificar stock y precio
      const product = await this.getProductById(saleData.productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      if (product.stock < saleData.quantity) {
        throw new Error('Stock insuficiente');
      }
      const totalAmount = product.price * saleData.quantity;
      return await runTransaction(db, async (transaction) => {
        // Crear la venta
        const sale: Omit<ProductSale, 'id'> = {
          productId: saleData.productId,
          productName: product.name,
          quantity: saleData.quantity,
          unitPrice: product.price,
          totalAmount,
          buyerName: saleData.buyerName,
          buyerEmail: saleData.buyerEmail,
          saleDate: new Date(),
          paymentMethod: saleData.paymentMethod,
          status: 'completed',
          notes: saleData.notes,
          soldBy: saleData.soldBy,
          isMember: false, // Por defecto, se puede actualizar según la lógica de negocio
          createdAt: new Date()
        };
        const saleRef = await addDoc(collection(db, this.SALES_COLLECTION), sale);
        // Actualizar stock del producto
        const productRef = doc(db, this.PRODUCTS_COLLECTION, saleData.productId);
        transaction.update(productRef, {
          stock: increment(-saleData.quantity),
          updatedAt: serverTimestamp()
        });
        // Actualizar ingresos mensuales
        logger.log('🛒 ProductService.createProductSale: Llamando a updateMonthlyIncome', {
          totalAmount,
          date: new Date(),
          productName: product.name,
          saleId: saleRef.id
        });
        await this.updateMonthlyIncome(totalAmount, new Date());
        return saleRef.id;
      });
    } catch (error) {
      criticalLogger.error('Error creating product sale:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al registrar la venta');
    }
  }
  /**
   * Obtener estadísticas de productos
   */
  static async getProductStats(): Promise<ProductStats> {
    try {
      const [productsSnapshot, salesSnapshot] = await Promise.all([
        getDocs(collection(db, this.PRODUCTS_COLLECTION)),
        getDocs(collection(db, this.SALES_COLLECTION))
      ]);
      const products = productsSnapshot.docs.map(doc => doc.data() as Product);
      const sales = salesSnapshot.docs.map(doc => doc.data() as ProductSale);
      return {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'active').length,
        outOfStockProducts: products.filter(p => p.stock === 0).length,
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      };
    } catch (error) {
      logger.error('Error getting product stats:', error);
      throw new Error('Error al obtener las estadísticas de productos');
    }
  }
  /**
   * Subir imagen a Postimages
   */
  static async uploadImageToPostimages(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('upload', file);
      formData.append('type', 'file');
      const response = await fetch('https://postimages.org/json/rr', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }
      const data: PostimagesResponse = await response.json();
      if (data.status !== 'OK') {
        throw new Error('Error en la respuesta del servidor de imágenes');
      }
      return data.direct_link;
    } catch (error) {
      logger.error('Error uploading image to Postimages:', error);
      throw new Error('Error al subir la imagen. Por favor, intenta de nuevo.');
    }
  }
  /**
   * Actualizar ingresos mensuales por ventas de productos
   */
  private static async updateMonthlyIncome(amount: number, date: Date): Promise<void> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthlyIncomeId = `${year}-${month.toString().padStart(2, '0')}`;
      logger.log('🛒 ProductService.updateMonthlyIncome: Iniciando actualización', {
        amount,
        monthlyIncomeId,
        year,
        month
      });
      await runTransaction(db, async (transaction) => {
        const monthlyIncomeRef = doc(db, this.MONTHLY_INCOME_COLLECTION, monthlyIncomeId);
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
            totalIncome: amount,
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
      logger.log('🛒 ProductService.updateMonthlyIncome: Actualización completada exitosamente', {
        amount,
        monthlyIncomeId
      });
    } catch (error) {
      logger.error('🛒 ProductService.updateMonthlyIncome: Error:', error);
      throw new Error('Error al actualizar los ingresos mensuales');
    }
  }
}