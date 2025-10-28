import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { PaymentService } from '../../services/payments/paymentService';
import type { ClassPayment } from '../../types/class.types';
import { logger } from '../../utils/logger';
interface PaymentManagementProps {
  isOpen: boolean;
  onClose: () => void;
}
const PaymentManagement: React.FC<PaymentManagementProps> = ({ isOpen, onClose }) => {
  const [payments, setPayments] = useState<ClassPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all'); // Nuevo filtro para categorías
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<ClassPayment | null>(null);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const itemsPerPage = 15; // Aumentado para aprovechar el modal más grande
  useEffect(() => {
    if (isOpen) {
      loadPayments();
    }
  }, [isOpen]);
  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsData = await PaymentService.getAllPayments();
      setPayments(paymentsData);
    } catch (error) {
      logger.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };
  const formatDate = (date: any) => {
    try {
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else {
        dateObj = new Date(date);
      }
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      return dateObj.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      other: 'Otro'
    };
    return methods[method] || method;
  };
  const getTransactionTypeLabel = (type: string, isExpense?: boolean) => {
    const types: { [key: string]: string } = {
      class: 'Clase',
      membership: 'Membresía',
      product: 'Producto',
      staff_payment: 'Pago Personal',
      product_purchase: 'Compra Producto',
      other_expense: 'Otro Gasto',
      other: 'Otro'
    };
    return types[type] || type;
  };

  const getPaymentCategory = (payment: ClassPayment) => {
    // Categorizar pagos según el tipo y si es gasto
    if (payment.isExpense) {
      if (payment.transactionType === 'staff_payment') {
        return 'personal';
      } else if (payment.transactionType === 'product_purchase') {
        return 'productos';
      } else {
        return 'gastos';
      }
    } else {
      if (['class', 'membership'].includes(payment.transactionType)) {
        return 'servicios';
      } else if (payment.transactionType === 'product') {
        return 'productos';
      }
    }
    return 'otros';
  };
  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      personal: 'Pagos al Personal',
      productos: 'Ventas de Productos',
      servicios: 'Servicios (Clases/Membresías)',
      otros: 'Otros'
    };
    return categories[category] || category;
  };
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      personal: 'bg-orange-100 text-orange-800',
      productos: 'bg-green-100 text-green-800',
      servicios: 'bg-blue-100 text-blue-800',
      otros: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };
  // Filtrar pagos
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.processor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || payment.paymentMethod === filterMethod;
    const matchesType = filterType === 'all' || payment.transactionType === filterType;
    const matchesCategory = filterCategory === 'all' || getPaymentCategory(payment) === filterCategory;
    return matchesSearch && matchesMethod && matchesType && matchesCategory;
  });
  // Paginación
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  const handleViewPayment = (payment: ClassPayment) => {
    setSelectedPayment(payment);
    setShowPaymentDetail(true);
  };
  const calculateTotalAmount = () => {
    return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };
  const getStatsByCategory = () => {
    const stats = {
      personal: { count: 0, total: 0 },
      productos: { count: 0, total: 0 },
      servicios: { count: 0, total: 0 },
      otros: { count: 0, total: 0 }
    };
    filteredPayments.forEach(payment => {
      const category = getPaymentCategory(payment);
      stats[category as keyof typeof stats].count++;
      stats[category as keyof typeof stats].total += payment.amount;
    });
    return stats;
  };
  if (!isOpen) return null;
  const categoryStats = getStatsByCategory();
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Pagos" size="xl">
        <div className="space-y-6">
          {/* Filtros y búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por miembro, concepto, notas..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las categorías</option>
                <option value="personal">Pagos al Personal</option>
                <option value="productos">Ventas de Productos</option>
                <option value="servicios">Servicios</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Específico
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="class">Clases</option>
                <option value="membership">Membresías</option>
                <option value="product">Productos</option>
                <option value="staff_payment">Pago Personal</option>
                <option value="salary">Salario</option>
                <option value="commission">Comisión</option>
                <option value="bonus">Bono</option>
                <option value="other">Otros</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadPayments}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Actualizar
              </button>
            </div>
          </div>
          {/* Resumen por categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(categoryStats).map(([category, stats]) => (
              <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-center">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${getCategoryColor(category)}`}>
                    {getCategoryLabel(category)}
                  </div>
                  <p className="text-sm text-gray-600">Cantidad: {stats.count}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Resumen general */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total de Pagos</p>
                <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotalAmount())}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Promedio por Pago</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredPayments.length > 0 ? formatCurrency(calculateTotalAmount() / filteredPayments.length) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
          {/* Lista de pagos */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando pagos...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beneficiario/Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Método
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Procesado por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPayments.map((payment) => {
                      const category = getPaymentCategory(payment);
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.memberName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {payment.className || 'Pago general'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                              {getCategoryLabel(category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {getTransactionTypeLabel(payment.transactionType, payment.isExpense)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(payment.paymentDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {payment.processor || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewPayment(payment)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Ver detalles
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredPayments.length)} de {filteredPayments.length} pagos
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
              {filteredPayments.length === 0 && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <p className="text-gray-500">No se encontraron pagos con los filtros aplicados</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
      {/* Modal de detalles del pago */}
      {showPaymentDetail && selectedPayment && (
        <Modal
          isOpen={showPaymentDetail}
          onClose={() => setShowPaymentDetail(false)}
          title="Detalles del Pago"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Beneficiario/Cliente</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.memberName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Concepto</label>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.className || 'Pago general'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(getPaymentCategory(selectedPayment))}`}>
                  {getCategoryLabel(getPaymentCategory(selectedPayment))}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Pago</label>
                <p className="mt-1 text-sm text-gray-900">{getTransactionTypeLabel(selectedPayment.transactionType, selectedPayment.isExpense)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
                <p className="mt-1 text-sm text-gray-900">{getPaymentMethodLabel(selectedPayment.paymentMethod)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Monto</label>
                <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Pago</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedPayment.paymentDate)}</p>
              </div>
              {selectedPayment.processor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Procesado por</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.processor}</p>
                </div>
              )}
            </div>
            {selectedPayment.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-md">{selectedPayment.notes}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentDetail(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
export default PaymentManagement;