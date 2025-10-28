import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { VendorService } from '../../services/users/vendorService';
import type { UserProfile } from '../../types/auth.types';
import { Search, UserPlus, Edit, Trash2, Eye, Mail, Phone, Calendar, User, Loader2 } from 'lucide-react';
import {sanitizeEmail, sanitizeEmailInput, sanitizePhone } from '../../utils/sanitization';
import { logger, criticalLogger } from '../../utils/logger';
interface VendorManagementProps {
  isOpen: boolean;
  onClose: () => void;
}
const VendorManagement: React.FC<VendorManagementProps> = ({ isOpen, onClose }) => {
  const [vendors, setVendors] = useState<UserProfile[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<UserProfile | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: ''
  });
  useEffect(() => {
    if (isOpen) {
      loadVendors();
    }
  }, [isOpen]);
  useEffect(() => {
    filterVendors();
  }, [vendors, searchTerm]);
  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const vendorsList = await VendorService.getAllVendors();
      setVendors(vendorsList);
    } catch (error) {
      logger.error('Error loading vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const filterVendors = () => {
    if (!searchTerm) {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(vendor =>
        `${vendor.firstName} ${vendor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.emergencyContact?.phone && vendor.emergencyContact.phone.includes(searchTerm))
      );
      setFilteredVendors(filtered);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedVendor && showEditForm) {
        // Actualizar vendedor existente
        await VendorService.updateVendor(selectedVendor.uid, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: sanitizeEmail(formData.email),
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          emergencyContact: {
            name: formData.firstName + ' ' + formData.lastName,
            phone: formData.phone,
            relationship: 'self'
          }
        });
      } else {
        // Crear nuevo vendedor
        await VendorService.createVendor({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: sanitizeEmail(formData.email),
          password: formData.password || 'temporal123',
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date('1990-01-01'),
          emergencyContact: {
            name: formData.firstName + ' ' + formData.lastName,
            phone: formData.phone,
            relationship: 'self'
          }
        });
      }
      await loadVendors();
      resetForm();
    } catch (error) {
      logger.error('Error saving vendor:', error);
      alert('Error al guardar el vendedor. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleEdit = (vendor: UserProfile) => {
    setSelectedVendor(vendor);
    setFormData({
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      email: vendor.email,
      phone: vendor.emergencyContact?.phone || '',
      password: '',
      dateOfBirth: vendor.dateOfBirth ? vendor.dateOfBirth.toISOString().split('T')[0] : ''
    });
    setShowEditForm(true);
  };
  const handleDelete = async (vendorId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este vendedor?')) {
      try {
        setIsLoading(true);
        await VendorService.deleteVendor(vendorId);
        await loadVendors();
      } catch (error) {
        criticalLogger.error('Error deleting vendor:', error);
        alert('Error al eliminar el vendedor. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleViewDetails = (vendor: UserProfile) => {
    setSelectedVendor(vendor);
    setShowDetails(true);
  };
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      dateOfBirth: ''
    });
    setShowAddForm(false);
    setShowEditForm(false);
    setShowDetails(false);
    setSelectedVendor(null);
  };
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL').format(date);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Vendedores">
      <div className="space-y-6">
        {/* Header con búsqueda y botón agregar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar vendedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Vendedor
          </Button>
        </div>
        {/* Formulario de agregar/editar */}
        {(showAddForm || showEditForm) && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {showEditForm ? 'Editar Vendedor' : 'Nuevo Vendedor'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName:(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName:(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                {!showEditForm && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!showEditForm}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {showEditForm ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </div>
        )}
        {/* Modal de detalles */}
        {showDetails && selectedVendor && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-medium text-gray-900">Detalles del Vendedor</h4>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Nombre Completo</label>
                <p className="text-sm text-gray-900">{selectedVendor.firstName} {selectedVendor.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{selectedVendor.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Teléfono</label>
                <p className="text-sm text-gray-900">{selectedVendor.emergencyContact?.phone || 'No especificado'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
                <p className="text-sm text-gray-900">
                  {selectedVendor.dateOfBirth ? formatDate(selectedVendor.dateOfBirth) : 'No especificada'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Fecha de Registro</label>
                <p className="text-sm text-gray-900">{formatDate(selectedVendor.joinDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Rol</label>
                <p className="text-sm text-gray-900">Vendedor</p>
              </div>
            </div>
          </div>
        )}
        {/* Lista de vendedores */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando vendedores...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.firstName} {vendor.lastName}
                          </div>
                          <div className="text-sm text-gray-500">ID: {vendor.uid.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {vendor.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {vendor.emergencyContact?.phone || 'No especificado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(vendor.joinDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(vendor)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.uid)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredVendors.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vendedores</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron vendedores que coincidan con la búsqueda.' : 'Comienza agregando un nuevo vendedor.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default VendorManagement;