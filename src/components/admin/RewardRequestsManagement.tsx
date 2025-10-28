import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Gift, 
  Calendar, 
  MessageSquare,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { RewardRequestsService, RewardsService } from '../../services/rewards';
import { UserPointsService } from '../../services/user';
import { useAuth } from '../../hooks/useAuth';
import type { RewardRequest } from '../../services/rewards';
import { logger } from '../../utils/logger';
const RewardRequestsManagement: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RewardRequest | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  useEffect(() => {
    loadRequests();
    loadStats();
  }, []);
  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter]);
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const allRequests = await RewardRequestsService.getAllRequests();
      setRequests(allRequests);
    } catch (err) {
      setError('Error al cargar las solicitudes');
      logger.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };
  const loadStats = async () => {
    try {
      const requestStats = await RewardRequestsService.getRequestsStats();
      setStats(requestStats);
    } catch (err) {
      logger.error('Error loading stats:', err);
    }
  };
  const filterRequests = () => {
    let filtered = requests;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    setFilteredRequests(filtered);
  };
  const handleProcessRequest = (request: RewardRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setShowProcessModal(true);
  };
  const processRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest || !user) return;
    try {
      setProcessing(selectedRequest.id);
      // Procesar la solicitud
      await RewardRequestsService.processRequest(selectedRequest.id, {
        status,
        adminNotes,
        processedBy: user.uid
      });
      // Si se aprueba, realizar el canje real
      if (status === 'approved') {
        try {
          await RewardsService.redeemRewardWithPoints(
            selectedRequest.userId, 
            selectedRequest.rewardId
          );
        } catch (redeemError) {
          logger.error('Error processing redemption:', redeemError);
          // Si falla el canje, revertir la aprobación
          await RewardRequestsService.processRequest(selectedRequest.id, {
            status: 'rejected',
            adminNotes: 'Error al procesar el canje automáticamente. Contactar al usuario.',
            processedBy: user.uid
          });
          alert('Error al procesar el canje. La solicitud ha sido marcada como rechazada.');
        }
      }
      setShowProcessModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      // Recargar datos
      await Promise.all([loadRequests(), loadStats()]);
      alert(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`);
    } catch (err) {
      logger.error('Error processing request:', err);
      alert('Error al procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setProcessing(null);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazada
          </span>
        );
      default:
        return null;
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header y Estadísticas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Solicitudes de Intercambio</h2>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gift className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">Todas las solicitudes</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </div>
      </div>
      {/* Lista de Solicitudes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'No se han encontrado solicitudes de intercambio.'
                : `No hay solicitudes ${statusFilter === 'pending' ? 'pendientes' : statusFilter === 'approved' ? 'aprobadas' : 'rechazadas'}.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recompensa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.rewardName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-emerald-600">
                        {request.rewardPointsCost.toLocaleString()} pts
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {request.requestDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' ? (
                        <button
                          onClick={() => handleProcessRequest(request)}
                          disabled={processing === request.id}
                          className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50"
                        >
                          {processing === request.id ? 'Procesando...' : 'Procesar'}
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {request.processedDate ? `Procesada ${request.processedDate.toLocaleDateString()}` : 'Procesada'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal de Procesamiento */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Procesar Solicitud
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Usuario:</strong> {selectedRequest.userName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Recompensa:</strong> {selectedRequest.rewardName}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Puntos:</strong> {selectedRequest.rewardPointsCost.toLocaleString()}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del administrador (opcional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Agregar notas sobre la decisión..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowProcessModal(false);
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => processRequest('rejected')}
                  disabled={processing === selectedRequest.id}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => processRequest('approved')}
                  disabled={processing === selectedRequest.id}
                  className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RewardRequestsManagement;