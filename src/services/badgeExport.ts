import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { EventItem, Participant, CategoryGroup, BadgeLayout } from '../types';

interface ExportBadgeOptions {
  layout: BadgeLayout;
  showCompany: boolean;
  showCity: boolean;
  showBarcode: boolean;
  showLogo?: boolean;
}

// Helper to generate QR Code as Base64 DataURL
async function generateQrDataUrl(code: string): Promise<string> {
  try {
    return await QRCode.toDataURL(code, {
      margin: 1,
      width: 200,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (e) {
    console.error('Error generating QR for export:', e);
    return '';
  }
}

// Helper to generate Barcode Code 128 as Base64 DataURL
function generateBarcodeDataUrl(code: string): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: 1.8,
      height: 36,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Error generating Barcode for export:', e);
    return '';
  }
}

// Convert Hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) || 79,
    g: parseInt(clean.substring(2, 4), 16) || 70,
    b: parseInt(clean.substring(4, 6), 16) || 229,
  };
}

/**
 * Generates and downloads high-quality A4 PDF with badges
 */
export async function exportBadgesToPdf(
  event: EventItem,
  participants: Participant[],
  categories: CategoryGroup[],
  options: ExportBadgeOptions,
  onProgress?: (progressText: string) => void
): Promise<void> {
  if (participants.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const catMap = new Map<string, CategoryGroup>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Determine grid dimensions based on layout
  // Default is Grade 2x3 (6 crachás por folha A4)
  let cols = 2;
  let rows = 3;
  let badgeW = 95;
  let badgeH = 87;
  let marginX = 6.5;
  let marginY = 8;
  let gapX = 7;
  let gapY = 5.5;

  if (options.layout === 'a4-4') {
    cols = 2;
    rows = 2;
    badgeW = 95;
    badgeH = 130;
    marginX = 6.5;
    marginY = 10;
    gapX = 7;
    gapY = 8;
  } else if (options.layout === 'a4-8') {
    cols = 2;
    rows = 4;
    badgeW = 95;
    badgeH = 65;
    marginX = 6.5;
    marginY = 6;
    gapX = 7;
    gapY = 4;
  }

  const perPage = cols * rows;
  const total = participants.length;

  for (let i = 0; i < total; i++) {
    const p = participants[i];
    const pageIndex = Math.floor(i / perPage);
    const indexOnPage = i % perPage;

    if (i > 0 && indexOnPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    if (onProgress) {
      onProgress(`Gerando crachá ${i + 1} de ${total}...`);
    }

    const colIndex = indexOnPage % cols;
    const rowIndex = Math.floor(indexOnPage / cols);

    const x = marginX + colIndex * (badgeW + gapX);
    const y = marginY + rowIndex * (badgeH + gapY);

    const cat = catMap.get(p.categoryId);
    const catColor = cat?.color || '#4f46e5';
    const catName = (cat?.badgeLabel || cat?.name || p.categoryName || 'GERAL').toUpperCase();

    // 1. Badge outer card border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, badgeW, badgeH, 3, 3, 'FD');

    // 2. Top Header (Event logo, Event name & ID)
    let textX = x + 4;
    if (options.showLogo !== false && event.logoUrl) {
      try {
        doc.addImage(event.logoUrl, 'PNG', x + 3.5, y + 2, 5.5, 5.5);
        textX = x + 10;
      } catch (err) {
        // Continue if logo fails
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // slate-800
    const availableWidth = badgeW - (textX - x) - 26;
    const eventNameTruncated = doc.splitTextToSize(event.name.toUpperCase(), availableWidth);
    doc.text(eventNameTruncated[0] || event.name.toUpperCase(), textX, y + 6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(p.publicCode, x + badgeW - 4, y + 6, { align: 'right' });

    // 3. Category color banner
    const rgb = hexToRgb(catColor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(x + 3, y + 8.5, badgeW - 6, 6, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(catName, x + badgeW / 2, y + 12.8, { align: 'center' });

    // 4. Attendee Name (Bold, centered, max 2 lines)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(options.layout === 'a4-4' ? 14 : options.layout === 'a4-6' ? 12 : 10);
    doc.setTextColor(15, 23, 42); // slate-900

    const nameLines = doc.splitTextToSize(p.name.toUpperCase(), badgeW - 10);
    const nameY = y + (options.layout === 'a4-4' ? 32 : options.layout === 'a4-6' ? 26 : 22);
    doc.text(nameLines.slice(0, 2), x + badgeW / 2, nameY, { align: 'center' });

    // 5. Company & City
    let infoY = nameY + (nameLines.length > 1 ? 9 : 6);
    if (options.showCompany && p.company) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600
      const compLines = doc.splitTextToSize(p.company, badgeW - 12);
      doc.text(compLines[0], x + badgeW / 2, infoY, { align: 'center' });
      infoY += 4;
    }

    if (options.showCity && p.city) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      const cityLines = doc.splitTextToSize(p.city, badgeW - 12);
      doc.text(cityLines[0], x + badgeW / 2, infoY, { align: 'center' });
    }

    // 6. Bottom Separator
    const bottomY = y + badgeH - (options.layout === 'a4-8' ? 22 : 25);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(x + 3, bottomY, x + badgeW - 3, bottomY);

    // 7. QR Code (Left bottom)
    const qrDataUrl = await generateQrDataUrl(p.publicCode);
    if (qrDataUrl) {
      const qrSize = options.layout === 'a4-8' ? 17 : 20;
      doc.addImage(qrDataUrl, 'PNG', x + 4, bottomY + 2, qrSize, qrSize);
    }

    // 8. Barcode & Subtitle (Right bottom)
    if (options.showBarcode) {
      const barcodeDataUrl = generateBarcodeDataUrl(p.publicCode);
      if (barcodeDataUrl) {
        const bcW = badgeW - 32;
        const bcH = options.layout === 'a4-8' ? 8 : 10;
        doc.addImage(barcodeDataUrl, 'PNG', x + 27, bottomY + 2.5, bcW, bcH);
      }
    }

    // ID Under Barcode
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(p.publicCode, x + (badgeW + 22) / 2, bottomY + (options.showBarcode ? 16 : 9), {
      align: 'center',
    });

    // Event Subtitle
    if (event.badgeSubtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(event.badgeSubtitle.toUpperCase(), x + (badgeW + 22) / 2, bottomY + (options.showBarcode ? 19.5 : 13), {
        align: 'center',
      });
    }
  }

  const cleanEventName = event.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
  doc.save(`Crachas_${cleanEventName}_A4.pdf`);
}

/**
 * Generates and downloads formatted Word document (.doc) with A4 layout
 * containing 6 badges per page in a 2x3 table compatible with Microsoft Word & Google Docs.
 */
export async function exportBadgesToWord(
  event: EventItem,
  participants: Participant[],
  categories: CategoryGroup[],
  options: ExportBadgeOptions,
  onProgress?: (progressText: string) => void
): Promise<void> {
  if (participants.length === 0) return;

  const catMap = new Map<string, CategoryGroup>();
  categories.forEach((c) => catMap.set(c.id, c));

  const perPage = options.layout === 'a4-4' ? 4 : options.layout === 'a4-8' ? 8 : 6;
  const cols = 2;
  const total = participants.length;
  const totalPages = Math.ceil(total / perPage);

  let docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Crachás ${event.name} - Folha A4</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page Section1 {
  size: 210mm 297mm;
  margin: 8mm 6mm 8mm 6mm;
  mso-header-margin: 0mm;
  mso-footer-margin: 0mm;
  mso-paper-source: 0;
}
div.Section1 { page: Section1; }
body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #ffffff;
}
.sheet-table {
  width: 196mm;
  border-collapse: separate;
  border-spacing: 5mm;
  margin: 0 auto;
}
.badge-cell {
  width: 95mm;
  height: ${options.layout === 'a4-4' ? '128mm' : options.layout === 'a4-8' ? '64mm' : '86mm'};
  border: 1.5pt solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  vertical-align: top;
  box-sizing: border-box;
  background-color: #ffffff;
}
.badge-header {
  font-size: 9px;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 4px;
}
.badge-id {
  float: right;
  font-family: Courier New, monospace;
  font-weight: bold;
  color: #64748b;
}
.category-stripe {
  text-align: center;
  font-weight: bold;
  font-size: 10px;
  color: #ffffff;
  padding: 3px;
  border-radius: 3px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.attendee-name {
  font-size: ${options.layout === 'a4-4' ? '18px' : '15px'};
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  color: #0f172a;
  margin: 6px 0 2px 0;
}
.attendee-company {
  font-size: 10px;
  font-weight: bold;
  text-align: center;
  color: #475569;
}
.attendee-city {
  font-size: 9px;
  text-align: center;
  color: #94a3b8;
  margin-bottom: 6px;
}
.footer-table {
  width: 100%;
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
  padding-top: 4px;
}
.page-break {
  page-break-before: always;
  mso-break-type: section-break;
  clear: both;
}
</style>
</head>
<body>
<div class="Section1">
`;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      docContent += `<div class="page-break"></div>`;
    }

    docContent += `<table class="sheet-table">`;
    const pageParticipants = participants.slice(page * perPage, (page + 1) * perPage);
    const rows = Math.ceil(pageParticipants.length / cols);

    for (let r = 0; r < rows; r++) {
      docContent += `<tr>`;
      for (let c = 0; c < cols; c++) {
        const itemIndex = r * cols + c;
        const p = pageParticipants[itemIndex];

        if (!p) {
          docContent += `<td class="badge-cell" style="border: none; background: transparent;"></td>`;
          continue;
        }

        const overallIdx = page * perPage + itemIndex;
        if (onProgress) {
          onProgress(`Processando crachá ${overallIdx + 1} de ${total} para Word...`);
        }

        const cat = catMap.get(p.categoryId);
        const catColor = cat?.color || '#4f46e5';
        const catName = (cat?.badgeLabel || cat?.name || p.categoryName || 'GERAL').toUpperCase();

        const qrDataUrl = await generateQrDataUrl(p.publicCode);
        const barcodeDataUrl = options.showBarcode ? generateBarcodeDataUrl(p.publicCode) : '';

        docContent += `
        <td class="badge-cell">
          <div class="badge-header">
            ${options.showLogo !== false && event.logoUrl ? `<img src="${event.logoUrl}" width="16" height="16" style="vertical-align: middle; margin-right: 4px; object-fit: contain; border-radius: 2px;" alt="Logo" />` : ''}
            <span>${event.name.toUpperCase()}</span>
            <span class="badge-id">${p.publicCode}</span>
          </div>

          <div class="category-stripe" style="background-color: ${catColor};">
            ${catName}
          </div>

          <div class="attendee-name">${p.name}</div>
          ${options.showCompany && p.company ? `<div class="attendee-company">${p.company}</div>` : ''}
          ${options.showCity && p.city ? `<div class="attendee-city">${p.city}</div>` : ''}

          <table class="footer-table">
            <tr>
              <td width="72" align="center" valign="middle">
                ${qrDataUrl ? `<img src="${qrDataUrl}" width="65" height="65" alt="QR" />` : ''}
              </td>
              <td align="center" valign="middle">
                ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" width="140" height="32" alt="Barcode" /><br/>` : ''}
                <span style="font-family: Courier New, monospace; font-size: 10px; font-weight: bold; color: #334155;">${p.publicCode}</span>
                ${event.badgeSubtitle ? `<br/><span style="font-size: 8px; color: #94a3b8; font-weight: bold;">${event.badgeSubtitle.toUpperCase()}</span>` : ''}
              </td>
            </tr>
          </table>
        </td>
        `;
      }
      docContent += `</tr>`;
    }

    docContent += `</table>`;
  }

  docContent += `
</div>
</body>
</html>
`;

  const blob = new Blob([docContent], { type: 'application/msword;charset=utf-8' });
  const cleanEventName = event.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Crachas_${cleanEventName}_A4.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
