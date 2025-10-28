import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { TrainerService, MemberService } from '../../services/users';
import { ClassService } from '../../services/classes';
import type { Trainer, CreateTrainerData, UpdateTrainerData, TrainerClass } from '../../types/trainer.types';
import type { GymClass, CreateClassData, CreateClassAssignmentData, ClassAssignment } from '../../types/class.types';
import type { UserProfile } from '../../types/auth.types';
import {sanitizeEmail, sanitizeEmailInput, sanitizePhone } from '../../utils/sanitization';
import { logger, criticalLogger } from '../../utils/logger';
// Constantes para el formulario de clases
const CLASS_CATEGORIES = [
  'Cardio',
  'Fuerza',
  'Flexibilidad',
  'Funcional',
  'Yoga',
  'Pilates',
  'Crossfit',
  'Spinning',
  'Aqua Fitness',
  'Danza',
  'Artes Marciales',
  'Rehabilitación'
];
const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' }
];
const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];
interface TrainerManagementProps {
  isOpen: boolean;
  onClose: () => void;
}
const TrainerManagement: React.FC<TrainerManagementProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'classes' | 'assign'>('list');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Estados para mensajes de éxito y error
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  // Estado para clases
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  // Estado para miembros y asignaciones
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  // Cargar entrenadores desde Firebase al montar el componente
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        setLoadingTrainers(true);
        const trainersData = await TrainerService.getAllTrainers();
        setTrainers(trainersData);
      } catch (error) {
        logger.error('Error loading trainers:', error);
        alert('Error al cargar los entrenadores');
      } finally {
        setLoadingTrainers(false);
      }
    };
    if (isOpen) {
      loadTrainers();
    }
  }, [isOpen]);
  // Cargar clases
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const classesData = await ClassService.getAllClasses();
      // Agregar nombres de entrenadores a las clases
      const classesWithTrainerNames = classesData.map(gymClass => {
        const trainer = trainers.find(t => t.id === gymClass.trainerId);
        return {
          ...gymClass,
          trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Sin asignar'
        };
      });
      setClasses(classesWithTrainerNames);
    } catch (error) {
      logger.error('Error loading classes:', error);
      alert('Error al cargar las clases');
    } finally {
      setLoadingClasses(false);
    }
  };
  // Cargar clases cuando se cambia a la pestaña de clases
  useEffect(() => {
    if (activeTab === 'classes' && trainers.length > 0) {
      loadClasses();
    }
  }, [activeTab, trainers]);
  // Función para cargar miembros
  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const membersData = await MemberService.getAllMembers();
      setMembers(membersData);
    } catch (error) {
      logger.error('Error loading members:', error);
      alert('Error al cargar los miembros');
    } finally {
      setLoadingMembers(false);
    }
  };
  // Cargar miembros cuando se cambia a la pestaña de asignación
  useEffect(() => {
    if (activeTab === 'assign') {
      loadMembers();
    }
  }, [activeTab]);
  const availableClasses: TrainerClass[] = [
    {
      id: 'crossfit-morning',
      name: 'CrossFit Matutino',
      description: 'Entrenamiento funcional de alta intensidad',
      duration: 60,
      maxCapacity: 15,
      trainerId: '1',
      schedule: [{ dayOfWeek: 1, startTime: '07:00', endTime: '08:00', room: 'Sala A' }],
      equipment: ['Barras', 'Discos', 'Kettlebells'],
      difficulty: 'intermediate',
      category: 'Fuerza'
    },
    {
      id: 'yoga-morning',
      name: 'Yoga Matutino',
      description: 'Práctica de yoga para comenzar el día',
      duration: 75,
      maxCapacity: 20,
      trainerId: '2',
      schedule: [{ dayOfWeek: 2, startTime: '08:00', endTime: '09:15', room: 'Sala B' }],
      equipment: ['Colchonetas', 'Bloques', 'Correas'],
      difficulty: 'beginner',
      category: 'Flexibilidad'
    }
  ];
  const handleAddTrainer = async (trainerData: CreateTrainerData) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      // Validaciones adicionales
      if (!trainerData.firstName.trim() || !trainerData.lastName.trim()) {
        throw new Error('El nombre y apellido son obligatorios');
      }
      if (!trainerData.email.trim()) {
        throw new Error('El email es obligatorio');
      }
      if (!trainerData.password || trainerData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      if (trainerData.specialties.length === 0) {
        throw new Error('Debe agregar al menos una especialidad');
      }
      logger.log('🔄 Creando entrenador:', trainerData.email);
      const newTrainer = await TrainerService.createTrainer(trainerData);
      logger.log('✅ Entrenador creado exitosamente:', newTrainer);
      setTrainers([...trainers, newTrainer]);
      setActiveTab('list');
      // Mostrar mensaje de éxito
      setSuccessMessage(`¡Entrenador ${trainerData.firstName} ${trainerData.lastName} creado exitosamente!`);
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      logger.error('❌ Error creating trainer:', error);
      // Mostrar mensaje de error específico
      const errorMsg = error.message || 'Error al crear el entrenador. Por favor, intenta de nuevo.';
      setErrorMessage(errorMsg);
      // Limpiar mensaje después de 8 segundos
      setTimeout(() => setErrorMessage(''), 8000);
    } finally {
      setIsLoading(false);
    }
  };
  // Funciones para manejar clases
  const handleAddClass = async (classData: CreateClassData) => {
    try {
      setIsLoading(true);
      await ClassService.createClass(classData);
      alert('Clase creada exitosamente');
      await loadClasses(); // Recargar las clases
    } catch (error) {
      criticalLogger.error('Error creating class:', error);
      alert('Error al crear la clase');
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateClass = async (classData: any) => {
    try {
      setIsLoading(true);
      await ClassService.updateClass(classData);
      alert('Clase actualizada exitosamente');
      await loadClasses(); // Recargar las clases
    } catch (error) {
      logger.error('Error updating class:', error);
      alert('Error al actualizar la clase');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteClass = async (classId: string) => {
    try {
      setIsLoading(true);
      await ClassService.deleteClass(classId);
      alert('Clase eliminada exitosamente');
      await loadClasses(); // Recargar las clases
    } catch (error) {
      criticalLogger.error('Error deleting class:', error);
      alert('Error al eliminar la clase');
    } finally {
      setIsLoading(false);
    }
  };
  // Funciones para manejar asignaciones de clases
  const handleCreateAssignment = async (assignmentData: CreateClassAssignmentData) => {
    try {
      setLoadingAssignments(true);
      await ClassService.createClassAssignment(assignmentData);
      alert('Clase asignada exitosamente');
      // Recargar datos si es necesario
      if (activeTab === 'classes') {
        await loadClasses();
      }
    } catch (error) {
      criticalLogger.error('Error creating assignment:', error);
      alert(error instanceof Error ? error.message : 'Error al asignar la clase');
    } finally {
      setLoadingAssignments(false);
    }
  };
  const handleCancelAssignment = async (assignmentId: string) => {
    try {
      setLoadingAssignments(true);
      await ClassService.cancelClassAssignment(assignmentId);
      alert('Asignación cancelada exitosamente');
      // Recargar datos si es necesario
      if (activeTab === 'classes') {
        await loadClasses();
      }
    } catch (error) {
      logger.error('Error canceling assignment:', error);
      alert('Error al cancelar la asignación');
    } finally {
      setLoadingAssignments(false);
    }
  };
  const handleUpdateTrainer = (trainerData: UpdateTrainerData) => {
    setTrainers(trainers.map(trainer => 
      trainer.id === trainerData.id 
        ? { ...trainer, ...trainerData }
        : trainer
    ));
    setSelectedTrainer(null);
  };
  const handleDeleteTrainer = (trainerId: string) => {
    setTrainers(trainers.filter(trainer => trainer.id !== trainerId));
    setShowDeleteConfirm(false);
    setSelectedTrainer(null);
  };
  const getDayName = (dayOfWeek: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dayOfWeek];
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'on_leave': return 'Con Licencia';
      default: return status;
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Entrenadores"
      size="xl"
    >
      <div className="h-[600px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lista de Entrenadores
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Agregar Entrenador
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'classes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Gestión de Clases
          </button>
          <button
            onClick={() => setActiveTab('assign')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'assign'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Asignar Clases
          </button>
        </div>
        {/* Mensajes de éxito y error */}
        {successMessage && (
          <div className="mx-6 mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </div>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'list' && (
            <>
              {loadingTrainers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Cargando entrenadores...</p>
                  </div>
                </div>
              ) : trainers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No hay entrenadores registrados</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Agregar Primer Entrenador
                  </button>
                </div>
              ) : (
                <TrainerList
                  trainers={trainers}
                  onEdit={setSelectedTrainer}
                  onDelete={(trainer) => {
                    setSelectedTrainer(trainer);
                    setShowDeleteConfirm(true);
                  }}
                  getDayName={getDayName}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              )}
            </>
          )}
          {activeTab === 'add' && (
            <AddTrainerForm
              onSubmit={handleAddTrainer}
              onCancel={() => setActiveTab('list')}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'classes' && (
            <ClassManagement
              classes={classes}
              trainers={trainers}
              loadingClasses={loadingClasses}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
            />
          )}
          {activeTab === 'assign' && (
            <AssignClassesForm
              classes={classes}
              members={members}
              loadingMembers={loadingMembers}
              loadingAssignments={loadingAssignments}
              onCreateAssignment={handleCreateAssignment}
            />
          )}
        </div>
        {/* Edit Trainer Modal */}
        {selectedTrainer && !showDeleteConfirm && (
          <EditTrainerModal
            trainer={selectedTrainer}
            onSave={handleUpdateTrainer}
            onCancel={() => setSelectedTrainer(null)}
          />
        )}
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedTrainer && (
          <DeleteConfirmModal
            trainer={selectedTrainer}
            onConfirm={() => handleDeleteTrainer(selectedTrainer.id)}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setSelectedTrainer(null);
            }}
          />
        )}
      </div>
    </Modal>
  );
};
// Componente para la lista de entrenadores
const TrainerList: React.FC<{
  trainers: Trainer[];
  onEdit: (trainer: Trainer) => void;
  onDelete: (trainer: Trainer) => void;
  getDayName: (day: number) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}> = ({ trainers, onEdit, onDelete, getDayName, getStatusColor, getStatusText }) => (
  <div className="space-y-4">
    {trainers.map((trainer) => (
      <div key={trainer.id} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900">
                {trainer.firstName} {trainer.lastName}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trainer.status)}`}>
                {getStatusText(trainer.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{trainer.email}</p>
            <p className="text-sm text-gray-600">{trainer.phone}</p>
            <div className="mt-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Especialidades:</span> {trainer.specialties.join(', ')}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Experiencia:</span> {trainer.experience} años
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tarifa:</span> ${trainer.hourlyRate.toLocaleString()}/hora
              </p>
            </div>
            {trainer.availability.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">Disponibilidad:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {trainer.availability.map((slot, index) => (
                    <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {getDayName(slot.dayOfWeek)} {slot.startTime}-{slot.endTime}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(trainer)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(trainer)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
);
// Componente para agregar entrenador
const AddTrainerForm: React.FC<{
  onSubmit: (data: CreateTrainerData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ onSubmit, onCancel, isLoading = false }) => {
  const [formData, setFormData] = useState<CreateTrainerData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    specialties: [],
    certifications: [],
    experience: 0,
    hourlyRate: 0,
    bio: ''
  });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Limpiar errores previos
    setValidationErrors({});
    // Validaciones
    const errors: {[key: string]: string} = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'El nombre es obligatorio';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es obligatorio';
    }
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es obligatorio';
    }
    if (formData.specialties.length === 0) {
      errors.specialties = 'Debe agregar al menos una especialidad';
    }
    if (formData.experience < 0) {
      errors.experience = 'La experiencia no puede ser negativa';
    }
    if (formData.hourlyRate < 0) {
      errors.hourlyRate = 'La tarifa no puede ser negativa';
    }
    // Si hay errores, mostrarlos y no enviar
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    const sanitizedData = {
      ...formData,
      email: sanitizeEmail(formData.email)
    };
    onSubmit(sanitizedData);
  };
  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, newSpecialty.trim()]
      });
      setNewSpecialty('');
    }
  };
  const addCertification = () => {
    if (newCertification.trim()) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, newCertification.trim()]
      });
      setNewCertification('');
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName:(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.firstName 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.firstName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName:(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.lastName 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.lastName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.email 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.password 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Mínimo 6 caracteres"
          />
          {validationErrors.password && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono
        </label>
        <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.phone 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.phone && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
          )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Años de Experiencia
          </label>
          <input
            type="number"
            min="0"
            required
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.experience 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.experience && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.experience}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tarifa por Hora ($)
          </label>
          <input
            type="number"
            min="0"
            required
            value={formData.hourlyRate}
            onChange={(e) => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.hourlyRate 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {validationErrors.hourlyRate && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.hourlyRate}</p>
          )}
        </div>
      </div>
      {/* Especialidades */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidades
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="Agregar especialidad"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addSpecialty}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Agregar
          </button>
        </div>
        {validationErrors.specialties && (
          <p className="mb-2 text-sm text-red-600">{validationErrors.specialties}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {formData.specialties.map((specialty, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {specialty}
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  specialties: formData.specialties.filter((_, i) => i !== index)
                })}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {/* Certificaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Certificaciones
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newCertification}
            onChange={(e) => setNewCertification(e.target.value)}
            placeholder="Agregar certificación"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addCertification}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.certifications.map((cert, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
              {cert}
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  certifications: formData.certifications.filter((_, i) => i !== index)
                })}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Biografía (Opcional)
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio:(e.target.value) })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Breve descripción del entrenador..."
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Creando...' : 'Agregar Entrenador'}
        </button>
      </div>
    </form>
  );
};
// Componente para editar entrenador (simplificado)
const EditTrainerModal: React.FC<{
  trainer: Trainer;
  onSave: (data: UpdateTrainerData) => void;
  onCancel: () => void;
}> = ({ trainer, onSave, onCancel }) => {
  const [status, setStatus] = useState(trainer.status);
  const handleSave = () => {
    onSave({
      id: trainer.id,
      status
    });
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium mb-4">
          Editar {trainer.firstName} {trainer.lastName}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="on_leave">Con Licencia</option>
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
// Componente para confirmar eliminación
const DeleteConfirmModal: React.FC<{
  trainer: Trainer;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ trainer, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-96">
      <h3 className="text-lg font-medium mb-4 text-red-600">
        Confirmar Eliminación
      </h3>
      <p className="text-gray-700 mb-6">
        ¿Estás seguro de que deseas eliminar a {trainer.firstName} {trainer.lastName}? 
        Esta acción no se puede deshacer.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);
// Componente para gestión de clases
const ClassManagement: React.FC<{
  classes: GymClass[];
  trainers: Trainer[];
  loadingClasses: boolean;
  onAddClass: (classData: CreateClassData) => void;
  onUpdateClass: (classData: any) => void;
  onDeleteClass: (classId: string) => void;
}> = ({ classes, trainers, loadingClasses, onAddClass, onUpdateClass, onDeleteClass }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  if (showAddForm) {
    return (
      <AddClassForm
        trainers={trainers}
        onSubmit={(classData) => {
          onAddClass(classData);
          setShowAddForm(false);
        }}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Gestión de Clases</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Agregar Clase
        </button>
      </div>
      {loadingClasses ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando clases...</p>
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No hay clases registradas</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Crear Primera Clase
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((gymClass) => (
            <div key={gymClass.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{gymClass.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      gymClass.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {gymClass.status === 'active' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{gymClass.description}</p>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Entrenador:</span> {gymClass.trainerName}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Categoría:</span> {gymClass.category}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Duración:</span> {gymClass.duration} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Capacidad:</span> {gymClass.currentEnrollment}/{gymClass.maxCapacity}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Puntos por asignación:</span> {gymClass.assignmentPoints}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Puntos por asistencia:</span> {gymClass.attendancePoints}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedClass(gymClass)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDeleteClass(gymClass.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// Componente para agregar clases
const AddClassForm: React.FC<{
  trainers: Trainer[];
  onSubmit: (classData: CreateClassData) => void;
  onCancel: () => void;
}> = ({ trainers, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<CreateClassData>({
    name: '',
    description: '',
    trainerId: '',
    schedule: [],
    duration: 60,
    maxCapacity: 20,
    category: '',
    difficulty: 'beginner',
    equipment: [],
    assignmentPoints: 10,
    attendancePoints: 5,
    cost: 0
  });
  const [newEquipment, setNewEquipment] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: ''
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.schedule.length === 0) {
      alert('Debe agregar al menos un horario');
      return;
    }
    onSubmit(formData);
  };
  const addEquipment = () => {
    if (newEquipment.trim()) {
      setFormData({
        ...formData,
        equipment: [...formData.equipment, newEquipment.trim()]
      });
      setNewEquipment('');
    }
  };
  const removeEquipment = (index: number) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter((_, i) => i !== index)
    });
  };
  const addSchedule = () => {
    if (scheduleForm.room.trim()) {
      setFormData({
        ...formData,
        schedule: [...formData.schedule, { ...scheduleForm }]
      });
      setScheduleForm({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        room: ''
      });
    }
  };
  const removeSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.filter((_, i) => i !== index)
    });
  };
  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Agregar Nueva Clase</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la Clase
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entrenador
          </label>
          <select
            required
            value={formData.trainerId}
            onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar entrenador</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.firstName} {trainer.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar categoría</option>
            {CLASS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dificultad
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración (minutos)
          </label>
          <input
            type="number"
            min="15"
            max="180"
            required
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacidad Máxima
          </label>
          <input
            type="number"
            min="1"
            max="50"
            required
            value={formData.maxCapacity}
            onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Puntos por Asignación
          </label>
          <input
            type="number"
            min="0"
            max="100"
            required
            value={formData.assignmentPoints}
            onChange={(e) => setFormData({ ...formData, assignmentPoints: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Puntos por Asistencia
          </label>
          <input
            type="number"
            min="0"
            max="100"
            required
            value={formData.attendancePoints}
            onChange={(e) => setFormData({ ...formData, attendancePoints: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Costo de la Clase ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>
      {/* Equipamiento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Equipamiento
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newEquipment}
            onChange={(e) => setNewEquipment(e.target.value)}
            placeholder="Agregar equipamiento"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addEquipment}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.equipment.map((equipment, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {equipment}
              <button
                type="button"
                onClick={() => removeEquipment(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {/* Horarios */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Horarios
        </label>
        <div className="grid grid-cols-5 gap-2 mb-2">
          <select
            value={scheduleForm.dayOfWeek}
            onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(e.target.value) })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={scheduleForm.startTime}
            onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="time"
            value={scheduleForm.endTime}
            onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={scheduleForm.room}
            onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
            placeholder="Sala/Ubicación"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addSchedule}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Agregar
          </button>
        </div>
        <div className="space-y-2">
          {formData.schedule.map((schedule, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-sm">
                {getDayName(schedule.dayOfWeek)} de {schedule.startTime} a {schedule.endTime} - {schedule.room}
              </span>
              <button
                type="button"
                onClick={() => removeSchedule(index)}
                className="text-red-600 hover:text-red-800"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear Clase
        </button>
      </div>
    </form>
  );
};
// Componente para asignar clases (simplificado)
const AssignClassesForm: React.FC<{
  classes: GymClass[];
  members: UserProfile[];
  loadingMembers: boolean;
  loadingAssignments: boolean;
  onCreateAssignment: (assignmentData: CreateClassAssignmentData) => void;
}> = ({ classes, members, loadingMembers, loadingAssignments, onCreateAssignment }) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [duration, setDuration] = useState(30); // días por defecto
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const filteredMembers = members.filter(member =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedClass = classes.find(c => c.id === selectedClassId);
  // Actualizar el monto del pago cuando se selecciona una clase
  useEffect(() => {
    if (selectedClass?.cost) {
      setPaymentAmount(selectedClass.cost);
    }
  }, [selectedClass]);
  // Función para obtener el color del estado de membresía
  const getMembershipStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  // Función para obtener el texto del estado de membresía
  const getMembershipStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'suspended':
        return 'Suspendido';
      default:
        return 'Sin estado';
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedMemberId) {
      alert('Por favor selecciona una clase y un miembro');
      return;
    }
    if (paymentAmount <= 0) {
      alert('El monto del pago debe ser mayor a 0');
      return;
    }
    const assignmentData: CreateClassAssignmentData = {
      classId: selectedClassId,
      memberId: selectedMemberId,
      duration,
      assignedBy: 'admin', // En una implementación real, esto vendría del usuario autenticado
      paymentAmount,
      paymentMethod,
      paymentNotes
    };
    onCreateAssignment(assignmentData);
    // Limpiar formulario
    setSelectedClassId('');
    setSelectedMemberId('');
    setDuration(30);
    setSearchTerm('');
    setPaymentAmount(0);
    setPaymentMethod('cash');
    setPaymentNotes('');
  };
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Asignar Clase a Miembro
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona una clase y un miembro para crear una nueva asignación
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de Clase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clase *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar clase...</option>
              {classes.map((gymClass) => (
                <option key={gymClass.id} value={gymClass.id}>
                  {gymClass.name} - {gymClass.category} ({gymClass.difficulty})
                </option>
              ))}
            </select>
          </div>
          {/* Información de la clase seleccionada */}
          {selectedClass && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Información de la Clase</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Puntos de Asignación:</span>
                  <span className="ml-2 text-blue-700">{selectedClass.assignmentPoints}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Puntos de Asistencia:</span>
                  <span className="ml-2 text-blue-700">{selectedClass.attendancePoints}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Costo:</span>
                  <span className="ml-2 text-blue-700">${selectedClass.cost?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Duración:</span>
                  <span className="ml-2 text-blue-700">{selectedClass.duration} minutos</span>
                </div>
                <div>
                   <span className="font-medium text-blue-800">Capacidad:</span>
                   <span className="ml-2 text-blue-700">{selectedClass.maxCapacity} personas</span>
                 </div>
              </div>
              {selectedClass.description && (
                <div className="mt-2">
                  <span className="font-medium text-blue-800">Descripción:</span>
                  <p className="text-blue-700 text-sm mt-1">{selectedClass.description}</p>
                </div>
              )}
            </div>
          )}
          {/* Duración de la asignación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración de la Asignación (días) *
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              La asignación expirará el {new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
          {/* Búsqueda de miembros */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Miembro *
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Lista de miembros */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Miembro *
            </label>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando miembros...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron miembros con ese criterio' : 'No hay miembros disponibles'}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
                 {filteredMembers.map((member) => (
                   <div
                     key={member.uid}
                     className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                       selectedMemberId === member.uid ? 'bg-blue-50 border-blue-200' : ''
                     }`}
                     onClick={() => setSelectedMemberId(member.uid)}
                   >
                     <div className="flex items-center">
                       <input
                         type="radio"
                         name="member"
                         value={member.uid}
                         checked={selectedMemberId === member.uid}
                         onChange={() => setSelectedMemberId(member.uid)}
                         className="mr-3"
                       />
                       <div className="flex-1">
                         <div className="flex items-center space-x-2">
                           <div className="font-medium text-gray-900">
                             {member.firstName} {member.lastName}
                           </div>
                           <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMembershipStatusColor(member.membershipStatus)}`}>
                             {getMembershipStatusText(member.membershipStatus)}
                           </span>
                         </div>
                         <div className="text-sm text-gray-600">{member.email}</div>
                         {member.emergencyContact?.phone && (
                           <div className="text-sm text-gray-500">{member.emergencyContact.phone}</div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
          {/* Información de Pago */}
          {selectedClass && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-green-800 mb-4">Información de Pago</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar ($) *
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas del Pago (opcional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>
              </div>
            </div>
          )}
          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSelectedClassId('');
                setSelectedMemberId('');
                setDuration(30);
                setSearchTerm('');
                setPaymentAmount(0);
                setPaymentMethod('cash');
                setPaymentNotes('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={loadingAssignments || !selectedClassId || !selectedMemberId || paymentAmount <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAssignments ? 'Asignando...' : 'Asignar Clase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TrainerManagement;