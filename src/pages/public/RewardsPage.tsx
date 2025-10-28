import React, { useState, useEffect } from 'react';
import { Coins, Package, Percent, Gift, Star, Filter, Search, CheckCircle, Loader2 } from 'lucide-react';
import { RewardsService, RewardRequestsService } from '../../services/rewards';
import { UserPointsService } from '../../services/user';
import { useAuth } from '../../hooks/useAuth';
import type { RewardItem } from '../../services/rewards';
import type { UserPoints } from '../../services/user';
import { logger, criticalLogger } from '../../utils/logger';
const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  // Cargar recompensas y puntos al montar el componente
  useEffect(() => {
    loadRewards();
    if (user) {
      loadUserPoints();
    }
  }, [user]);
  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      // Solo obtener recompensas activas para mostrar al público
      const activeRewards = await RewardsService.getActiveRewards();
      setRewards(activeRewards);
      setFilteredRewards(activeRewards);
    } catch (err) {
      setError('Error al cargar las recompensas');
      logger.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  };
  const loadUserPoints = async () => {
    if (!user) return;
    try {
      setPointsLoading(true);
      // Primero intentar sincronizar puntos del sistema legacy
      let points = await UserPointsService.syncLegacyPoints(user.uid);
      // Si la sincronización falla, intentar cargar puntos normalmente
      if (!points) {
        points = await UserPointsService.getUserPoints(user.uid);
        // Si aún no existen puntos, inicializar
        if (!points) {
          points = await UserPointsService.initializeUserPoints(user.uid);
        }
      }
      setUserPoints(points);
    } catch (err) {
      logger.error('Error loading user points:', err);
      // Fallback: intentar cargar puntos sin sincronización
      try {
        let points = await UserPointsService.getUserPoints(user.uid);
        if (!points) {
          points = await UserPointsService.initializeUserPoints(user.uid);
        }
        setUserPoints(points);
      } catch (fallbackErr) {
        logger.error('Error in fallback loading:', fallbackErr);
        // Último recurso: crear objeto local
        setUserPoints({
          userId: user.uid,
          totalPoints: 0,
          availablePoints: 0,
          earnedPoints: 0,
          redeemedPoints: 0,
          lastUpdated: new Date()
        });
      }
    } finally {
      setPointsLoading(false);
    }
  };
  // Filtrar recompensas
  useEffect(() => {
    let filtered = rewards;
    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(reward => reward.category === selectedCategory);
    }
    // Filtrar por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(reward => reward.type === selectedType);
    }
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(reward =>
        reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reward.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredRewards(filtered);
  }, [rewards, selectedCategory, selectedType, searchTerm]);
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
  const categories = Array.from(new Set(rewards.map(reward => reward.category).filter(Boolean)));
  const canAfford = (pointsCost: number) => userPoints ? userPoints.availablePoints >= pointsCost : false;
  const handleRedeem = (reward: RewardItem) => {
    if (canAfford(reward.pointsCost)) {
      setSelectedReward(reward);
      setShowRedemptionModal(true);
    }
  };
  const confirmRedemption = async () => {
    if (!selectedReward || !user) return;
    try {
      setRedeeming(true);
      // Crear solicitud de intercambio en lugar de canje directo
      await RewardRequestsService.createRequest({
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuario',
        userEmail: user.email || '',
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardPointsCost: selectedReward.pointsCost,
        userNotes: '' // Podrías agregar un campo para notas del usuario
      });
      alert('¡Solicitud enviada exitosamente! Un administrador revisará tu solicitud y te notificará cuando sea procesada.');
      setShowRedemptionModal(false);
      setSelectedReward(null);
    } catch (err) {
      criticalLogger.error('Error creating reward request:', err);
      alert('Error al enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setRedeeming(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando recompensas...</h2>
          <p className="text-gray-600">Estamos preparando las mejores ofertas para ti</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar recompensas</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRewards}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Coins className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Canje de Puntos</h1>
            <p className="text-lg text-gray-600 mb-6">
              Intercambia tus puntos por increíbles recompensas
            </p>
            {/* User Points */}
            <div className="inline-flex items-center bg-emerald-50 px-6 py-3 rounded-full">
              <Star className="w-5 h-5 text-emerald-600 mr-2" />
              <span className="text-emerald-800 font-semibold">
                {pointsLoading ? (
                  'Cargando puntos...'
                ) : (
                  `Tienes ${userPoints?.availablePoints?.toLocaleString() || 0} puntos disponibles`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar recompensas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtros:</span>
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="product">Productos</option>
                <option value="discount">Descuentos</option>
                <option value="service">Servicios</option>
              </select>
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        {/* Rewards Grid */}
        {filteredRewards.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'No se encontraron recompensas'
                : 'No hay recompensas disponibles'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'Intenta ajustar tus filtros de búsqueda'
                : 'Las recompensas aparecerán aquí cuando estén disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${getTypeColor(reward.type)}`}>
                      {getTypeIcon(reward.type)}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(reward.type)}`}>
                      {getTypeName(reward.type)}
                    </span>
                  </div>
                  {/* Content */}
                  <h3 className="font-semibold text-gray-900 mb-2">{reward.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{reward.description}</p>
                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-600">{reward.pointsCost}</span>
                        <span className="text-xs text-gray-500">puntos</span>
                      </div>
                      {reward.stock && (
                        <span className="text-xs text-gray-500">Stock: {reward.stock}</span>
                      )}
                    </div>
                    {reward.discountPercentage && (
                      <div className="bg-green-50 px-2 py-1 rounded">
                        <span className="text-sm font-medium text-green-600">
                          {reward.discountPercentage}% de descuento
                        </span>
                      </div>
                    )}
                    {reward.category && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {reward.category}
                      </span>
                    )}
                  </div>
                  {/* Action Button */}
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canAfford(reward.pointsCost) || (reward.stock !== undefined && reward.stock <= 0)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      canAfford(reward.pointsCost) && (reward.stock === undefined || reward.stock > 0)
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {!canAfford(reward.pointsCost)
                      ? 'Puntos insuficientes'
                      : reward.stock !== undefined && reward.stock <= 0
                      ? 'Sin stock'
                      : 'Canjear'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Redemption Modal */}
      {showRedemptionModal && selectedReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Solicitar Intercambio
              </h3>
              <p className="text-gray-600 text-center mb-6">
                ¿Estás seguro de que quieres solicitar el intercambio de <strong>{selectedReward.name}</strong> por{' '}
                <strong>{selectedReward.pointsCost} puntos</strong>?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Tu solicitud será revisada por un administrador. 
                  Te notificaremos cuando sea procesada.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Puntos actuales:</span>
                  <span className="font-medium">{userPoints?.availablePoints?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Costo del canje:</span>
                  <span className="font-medium text-emerald-600">-{selectedReward.pointsCost.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Puntos restantes:</span>
                    <span className="font-semibold">
                      {((userPoints?.availablePoints || 0) - selectedReward.pointsCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRedemptionModal(false);
                    setSelectedReward(null);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRedemption}
                  disabled={redeeming}
                  className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {redeeming ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RewardsPage;