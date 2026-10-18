import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EventItem, CategoryGroup } from '../types';
import { storageService } from '../services/storage';

interface EventsManagerProps {
  events: EventItem[];
  activeEvent: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (id: string) => void;
  onRefresh: () => void;
}

export const EventsManager: React.FC<EventsManagerProps> = ({
  events,
  activeEvent,
  isOpen,
  onClose,
  onSelectEvent,
  onRefresh,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // New/Edit Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [badgeSubtitle, setBadgeSubtitle] = useState('');

  if (!isOpen) return null;

  const startCreate = () => {
    setName('');
    setDate(new Date().toISOString().slice(0, 10));
    setLocation('');
    setDescription('');
    setBadgeSubtitle('ACESSO GERAL');
    setEditingEvent(null);
    setIsCreating(true);
  };

  const startEdit = (evt: EventItem) => {
    setEditingEvent(evt);
    setName(evt.name);
    setDate(evt.date);
    setLocation(evt.location);
    setDescription(evt.description || '');
    setBadgeSubtitle(evt.badgeSubtitle || '');
    setIsCreating(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingEvent) {
      storageService.saveEvent({
        ...editingEvent,
        name: name.trim(),
        date,
        location: location.trim(),
        description: description.trim(),
        badgeSubtitle: badgeSubtitle.trim(),
      });
    } else {
      const created = storageService.saveEvent({
        orgId: 'org_master',
        name: name.trim(),
        date,
        location: location.trim(),
        description: description.trim(),
        badgeSubtitle: badgeSubtitle.trim(),
        status: 'active',
      });
      onSelectEvent(created.id);
    }

    setIsCreating(false);
    onRefresh();
  };

  const handleDelete = (id: string, evtName: string) => {
    if (confirm(`Atenção: Excluir o evento "${evtName}" apagará todos os seus participantes e crachás. Deseja continuar?`)) {
      storageService.deleteEvent(id);
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Gestão de Eventos</h2>
              <p className="text-[11px] text-slate-500">Crie ou alterne entre conferências e credenciamentos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!isCreating ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Eventos Disponíveis ({events.length})
                </span>
                <button
                  onClick={startCreate}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Evento</span>
                </button>
              </div>

              <div className="space-y-3">
                {events.map((evt) => {
                  const isActive = activeEvent?.id === evt.id;
                  const participantCount = storageService.getParticipants(evt.id).length;

                  return (
                    <div
                      key={evt.id}
                      className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{evt.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                              Ativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {evt.date || 'Data a definir'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {evt.location || 'Local a definir'}
                          </span>
                          <span>• {participantCount} participante{participantCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={() => {
                              onSelectEvent(evt.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition"
                          >
                            Ativar
                          </button>
                        )}

                        <button
                          onClick={() => startEdit(evt)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {events.length > 1 && (
                          <button
                            onClick={() => handleDelete(evt.id, evt.name)}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingEvent ? 'Editar Dados do Evento' : 'Criar Novo Evento'}
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Evento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Fórum de Tecnologia e Negócios 2026"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local / Cidade
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Expo Center Norte - SP"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subtítulo / Rodapé nos Crachás
                </label>
                <input
                  type="text"
                  value={badgeSubtitle}
                  onChange={(e) => setBadgeSubtitle(e.target.value)}
                  placeholder="Ex: ACESSO GERAL • PAVILHÃO 1"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição / Notas Internas
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções para a equipe de recepção e portaria..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
