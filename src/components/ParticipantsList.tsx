import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  MapPin,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { EventItem, Participant, CategoryGroup } from '../types';
import { storageService } from '../services/storage';

interface ParticipantsListProps {
  event: EventItem;
  participants: Participant[];
  categories: CategoryGroup[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onNavigateToBadges: () => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  event,
  participants,
  categories,
  onRefresh,
  onOpenAddModal,
  onNavigateToBadges,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  
  // Single Delete State
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  
  // Multi-Selection State for Batch Actions (like Batch Delete)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Success / Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Category map
  const catMap = new Map<string, CategoryGroup>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Filter participants
  const filtered = participants.filter((p) => {
    if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(term);
      const matchCode = p.publicCode.toLowerCase().includes(term);
      const matchCompany = (p.company || '').toLowerCase().includes(term);
      const matchPhone = (p.phone || '').toLowerCase().includes(term);
      const matchEmail = (p.email || '').toLowerCase().includes(term);
      const matchDoc = (p.document || '').toLowerCase().includes(term);
      return matchName || matchCode || matchCompany || matchPhone || matchEmail || matchDoc;
    }

    return true;
  });

  // Fast direct check-in from table
  const handleToggleCheckin = (p: Participant) => {
    if (p.status === 'checked_in') {
      storageService.undoCheckin(p.id);
    } else {
      const settings = storageService.getSettings();
      storageService.recordCheckin({
        eventId: event.id,
        rawCode: p.publicCode,
        operatorName: settings.operatorName,
        deviceName: settings.deviceName,
        isOffline: false,
      });
    }
    onRefresh();
  };

  // Trigger single participant deletion
  const handleDeleteClick = (p: Participant) => {
    setDeletingParticipant(p);
  };

  // Confirm single participant deletion
  const confirmDeleteSingle = () => {
    if (!deletingParticipant) return;
    const { id, publicCode, name } = deletingParticipant;
    storageService.deleteParticipant(id);
    if (publicCode) {
      storageService.deleteParticipant(publicCode);
    }

    // Clean up selection if this participant was selected
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }

    setDeletingParticipant(null);
    setFeedbackToast(`Participante "${name}" foi excluído com sucesso!`);
    setTimeout(() => setFeedbackToast(null), 3500);
    onRefresh();
  };

  // Multi-selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Confirm batch deletion of selected participants
  const confirmDeleteBatch = () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    storageService.deleteMultipleParticipants(idsToDelete);
    const count = idsToDelete.length;
    setSelectedIds(new Set());
    setIsDeletingBatch(false);
    setFeedbackToast(`${count} participante${count > 1 ? 's' : ''} excluído${count > 1 ? 's' : ''} com sucesso!`);
    setTimeout(() => setFeedbackToast(null), 3500);
    onRefresh();
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    storageService.saveParticipant(editingParticipant);
    setEditingParticipant(null);
    setFeedbackToast(`Dados de "${editingParticipant.name}" salvos com sucesso!`);
    setTimeout(() => setFeedbackToast(null), 3000);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-4 z-[90] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedbackToast}</span>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Participantes & Convidados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} de {participants.length} participantes cadastrados no evento
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Batch delete action button when items are selected */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setIsDeletingBatch(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs animate-in fade-in"
              title="Excluir todos os participantes marcados"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Excluir Selecionados ({selectedIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToBadges}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir Crachás</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Participante</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código EVT, telefone, empresa..."
            className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
          >
            <option value="all">Todos os Status</option>
            <option value="checked_in">Credenciados (Presentes)</option>
            <option value="pending">Pendentes (Ausentes)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={selectedIds.size === filtered.length && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                  >
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Nome & Contato</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Empresa / Cidade</th>
                <th className="py-3 px-4">Status & Entrada</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum participante encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const cat = catMap.get(p.categoryId);
                  const isChecked = p.status === 'checked_in';
                  const isSelected = selectedIds.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(p.id)}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {p.publicCode}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm leading-tight">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {p.phone && <span>{p.phone}</span>}
                          {p.phone && p.email && <span>•</span>}
                          {p.email && <span>{p.email}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span
                          className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shadow-xs"
                          style={{ backgroundColor: cat?.color || '#64748b' }}
                        >
                          {cat?.name || p.categoryName || 'Geral'}
                        </span>
                      </td>

                      {/* Company & City */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium truncate max-w-xs">
                          {p.company || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {p.city || ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isChecked ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <UserCheck className="w-3 h-3 text-emerald-700" />
                              Credenciado
                            </span>
                            {p.checkedInAt && (
                              <p className="text-[10px] font-mono text-slate-400">
                                {new Date(p.checkedInAt).toLocaleTimeString('pt-BR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <UserX className="w-3 h-3 text-amber-600" />
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Toggle Checkin Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleCheckin(p)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={isChecked ? 'Desfazer Credenciamento' : 'Realizar Credenciamento'}
                          >
                            {isChecked ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingParticipant(p)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                            title="Editar Participante"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(p);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition cursor-pointer"
                            title={`Excluir ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal (Includes direct Excluir button) */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900 text-base">Editar Participante</h2>
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editingParticipant.name}
                  onChange={(e) =>
                    setEditingParticipant({ ...editingParticipant, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ID Credencial (Código)
                  </label>
                  <input
                    type="text"
                    value={editingParticipant.publicCode}
                    onChange={(e) =>
                      setEditingParticipant({
                        ...editingParticipant,
                        publicCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria / Grupo
                  </label>
                  <select
                    value={editingParticipant.categoryId}
                    onChange={(e) => {
                      const sel = categories.find((c) => c.id === e.target.value);
                      setEditingParticipant({
                        ...editingParticipant,
                        categoryId: e.target.value,
                        categoryName: sel?.name,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Empresa / Instituição
                  </label>
                  <input
                    type="text"
                    value={editingParticipant.company || ''}
                    onChange={(e) =>
                      setEditingParticipant({ ...editingParticipant, company: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={editingParticipant.city || ''}
                    onChange={(e) =>
                      setEditingParticipant({ ...editingParticipant, city: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Documento (CPF / RG)
                  </label>
                  <input
                    type="text"
                    value={editingParticipant.document || ''}
                    onChange={(e) =>
                      setEditingParticipant({ ...editingParticipant, document: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editingParticipant.phone || ''}
                    onChange={(e) =>
                      setEditingParticipant({ ...editingParticipant, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editingParticipant.email || ''}
                  onChange={(e) =>
                    setEditingParticipant({ ...editingParticipant, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Delete button from within edit modal */}
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingParticipant;
                    setEditingParticipant(null);
                    handleDeleteClick(toDelete);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Participante</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingParticipant(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingParticipant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Excluir Participante?</h3>
              <p className="text-xs text-slate-600">
                Tem certeza que deseja remover <strong>{deletingParticipant.name}</strong> ({deletingParticipant.publicCode}) da lista deste evento?
              </p>
              <p className="text-[11px] text-slate-400">
                Esta ação removerá o participante e suas credenciais deste evento.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingParticipant(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isDeletingBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Excluir {selectedIds.size} Participantes?</h3>
              <p className="text-xs text-slate-600">
                Tem certeza que deseja excluir em lote os <strong>{selectedIds.size}</strong> participantes selecionados?
              </p>
              <p className="text-[11px] text-rose-500 font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeletingBatch(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteBatch}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Excluir Todos ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
