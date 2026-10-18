import React, { useState } from 'react';
import {
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  X,
  Workflow,
  Sparkles,
  Server,
  Smartphone,
  Cpu,
  Lock,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'workflow' | 'database' | 'security'>('diagram');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlSchema = `-- ==========================================================
-- SCHEMA POSTGRESQL / SUPABASE: CREDENCIA FÁCIL
-- Multi-tenant com RLS (Row Level Security) e Gestão de Licenças
-- ==========================================================

-- 1. Organizações / Empresas
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuários / Operadores com Papéis
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('superadmin', 'admin', 'operator', 'receptionist')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Gestão de Assinaturas & Licenças
CREATE TABLE IF NOT EXISTS public.subscriptions_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('trial_7_days', 'monthly', 'annual', 'unlimited_lifetime')),
    license_key_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    trial_started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    max_concurrent_terminals INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Eventos
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'finished')),
    badge_subtitle VARCHAR(100) DEFAULT 'ACESSO GERAL',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Grupos e Categorias (Palestrante, VIP, etc.)
CREATE TABLE IF NOT EXISTS public.participant_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    badge_label VARCHAR(50),
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Participantes
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.participant_groups(id) ON DELETE SET NULL,
    public_code VARCHAR(32) NOT NULL, -- ex: EVT-000001 (Encoded no QR)
    name VARCHAR(255) NOT NULL,
    document VARCHAR(50), -- Opcional (NÃO VAI NO QR)
    phone VARCHAR(50),
    email VARCHAR(255),
    company VARCHAR(255),
    city VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in')),
    checked_in_at TIMESTAMPTZ,
    checkin_device VARCHAR(100),
    checkin_operator VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_event_public_code UNIQUE (event_id, public_code)
);

-- 7. Log Auditoria de Check-in
CREATE TABLE IF NOT EXISTS public.checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    public_code VARCHAR(32) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_info VARCHAR(100) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    is_offline_sync BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_participants_event_lookup ON public.participants (event_id, public_code);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants (event_id, status);
CREATE INDEX IF NOT EXISTS idx_checkins_event_time ON public.checkin_logs (event_id, timestamp DESC);

-- Habilitação de RLS (Row Level Security)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento por Organização (Tenant)
CREATE POLICY "Users can only access their org events"
ON public.events FOR ALL
USING (org_id IN (SELECT org_id FROM public.app_users WHERE id = auth.uid()));

CREATE POLICY "Users can only access their org participants"
ON public.participants FOR ALL
USING (event_id IN (
    SELECT e.id FROM public.events e
    INNER JOIN public.app_users u ON u.org_id = e.org_id
    WHERE u.id = auth.uid()
));`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">Arquitetura, Banco de Dados & Manual</h2>
              <p className="text-[11px] text-slate-400">Credencia Fácil • Engenharia & Passo a Passo Operacional</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'diagram'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Desenho da Arquitetura
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'workflow'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Passo a Passo de Funcionamento
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Estrutura SQL & RLS
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacidade & LGPD
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'diagram' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-2">
                  Visão Geral dos Módulos do Sistema
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O <strong>Credencia Fácil</strong> foi desenhado seguindo a filosofia <em>Local-First + Offline-Resilient</em>. O operador pode estar na portaria de um hotel ou auditório sem sinal de celular: o check-in ocorre com latência de zero milissegundos e áudio sintético imediato.
                </p>
              </div>

              {/* Architectural Layers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Layer 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    1. Camada do Cliente (PWA)
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    • React + TypeScript + Tailwind.<br />
                    • Câmera WebRTC nativa com auto-foco.<br />
                    • Hook de leitor de código de barras USB/Bluetooth que opera via hardware keyboard wedge.<br />
                    • Web Audio API sem dependência de internet.
                  </p>
                </div>

                {/* Layer 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    2. Motor Offline & Cache
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    • IndexedDB / LocalStorage resiliente.<br />
                    • Cache completo dos participantes e credenciais no dispositivo.<br />
                    • Fila de sincronização (SyncQueue) para check-ins efetuados offline.<br />
                    • Sincronização idempotente: nunca duplica contagens.
                  </p>
                </div>

                {/* Layer 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                    <Server className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    3. Persistência & Assinaturas
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    • PostgreSQL / Supabase com isolamento RLS multi-inquilino.<br />
                    • Gestão de licenças (Degustação de 7 dias com PIN numérico e Vitalícia ilimitada).<br />
                    • Importação e Exportação Excel multi-abas bidirecional.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Fluxo Operacional Passo a Passo em Eventos Reais:
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Criação do Evento & Categorias</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Defina nome, data, local e cores para cada categoria (ex: Palestrante = Roxo, VIP = Dourado, Staff = Verde).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Importação de Participantes via Excel ou Cadastro</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Suba a planilha com os convidados. O sistema gera automaticamente os IDs públicos sequenciais (ex: EVT-000001) e exibe uma tela de validação antes de gravar.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Impressão dos Crachás / Tags em Lote</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Escolha o layout (A4 com 4, 6 ou 8 crachás, ou bobina térmica 80x50mm). O sistema renderiza os QR Codes e códigos de barras com fidelidade milimétrica.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Credenciamento & Recepção</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Na portaria, use a câmera do smartphone ou um leitor USB/Bluetooth (tipo pistola). A tela pisca verde e emite som agradável de validação. Se for código duplicado, avisa em amarelo e mostra o horário do primeiro credenciamento.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Sincronização & Exportação Final</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Ao encerrar ou recuperar a internet, todos os registros pendentes são sincronizados. Baixe a planilha final com o relatório completo de presentes e ausentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Estrutura de Tabelas & Políticas RLS
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Script DDL completo e otimizado com chaves UUID, índices rápidos e segurança multi-tenant.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[380px] border border-slate-800">
                <pre>{sqlSchema}</pre>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Princípio de Proteção de Dados (LGPD / GDPR):
                </h4>
                <p className="text-emerald-900 leading-relaxed">
                  O QR Code e o código de barras contêm <strong>EXCLUSIVAMENTE o identificador público da credencial</strong> (ex: <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-800">EVT-000001</code>). Em hipótese alguma CPFs, telefones ou e-mails são codificados na imagem do crachá. Se alguém fotografar o crachá de longe, nenhuma informação pessoal é vazada.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900">Isolamento Multi-Tenant com RLS:</h4>
                <p className="text-slate-600 leading-relaxed">
                  No banco de dados PostgreSQL, a política de <em>Row Level Security (RLS)</em> impede que operadores de um evento visualizem convidados de outra organização, garantindo conformidade jurídica e segurança corporativa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
