import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ClassPayment, CreatePaymentData, MonthlyIncome, IncomeType, ExpenseType, TransactionType } from '../../types/class.types';
import { logger, criticalLogger } from '../../utils/logger';
export class PaymentService {
  private static paymentsCollection = 'payments';
  private static monthlyIncomeCollection = 'monthlyIncome';
  /**
   * Crear un nuevo pago para una asignación de clase
   */
  static async createPayment(paymentData: CreatePaymentData): Promise<string> {
    try {
      const payment: Omit<ClassPayment, 'id'> = {
        assignmentId: paymentData.assignmentId,
        classId: paymentData.classId || '',
        className: paymentData.className || '',
        memberId: paymentData.memberId || '',
        memberName: paymentData.memberName || '',
        amount: paymentData.amount,
        paymentDate: new Date(),
        paymentMethod: paymentData.paymentMethod,
        transactionType: paymentData.transactionType,
        isExpense: paymentData.isExpense,
        status: 'completed',
        processor: paymentData.processor,
        notes: paymentData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, this.paymentsCollection), payment);

      // Actualizar ingresos/gastos mensuales
      await this.updateMonthlyIncome(paymentData.amount, new Date(), paymentData.transactionType, paymentData.isExpense);
      return docRef.id;
    } catch (error) {
      criticalLogger.error('Error creating payment:', error);
      throw new Error('Error al crear el pago');
    }
  }
  /**
   * Obtener pagos por asignación
   */
  static async getPaymentsByAssignment(assignmentId: string): Promise<ClassPayment[]> {
    try {
      const q = query(
        collection(db, this.paymentsCollection),
        where('assignmentId', '==', assignmentId),
        orderBy('paymentDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir fechas de Firestores a Date objects
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as ClassPayment;
      });
    } catch (error) {
      logger.error('Error getting payments by assignment:', error);
      throw new Error('Error al obtener los pagos');
    }
  }
  /**
   * Obtener pagos por miembro
   */
  static async getPaymentsByMember(memberId: string): Promise<ClassPayment[]> {
    try {
      const q = query(
        collection(db, this.paymentsCollection),
        where('memberId', '==', memberId),
        orderBy('paymentDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir fechas de Firestores a Date objects
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as ClassPayment;
      });
    } catch (error) {
      logger.error('Error getting payments by member:', error);
      throw new Error('Error al obtener los pagos del miembro');
    }
  }
  /**
   * Obtener todos los pagos con filtros opcionales
   */
  static async getAllPayments(
    startDate?: Date,
    endDate?: Date,
    paymentMethod?: string
  ): Promise<ClassPayment[]> {
    try {
      let q = query(
        collection(db, this.paymentsCollection),
        orderBy('paymentDate', 'desc')
      );
      if (startDate && endDate) {
        q = query(
          collection(db, this.paymentsCollection),
          where('paymentDate', '>=', startDate),
          where('paymentDate', '<=', endDate),
          orderBy('paymentDate', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      let payments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir fechas de Firestores a Date objects
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as ClassPayment;
      });
      // Filtrar por método de pago si se especifica
      if (paymentMethod) {
        payments = payments.filter(payment => payment.paymentMethod === paymentMethod);
      }
      return payments;
    } catch (error) {
      logger.error('Error getting all payments:', error);
      throw new Error('Error al obtener los pagos');
    }
  }
  /**
   * Actualizar ingresos mensuales
   */
  private static async updateMonthlyIncome(amount: number, date: Date, transactionType: TransactionType, isExpense: boolean): Promise<void> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const monthlyIncomeId = `${year}-${month.toString().padStart(2, '0')}`;
      await runTransaction(db, async (transaction) => {
        const monthlyIncomeRef = doc(db, this.monthlyIncomeCollection, monthlyIncomeId);
        const monthlyIncomeDoc = await transaction.get(monthlyIncomeRef);
        if (monthlyIncomeDoc.exists()) {
          // Actualizar documento existente
          const updateData: any = {
            totalTransactions: increment(1),
            updatedAt: serverTimestamp()
          };

          if (isExpense) {
            // Es un gasto - incrementar gastos y decrementar ingresos netos
            updateData.totalExpenses = increment(amount);
            updateData.netIncome = increment(-amount);

            switch (transactionType) {
              case 'staff_payment':
                updateData['staffPayments.total'] = increment(amount);
                updateData['staffPayments.transactions'] = increment(1);
                break;
              case 'product_purchase':
                updateData['productPurchases.total'] = increment(amount);
                updateData['productPurchases.transactions'] = increment(1);
                break;
              case 'other_expense':
                updateData['otherExpenses.total'] = increment(amount);
                updateData['otherExpenses.transactions'] = increment(1);
                break;
            }
          } else {
            // Es un ingreso - incrementar ingresos y ingresos netos
            updateData.totalIncome = increment(amount);
            updateData.netIncome = increment(amount);

            switch (transactionType) {
              case 'class':
                updateData['classIncome.total'] = increment(amount);
                updateData['classIncome.transactions'] = increment(1);
                break;
              case 'membership':
                updateData['membershipIncome.total'] = increment(amount);
                updateData['membershipIncome.transactions'] = increment(1);
                break;
              case 'product':
                updateData['productSales.total'] = increment(amount);
                updateData['productSales.transactions'] = increment(1);
                break;
              case 'other':
                updateData['otherIncome.total'] = increment(amount);
                updateData['otherIncome.transactions'] = increment(1);
                break;
            }
          }

          transaction.update(monthlyIncomeRef, updateData);
        } else {
          // Crear nuevo documento
          const newMonthlyIncome: Omit<MonthlyIncome, 'id'> = {
            year,
            month,
            totalIncome: isExpense ? 0 : amount,
            totalExpenses: isExpense ? amount : 0,
            netIncome: isExpense ? -amount : amount,
            classIncome: {
              total: transactionType === 'class' && !isExpense ? amount : 0,
              transactions: transactionType === 'class' && !isExpense ? 1 : 0
            },
            membershipIncome: {
              total: transactionType === 'membership' && !isExpense ? amount : 0,
              transactions: transactionType === 'membership' && !isExpense ? 1 : 0
            },
            productSales: {
              total: transactionType === 'product' && !isExpense ? amount : 0,
              transactions: transactionType === 'product' && !isExpense ? 1 : 0
            },
            otherIncome: {
              total: transactionType === 'other' && !isExpense ? amount : 0,
              transactions: transactionType === 'other' && !isExpense ? 1 : 0
            },
            staffPayments: {
              total: transactionType === 'staff_payment' && isExpense ? amount : 0,
              transactions: transactionType === 'staff_payment' && isExpense ? 1 : 0
            },
            productPurchases: {
              total: transactionType === 'product_purchase' && isExpense ? amount : 0,
              transactions: transactionType === 'product_purchase' && isExpense ? 1 : 0
            },
            otherExpenses: {
              total: transactionType === 'other_expense' && isExpense ? amount : 0,
              transactions: transactionType === 'other_expense' && isExpense ? 1 : 0
            },
            totalTransactions: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          transaction.set(monthlyIncomeRef, newMonthlyIncome);
        }
      });
    } catch (error) {
      logger.error('Error updating monthly income:', error);
      throw new Error('Error al actualizar los ingresos mensuales');
    }
  }
  /**
   * Obtener ingresos mensuales por año y mes
   */
  static async getMonthlyIncome(year: number, month: number): Promise<MonthlyIncome | null> {
    try {
      const monthlyIncomeId = `${year}-${month.toString().padStart(2, '0')}`;
      const docRef = doc(db, this.monthlyIncomeCollection, monthlyIncomeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as MonthlyIncome;
      }
      return null;
    } catch (error) {
      logger.error('Error getting monthly income:', error);
      throw new Error('Error al obtener los ingresos mensuales');
    }
  }
  /**
   * Obtener ingresos mensuales por año
   */
  static async getYearlyIncome(year: number): Promise<MonthlyIncome[]> {
    try {
      const q = query(
        collection(db, this.monthlyIncomeCollection),
        where('year', '==', year),
        orderBy('month', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MonthlyIncome));
    } catch (error) {
      logger.error('Error getting yearly income:', error);
      throw new Error('Error al obtener los ingresos anuales');
    }
  }
}