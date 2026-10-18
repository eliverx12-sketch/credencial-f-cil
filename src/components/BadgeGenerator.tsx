import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  Printer,
  LayoutGrid,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  Building,
  MapPin,
  FileDown,
  FileText,
  Loader2,
} from 'lucide-react';
import { EventItem, Participant, CategoryGroup, BadgeLayout } from '../types';
import { exportBadgesToPdf, exportBadgesToWord } from '../services/badgeExport';

interface BadgeGeneratorProps {
  event: EventItem;
  participants: Participant[];
  categories: CategoryGroup[];
}

// Helper to chunk array for pagination
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Single Badge Card Renderer with QR and Barcode
const BadgeCard: React.FC<{
  participant: Participant;
  category?: CategoryGroup;
  layout: BadgeLayout;
  showCompany: boolean;
  showCity: boolean;
  showBarcode: boolean;
  showLogo: boolean;
  event: EventItem;
}> = ({ participant, category, layout, showCompany, showCity, showBarcode, showLogo, event }) => {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Generate QR Code with ID only (privacy safe)
    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        participant.publicCode,
        {
          width: layout === 'thermal-tag' ? 80 : layout === 'a4-8' ? 68 : 84,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('QR code render error:', err);
        }
      );
    }

    // Generate Barcode Code 128
    if (barcodeSvgRef.current && showBarcode) {
      try {
        JsBarcode(barcodeSvgRef.current, participant.publicCode, {
          format: 'CODE128',
          width: layout === 'thermal-tag' ? 1.2 : 1.3,
          height: layout === 'thermal-tag' ? 22 : 24,
          displayValue: false,
          margin: 0,
        });
      } catch (e) {
        console.error('Barcode error:', e);
      }
    }
  }, [participant.publicCode, layout, showBarcode]);

  const catColor = category?.color || '#3b82f6';
  const catName = category?.badgeLabel || category?.name || participant.categoryName || 'GERAL';

  return (
    <div
      className={`bg-white border-2 border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm page-break-inside-avoid print:shadow-none print:border print:border-slate-400 print:rounded-none relative ${
        layout === 'thermal-tag'
          ? 'w-full max-w-[320px] h-[220px] p-3 mx-auto'
          : layout === 'a4-4'
          ? 'w-full h-[320px] print:h-full p-4 print:p-3'
          : layout === 'a4-6'
          ? 'w-full h-[245px] print:h-full print:max-h-[87mm] p-3 print:p-2'
          : 'w-full h-[210px] print:h-full print:max-h-[64mm] p-2.5 print:p-1.5'
      }`}
    >
      {/* Top Header / Event Name, Logo & Category color stripe */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 print:pb-1 print:mb-1 gap-1.5">
          <div className="flex items-center gap-1.5 truncate max-w-[75%]">
            {showLogo && event.logoUrl && (
              <img
                src={event.logoUrl}
                alt="Logo"
                className="w-5 h-5 object-contain rounded flex-shrink-0"
              />
            )}
            <span className="font-bold text-[10px] sm:text-xs text-slate-800 uppercase tracking-tight truncate">
              {event.name}
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 font-semibold flex-shrink-0">
            {participant.publicCode}
          </span>
        </div>

        {/* Category Pill / Stripe */}
        <div
          className="text-white text-[10px] sm:text-xs font-black uppercase tracking-wider py-1 px-2 rounded text-center shadow-xs print:py-0.5"
          style={{ backgroundColor: catColor }}
        >
          {catName}
        </div>
      </div>

      {/* Middle: Attendee Name, Company, City */}
      <div className="text-center my-auto py-1">
        <h3
          className={`font-black text-slate-900 leading-tight tracking-tight uppercase line-clamp-2 ${
            layout === 'a4-4'
              ? 'text-lg sm:text-xl'
              : layout === 'a4-6'
              ? 'text-base sm:text-lg print:text-base'
              : 'text-sm sm:text-base print:text-xs'
          }`}
        >
          {participant.name}
        </h3>

        {showCompany && participant.company && (
          <p className="text-[11px] print:text-[10px] font-medium text-slate-600 truncate mt-0.5">
            {participant.company}
          </p>
        )}

        {showCity && participant.city && (
          <p className="text-[10px] print:text-[9px] text-slate-400 truncate mt-0.5">
            {participant.city}
          </p>
        )}
      </div>

      {/* Bottom: Codes (QR and Barcode side by side or stacked) */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* QR Code Canvas */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <canvas ref={qrCanvasRef} className="rounded" />
        </div>

        {/* Barcode & ID */}
        <div className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden">
          {showBarcode ? (
            <>
              <svg ref={barcodeSvgRef} className="max-w-full h-6 print:h-5 object-contain" />
              <span className="font-mono text-[9px] sm:text-[10px] font-bold text-slate-700 tracking-wider">
                {participant.publicCode}
              </span>
            </>
          ) : (
            <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
              {participant.publicCode}
            </span>
          )}
          {event.badgeSubtitle && (
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold truncate max-w-full">
              {event.badgeSubtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const BadgeGenerator: React.FC<BadgeGeneratorProps> = ({
  event,
  participants,
  categories,
}) => {
  // Default to Grade 2x3 (6 crachás por folha A4)
  const [layout, setLayout] = useState<BadgeLayout>('a4-6');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompany, setShowCompany] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'word' | null>(null);
  const [exportStatusText, setExportStatusText] = useState<string>('');

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  // Category map
  const catMap = new Map<string, CategoryGroup>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Badges to print: if any selected, print selected; otherwise print all filtered
  const badgesToPrint =
    selectedIds.size > 0
      ? filteredParticipants.filter((p) => selectedIds.has(p.id))
      : filteredParticipants;

  // Primary Print Function: invokes native browser print dialog for printer selection
  const handlePrint = () => {
    window.print();
  };

  // Download PDF (A4 sheet with 6 badges 2x3 or configured layout)
  const handleDownloadPdf = async () => {
    if (badgesToPrint.length === 0) return;
    setIsExporting('pdf');
    setExportStatusText('Preparando arquivo PDF de alta definição...');
    try {
      await exportBadgesToPdf(
        event,
        badgesToPrint,
        categories,
        {
          layout,
          showCompany,
          showCity,
          showBarcode,
          showLogo,
        },
        (msg) => setExportStatusText(msg)
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(null);
      setExportStatusText('');
    }
  };

  // Download Word (.doc A4 sheet compatible with Word and Google Docs)
  const handleDownloadWord = async () => {
    if (badgesToPrint.length === 0) return;
    setIsExporting('word');
    setExportStatusText('Formatando documento do Word (.doc)...');
    try {
      await exportBadgesToWord(
        event,
        badgesToPrint,
        categories,
        {
          layout,
          showCompany,
          showCity,
          showBarcode,
          showLogo,
        },
        (msg) => setExportStatusText(msg)
      );
    } catch (err) {
      console.error('Error generating Word document:', err);
    } finally {
      setIsExporting(null);
      setExportStatusText('');
    }
  };

  // Chunking for pagination:
  // a4-6: Grade 2x3 (2 colunas x 3 linhas = 6 crachás por folha A4)
  // a4-4: Grade 2x2 (2 colunas x 2 linhas = 4 crachás por folha A4)
  // a4-8: Grade 2x4 (2 colunas x 4 linhas = 8 crachás por folha A4)
  // thermal-tag: 1 crachá por etiqueta contínua
  const pageSize = layout === 'a4-6' ? 6 : layout === 'a4-4' ? 4 : layout === 'a4-8' ? 8 : 1;
  const badgePages = chunkArray(badgesToPrint, pageSize);

  // CSS class for the print sheet layout
  const getPrintGridClass = () => {
    switch (layout) {
      case 'a4-6':
        return 'a4-grid-2x3';
      case 'a4-4':
        return 'a4-grid-2x2';
      case 'a4-8':
        return 'a4-grid-2x4';
      case 'thermal-tag':
        return 'thermal-tag-page';
      default:
        return 'a4-grid-2x3';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Filter Bar (hidden when printing) */}
      <div className="print:hidden space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              Emissão de Crachás & Etiquetas
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Gere crachás na folha A4 (grade 2x3 padrão com 6 crachás), imprima direto ou baixe em PDF e Word.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrinterGuide(!showPrinterGuide)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Informações sobre a seleção de impressora"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Como selecionar impressora?</span>
            </button>

            {/* Baixar em Word (.doc) */}
            <button
              type="button"
              onClick={handleDownloadWord}
              disabled={badgesToPrint.length === 0 || isExporting !== null}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Baixar crachás formatados em Word (.doc) com grade A4"
            >
              {isExporting === 'word' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileText className="w-4 h-4 text-blue-200" />
              )}
              <span>Baixar em Word</span>
            </button>

            {/* Baixar em PDF (A4) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={badgesToPrint.length === 0 || isExporting !== null}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Baixar crachás prontos em arquivo PDF de folha A4"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileDown className="w-4 h-4 text-rose-200" />
              )}
              <span>Baixar em PDF</span>
            </button>

            {/* Direct 'Imprimir' Button invoking native printer selector */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={badgesToPrint.length === 0 || isExporting !== null}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
              title="Abrir diálogo de impressão do navegador para selecionar a impressora"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
              <span className="bg-indigo-500/40 px-2 py-0.5 rounded text-[11px]">
                {badgesToPrint.length}
              </span>
            </button>
          </div>
        </div>

        {/* Export Progress Notification */}
        {isExporting && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl p-3.5 text-xs flex items-center gap-2.5 animate-in fade-in shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
            <span className="font-semibold">{exportStatusText || 'Gerando arquivo de crachás...'}</span>
          </div>
        )}

        {/* Printer Selection Guidance Dialog */}
        {showPrinterGuide && (
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-indigo-900">
              <span className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-600" />
                Diálogo Nativo de Impressão:
              </span>
              <button
                onClick={() => setShowPrinterGuide(false)}
                className="text-indigo-400 hover:text-indigo-700 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
            <p className="leading-relaxed">
              Ao clicar no botão <strong>"Imprimir"</strong>, seu navegador abre diretamente o diálogo nativo do sistema operacional. No campo <strong>"Destino"</strong>, você pode escolher qualquer impressora conectada (USB, Wi-Fi, rede local, impressora térmica ou Salvar em PDF).
            </p>
            <p className="leading-relaxed">
              <strong>Importante para cores:</strong> Em <em>"Mais definições"</em>, marque <strong>"Gráficos de segundo plano"</strong> para que as tarjas coloridas das categorias sejam impressas perfeitamente.
            </p>
          </div>
        )}

        {/* Settings and Layout Selector */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Layout selector - Explicitly offers Grade 2x3 (6 por folha A4) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Layout da Folha</span>
                {layout === 'a4-6' && (
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">
                    2x3 Ativo
                  </span>
                )}
              </label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as BadgeLayout)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="a4-6">Grade 2x3 (6 crachás por folha A4) — Padrão</option>
                <option value="a4-4">Grade 2x2 (4 crachás por folha A4)</option>
                <option value="a4-8">Grade 2x4 (8 crachás por folha A4)</option>
                <option value="thermal-tag">Etiqueta Individual / Térmica (80 x 50 mm)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Filtrar Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value="all">Todas as Categorias ({participants.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Filtrar Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Apenas Pendentes (Não credenciados)</option>
                <option value="checked_in">Apenas Credenciados</option>
              </select>
            </div>

            {/* Display Toggles */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Elementos Visíveis
              </label>
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompany}
                    onChange={(e) => setShowCompany(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Empresa</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCity}
                    onChange={(e) => setShowCity(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Cidade</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Cód. Barras</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Logomarca</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Selection Toolbar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition cursor-pointer"
              >
                {selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Desmarcar Todos</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Selecionar Todos ({filteredParticipants.length})</span>
                  </>
                )}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-slate-400">
                  • {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Layout: <strong>{layout === 'a4-6' ? 'Grade 2x3 (6 crachás por folha A4)' : layout}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                • {badgePages.length} folha{badgePages.length > 1 ? 's' : ''} A4
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid View Paginated by Sheet (Optimized for Screen and Print) */}
      <div id="printable-badges-area" className="space-y-8 print:space-y-0">
        {badgesToPrint.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Nenhum participante encontrado com os filtros selecionados.
          </div>
        ) : (
          badgePages.map((pageBadges, pageIndex) => (
            <div
              key={pageIndex}
              className={`a4-page-container ${getPrintGridClass()}`}
            >
              {/* Screen Page Indicator (Hidden in Print) */}
              <div className="print:hidden col-span-full flex items-center justify-between pb-2 mb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Folha A4 #{pageIndex + 1} — {pageBadges.length} crachá{pageBadges.length > 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {layout === 'a4-6' ? 'Grade 2x3 (máx 6)' : `Máx ${pageSize} por página`}
                </span>
              </div>

              {/* Badges of this sheet */}
              {pageBadges.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <div key={p.id} className="relative group page-break-inside-avoid print:h-full">
                    {/* Screen Selection Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(p.id)}
                      className={`print:hidden absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition shadow-sm cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/90 text-slate-400 hover:text-slate-700 border border-slate-200'
                      }`}
                      title="Selecionar para impressão"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Badge Card */}
                    <BadgeCard
                      participant={p}
                      category={catMap.get(p.categoryId)}
                      layout={layout}
                      showCompany={showCompany}
                      showCity={showCity}
                      showBarcode={showBarcode}
                      showLogo={showLogo}
                      event={event}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
