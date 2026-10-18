import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  QrCode,
  Printer,
  FileSpreadsheet,
  UserPlus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
} from 'lucide-react';
import { EventItem, Participant, CategoryGroup } from '../types';

interface DashboardProps {
  event: EventItem;
  participants: Participant[];
  categories: CategoryGroup[];
  onNavigate: (tab: 'checkin' | 'participants' | 'badges' | 'excel' | 'events') => void;
  onOpenAddParticipant: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  event,
  participants,
  categories,
  onNavigate,
  onOpenAddParticipant,
}) => {
  const total = participants.length;
  const checkedIn = participants.filter((p) => p.status === 'checked_in').length;
  const pending = total - checkedIn;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Category breakdown
  const categoryStats = categories.map((cat) => {
    const list = participants.filter((p) => p.categoryId === cat.id);
    const checked = list.filter((p) => p.status === 'checked_in').length;
    const pct = list.length > 0 ? Math.round((checked / list.length) * 100) : 0;
    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      total: list.length,
      checked,
      pending: list.length - checked,
      pct,
    };
  });

  // Calculate checkin times distribution
  const checkedInList = participants
    .filter((p) => p.status === 'checked_in' && p.checkedInAt)
    .sort((a, b) => new Date(a.checkedInAt!).getTime() - new Date(b.checkedInAt!).getTime());

  // Group by hour
  const hourlyArrivals: Record<string, number> = {};
  checkedInList.forEach((p) => {
    const date = new Date(p.checkedInAt!);
    const hourKey = `${String(date.getHours()).padStart(2, '0')}:00`;
    hourlyArrivals[hourKey] = (hourlyArrivals[hourKey] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Event Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Evento Ativo
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                {event.date || 'Data não definida'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-400" />
                {event.location || 'Local a definir'}
              </span>
            </div>
          </div>

          {/* Quick Launch Checkin */}
          <button
            onClick={() => onNavigate('checkin')}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base cursor-pointer"
          >
            <QrCode className="w-5 h-5" />
            <span>Abrir Credenciamento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inscritos</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{total}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total de convidados na lista</p>
        </div>

        {/* Checked-in Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Presentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{checkedIn}</div>
          <p className="text-[11px] text-emerald-600/80 mt-1">Crachá / Entrada validada</p>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Pendentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{pending}</div>
          <p className="text-[11px] text-amber-600/80 mt-1">Ainda não credenciados</p>
        </div>

        {/* Percentage Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              % Presença
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{percentage}%</div>
          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('checkin')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-800 transition shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm">Leitor & Check-in</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Câmera e Scanner</span>
        </button>

        <button
          onClick={() => onNavigate('badges')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-800 transition shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Printer className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm">Emitir Crachás</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Impressão em Lote</span>
        </button>

        <button
          onClick={() => onNavigate('excel')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-800 transition shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm">Planilhas Excel</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Importar & Exportar</span>
        </button>

        <button
          onClick={onOpenAddParticipant}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-800 transition shadow-sm group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs sm:text-sm">Novo Participante</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Cadastro Individual</span>
        </button>
      </div>

      {/* Categories & Arrival Curve Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Distribuição por Categoria
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {categoryStats.length} categorias
            </span>
          </div>

          <div className="space-y-3">
            {categoryStats.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="font-bold text-emerald-600">{c.checked}</span> / {c.total} ({c.pct}%)
                  </div>
                </div>
                {/* Visual Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${c.pct}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrival Timeline / Recent Flux */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Fluxo de Credenciamento por Horário
              </h2>
              <span className="text-xs text-slate-400 font-medium">Entradas Hoje</span>
            </div>

            {Object.keys(hourlyArrivals).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum check-in registrado neste evento ainda.
                <br />
                <button
                  onClick={() => onNavigate('checkin')}
                  className="mt-2 text-indigo-600 font-semibold hover:underline"
                >
                  Iniciar leituras agora
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(hourlyArrivals).map(([hour, count]) => {
                  const maxHourly = Math.max(...Object.values(hourlyArrivals), 1);
                  const barPct = Math.round((count / maxHourly) * 100);
                  return (
                    <div key={hour} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-mono text-slate-500 font-medium">{hour}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-slate-700">
                        {count} {count === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Último check-in:</span>
            <span className="font-semibold text-slate-700">
              {checkedInList.length > 0
                ? new Date(checkedInList[checkedInList.length - 1].checkedInAt!).toLocaleTimeString(
                    'pt-BR'
                  )
                : 'Nenhum'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
