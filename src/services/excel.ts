import * as XLSX from 'xlsx';
import { Participant, CategoryGroup, EventItem, ImportSummary, ImportPreviewRow } from '../types';

/**
 * Excel & CSV Import/Export Service
 * Uses SheetJS to generate clean, formatted spreadsheets and parse incoming files.
 */

export function downloadImportTemplate(): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sample template rows
  const templateData = [
    {
      'Nome Completo *': 'Mariana Souza Silva',
      'Documento': '123.456.789-00',
      'Telefone': '(11) 98765-4321',
      'E-mail': 'mariana.silva@exemplo.com.br',
      'Categoria / Grupo': 'Palestrante',
      'Empresa / Instituição': 'Inovação Tech Brasil',
      'Cidade': 'São Paulo - SP',
      'ID_Publico (Opcional)': '',
    },
    {
      'Nome Completo *': 'Carlos Eduardo Menezes',
      'Documento': '987.654.321-99',
      'Telefone': '(21) 99123-4567',
      'E-mail': 'carlos.menezes@empresa.com',
      'Categoria / Grupo': 'VIP',
      'Empresa / Instituição': 'Invest Capital',
      'Cidade': 'Rio de Janeiro - RJ',
      'ID_Publico (Opcional)': '',
    },
    {
      'Nome Completo *': 'Fernanda Oliveira Ramos',
      'Documento': '456.789.012-33',
      'Telefone': '(31) 99234-5678',
      'E-mail': 'fernanda.ramos@evento.com',
      'Categoria / Grupo': 'Organização',
      'Empresa / Instituição': 'Produtora Criativa',
      'Cidade': 'Belo Horizonte - MG',
      'ID_Publico (Opcional)': '',
    },
    {
      'Nome Completo *': 'Rodrigo Albuquerque',
      'Documento': '',
      'Telefone': '(41) 98877-6655',
      'E-mail': 'rodrigo.albuquerque@gmail.com',
      'Categoria / Grupo': 'Convidado',
      'Empresa / Instituição': 'Universidade Federal',
      'Cidade': 'Curitiba - PR',
      'ID_Publico (Opcional)': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set friendly column widths
  ws['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 18 }, // Doc
    { wch: 18 }, // Tel
    { wch: 32 }, // Email
    { wch: 20 }, // Categoria
    { wch: 28 }, // Empresa
    { wch: 20 }, // Cidade
    { wch: 22 }, // ID_Publico
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

  // Instructions Sheet
  const instructions = [
    { Instrução: '1. O campo "Nome Completo" é o único obrigatório.' },
    { Instrução: '2. "ID_Publico": deixe vazio para o sistema gerar automaticamente (ex: EVT-000001).' },
    { Instrução: '3. Se preencher "ID_Publico" com um código existente no evento, o sistema atualizará o registro existente.' },
    { Instrução: '4. "Categoria / Grupo": use nomes como Palestrante, VIP, Organização, Produtor, Equipe ou Convidado.' },
    { Instrução: '5. Dados sensíveis como CPF e telefone NUNCA são inseridos no QR Code para segurança e conformidade LGPD.' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Como Preencher');

  XLSX.writeFile(wb, 'CredenciaFacil_Modelo_Importacao.xlsx');
}

/**
 * Parses an XLSX or CSV File Buffer and previews changes
 */
export async function parseFileForImport(
  file: File,
  existingParticipants: Participant[],
  categories: CategoryGroup[]
): Promise<ImportSummary> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const existingCodeMap = new Map<string, Participant>();
  existingParticipants.forEach((p) => {
    existingCodeMap.set(p.publicCode.toUpperCase().trim(), p);
    if (p.id) existingCodeMap.set(p.id.toUpperCase().trim(), p);
  });

  const previewRows: ImportPreviewRow[] = [];
  let validRows = 0;
  let newRows = 0;
  let updateRows = 0;
  let invalidRows = 0;

  for (const raw of rawRows) {
    // Normalizing keys
    const rowNormalized: Record<string, string> = {};
    Object.keys(raw).forEach((k) => {
      const cleanKey = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      rowNormalized[cleanKey] = String(raw[k] || '').trim();
    });

    // Detect Name
    const name =
      rowNormalized['nome completo *'] ||
      rowNormalized['nome completo'] ||
      rowNormalized['nome'] ||
      rowNormalized['name'] ||
      rowNormalized['participante'] ||
      '';

    if (!name) {
      invalidRows++;
      previewRows.push({
        name: '(Linha sem nome)',
        category: 'Convidado',
        isExisting: false,
        status: 'invalid',
        errorMessage: 'Nome obrigatório ausente',
      });
      continue;
    }

    // Detect other fields
    const document =
      rowNormalized['documento'] ||
      rowNormalized['cpf'] ||
      rowNormalized['rg'] ||
      rowNormalized['doc'] ||
      '';

    const phone =
      rowNormalized['telefone'] ||
      rowNormalized['celular'] ||
      rowNormalized['whatsapp'] ||
      rowNormalized['fone'] ||
      rowNormalized['phone'] ||
      '';

    const email =
      rowNormalized['e-mail'] ||
      rowNormalized['email'] ||
      rowNormalized['mail'] ||
      '';

    const rawCategory =
      rowNormalized['categoria / grupo'] ||
      rowNormalized['categoria'] ||
      rowNormalized['grupo'] ||
      rowNormalized['tipo'] ||
      'Convidado';

    const company =
      rowNormalized['empresa / instituicao'] ||
      rowNormalized['empresa'] ||
      rowNormalized['instituicao'] ||
      rowNormalized['organizacao'] ||
      '';

    const city =
      rowNormalized['cidade'] ||
      rowNormalized['municipio'] ||
      rowNormalized['cidade / uf'] ||
      '';

    const publicCode =
      rowNormalized['id_publico (opcional)'] ||
      rowNormalized['id_publico'] ||
      rowNormalized['id'] ||
      rowNormalized['codigo'] ||
      '';

    const cleanCode = publicCode.toUpperCase().trim();
    const isExisting = !!cleanCode && existingCodeMap.has(cleanCode);

    if (isExisting) {
      updateRows++;
      validRows++;
      previewRows.push({
        name,
        document,
        phone,
        email,
        category: rawCategory,
        company,
        city,
        publicCode: cleanCode,
        isExisting: true,
        status: 'update',
      });
    } else {
      newRows++;
      validRows++;
      previewRows.push({
        name,
        document,
        phone,
        email,
        category: rawCategory,
        company,
        city,
        publicCode: cleanCode || undefined,
        isExisting: false,
        status: 'new',
      });
    }
  }

  return {
    totalRows: rawRows.length,
    validRows,
    newRows,
    updateRows,
    invalidRows,
    rows: previewRows,
  };
}

/**
 * Exports complete multi-tab Excel workbook with attendance metrics
 */
export function exportEventToExcel(
  event: EventItem,
  participants: Participant[],
  categories: CategoryGroup[]
): void {
  const wb = XLSX.utils.book_new();

  // Category lookup
  const catMap = new Map<string, CategoryGroup>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Tab 1: All Participants
  const allRows = participants.map((p, idx) => {
    const cat = catMap.get(p.categoryId);
    return {
      '#': idx + 1,
      'ID Credencial': p.publicCode,
      'Nome Completo': p.name,
      'Status': p.status === 'checked_in' ? 'CREDENCIADO' : 'PENDENTE',
      'Data/Hora Credenciamento': p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '-',
      'Operador Check-in': p.checkinOperator || '-',
      'Terminal': p.checkinDevice || '-',
      'Categoria / Grupo': cat?.name || p.categoryName || 'Geral',
      'Empresa / Instituição': p.company || '-',
      'Cidade': p.city || '-',
      'Documento (CPF/RG)': p.document || '-',
      'Telefone': p.phone || '-',
      'E-mail': p.email || '-',
      'Cadastrado Em': new Date(p.createdAt).toLocaleString('pt-BR'),
    };
  });
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Todos Participantes');

  // Tab 2: Only Checked-in
  const checkedInRows = participants
    .filter((p) => p.status === 'checked_in')
    .sort((a, b) => (new Date(a.checkedInAt || 0).getTime() - new Date(b.checkedInAt || 0).getTime()))
    .map((p, idx) => {
      const cat = catMap.get(p.categoryId);
      return {
        'Ordem Entrada': idx + 1,
        'ID': p.publicCode,
        'Nome': p.name,
        'Categoria': cat?.name || p.categoryName || 'Geral',
        'Empresa': p.company || '-',
        'Horário Credenciamento': p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString('pt-BR') : '-',
        'Data Credenciamento': p.checkedInAt ? new Date(p.checkedInAt).toLocaleDateString('pt-BR') : '-',
        'Operador': p.checkinOperator || '-',
      };
    });
  const wsCheckedIn = XLSX.utils.json_to_sheet(checkedInRows);
  XLSX.utils.book_append_sheet(wb, wsCheckedIn, 'Credenciados (Presentes)');

  // Tab 3: Only Pending (Absent)
  const pendingRows = participants
    .filter((p) => p.status === 'pending')
    .map((p, idx) => {
      const cat = catMap.get(p.categoryId);
      return {
        '#': idx + 1,
        'ID': p.publicCode,
        'Nome': p.name,
        'Categoria': cat?.name || p.categoryName || 'Geral',
        'Empresa': p.company || '-',
        'Telefone': p.phone || '-',
        'E-mail': p.email || '-',
      };
    });
  const wsPending = XLSX.utils.json_to_sheet(pendingRows);
  XLSX.utils.book_append_sheet(wb, wsPending, 'Pendentes (Ausentes)');

  // Tab 4: Event Summary
  const total = participants.length;
  const present = participants.filter((p) => p.status === 'checked_in').length;
  const absent = total - present;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0%';

  const summaryRows = [
    { Métrica: 'Evento', Valor: event.name },
    { Métrica: 'Data do Evento', Valor: event.date },
    { Métrica: 'Local', Valor: event.location },
    { Métrica: 'Total de Inscritos', Valor: total },
    { Métrica: 'Total Credenciados (Presentes)', Valor: present },
    { Métrica: 'Total Pendentes (Ausentes)', Valor: absent },
    { Métrica: 'Taxa de Presença Geral', Valor: percentage },
    { Métrica: 'Relatório Gerado Em', Valor: new Date().toLocaleString('pt-BR') },
    { Métrica: '---', Valor: '---' },
    { Métrica: 'DISTRIBUIÇÃO POR CATEGORIA', Valor: '---' },
  ];

  categories.forEach((cat) => {
    const inCat = participants.filter((p) => p.categoryId === cat.id);
    const inCatPresent = inCat.filter((p) => p.status === 'checked_in').length;
    const catPercent = inCat.length > 0 ? ((inCatPresent / inCat.length) * 100).toFixed(1) + '%' : '0%';
    summaryRows.push({
      Métrica: `Categoria: ${cat.name}`,
      Valor: `${inCatPresent} de ${inCat.length} credenciados (${catPercent})`,
    });
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo do Evento');

  // Filename safe
  const safeName = event.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const fileName = `CredenciaFacil_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Fast CSV Export for quick spreadsheets
 */
export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
