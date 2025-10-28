import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { TrainerService } from '../../services/users/trainerService';
import { VendorService } from '../../services/users/vendorService';
import { Search, UserPlus, Edit, Trash2, Eye, Mail, Phone, Calendar, User, Loader2, Users, Briefcase } from 'lucide-react';
import {sanitizeEmail, sanitizeEmailInput, sanitizePhone } from '../../utils/sanitization';
import { logger, criticalLogger } from '../../utils/logger';
interface StaffManagementProps {
  isOpen: boolean;
  onClose: () => void;
}
type StaffType = 'trainer' | 'vendor';
interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  staffType: StaffType;
  // Campos específicos de entrenadores
  specialties?: string[];
  certifications?: string[];
  experience?: number;
  hourlyRate?: number;
  bio?: string;
  // Campos específicos de vendedores
  company?: string;
  products?: string[];
  contactPerson?: string;
}
const StaffManagement: React.FC<StaffManagementProps> = ({ isOpen, onClose }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trainers' | 'vendors'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newStaffType, setNewStaffType] = useState<StaffType>('trainer');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    experience: '0' // Cambiar a string para el formulario
  });
  useEffect(() => {
    if (isOpen) {
      loadStaff();
    }
  }, [isOpen]);
  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm, activeTab]);
  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const [trainers, vendors] = await Promise.all([
        TrainerService.getAllTrainers(),
        VendorService.getAllVendors()
      ]);
      const staffList: StaffMember[] = [
        ...trainers.map(trainer => ({ 
          id: `trainer-${trainer.id}`,
          firstName: trainer.firstName,
          lastName: trainer.lastName,
          email: trainer.email,
          phone: trainer.phone || '',
          status: trainer.status || 'active',
          staffType: 'trainer' as StaffType,
          specialties: trainer.specialties || [],
          certifications: trainer.certifications || [],
          experience: trainer.experience || 0,
          hourlyRate: trainer.hourlyRate || 0,
          bio: trainer.bio || ''
        })),
        ...vendors.map(vendor => ({ 
          id: `vendor-${vendor.id}`,
          firstName: vendor.firstName,
          lastName: vendor.lastName,
          email: vendor.email,
          phone: vendor.phone || '',
          status: vendor.status || 'active',
          staffType: 'vendor' as StaffType,
          company: vendor.company || '',
          products: vendor.products || [],
          contactPerson: vendor.contactPerson || ''
        }))
      ];
      setStaff(staffList);
    } catch (error) {
      logger.error('Error loading staff:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const filterStaff = () => {
    let filtered = staff;
    // Filtrar por tipo de personal
    if (activeTab === 'trainers') {
      filtered = filtered.filter(member => member.staffType === 'trainer');
    } else if (activeTab === 'vendors') {
      filtered = filtered.filter(member => member.staffType === 'vendor');
    }
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm)
      );
    }
    setFilteredStaff(filtered);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedStaff && showEditForm) {
        // Actualizar miembro del personal existente
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: sanitizeEmail(formData.email), // Sanitización final para validación completa
          phone: formData.phone
        };
        if (selectedStaff.staffType === 'trainer') {
          await TrainerService.updateTrainer(selectedStaff.id, {
            ...updateData,
            experience: Number(formData.experience) || 0
          });
        } else {
          await VendorService.updateVendor(selectedStaff.id, updateData);
        }
      } else {
        // Crear nuevo miembro del personal
        const createData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: sanitizeEmail(formData.email), // Sanitización final para validación completa
          password: formData.password || 'temporal123',
          phone: formData.phone
        };
        if (newStaffType === 'trainer') {
          await TrainerService.createTrainer({
            ...createData,
            experience: Number(formData.experience) || 0
          });
        } else {
          await VendorService.createVendor(createData);
        }
      }
      await loadStaff();
      resetForm();
    } catch (error) {
      logger.error('Error saving staff member:', error);
      alert('Error al guardar el miembro del personal. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleEdit = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email,
      phone: staffMember.phone,
      password: '',
      dateOfBirth: '',
      experience: (staffMember.experience || 0).toString()
    });
    setShowEditForm(true);
  };
  const handleDelete = async (staffMember: StaffMember) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${staffMember.firstName} ${staffMember.lastName}?`)) {
      setIsLoading(true);
      try {
        if (staffMember.staffType === 'trainer') {
          await TrainerService.deleteTrainer(staffMember.id);
        } else {
          await VendorService.deleteVendor(staffMember.id);
        }
        await loadStaff();
      } catch (error) {
        criticalLogger.error('Error deleting staff member:', error);
        alert('Error al eliminar el miembro del personal. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      dateOfBirth: '',
      experience: '0'
    });
    setShowAddForm(false);
    setShowEditForm(false);
    setSelectedStaff(null);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    // Aplicar sanitización específica según el tipo de campo
    if (name === 'email') {
      sanitizedValue = sanitizeEmailInput(value);
    } else if (name === 'phone') {
      sanitizedValue = sanitizePhone(value);
    } else if (typeof value === 'string') {
      sanitizedValue =(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };
  const getStaffStats = () => {
    const trainers = staff.filter(member => member.staffType === 'trainer');
    const vendors = staff.filter(member => member.staffType === 'vendor');
    const activeStaff = staff.filter(member => member.status === 'active');
    return {
      total: staff.length,
      trainers: trainers.length,
      vendors: vendors.length,
      active: activeStaff.length
    };
  };
  const stats = getStaffStats();
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Personal" size="xl">
      <div className="space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Personal</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Entrenadores</p>
                <p className="text-2xl font-bold text-green-900">{stats.trainers}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Vendedores</p>
                <p className="text-2xl font-bold text-purple-900">{stats.vendors}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Activos</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.active}</p>
              </div>
            </div>
          </div>
        </div>
        {/* Controles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'all'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab('trainers')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'trainers'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Entrenadores ({stats.trainers})
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'vendors'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendedores ({stats.vendors})
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar personal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Personal
            </Button>
          </div>
        </div>
        {/* Lista de Personal */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay personal</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'Comienza agregando un nuevo miembro del personal.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredStaff.map((member) => (
                <li key={member.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        member.staffType === 'trainer' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {member.staffType === 'trainer' ? (
                          <User className={`h-5 w-5 ${member.staffType === 'trainer' ? 'text-green-600' : 'text-purple-600'}`} />
                        ) : (
                          <Briefcase className={`h-5 w-5 ${member.staffType === 'trainer' ? 'text-green-600' : 'text-purple-600'}`} />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.staffType === 'trainer' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {member.staffType === 'trainer' ? 'Entrenador' : 'Vendedor'}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-1" />
                          {member.email}
                          {member.phone && (
                            <>
                              <Phone className="h-4 w-4 ml-4 mr-1" />
                              {member.phone}
                            </>
                          )}
                        </div>
                        {member.staffType === 'trainer' && member.experience && (
                          <p className="text-sm text-gray-500 mt-1">
                            Experiencia: {member.experience} años
                          </p>
                        )}
                        {member.staffType === 'vendor' && member.company && (
                          <p className="text-sm text-gray-500 mt-1">
                            Empresa: {member.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStaff(member);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Modal para agregar personal */}
      {showAddForm && (
        <Modal
          isOpen={showAddForm}
          onClose={resetForm}
          title="Agregar Nuevo Personal"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Personal
              </label>
              <select
                value={newStaffType}
                onChange={(e) => setNewStaffType(e.target.value as StaffType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="trainer">Entrenador</option>
                <option value="vendor">Vendedor</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {newStaffType === 'trainer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Años de Experiencia
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Agregar Personal'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal para editar personal */}
      {showEditForm && selectedStaff && (
        <Modal
          isOpen={showEditForm}
          onClose={resetForm}
          title={`Editar ${selectedStaff.staffType === 'trainer' ? 'Entrenador' : 'Vendedor'}`}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {selectedStaff.staffType === 'trainer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Años de Experiencia
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal de detalles */}
      {showDetails && selectedStaff && (
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={`Detalles de ${selectedStaff.firstName} ${selectedStaff.lastName}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre Completo</p>
                  <p className="text-sm text-gray-900">{selectedStaff.firstName} {selectedStaff.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{selectedStaff.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900">{selectedStaff.phone || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedStaff.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedStaff.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
            {selectedStaff.staffType === 'trainer' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-4">Información de Entrenador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700">Experiencia</p>
                    <p className="text-sm text-green-900">{selectedStaff.experience || 0} años</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Tarifa por Hora</p>
                    <p className="text-sm text-green-900">${selectedStaff.hourlyRate || 0}</p>
                  </div>
                  {selectedStaff.specialties && selectedStaff.specialties.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-green-700">Especialidades</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedStaff.specialties.map((specialty) => (
                          <span key={specialty} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedStaff.bio && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-green-700">Biografía</p>
                      <p className="text-sm text-green-900">{selectedStaff.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedStaff.staffType === 'vendor' && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900 mb-4">Información de Vendedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Empresa</p>
                    <p className="text-sm text-purple-900">{selectedStaff.company || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700">Persona de Contacto</p>
                    <p className="text-sm text-purple-900">{selectedStaff.contactPerson || 'No especificada'}</p>
                  </div>
                  {selectedStaff.products && selectedStaff.products.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-purple-700">Productos</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedStaff.products.map((product) => (
                          <span key={product} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
};
export default StaffManagement;