import { PaymentService } from '../payments/paymentService';
import { salesService } from '../sales/salesService';
import type { ClassPayment, MonthlyIncome } from '../../types/class.types';
import type { ProductSale } from '../../types/product.types';
import { logger } from '../../utils/logger';
export interface FinancialSummary {
  totalRevenue: number; // Ingresos totales (clases + productos + membresías + otros)
  netRevenue: number; // Ingresos netos (totalRevenue - staffPayments - productPayments)
  classIncome: number;
  productSales: number;
  membershipIncome: number;
  otherIncome: number;
  staffPayments: number;
  productPayments: number;
  totalTransactions: number;
  averageTransactionValue: number;
}
export interface MonthlyFinancialData {
  month: string;
  year: number;
  monthNumber: number;
  totalRevenue: number;
  netRevenue: number;
  classIncome: number;
  productSales: number;
  membershipIncome: number;
  otherIncome: number;
  staffPayments: number;
  productPayments: number;
  transactions: number;
}
export interface StaffPaymentData {
  staffName: string;
  totalAmount: number;
  paymentCount: number;
  lastPayment: Date;
  concept: string;
}
export interface ProductPaymentData {
  productName: string;
  totalAmount: number;
  paymentCount: number;
  lastPayment: Date;
}
export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  transactions: number;
  percentage: number;
}
export interface FinancialReport {
  summary: FinancialSummary;
  monthlyData: MonthlyFinancialData[];
  paymentMethods: PaymentMethodBreakdown[];
  topProducts: Array<{
    productName: string;
    revenue: number;
    quantity: number;
  }>;
  staffPayments: StaffPaymentData[];
  productPayments: ProductPaymentData[];
  recentTransactions: Array<{
    id: string;
    type: 'class' | 'product' | 'membership' | 'staff' | 'product_payment';
    description: string;
    amount: number;
    date: Date;
    paymentMethod: string;
  }>;
}
export class FinancialReportsService {
  /**
   * Asegurar que un valor sea un objeto Date válido
   */
  private static ensureDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  /**
   * Asegurar que un valor sea un número válido, devolver 0 si es NaN o inválido
   */
  private static ensureNumber(value: any): number {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  /**
   * Calcular porcentaje de forma segura
   */
  private static safePercentage(part: number, total: number): number {
    const safePart = this.ensureNumber(part);
    const safeTotal = this.ensureNumber(total);
    return safeTotal > 0 ? (safePart / safeTotal) * 100 : 0;
  }

  /**
   * Calcular división de forma segura
   */
  private static safeDivision(dividend: number, divisor: number): number {
    const safeDividend = this.ensureNumber(dividend);
    const safeDivisor = this.ensureNumber(divisor);
    return safeDivisor > 0 ? safeDividend / safeDivisor : 0;
  }
  /**
   * Obtener reporte financiero completo
   */
  static async getFinancialReport(
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialReport> {
    try {
      const [payments, sales, monthlyIncomes] = await Promise.all([
        PaymentService.getAllPayments(startDate, endDate),
        salesService.getAllSales(),
        this.getMonthlyIncomes(startDate, endDate)
      ]);
      // Filtrar ventas por fecha si se especifica
      const filteredSales = startDate && endDate 
        ? sales.filter(sale => {
            const saleDate = sale.saleDate;
            return saleDate >= startDate && saleDate <= endDate;
          })
        : sales;
      const summary = this.calculateSummary(payments, filteredSales, monthlyIncomes);
      const monthlyData = this.processMonthlyData(monthlyIncomes, payments);
      const paymentMethods = this.calculatePaymentMethodBreakdown(payments, filteredSales);
      const topProducts = this.calculateTopProducts(filteredSales);
      const staffPayments = this.calculateStaffPayments(payments);
      const productPayments = this.calculateProductPayments(payments);
      const recentTransactions = this.getRecentTransactions(payments, filteredSales);
      return {
        summary,
        monthlyData,
        paymentMethods,
        topProducts,
        staffPayments,
        productPayments,
        recentTransactions
      };
    } catch (error) {
      logger.error('Error getting financial report:', error);
      throw new Error('Error al obtener el reporte financiero');
    }
  }
  /**
   * Obtener ingresos mensuales en un rango de fechas
   */
  private static async getMonthlyIncomes(
    startDate?: Date,
    endDate?: Date
  ): Promise<MonthlyIncome[]> {
    try {
      if (!startDate || !endDate) {
        // Si no hay fechas, obtener el año actual
        const currentYear = new Date().getFullYear();
        return await PaymentService.getYearlyIncome(currentYear);
      }
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const allIncomes: MonthlyIncome[] = [];
      // Obtener datos para todos los años en el rango
      for (let year = startYear; year <= endYear; year++) {
        const yearlyIncome = await PaymentService.getYearlyIncome(year);
        allIncomes.push(...yearlyIncome);
      }
      // Filtrar por meses específicos si es necesario
      return allIncomes.filter(income => {
        const incomeDate = new Date(income.year, income.month - 1);
        const filterStartDate = new Date(startDate.getFullYear(), startDate.getMonth());
        const filterEndDate = new Date(endDate.getFullYear(), endDate.getMonth());
        return incomeDate >= filterStartDate && incomeDate <= filterEndDate;
      });
    } catch (error) {
      logger.error('Error getting monthly incomes:', error);
      return [];
    }
  }
  /**
   * Calcular resumen financiero
   */
  private static calculateSummary(
    payments: ClassPayment[],
    sales: ProductSale[],
    monthlyIncomes: MonthlyIncome[]
  ): FinancialSummary {
    // Separar pagos por tipo
    const classPayments = payments.filter(p => p.transactionType === 'class' && !p.isExpense);
    // Pagos al personal: usar transactionType 'staff_payment' o isExpense true
    const staffPayments = payments.filter(p => 
      p.transactionType === 'staff_payment' || 
      (p.isExpense && (
        p.assignmentId?.startsWith('staff-') || 
        p.notes?.toLowerCase().includes('personal') ||
        p.notes?.toLowerCase().includes('salario') ||
        p.notes?.toLowerCase().includes('comisión') ||
        p.notes?.toLowerCase().includes('bono')
      ))
    );
    // Pagos de productos: usar transactionType 'product_purchase' o isExpense true con product
    const productPayments = payments.filter(p => 
      p.transactionType === 'product_purchase' || 
      (p.isExpense && (p.transactionType === 'product' || p.assignmentId?.startsWith('product-')))
    );
    const classIncome = this.ensureNumber(
      classPayments.reduce((sum, payment) => sum + this.ensureNumber(payment.amount), 0)
    );
    const productSales = this.ensureNumber(
      sales.reduce((sum, sale) => sum + this.ensureNumber(sale.totalAmount), 0)
    );
    const staffPaymentsTotal = this.ensureNumber(
      staffPayments.reduce((sum, payment) => sum + this.ensureNumber(payment.amount), 0)
    );
    const productPaymentsTotal = this.ensureNumber(
      productPayments.reduce((sum, payment) => sum + this.ensureNumber(payment.amount), 0)
    );

    // Obtener ingresos de membresías y otros de los datos mensuales
    const membershipIncome = this.ensureNumber(
      monthlyIncomes.reduce(
        (sum, income) => sum + this.ensureNumber(income.membershipIncome?.total || 0), 0
      )
    );
    const otherIncome = this.ensureNumber(
      monthlyIncomes.reduce(
        (sum, income) => sum + this.ensureNumber(income.otherIncome?.total || 0), 0
      )
    );

    // INGRESOS TOTALES: Solo ingresos reales (NO incluir gastos)
    const totalRevenue = this.ensureNumber(classIncome + productSales + membershipIncome + otherIncome);
    // INGRESOS NETOS: Ingresos totales menos gastos
    const netRevenue = this.ensureNumber(totalRevenue - staffPaymentsTotal - productPaymentsTotal);

    const totalTransactions = payments.length + sales.length;
    const averageTransactionValue = this.safeDivision(totalRevenue, totalTransactions);
    return {
      totalRevenue,
      netRevenue,
      classIncome,
      productSales,
      membershipIncome,
      otherIncome,
      staffPayments: staffPaymentsTotal,
      productPayments: productPaymentsTotal,
      totalTransactions,
      averageTransactionValue
    };
  }
  /**
   * Procesar datos mensuales para gráficos
   */
  private static processMonthlyData(monthlyIncomes: MonthlyIncome[], payments: ClassPayment[]): MonthlyFinancialData[] {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    // Debug: Log de datos de monthlyIncome
    logger.log('📊 FinancialReportsService - monthlyIncomes recibidos:', monthlyIncomes);
    logger.log('📊 FinancialReportsService - Datos de productSales en cada mes:', 
      monthlyIncomes?.map(income => ({
        id: income.id,
        year: income.year,
        month: income.month,
        productSales: income.productSales
      }))
    );
    // Si no hay datos, retornar array vacío
    if (!monthlyIncomes || monthlyIncomes.length === 0) {
      return [];
    }
    return monthlyIncomes
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .map(income => {
        // Calcular pagos al personal y productos para este mes
        const monthPayments = payments.filter(p => {
          const paymentDate = this.ensureDate(p.paymentDate);
          if (!paymentDate) return false;
          return paymentDate.getFullYear() === income.year && 
                 paymentDate.getMonth() + 1 === income.month;
        });
        const staffPayments = monthPayments
          .filter(p => 
            p.transactionType === 'staff_payment' || 
            (p.isExpense && (
              p.assignmentId?.startsWith('staff-') || 
              p.notes?.toLowerCase().includes('personal') ||
              p.notes?.toLowerCase().includes('salario') ||
              p.notes?.toLowerCase().includes('comisión') ||
              p.notes?.toLowerCase().includes('bono')
            ))
          )
          .reduce((sum, p) => sum + p.amount, 0);
        const productPayments = monthPayments
          .filter(p => 
            p.transactionType === 'product_purchase' || 
            (p.isExpense && (p.transactionType === 'product' || p.assignmentId?.startsWith('product-')))
          )
          .reduce((sum, p) => sum + p.amount, 0);
        const totalRevenue = income.totalIncome;
        const netRevenue = totalRevenue - staffPayments - productPayments;
        return {
          month: monthNames[income.month - 1],
          year: income.year,
          monthNumber: income.month,
          totalRevenue,
          netRevenue,
          classIncome: income.classIncome?.total || 0,
          productSales: income.productSales?.total || 0,
          membershipIncome: income.membershipIncome?.total || 0,
          otherIncome: income.otherIncome?.total || 0,
          staffPayments,
          productPayments,
          transactions: income.totalTransactions
        };
      });
  }
  /**
   * Calcular datos de pagos al personal
   */
  private static calculateStaffPayments(payments: ClassPayment[]): StaffPaymentData[] {
    const staffPayments = payments.filter(p => 
      p.transactionType === 'staff_payment' || 
      (p.isExpense && (
        p.assignmentId?.startsWith('staff-') || 
        p.notes?.toLowerCase().includes('personal') ||
        p.notes?.toLowerCase().includes('salario') ||
        p.notes?.toLowerCase().includes('comisión') ||
        p.notes?.toLowerCase().includes('bono')
      ))
    );
    const staffMap = new Map<string, {
      totalAmount: number;
      paymentCount: number;
      lastPayment: Date;
      concept: string;
    }>();
    staffPayments.forEach(payment => {
      const paymentDate = this.ensureDate(payment.paymentDate);
      if (!paymentDate) return; // Skip invalid dates
      const staffName = payment.memberName || 'Personal';
      const existing = staffMap.get(staffName);
      if (existing) {
        existing.totalAmount += payment.amount;
        existing.paymentCount += 1;
        if (paymentDate > existing.lastPayment) {
          existing.lastPayment = paymentDate;
          existing.concept = payment.notes || 'Pago al personal';
        }
      } else {
        staffMap.set(staffName, {
          totalAmount: payment.amount,
          paymentCount: 1,
          lastPayment: paymentDate,
          concept: payment.notes || 'Pago al personal'
        });
      }
    });
    return Array.from(staffMap.entries()).map(([staffName, data]) => ({
      staffName,
      ...data
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }
  /**
   * Calcular datos de pagos por productos
   */
  private static calculateProductPayments(payments: ClassPayment[]): ProductPaymentData[] {
    const productPayments = payments.filter(p => 
      p.transactionType === 'product_purchase' || 
      (p.isExpense && (p.transactionType === 'product' || p.assignmentId?.startsWith('product-')))
    );
    const productMap = new Map<string, {
      totalAmount: number;
      paymentCount: number;
      lastPayment: Date;
    }>();
    productPayments.forEach(payment => {
      const paymentDate = this.ensureDate(payment.paymentDate);
      if (!paymentDate) return; // Skip invalid dates
      const productName = payment.className || payment.notes || 'Producto';
      const existing = productMap.get(productName);
      if (existing) {
        existing.totalAmount += payment.amount;
        existing.paymentCount += 1;
        if (paymentDate > existing.lastPayment) {
          existing.lastPayment = paymentDate;
        }
      } else {
        productMap.set(productName, {
          totalAmount: payment.amount,
          paymentCount: 1,
          lastPayment: paymentDate
        });
      }
    });
    return Array.from(productMap.entries()).map(([productName, data]) => ({
      productName,
      ...data
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }
  /**
   * Calcular desglose por método de pago
   */
  private static calculatePaymentMethodBreakdown(
    payments: ClassPayment[],
    sales: ProductSale[]
  ): PaymentMethodBreakdown[] {
    const methodTotals = new Map<string, { amount: number; transactions: number }>();
    // Procesar pagos de clases
    payments.forEach(payment => {
      const paymentDate = this.ensureDate(payment.paymentDate);
      if (!paymentDate) return; // Skip invalid dates
      const method = payment.paymentMethod;
      const current = methodTotals.get(method) || { amount: 0, transactions: 0 };
      methodTotals.set(method, {
        amount: current.amount + this.ensureNumber(payment.amount),
        transactions: current.transactions + 1
      });
    });
    // Procesar ventas de productos
    sales.forEach(sale => {
      const saleDate = this.ensureDate(sale.saleDate);
      if (!saleDate) return; // Skip invalid dates
      const method = sale.paymentMethod;
      const current = methodTotals.get(method) || { amount: 0, transactions: 0 };
      methodTotals.set(method, {
        amount: current.amount + this.ensureNumber(sale.totalAmount),
        transactions: current.transactions + 1
      });
    });
    const totalAmount = this.ensureNumber(
      Array.from(methodTotals.values()).reduce((sum, data) => sum + data.amount, 0)
    );

    return Array.from(methodTotals.entries()).map(([method, data]) => ({
      method,
      amount: this.ensureNumber(data.amount),
      transactions: data.transactions,
      percentage: this.safePercentage(data.amount, totalAmount)
    }));
  }
  /**
   * Calcular productos más vendidos
   */
  private static calculateTopProducts(sales: ProductSale[]): Array<{
    productName: string;
    revenue: number;
    quantity: number;
  }> {
    const productTotals = new Map<string, { revenue: number; quantity: number }>();
    sales.forEach(sale => {
      const saleDate = this.ensureDate(sale.saleDate);
      if (!saleDate) return; // Skip invalid dates
      const current = productTotals.get(sale.productName) || { revenue: 0, quantity: 0 };
      productTotals.set(sale.productName, {
        revenue: current.revenue + this.ensureNumber(sale.totalAmount),
        quantity: current.quantity + this.ensureNumber(sale.quantity)
      });
    });
    return Array.from(productTotals.entries())
      .map(([productName, data]) => ({
        productName,
        revenue: this.ensureNumber(data.revenue),
        quantity: this.ensureNumber(data.quantity)
      }))
      .sort((a, b) => this.ensureNumber(b.revenue) - this.ensureNumber(a.revenue))
      .slice(0, 10); // Top 10 productos
  }
  /**
   * Obtener transacciones recientes
   */
  private static getRecentTransactions(
    payments: ClassPayment[],
    sales: ProductSale[]
  ): Array<{
    id: string;
    type: 'class' | 'product' | 'membership' | 'staff' | 'product_payment';
    description: string;
    amount: number;
    date: Date;
    paymentMethod: string;
  }> {
    const transactions: Array<{
      id: string;
      type: 'class' | 'product' | 'membership' | 'staff' | 'product_payment';
      description: string;
      amount: number;
      date: Date;
      paymentMethod: string;
    }> = [];
    // Agregar pagos
    payments.forEach(payment => {
      const paymentDate = this.ensureDate(payment.paymentDate) || new Date();
      // Determinar el tipo de transacción
      let type: 'class' | 'product' | 'membership' | 'staff' | 'product_payment';
      let description: string;
      if (payment.transactionType === 'staff_payment' || (payment.isExpense && payment.assignmentId?.startsWith('staff-'))) {
        type = 'staff';
        description = `Pago Personal: ${payment.memberName} - ${payment.notes || 'Pago al personal'}`;
      } else if (payment.transactionType === 'product_purchase' || (payment.isExpense && payment.assignmentId?.startsWith('product-'))) {
        type = 'product_payment';
        description = `Pago Producto: ${payment.className || payment.notes || 'Producto'}`;
      } else if (payment.transactionType === 'membership') {
        type = 'membership';
        description = `Membresía: ${payment.className} - ${payment.memberName}`;
      } else {
        type = 'class';
        description = `Clase: ${payment.className} - ${payment.memberName}`;
      }
      transactions.push({
        id: payment.id,
        type,
        description,
        amount: payment.amount,
        date: paymentDate,
        paymentMethod: payment.paymentMethod
      });
    });
    // Agregar ventas de productos
    sales.forEach(sale => {
      const saleDate = this.ensureDate(sale.saleDate) || new Date();
      transactions.push({
        id: sale.id,
        type: 'product',
        description: `Producto: ${sale.productName} (x${sale.quantity}) - ${sale.buyerName}`,
        amount: sale.totalAmount,
        date: saleDate,
        paymentMethod: sale.paymentMethod
      });
    });
    // Ordenar por fecha descendente y tomar las 20 más recientes
    return transactions
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 20);
  }
  /**
   * Obtener estadísticas rápidas para el dashboard
   */
  static async getQuickStats(): Promise<{
    todayRevenue: number;
    monthRevenue: number;
    todayTransactions: number;
    monthTransactions: number;
  }> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      const [todayPayments, monthPayments, todaySales, monthSales] = await Promise.all([
        PaymentService.getAllPayments(startOfDay, endOfDay),
        PaymentService.getAllPayments(startOfMonth, endOfMonth),
        salesService.getAllSales(),
        salesService.getAllSales()
      ]);
      const todaySalesFiltered = todaySales.filter(sale => {
        const saleDate = sale.saleDate;
        return saleDate >= startOfDay && saleDate <= endOfDay;
      });
      const monthSalesFiltered = monthSales.filter(sale => {
        const saleDate = sale.saleDate;
        return saleDate >= startOfMonth && saleDate <= endOfMonth;
      });
      const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0) +
                          todaySalesFiltered.reduce((sum, s) => sum + s.totalAmount, 0);
      const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0) +
                          monthSalesFiltered.reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        todayRevenue,
        monthRevenue,
        todayTransactions: todayPayments.length + todaySalesFiltered.length,
        monthTransactions: monthPayments.length + monthSalesFiltered.length
      };
    } catch (error) {
      logger.error('Error getting quick stats:', error);
      return {
        todayRevenue: 0,
        monthRevenue: 0,
        todayTransactions: 0,
        monthTransactions: 0
      };
    }
  }
}