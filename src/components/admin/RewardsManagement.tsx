import React, { useState, useEffect } from 'react';
import { X, Plus, Gift, Percent, Package, Coins, Loader2 } from 'lucide-react';
import { RewardsService } from '../../services/rewards';
import type { RewardItem, CreateRewardData } from '../../services/rewards';
import { logger, criticalLogger } from '../../utils/logger';
interface RewardsManagementProps {
  onClose: () => void;
}
const RewardsManagement: React.FC<RewardsManagementProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReward, setNewReward] = useState<CreateRewardData>({
    name: '',
    type: 'product',
    pointsCost: 0,
    description: '',
    isActive: true
  });
  // Cargar recompensas al montar el componente
  useEffect(() => {
    loadRewards();
  }, []);
  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const rewardsData = await RewardsService.getRewards();
      setRewards(rewardsData);
    } catch (err) {
      setError('Error al cargar las recompensas');
      logger.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleAddReward = async () => {
    if (newReward.name && newReward.pointsCost && newReward.description) {
      try {
        setLoading(true);
        await RewardsService.createReward(newReward);
        // Resetear formulario
        setNewReward({
          name: '',
          type: 'product',
          pointsCost: 0,
          description: '',
          isActive: true
        });
        // Recargar lista y cambiar a pestaña de lista
        await loadRewards();
        setActiveTab('list');
      } catch (err) {
        setError('Error al crear la recompensa');
        criticalLogger.error('Error creating reward:', err);
      } finally {
        setLoading(false);
      }
    }
  };
  const toggleRewardStatus = async (id: string) => {
    try {
      const reward = rewards.find(r => r.id === id);
      if (reward) {
        await RewardsService.updateReward(id, { isActive: !reward.isActive });
        await loadRewards();
      }
    } catch (err) {
      setError('Error al actualizar la recompensa');
      logger.error('Error updating reward:', err);
    }
  };
  const deleteReward = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta recompensa?')) {
      try {
        await RewardsService.deleteReward(id);
        await loadRewards();
      } catch (err) {
        setError('Error al eliminar la recompensa');
        criticalLogger.error('Error deleting reward:', err);
      }
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package className="w-5 h-5" />;
      case 'discount':
        return <Percent className="w-5 h-5" />;
      case 'service':
        return <Gift className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-100 text-blue-800';
      case 'discount':
        return 'bg-green-100 text-green-800';
      case 'service':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getTypeName = (type: string) => {
    switch (type) {
      case 'product':
        return 'Producto';
      case 'discount':
        return 'Descuento';
      case 'service':
        return 'Servicio';
      default:
        return 'Otro';
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Gestión de Recompensas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Lista de Recompensas
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Agregar Recompensa
            </button>
          </nav>
        </div>
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {activeTab === 'list' ? (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="ml-2 text-gray-600">Cargando recompensas...</span>
                </div>
              ) : rewards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay recompensas</h3>
                  <p className="text-gray-600 mb-4">Comienza agregando tu primera recompensa</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    Agregar Recompensa
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg ${getTypeColor(reward.type)}`}>
                            {getTypeIcon(reward.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{reward.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(reward.type)}`}>
                              {getTypeName(reward.type)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleRewardStatus(reward.id)}
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              reward.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {reward.isActive ? 'Activo' : 'Inactivo'}
                          </button>
                          <button
                            onClick={() => deleteReward(reward.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Coins className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-600">{reward.pointsCost}</span>
                          <span className="text-xs text-gray-500">puntos</span>
                        </div>
                        {reward.stock && (
                          <span className="text-xs text-gray-500">Stock: {reward.stock}</span>
                        )}
                        {reward.discountPercentage && (
                          <span className="text-xs font-medium text-green-600">{reward.discountPercentage}% OFF</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Agregar Nueva Recompensa</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la recompensa
                  </label>
                  <input
                    type="text"
                    value={newReward.name}
                    onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: Proteína Whey 1kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de recompensa
                  </label>
                  <select
                    value={newReward.type}
                    onChange={(e) => setNewReward({ ...newReward, type: e.target.value as 'product' | 'discount' | 'service' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="product">Producto</option>
                    <option value="discount">Descuento</option>
                    <option value="service">Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo en puntos
                  </label>
                  <input
                    type="number"
                    value={newReward.pointsCost}
                    onChange={(e) => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: 500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newReward.description}
                    onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Describe la recompensa..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={newReward.category || ''}
                    onChange={(e) => setNewReward({ ...newReward, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: Suplementos, Accesorios, Servicios"
                  />
                </div>
                {newReward.type === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock inicial
                    </label>
                    <input
                      type="number"
                      value={newReward.stock || ''}
                      onChange={(e) => setNewReward({ ...newReward, stock: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: 10"
                      min="0"
                    />
                  </div>
                )}
                {newReward.type === 'discount' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porcentaje de descuento
                    </label>
                    <input
                      type="number"
                      value={newReward.discountPercentage || ''}
                      onChange={(e) => setNewReward({ ...newReward, discountPercentage: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: 20"
                      min="1"
                      max="100"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newReward.isActive}
                    onChange={(e) => setNewReward({ ...newReward, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Recompensa activa
                  </label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setActiveTab('list')}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddReward}
                    disabled={loading || !newReward.name || !newReward.description || newReward.pointsCost <= 0}
                    className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Recompensa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RewardsManagement;