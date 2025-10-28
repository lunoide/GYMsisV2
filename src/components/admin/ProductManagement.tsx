import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import type { CreateProductData, ProductCategory, Product } from '../../types/product.types';
import { logger } from '../../utils/logger';
import { ProductService } from '../../services/products';
interface ProductManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  product?: Product; // Para edición
}
const ProductManagement: React.FC<ProductManagementProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    price: 0,
    category: 'supplements',
    imageUrl: '',
    stock: 0,
    points: 0,
    createdBy: user?.uid || ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const categories: { value: ProductCategory; label: string }[] = [
    { value: 'supplements', label: 'Suplementos' },
    { value: 'equipment', label: 'Equipos' },
    { value: 'apparel', label: 'Ropa Deportiva' },
    { value: 'accessories', label: 'Accesorios' },
    { value: 'nutrition', label: 'Nutrición' },
    { value: 'other', label: 'Otros' }
  ];
  // Cargar datos del producto cuando se está editando
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        stock: product.stock,
        points: product.points,
        createdBy: product.createdBy
      });
      setImagePreview(product.imageUrl);
    } else if (!product && isOpen) {
      // Reset form for new product
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'supplements',
        imageUrl: '',
        stock: 0,
        points: 0,
        createdBy: user?.uid || ''
      });
      setImagePreview('');
    }
  }, [product, isOpen, user?.uid]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value
    }));
  };
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      alert('Error: Usuario no autenticado');
      return;
    }
    if (!formData.imageUrl) {
      alert('Por favor, ingresa la URL de la imagen del producto');
      return;
    }
    setIsLoading(true);
    try {
      const imageUrl = formData.imageUrl;
      if (product && product.id) {
        // Editar producto existente
        const updateData = {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          category: formData.category,
          imageUrl,
          stock: formData.stock
        };
        await ProductService.updateProduct(product.id, updateData);
        alert('Producto actualizado exitosamente');
      } else {
        // Crear nuevo producto
        const productData: CreateProductData = {
          ...formData,
          imageUrl,
          createdBy: user.uid
        };
        await ProductService.createProduct(productData);
        alert('Producto creado exitosamente');
      }
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'supplements',
        imageUrl: '',
        stock: 0,
        points: 0,
        createdBy: user.uid
      });
      setImagePreview('');
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error saving product:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'supplements',
        imageUrl: '',
        stock: 0,
        points: 0,
        createdBy: user?.uid || ''
      });
      setImagePreview('');
      onClose();
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={product ? "Editar Producto" : "Agregar Nuevo Producto"}
      size="lg"
      closeOnOverlayClick={!isLoading}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Nombre del Producto */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Producto *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="Ej: Proteína Whey 2kg"
          />
        </div>
        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Descripción *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={3}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="Describe las características del producto..."
          />
        </div>
        {/* Precio, Stock y Puntos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Precio ($) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
              Stock Inicial *
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              required
              min="0"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
              Puntos *
            </label>
            <input
              type="number"
              id="points"
              name="points"
              value={formData.points}
              onChange={handleInputChange}
              required
              min="0"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="0"
            />
          </div>
        </div>
        {/* Categoría */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        {/* Imagen */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
            URL de la Imagen del Producto *
          </label>
          <div className="space-y-4">
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleImageUrlChange}
              placeholder="https://ejemplo.com/imagen.jpg"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            {imagePreview && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  onError={() => setImagePreview('')}
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              Ingresa la URL completa de la imagen del producto. Puedes usar servicios como Imgur, Cloudinary, o cualquier URL pública de imagen.
            </p>
          </div>
        </div>
        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.name || !formData.description || !formData.imageUrl}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              product ? 'Actualizar Producto' : 'Crear Producto'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default ProductManagement;