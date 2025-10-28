import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { TrainerService } from '../../services/users/trainerService';
import { VendorService } from '../../services/users/vendorService';
import { PaymentService } from '../../services/payments/paymentService';
import { ProductService } from '../../services/products';
import { useAuth } from '../../hooks/useAuth';
import { logger, criticalLogger } from '../../utils/logger';
import { 
  Users, 
  Package, 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  CheckCircle,
  Search,
  User
} from 'lucide-react';
interface StaffPaymentProps {
  isOpen: boolean;
  onClose: () => void;
}
type PaymentType = 'staff' | 'product';
type PaymentConcept = 'salary' | 'commission' | 'bonus' | 'product_payment';
interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: 'trainer' | 'vendor';
}
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}
const StaffPayment: React.FC<StaffPaymentProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState<PaymentType>('staff');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Form fields
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState<PaymentConcept>('salary');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'other'>('cash');
  const [description, setDescription] = useState('');
  // UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);
  const loadData = async () => {
    try {
      setLoading(true);
      const [trainers, vendors, allProducts] = await Promise.all([
        TrainerService.getAllTrainers(),
        VendorService.getAllVendors(),
        ProductService.getProducts()
      ]);
      const staffMembers: StaffMember[] = [
        ...trainers.map(trainer => ({
          id: trainer.id,
          firstName: trainer.firstName,
          lastName: trainer.lastName,
          email: trainer.email,
          type: 'trainer' as const
        })),
        ...vendors.map(vendor => ({
          id: vendor.uid,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          type: 'vendor' as const
        }))
      ];
      setStaff(staffMembers);
      setProducts(allProducts);
    } catch (error) {
      logger.error('Error loading data:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (paymentType === 'staff' && selectedStaff) {
        // Crear pago para personal (gasto)
        await PaymentService.createPayment({
          assignmentId: `staff-${selectedStaff.id}-${Date.now()}`,
          memberName: `${selectedStaff.firstName} ${selectedStaff.lastName}`,
          amount: parseFloat(amount),
          paymentMethod,
          transactionType: 'staff_payment',
          isExpense: true,
          notes: `${getConceptLabel(concept)} - ${description}`,
          processor: user?.uid
        });
      } else if (paymentType === 'product' && selectedProduct) {
        // Crear pago por producto (gasto)
        await PaymentService.createPayment({
          assignmentId: `product-${selectedProduct.id}-${Date.now()}`,
          memberName: selectedProduct.name,
          amount: parseFloat(amount),
          paymentMethod,
          transactionType: 'product_purchase',
          isExpense: true,
          notes: `Pago por producto - ${description}`,
          processor: user?.uid
        });
      }
      setSuccess('Pago registrado exitosamente');
      resetForm();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      criticalLogger.error('Error creating payment:', error);
      setError('Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };
  const resetForm = () => {
    setSelectedStaff(null);
    setSelectedProduct(null);
    setAmount('');
    setConcept('salary');
    setPaymentMethod('cash');
    setDescription('');
    setSearchTerm('');
    setError('');
    setSuccess('');
  };
  const getConceptLabel = (concept: PaymentConcept) => {
    const labels = {
      salary: 'Salario',
      commission: 'Comisión',
      bonus: 'Bono',
      product_payment: 'Pago por Producto'
    };
    return labels[concept];
  };
  const filteredStaff = staff.filter(member =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Realizar Pagos</h2>
              <p className="text-sm text-gray-600">Registra pagos al personal y por productos</p>
            </div>
          </div>
        </div>
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Pago
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setPaymentType('staff');
                  setSelectedProduct(null);
                }}
                className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  paymentType === 'staff'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Pago al Personal</div>
                  <div className="text-sm text-gray-500">Salarios, comisiones, bonos</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentType('product');
                  setSelectedStaff(null);
                }}
                className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  paymentType === 'product'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Pago por Productos</div>
                  <div className="text-sm text-gray-500">Pagos a proveedores</div>
                </div>
              </button>
            </div>
          </div>
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {paymentType === 'staff' ? 'Buscar Personal' : 'Buscar Producto'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={paymentType === 'staff' ? 'Buscar por nombre o email...' : 'Buscar por nombre o categoría...'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {/* Selección */}
          {paymentType === 'staff' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Personal *
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Cargando...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No se encontró personal</div>
                ) : (
                  filteredStaff.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaff(member)}
                      className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 flex items-center space-x-3 ${
                        selectedStaff?.id === member.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{member.firstName} {member.lastName}</div>
                        <div className="text-sm text-gray-500">{member.email} • {member.type === 'trainer' ? 'Entrenador' : 'Vendedor'}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Producto *
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Cargando...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No se encontraron productos</div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 flex items-center space-x-3 ${
                        selectedProduct?.id === product.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.category} • ${product.price.toLocaleString()}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Concepto (solo para personal) */}
          {paymentType === 'staff' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto *
              </label>
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value as PaymentConcept)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="salary">Salario</option>
                <option value="commission">Comisión</option>
                <option value="bonus">Bono</option>
              </select>
            </div>
          )}
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'transfer' | 'other')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>
          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalles adicionales del pago..."
            />
          </div>
          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || (!selectedStaff && !selectedProduct)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>Registrar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
export default StaffPayment;