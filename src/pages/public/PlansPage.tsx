import React, { useState, useEffect } from 'react';
import type { MembershipPlan } from '../../types/plan.types';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { PlanService } from '../../services/plans/planService';
const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadPlans();
  }, []);
  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      // Obtener solo planes activos para mostrar al público
      const plansData = await PlanService.getActivePlans();
      setPlans(plansData);
    } catch (err) {
      setError('Error al cargar los planes');
      logger.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };
  const formatDuration = (duration: number, durationType: 'days' | 'months') => {
    if (durationType === 'days') {
      return `${duration} ${duration === 1 ? 'día' : 'días'}`;
    } else {
      return `${duration} ${duration === 1 ? 'mes' : 'meses'}`;
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando planes...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar planes</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadPlans} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Planes de Membresía
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto">
              Elige el plan que mejor se adapte a tus necesidades y objetivos fitness. 
              Todos nuestros planes incluyen acceso completo a nuestras instalaciones.
            </p>
          </div>
        </div>
      </div>
      {/* Plans Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay planes disponibles
            </h3>
            <p className="text-gray-600">
              Actualmente no hay planes de membresía disponibles. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  index === 1 ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                {/* Popular Badge */}
                {index === 1 && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </span>
                  </div>
                )}
                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.cost)}
                      </span>
                      <span className="text-gray-600 ml-2">
                        / {formatDuration(plan.duration, plan.durationType)}
                      </span>
                    </div>
                  </div>
                  {/* Plan Details */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium">Duración</span>
                      <span className="text-gray-900 font-semibold">
                        {formatDuration(plan.duration, plan.durationType)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium">Puntos de Asignación</span>
                      <span className="text-blue-600 font-semibold">
                        +{plan.assignmentPoints} puntos
                      </span>
                    </div>
                  </div>
                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Incluye:
                      </h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <svg
                              className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* Plan Stats Footer */}
                <div className="bg-gray-50 px-8 py-4">
                  <div className="text-center text-sm text-gray-600">
                    <span>Creado: {plan.createdAt.toLocaleDateString('es-CL')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Additional Info Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir nuestros planes?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Todos nuestros planes están diseñados para adaptarse a diferentes estilos de vida 
              y objetivos fitness, con la flexibilidad que necesitas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Flexibilidad Total</h3>
              <p className="text-gray-600">
                Acceso 24/7 a nuestras instalaciones con horarios que se adaptan a tu rutina.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin Compromisos</h3>
              <p className="text-gray-600">
                Planes flexibles sin permanencia mínima. Puedes cambiar o cancelar cuando quieras.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Puntos</h3>
              <p className="text-gray-600">
                Gana puntos con cada plan y canjéalos por productos y servicios exclusivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PlansPage;