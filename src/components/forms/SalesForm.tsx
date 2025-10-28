import React, { useState, useEffect } from 'react';
import type { Product, PaymentMethod, CreateProductSaleData } from '../../types/product.types';
import type { UserProfile } from '../../types/auth.types';
import { salesService } from '../../services/sales/salesService';
import { MemberService } from '../../services/users/memberService';
import { ProductService } from '../../services/products';
import { logger, criticalLogger } from '../../utils/logger';
interface SalesFormProps {
  onSaleComplete: () => void;
  onCancel: () => void;
  sellerId: string;
}
export const SalesForm: React.FC<SalesFormProps> = ({
  onSaleComplete,
  onCancel,
  sellerId
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [isMemberSale, setIsMemberSale] = useState(false);
  const [memberInfo, setMemberInfo] = useState<UserProfile | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    loadProducts();
  }, []);
  const loadProducts = async () => {
    try {
      const productsData = await ProductService.getActiveProducts();
      setProducts(productsData);
    } catch (error) {
      logger.error('Error loading products:', error);
      setError('Error al cargar productos');
    }
  };
  const searchMembers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const members = await MemberService.searchMembersByName(searchTerm);
      setSearchResults(members);
      setShowSearchResults(true);
    } catch (error) {
      logger.error('Error searching members:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };
  const selectMember = async (member: UserProfile) => {
    try {
      // Obtener la información más actualizada del miembro
      const updatedMember = await MemberService.getMemberById(member.uid);
      if (updatedMember) {
        setMemberInfo(updatedMember);
        setBuyerName(`${updatedMember.firstName} ${updatedMember.lastName}`);
        setMemberSearchTerm(`${updatedMember.firstName} ${updatedMember.lastName}`);
      } else {
        // Si no se puede obtener la información actualizada, usar la del resultado de búsqueda
        setMemberInfo(member);
        setBuyerName(`${member.firstName} ${member.lastName}`);
        setMemberSearchTerm(`${member.firstName} ${member.lastName}`);
      }
    } catch (error) {
      logger.error('Error getting updated member info:', error);
      // En caso de error, usar la información del resultado de búsqueda
      setMemberInfo(member);
      setBuyerName(`${member.firstName} ${member.lastName}`);
      setMemberSearchTerm(`${member.firstName} ${member.lastName}`);
    }
    setShowSearchResults(false);
  };
  const clearMemberSelection = () => {
    setMemberInfo(null);
    setBuyerName('');
    setMemberSearchTerm('');
    setShowSearchResults(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Selecciona un producto');
      return;
    }
    if (quantity <= 0 || quantity > selectedProduct.stock) {
      setError('Cantidad inválida');
      return;
    }
    if (!buyerName.trim()) {
      setError('Ingresa el nombre del comprador');
      return;
    }
    if (isMemberSale && !memberInfo) {
      setError('Selecciona un miembro para la venta');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const saleData: CreateProductSaleData = {
        productId: selectedProduct.id,
        quantity,
        buyerName: buyerName.trim(),
        buyerEmail: memberInfo?.email || undefined,
        buyerId: memberInfo?.uid,
        isMember: isMemberSale && !!memberInfo,
        paymentMethod,
        notes: notes.trim() || undefined,
        soldBy: sellerId
      };
      await salesService.createSale(saleData);
      onSaleComplete();
    } catch (error) {
      criticalLogger.error('Error creating sale:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };
  const totalAmount = selectedProduct ? selectedProduct.price * quantity : 0;
  const pointsToAward = selectedProduct && isMemberSale && memberInfo ? selectedProduct.points * quantity : 0;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nueva Venta</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto *
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  setSelectedProduct(product || null);
                  setQuantity(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar producto</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - ${product.price} (Stock: {product.stock})
                  </option>
                ))}
              </select>
            </div>
            {/* Información del producto seleccionado */}
            {selectedProduct && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedProduct.description}</p>
                <div className="flex justify-between text-sm">
                  <span>Precio: <span className="font-medium">${selectedProduct.price}</span></span>
                  <span>Puntos: <span className="font-medium">{selectedProduct.points}</span></span>
                  <span>Stock: <span className="font-medium">{selectedProduct.stock}</span></span>
                </div>
              </div>
            )}
            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.stock || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {/* Checkbox para venta a miembro */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isMemberSale}
                  onChange={(e) => {
                    setIsMemberSale(e.target.checked);
                    if (!e.target.checked) {
                      clearMemberSelection();
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Venta para miembro (asignar puntos)
                </span>
              </label>
            </div>
            {/* Buscador de miembros */}
            {isMemberSale && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar miembro *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={memberSearchTerm}
                    onChange={(e) => {
                      setMemberSearchTerm(e.target.value);
                      searchMembers(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar por nombre..."
                    disabled={!!memberInfo}
                  />
                  {memberInfo && (
                    <button
                      type="button"
                      onClick={clearMemberSelection}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700"
                      title="Limpiar selección"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {isSearching && (
                    <div className="flex items-center px-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {/* Resultados de búsqueda */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((member) => (
                      <button
                        key={member.uid}
                        type="button"
                        onClick={() => selectMember(member)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email} • Puntos: {member.points || 0}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchResults && searchResults.length === 0 && memberSearchTerm && !isSearching && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                    No se encontraron miembros
                  </div>
                )}
              </div>
            )}
            {/* Nombre del comprador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del comprador *
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre completo"
                required
                disabled={isMemberSale && !!memberInfo}
              />
            </div>
            {/* Información de membresía */}
            {isMemberSale && memberInfo && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Información del Miembro</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Nombre: {memberInfo.firstName} {memberInfo.lastName}</p>
                  <p>Email: {memberInfo.email}</p>
                  <p>Puntos actuales: {memberInfo.points || 0}</p>
                  <p>Estado: {memberInfo.membershipStatus || 'Activo'}</p>
                  {pointsToAward > 0 && (
                    <p className="font-medium">Puntos a otorgar: +{pointsToAward}</p>
                  )}
                </div>
              </div>
            )}
            {/* Método de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Información adicional sobre la venta..."
              />
            </div>
            {/* Resumen de la venta */}
            {selectedProduct && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Resumen de la Venta</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  {pointsToAward > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Puntos a otorgar:</span>
                      <span>+{pointsToAward}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedProduct}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Procesando...' : 'Completar Venta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};