import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Badge } from '../ui';
import { MemberService } from '../../services/users';
import { PaymentService } from '../../services/payments';
import { ClassService } from '../../services/classes/classService';
import { PlanService } from '../../services/plans/planService';
import type { UserProfile } from '../../types/auth.types';
import type { ClassAssignment, ClassPayment } from '../../types/class.types';
import type { PlanAssignment } from '../../types/plan.types';
import { useSafeDisplay } from '../../hooks/useSafeDisplay';
import { logger, criticalLogger } from '../../utils/logger';
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  CreditCard, 
  Award,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
interface MemberManagementDetailedProps {
  isOpen: boolean;
  onClose: () => void;
}
interface MemberWithDetails extends UserProfile {
  totalSpent: number;
  classCount: number;
  planCount: number;
  classAssignments?: ClassAssignment[];
  planAssignments?: PlanAssignment[];
  payments?: ClassPayment[];
}
const MemberManagementDetailed: React.FC<MemberManagementDetailedProps> = ({ isOpen, onClose }) => {
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'lastActivity' | 'totalSpent'>('name');
  // Hook para sanitización segura de contenido
  const { safeText, safeEmail, safeFullName, safePhone, safeUserDisplay } = useSafeDisplay();
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);
  useEffect(() => {
    filterAndSortMembers();
  }, [members, searchTerm, filterStatus, sortBy]);
  const loadMembers = async () => {
    setLoading(true);
    try {
      const membersList = await MemberService.getAllMembers();
      // Enriquecer datos de miembros con información real de la base de datos
      const enrichedMembers: MemberWithDetails[] = await Promise.all(
        membersList.map(async (member) => {
          try {
            // Obtener datos reales de asignaciones y pagos
            const [classAssignments, planAssignments, payments] = await Promise.all([
              ClassService.getMemberAssignments(member.uid),
              PlanService.getMemberPlanAssignments(member.uid),
              PaymentService.getPaymentsByMember(member.uid)
            ]);
            // Calcular estadísticas reales
            const totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const classCount = classAssignments.length;
            const planCount = planAssignments.length;
            // Calcular estado activo dinámicamente basándose en asignaciones activas
            const isActive = planAssignments.some(plan => 
              plan.status === 'active' && new Date(plan.expiresAt) > new Date()
            ) || classAssignments.some(classAssignment => 
              classAssignment.status === 'active' && new Date(classAssignment.expiresAt) > new Date()
            );
            // Actualizar el membershipStatus basándose en el cálculo dinámico
            const dynamicMembershipStatus = isActive ? 'active' : 'inactive';
            return {
              ...member,
              membershipStatus: dynamicMembershipStatus, // Sobrescribir con el estado calculado dinámicamente
              totalSpent,
              classCount,
              planCount,
              classAssignments,
              planAssignments,
              payments
            };
          } catch (error) {
            logger.error(`Error loading data for member ${member.uid}:`, error);
            // En caso de error, devolver datos por defecto con estado inactivo
            return {
              ...member,
              membershipStatus: 'inactive', // Estado por defecto en caso de error
              totalSpent: 0,
              classCount: 0,
              planCount: 0,
              classAssignments: [],
              planAssignments: [],
              payments: []
            };
          }
        })
      );
      setMembers(enrichedMembers);
    } catch (error) {
      logger.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };
  const filterAndSortMembers = () => {
    let filtered = members.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`;
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && member.membershipStatus === 'active') ||
                           (filterStatus === 'inactive' && member.membershipStatus === 'inactive') ||
                           (filterStatus === 'suspended' && member.membershipStatus === 'suspended');
      return matchesSearch && matchesStatus;
    });
    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'joinDate':
          return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
        case 'lastActivity':
          const aActivity = a.lastActivity?.getTime() || 0;
          const bActivity = b.lastActivity?.getTime() || 0;
          return bActivity - aActivity;
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        default:
          return 0;
      }
    });
    setFilteredMembers(filtered);
  };
  const handleDeleteMember = async (memberId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este miembro? Esta acción no se puede deshacer.')) {
      try {
        await MemberService.deleteMember(memberId);
        await loadMembers();
      } catch (error) {
        criticalLogger.error('Error deleting member:', error);
        alert('Error al eliminar el miembro');
      }
    }
  };
  const handleViewMemberDetail = (member: MemberWithDetails) => {
    setSelectedMember(member);
    setShowMemberDetail(true);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-CL');
  };
  const getStatusBadge = (status: string | undefined) => {
    const statusConfig = {
      active: { variant: 'success' as const, text: 'Activo' },
      inactive: { variant: 'secondary' as const, text: 'Inactivo' },
      suspended: { variant: 'destructive' as const, text: 'Suspendido' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };
  const exportToCSV = () => {
    const csvData = filteredMembers.map(member => ({
      Nombre: `${member.firstName} ${member.lastName}`,
      Email: member.email,
      Estado: member.membershipStatus || 'inactive',
      'Fecha de Registro': formatDate(member.joinDate),
      'Total Gastado': member.totalSpent || 0,
      'Última Actividad': member.lastActivity ? formatDate(member.lastActivity) : 'N/A'
    }));
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miembros_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  if (!isOpen) return null;
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestión Detallada de Miembros" size="xl">
        <div className="space-y-6">
          {/* Controles de búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive' | 'suspended')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
              <option value="suspended">Solo suspendidos</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'joinDate' | 'lastActivity' | 'totalSpent')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Ordenar por nombre</option>
              <option value="joinDate">Ordenar por fecha de registro</option>
              <option value="lastActivity">Ordenar por última actividad</option>
              <option value="totalSpent">Ordenar por total gastado</option>
            </select>
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{filteredMembers.length}</div>
              <div className="text-sm text-blue-600">Total Miembros</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filteredMembers.filter(m => m.membershipStatus === 'active').length}
              </div>
              <div className="text-sm text-green-600">Activos</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {filteredMembers.filter(m => m.membershipStatus === 'inactive').length}
              </div>
              <div className="text-sm text-red-600">Inactivos</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(filteredMembers.reduce((sum, m) => sum + (m.totalSpent || 0), 0))}
              </div>
              <div className="text-sm text-purple-600">Ingresos Totales</div>
            </div>
          </div>
          {/* Lista de miembros */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando miembros...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron miembros que coincidan con los criterios de búsqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <div key={member.uid} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {safeFullName(member.firstName, member.lastName)}
                          </h3>
                          {getStatusBadge(member.membershipStatus)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {safeEmail(member.email)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Registro: {formatDate(member.joinDate)}
                          </div>
                          {member.totalSpent !== undefined && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatCurrency(member.totalSpent)}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            {member.classCount || 0} clases
                          </div>
                        </div>
                        {member.lastActivity && (
                          <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Última actividad: {formatDate(member.lastActivity)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleViewMemberDetail(member)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        <Button
                          onClick={() => handleDeleteMember(member.uid)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
      {/* Modal de detalle del miembro */}
      {showMemberDetail && selectedMember && (
        <Modal
          isOpen={showMemberDetail}
          onClose={() => setShowMemberDetail(false)}
          title={`Detalle de ${selectedMember.firstName} ${selectedMember.lastName}`}
        >
          <div className="space-y-6">
            {/* Información personal */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nombre:</span> {safeFullName(selectedMember.firstName, selectedMember.lastName)}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {safeEmail(selectedMember.email)}
                </div>
                <div>
                  <span className="font-medium">Fecha de nacimiento:</span> {formatDate(selectedMember.dateOfBirth)}
                </div>
                <div>
                  <span className="font-medium">Estado:</span> {getStatusBadge(selectedMember.membershipStatus)}
                </div>
                <div>
                  <span className="font-medium">Tipo de membresía:</span> {selectedMember.membershipType || 'No asignado'}
                </div>
                <div>
                  <span className="font-medium">Fecha de registro:</span> {formatDate(selectedMember.joinDate)}
                </div>
                {selectedMember.lastActivity && (
                  <div>
                    <span className="font-medium">Última actividad:</span> {formatDate(selectedMember.lastActivity)}
                  </div>
                )}
              </div>
            </div>
            {/* Contacto de emergencia */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contacto de Emergencia
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nombre:</span> {safeText(selectedMember.emergencyContact.name)}
                </div>
                <div>
                  <span className="font-medium">Teléfono:</span> {safePhone(selectedMember.emergencyContact.phone)}
                </div>
                <div>
                  <span className="font-medium">Relación:</span> {safeText(selectedMember.emergencyContact.relationship)}
                </div>
              </div>
            </div>
            {/* Estadísticas */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Estadísticas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Total Gastado</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedMember.totalSpent)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Clases Asignadas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedMember.classCount}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">Planes Asignados</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedMember.planCount}
                  </p>
                </div>
              </div>
            </div>
            {/* Clases Asignadas */}
            {selectedMember.classAssignments && selectedMember.classAssignments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Clases Asignadas ({selectedMember.classAssignments.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedMember.classAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{assignment.className}</p>
                          <p className="text-sm text-gray-600">
                            Asignado: {formatDate(assignment.assignedAt)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expira: {formatDate(assignment.expiresAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={assignment.status === 'active' ? 'success' : 'secondary'}>
                            {assignment.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatCurrency(assignment.paymentAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Planes Asignados */}
            {selectedMember.planAssignments && selectedMember.planAssignments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Planes Asignados ({selectedMember.planAssignments.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedMember.planAssignments.map((assignment) => (
                    <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{assignment.planName}</p>
                          <p className="text-sm text-gray-600">
                            Asignado: {formatDate(assignment.assignedAt)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expira: {formatDate(assignment.expiresAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={assignment.status === 'active' ? 'success' : 'secondary'}>
                            {assignment.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatCurrency(assignment.paymentAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Historial de Pagos */}
            {selectedMember.payments && selectedMember.payments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Historial de Pagos ({selectedMember.payments.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedMember.payments.map((payment) => (
                    <div key={payment.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{payment.className || 'Pago general'}</p>
                          <p className="text-sm text-gray-600">
                            Fecha: {formatDate(payment.paymentDate)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Método: {payment.paymentMethod}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-gray-500 italic">{payment.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </p>
                          <Badge variant="success">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Mensaje si no hay datos */}
            {(!selectedMember.classAssignments || selectedMember.classAssignments.length === 0) &&
             (!selectedMember.planAssignments || selectedMember.planAssignments.length === 0) &&
             (!selectedMember.payments || selectedMember.payments.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Este miembro aún no tiene actividad registrada</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setShowMemberDetail(false)} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
export default MemberManagementDetailed;