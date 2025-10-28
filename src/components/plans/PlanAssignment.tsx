import React, { useState, useEffect } from 'react';
import type { MembershipPlan, CreatePlanAssignmentData } from '../../types/plan.types';
import type { UserProfile } from '../../types/auth.types';
import { MemberService } from '../../services/users/memberService';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { PlanService } from '../../services/plans/planService';
interface PlanAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentComplete?: () => void;
}
interface AssignmentFormData {
  planId: string;
  memberId: string;
  paymentAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  paymentNotes: string;
}
const initialFormData: AssignmentFormData = {
  planId: '',
  memberId: '',
  paymentAmount: 0,
  paymentMethod: 'cash',
  paymentNotes: ''
};
export const PlanAssignment: React.FC<PlanAssignmentProps> = ({ 
  isOpen, 
  onClose, 
  onAssignmentComplete 
}) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);
  useEffect(() => {
    if (formData.planId) {
      const plan = plans.find(p => p.id === formData.planId);
      setSelectedPlan(plan || null);
      if (plan) {
        setFormData(prev => ({ ...prev, paymentAmount: plan.cost }));
      }
    } else {
      setSelectedPlan(null);
    }
  }, [formData.planId, plans]);
  // Verificar si existe una asignación activa cuando se selecciona plan y miembro
  useEffect(() => {
    const checkExistingAssignment = async () => {
      if (formData.planId && formData.memberId) {
        try {
          const memberAssignments = await getMemberPlanAssignments(formData.memberId);
          const activeAssignment = memberAssignments.find(
            assignment => assignment.planId === formData.planId && assignment.status === 'active'
          );
          if (activeAssignment) {
            const selectedMember = members.find(m => m.uid === formData.memberId);
            const memberName = selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'el miembro';
            setWarning(
              `⚠️ ${memberName} ya tiene una asignación activa de este plan. ` +
              `La asignación anterior será cancelada automáticamente al proceder.`
            );
          } else {
            setWarning(null);
          }
        } catch (err) {
          logger.error('Error checking existing assignments:', err);
        }
      } else {
        setWarning(null);
      }
    };
    checkExistingAssignment();
  }, [formData.planId, formData.memberId, members]);
  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, membersData] = await Promise.all([PlanService.getActivePlans(), // Usar getActivePlans() directamente
        MemberService.getAllMembers()
      ]);
      setPlans(plansData);
      setMembers(membersData);
    } catch (err) {
      setError('Error al cargar los datos');
      logger.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      setError('Usuario no autenticado');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const assignmentData: CreatePlanAssignmentData = {
        planId: formData.planId,
        memberId: formData.memberId,
        assignedBy: user.uid,
        paymentAmount: formData.paymentAmount,
        paymentMethod: formData.paymentMethod,
        paymentNotes: formData.paymentNotes
      };
      await assignPlanToMember(assignmentData);
      // Resetear formulario
      setFormData(initialFormData);
      setSelectedPlan(null);
      // Notificar éxito
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al asignar el plan';
      setError(errorMessage);
      logger.error('Error assigning plan:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    setFormData(initialFormData);
    setSelectedPlan(null);
    setError(null);
    setWarning(null);
    onClose();
  };
  const formatDuration = (duration: number, durationType: 'days' | 'months') => {
    return `${duration} ${durationType === 'days' ? 'días' : 'meses'}`;
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Asignar Plan a Miembro</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {warning && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              {warning}
            </div>
          )}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan de Membresía
                  </label>
                  <select
                    value={formData.planId}
                    onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar plan...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.cost} ({formatDuration(plan.duration, plan.durationType)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miembro
                  </label>
                  <select
                    value={formData.memberId}
                    onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar miembro...</option>
                    {members.map((member) => (
                      <option key={member.uid} value={member.uid}>
                        {member.firstName} {member.lastName} - {member.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedPlan && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">{selectedPlan.name}</h3>
                  <p className="text-blue-700 mb-3">{selectedPlan.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-900">Duración:</span>
                      <p className="text-blue-700">{formatDuration(selectedPlan.duration, selectedPlan.durationType)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">Costo:</span>
                      <p className="text-blue-700">${selectedPlan.cost}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">Puntos:</span>
                      <p className="text-blue-700">{selectedPlan.assignmentPoints}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">Asignaciones:</span>
                      <p className="text-blue-700">{selectedPlan.totalAssignments}</p>
                    </div>
                  </div>
                  {selectedPlan.features.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-blue-900">Características:</span>
                      <ul className="mt-1 text-blue-700 text-sm">
                        {selectedPlan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto del Pago ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.paymentAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'card' | 'transfer' | 'other' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del Pago (Opcional)
                </label>
                <textarea
                  value={formData.paymentNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Información adicional sobre el pago..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.planId || !formData.memberId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Asignando...' : 'Asignar Plan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};