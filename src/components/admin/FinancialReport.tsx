import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  ShoppingCart, 
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { FinancialReportsService } from '../../services/reports/financialReportsService';
import type { FinancialReport } from '../../services/reports/financialReportsService';
import { logger } from '../../utils/logger';
interface FinancialReportProps {
  onBack: () => void;
}
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
export const FinancialReportComponent: React.FC<FinancialReportProps> = ({ onBack }) => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    loadReport();
  }, []);
  const loadReport = async (startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true);
      setError(null);
      const reportData = await FinancialReportsService.getFinancialReport(startDate, endDate);
      // Debug: Log de datos de ventas de productos
      logger.log('🛒 FinancialReport - Datos completos del reporte:', reportData);
      logger.log('🛒 FinancialReport - Datos mensuales:', reportData.monthlyData);
      logger.log('🛒 FinancialReport - Ventas de productos por mes:', 
        reportData.monthlyData.map(month => ({
          month: month.month,
          year: month.year,
          productSales: month.productSales
        }))
      );
      logger.log('🛒 FinancialReport - Resumen de ventas de productos:', reportData.summary.productSales);
      setReport(reportData);
    } catch (err) {
      setError('Error al cargar el reporte financiero');
      logger.error('Error loading financial report:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleDateFilter = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      loadReport(startDate, endDate);
    } else {
      loadReport(); // Sin filtros
    }
  };
  const clearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    loadReport();
  };
  const formatCurrency = (amount: number) => {
    // Asegurar que el valor sea un número válido
    const safeAmount = typeof amount === 'number' && !isNaN(amount) && isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(safeAmount);
  };

  const safeNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value;
    }
    return 0;
  };

  const safePercentage = (value: any): string => {
    const num = safeNumber(value);
    return `${num.toFixed(1)}%`;
  };
  const formatDate = (date: Date | string | null | undefined) => {
    try {
      // Handle null, undefined, or invalid dates
      if (!date) {
        return 'Fecha no disponible';
      }
      // Convert to Date object if it's not already
      const dateObj = date instanceof Date ? date : new Date(date);
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      logger.error('Error formatting date:', error, 'Date value:', date);
      return 'Fecha inválida';
    }
  };
  const exportReport = () => {
    if (!report) return;
    // Crear CSV con los datos del reporte
    const csvData = [
      ['Reporte Financiero'],
      [''],
      ['Resumen'],
      ['Ingresos Totales', formatCurrency(report.summary.totalRevenue)],
      ['Ingresos Netos', formatCurrency(report.summary.netRevenue)],
      ['Ingresos por Clases', formatCurrency(report.summary.classIncome)],
      ['Ventas de Productos', formatCurrency(report.summary.productSales)],
      ['Ingresos por Membresías', formatCurrency(report.summary.membershipIncome)],
      ['Otros Ingresos', formatCurrency(report.summary.otherIncome)],
      ['Total de Transacciones', report.summary.totalTransactions.toString()],
      ['Valor Promedio por Transacción', formatCurrency(report.summary.averageTransactionValue)],
      [''],
      ['Datos Mensuales'],
      ['Mes', 'Año', 'Ingresos Totales', 'Ingresos Netos', 'Clases', 'Productos', 'Membresías', 'Otros'],
      ...report.monthlyData.map(month => [
        month.month,
        month.year.toString(),
        formatCurrency(month.totalRevenue),
        formatCurrency(month.netRevenue),
        formatCurrency(month.classIncome),
        formatCurrency(month.productSales),
        formatCurrency(month.membershipIncome),
        formatCurrency(month.otherIncome)
      ]),
    ];
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => loadReport()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay datos disponibles</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Reporte Financiero</h1>
          <p className="text-gray-600">Análisis detallado de ingresos y transacciones</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
          <button
            onClick={() => loadReport()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>
      {/* Filtros */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2 pt-6">
              <button
                onClick={handleDateFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Aplicar
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Resumen de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Netos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.netRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Después de gastos
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.summary.totalTransactions}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio por Transacción</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.averageTransactionValue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas de Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.productSales)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagos al Personal</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.staffPayments)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pagos por Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(report.summary.productPayments)}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      {/* Gráficos por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ingresos por Clases */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            Ingresos por Clases
          </h3>
          {report.monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <p className="text-sm mb-1">No hay datos disponibles</p>
                <p className="text-xs">Los datos aparecerán al registrar pagos de clases</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
                <Bar dataKey="classIncome" fill="#3B82F6" name="Clases" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Gráfico de Ingresos por Membresías/Planes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
            Ingresos por Membresías
          </h3>
          {report.monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <p className="text-sm mb-1">No hay datos disponibles</p>
                <p className="text-xs">Los datos aparecerán al registrar pagos de membresías</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
                <Bar dataKey="membershipIncome" fill="#F59E0B" name="Membresías" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Gráfico de Ventas de Productos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            Ventas de Productos
          </h3>
          {report.monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <p className="text-sm mb-1">No hay datos disponibles</p>
                <p className="text-xs">Los datos aparecerán al registrar ventas de productos</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
                <Bar dataKey="productSales" fill="#10B981" name="Productos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráficos de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pagos al Personal */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            Pagos al Personal
          </h3>
          {report.monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <p className="text-sm mb-1">No hay datos disponibles</p>
                <p className="text-xs">Los datos aparecerán al registrar pagos al personal</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
                <Bar dataKey="staffPayments" fill="#EF4444" name="Pagos Personal" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de Compras de Productos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            Compras de Productos
          </h3>
          {report.monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              <div className="text-center">
                <p className="text-sm mb-1">No hay datos disponibles</p>
                <p className="text-xs">Los datos aparecerán al registrar compras de productos</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
                <Bar dataKey="productPayments" fill="#F97316" name="Compras Productos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfico de métodos de pago y tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de métodos de pago */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report.paymentMethods.map((item) => ({ 
                  name: item.method, 
                  amount: item.amount,
                  percentage: item.percentage 
                } as any))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => {
                  const { name, percent } = entry;
                  const safePercent = safeNumber(percent * 100);
                  return `${name} (${safePercent.toFixed(1)}%)`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {report.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Tendencia de ingresos totales */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ingresos Totales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(safeNumber(value) / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(safeNumber(value))} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Ingresos Totales"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Tablas de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top productos - Ocupa 2 columnas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.topProducts.slice(0, 8).map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {safePercentage(product.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Transacciones recientes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transacciones Recientes</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {report.recentTransactions.slice(0, 10).map((transaction) => (
            <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transaction.description}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(transaction.date)} • {transaction.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(transaction.amount)}
                </p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  transaction.type === 'class' 
                    ? 'bg-blue-100 text-blue-800'
                    : transaction.type === 'product'
                    ? 'bg-green-100 text-green-800'
                    : transaction.type === 'staff'
                    ? 'bg-red-100 text-red-800'
                    : transaction.type === 'product_payment'
                    ? 'bg-orange-100 text-orange-800'
                    : transaction.type === 'membership'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {transaction.type === 'class' ? 'Clase' : 
                   transaction.type === 'product' ? 'Producto' :
                   transaction.type === 'staff' ? 'Pago Personal' :
                   transaction.type === 'product_payment' ? 'Compra Producto' :
                   transaction.type === 'membership' ? 'Membresía' : 'Otro'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};