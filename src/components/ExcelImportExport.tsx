import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  RefreshCw,
  Info,
  Users,
  Check,
} from 'lucide-react';
import { EventItem, Participant, CategoryGroup, ImportSummary } from '../types';
import {
  downloadImportTemplate,
  parseFileForImport,
  exportEventToExcel,
  exportToCSV,
} from '../services/excel';
import { storageService } from '../services/storage';

interface ExcelImportExportProps {
  event: EventItem;
  participants: Participant[];
  categories: CategoryGroup[];
  onImportComplete: () => void;
}

export const ExcelImportExport: React.FC<ExcelImportExportProps> = ({
  event,
  participants,
  categories,
  onImportComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [autoDownloadBackup, setAutoDownloadBackup] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Backup trigger
  const handleSafetyBackup = () => {
    storageService.exportCompleteBackupJSON(true);
    setSuccessMessage('Backup de segurança em JSON baixado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // File selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadedFileName(file.name);

    try {
      const summary = await parseFileForImport(file, participants, categories);
      setImportSummary(summary);
    } catch (err: unknown) {
      console.error('Import parse error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Erro ao processar arquivo: ${msg}. Verifique se é uma planilha válida.`);
    } finally {
      setIsProcessing(false);
      // Reset input value so same file can be chosen again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!importSummary) return;

    setIsProcessing(true);
    try {
      // Automatic safety backup before mass import (Requested by user)
      if (autoDownloadBackup) {
        try {
          storageService.exportCompleteBackupJSON(true);
        } catch (backupErr) {
          console.warn('Backup download notice:', backupErr);
        }
      }

      const validRows = importSummary.rows.filter((r) => r.status !== 'invalid');
      const now = new Date().toISOString();

      // Find or create categories
      const existingCategories = storageService.getCategories(event.id);
      const categoryMap = new Map<string, string>();
      existingCategories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

      const newParticipants: Participant[] = [];

      validRows.forEach((row) => {
        let catId = categoryMap.get(row.category.toLowerCase().trim());
        if (!catId) {
          // Create category if new
          const createdCat = storageService.saveCategory({
            eventId: event.id,
            name: row.category,
            color: '#64748b',
          });
          catId = createdCat.id;
          categoryMap.set(row.category.toLowerCase().trim(), catId);
        }

        const publicCode = row.publicCode || storageService.generateNextPublicCode(event.id);

        newParticipants.push({
          id: 'prt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
          eventId: event.id,
          publicCode,
          name: row.name,
          document: row.document || undefined,
          phone: row.phone || undefined,
          email: row.email || undefined,
          company: row.company || undefined,
          city: row.city || undefined,
          categoryId: catId,
          categoryName: row.category,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
      });

      storageService.bulkSaveParticipants(newParticipants);
      setSuccessMessage(
        `${newParticipants.length} participante(s) importado(s) com sucesso para "${event.name}"!`
      );
      setImportSummary(null);
      onImportComplete();
    } catch (err: unknown) {
      console.error('Save error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Erro ao gravar dados: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Full multi-sheet export
  const handleExportFullExcel = () => {
    exportEventToExcel(event, participants, categories);
  };

  // Quick CSV Export
  const handleExportCSV = () => {
    const rows = participants.map((p) => ({
      ID: p.publicCode,
      Nome: p.name,
      Status: p.status === 'checked_in' ? 'CREDENCIADO' : 'PENDENTE',
      Horario: p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '',
      Categoria: p.categoryName || 'Geral',
      Empresa: p.company || '',
      Telefone: p.phone || '',
      Email: p.email || '',
    }));
    exportToCSV(`Participantes_${event.name}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Integração Bidirecional com Excel & CSV
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Importe listas de convidados ou exporte relatórios consolidados em planilhas com múltiplas abas.
          </p>
        </div>

        {/* Action Buttons: Template & Backup */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSafetyBackup}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            title="Baixar cópia de segurança completa dos dados atuais em formato JSON"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Fazer Backup de Segurança (.json)</span>
          </button>

          <button
            onClick={downloadImportTemplate}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Baixar Modelo Padrão (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Two Columns: Import on Left, Export on Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Import */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Importar Participantes</h2>
              <p className="text-[11px] text-slate-500">Aceita arquivos Excel (.xlsx) e .csv</p>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Clique para selecionar ou arraste o arquivo aqui
            </p>
            <p className="text-[11px] text-slate-400">
              Formatos aceitos: Microsoft Excel (.xlsx) ou CSV com codificação UTF-8
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Regras de Importação Segura:
            </p>
            <p className="text-[11px] leading-relaxed">
              • O sistema detecta cabeçalhos automaticamente (Nome, Telefone, Email, Categoria, Empresa, etc.).
            </p>
            <p className="text-[11px] leading-relaxed">
              • IDs públicos existentes no evento são atualizados em vez de duplicados.
            </p>
            <p className="text-[11px] leading-relaxed">
              • Antes de gravar no banco, uma tela de pré-visualização valida os dados.
            </p>
          </div>
        </div>

        {/* Right Column: Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Exportar Dados & Relatórios</h2>
                <p className="text-[11px] text-slate-500">
                  Exportação completa do evento ativo ({participants.length} inscritos)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Multi-Sheet Excel */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Planilha Consolidada Multi-Abas (.xlsx)
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Gera arquivo com 4 abas completas: Participantes Gerais, Credenciados (com horário e operador), Pendentes e Resumo Estatístico.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExportFullExcel}
                  className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha Completa (.xlsx)</span>
                </button>
              </div>

              {/* Option 2: Quick CSV */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Exportar Lista Rápida (.csv)</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ideal para integração com outros sistemas ou leitura direta em editores de texto.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar CSV</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Nenhuma informação pessoal sensível é exposta fora das permissões do organizador.
          </p>
        </div>
      </div>

      {/* Pre-Import Validation & Diff Modal */}
      {importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    Prévia e Validação de Importação
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">{uploadedFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setImportSummary(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Stats Pills */}
            <div className="p-6 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Total Linhas</div>
                  <div className="text-xl font-black text-slate-800">
                    {importSummary.totalRows}
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Novos Registros</div>
                  <div className="text-xl font-black text-emerald-700">
                    {importSummary.newRows}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="text-[10px] font-bold uppercase text-blue-700">Atualizações (ID Existente)</div>
                  <div className="text-xl font-black text-blue-700">
                    {importSummary.updateRows}
                  </div>
                </div>

                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <div className="text-[10px] font-bold uppercase text-rose-700">Linhas Inválidas</div>
                  <div className="text-xl font-black text-rose-700">
                    {importSummary.invalidRows}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Empresa</th>
                    <th className="py-2.5 px-3">ID Proposto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importSummary.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        {row.status === 'new' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            Novo
                          </span>
                        )}
                        {row.status === 'update' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                            Atualizar
                          </span>
                        )}
                        {row.status === 'invalid' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                            Inválido
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-slate-600">{row.category}</td>
                      <td className="py-2 px-3 text-slate-500">{row.company || '-'}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {row.publicCode || '(será gerado)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importSummary.rows.length > 50 && (
                <p className="text-center text-[11px] text-slate-400 py-2">
                  Mostrando as 50 primeiras linhas de {importSummary.rows.length}...
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 block">
                  Linhas válidas: <strong>{importSummary.validRows}</strong>
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={autoDownloadBackup}
                    onChange={(e) => setAutoDownloadBackup(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Baixar backup de segurança automático em JSON antes de gravar</span>
                </label>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setImportSummary(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessing || importSummary.validRows === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Importar {importSummary.validRows} Registros</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
