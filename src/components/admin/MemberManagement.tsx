import React, { useState, useEffect } from 'react';
import { Modal } from '../ui';
import { UserForm } from '../forms';
import { MemberService } from '../../services/users';
import type { UserProfile } from '../../types/auth.types';
import type { UserFormData } from '../forms/UserForm';
import { logger } from '../../utils/logger';
interface MemberManagementProps {
  isOpen: boolean;
  onClose: () => void;
}
const MemberManagement: React.FC<MemberManagementProps> = ({ isOpen, onClose }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  // Cargar miembros
  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const allMembers = await MemberService.getAllMembers();
      setMembers(allMembers);
    } catch (error) {
      logger.error('Error cargando miembros:', error);
      alert('Error al cargar la lista de miembros');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);
  // Filtrar miembros por búsqueda
  const filteredMembers = members.filter(member =>
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Manejar edición de miembro
  const handleEditMember = (member: UserProfile) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };
  // Manejar actualización de miembro
  const handleUpdateMember = async (formData: UserFormData) => {
    if (!selectedMember) return;
    try {
      const updateData: Partial<UserProfile> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        dateOfBirth: new Date(formData.dateOfBirth),
        emergencyContact: formData.emergencyContact,
        lastActivity: new Date()
      };
      await MemberService.updateMember(selectedMember.uid, updateData);
      await loadMembers(); // Recargar la lista
      setShowEditModal(false);
      setSelectedMember(null);
      alert('Miembro actualizado exitosamente');
    } catch (error) {
      logger.error('Error actualizando miembro:', error);
      alert('Error al actualizar el miembro');
    }
  };
  // Confirmar eliminación
  const confirmDelete = (member: UserProfile) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };
  // Eliminar miembro
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await MemberService.deleteMember(memberToDelete.uid);
      await loadMembers(); // Recargar la lista
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
      alert('Miembro eliminado exitosamente');
    } catch (error) {
      logger.error('Error eliminando miembro:', error);
      alert('Error al eliminar el miembro');
    }
  };
  // Formatear fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES');
  };
  // Obtener color del estado
  const getStatusColor = (status?: string) => {
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
  // Obtener texto del estado
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'suspended':
        return 'Suspendido';
      default:
        return 'Desconocido';
    }
  };
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Miembros" size="xl">
        <div className="space-y-6">
          {/* Barra de búsqueda */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar miembros por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadMembers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Actualizar
            </button>
          </div>
          {/* Lista de miembros */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Miembro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
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
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          {searchTerm ? 'No se encontraron miembros con ese criterio' : 'No hay miembros registrados'}
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {member.uid.substring(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.membershipStatus)}`}>
                              {getStatusText(member.membershipStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(member.joinDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEditMember(member)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => confirmDelete(member)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{members.length}</div>
              <div className="text-sm text-blue-800">Total Miembros</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {members.filter(m => m.membershipStatus === 'active').length}
              </div>
              <div className="text-sm text-green-800">Miembros Activos</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {members.filter(m => m.membershipStatus === 'inactive').length}
              </div>
              <div className="text-sm text-gray-800">Miembros Inactivos</div>
            </div>
          </div>
        </div>
      </Modal>
      {/* Modal de edición */}
      {showEditModal && selectedMember && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMember(null);
          }}
          title={`Editar Miembro: ${selectedMember.firstName} ${selectedMember.lastName}`}
          size="lg"
        >
          <UserForm
            isEdit={true}
            initialData={{
              firstName: selectedMember.firstName,
              lastName: selectedMember.lastName,
              email: selectedMember.email,
              phone: '', // No tenemos este campo en UserProfile
              dateOfBirth: selectedMember.dateOfBirth.toISOString().split('T')[0],
              password: '',
              confirmPassword: '',
              emergencyContact: selectedMember.emergencyContact
            }}
            onSubmit={handleUpdateMember}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedMember(null);
            }}
          />
        </Modal>
      )}
      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && memberToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setMemberToDelete(null);
          }}
          title="Confirmar Eliminación"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar al miembro{' '}
              <strong>{memberToDelete.firstName} {memberToDelete.lastName}</strong>?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer y eliminará toda la información del miembro.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
export default MemberManagement;