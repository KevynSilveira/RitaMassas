import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, Platform } from 'react-native';

type CsvCell = string | number | boolean | null | undefined;

type CsvExportInput = {
  filename: string;
  columns: string[];
  rows: CsvCell[][];
};

type PdfSection = {
  title?: string;
  rows: string[];
};

type PdfExportInput = {
  filename: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
};

function toSafeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function ensureWebDownloadSupported() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    Alert.alert(
      'Exportacao',
      'O download de relatorios esta disponivel na versao web deste sistema.'
    );
    return false;
  }

  return true;
}

function downloadBlob(content: BlobPart, mimeType: string, filename: string) {
  if (!ensureWebDownloadSupported()) {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

function escapeCsvCell(cell: CsvCell) {
  const value = cell == null ? '' : String(cell);
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function removeAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function wrapLine(value: string, maxLength = 86) {
  if (value.length <= maxLength) {
    return [value];
  }

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const nextValue = current ? `${current} ${word}` : word;

    if (nextValue.length > maxLength) {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(word.slice(0, maxLength));
        current = word.slice(maxLength);
      }
    } else {
      current = nextValue;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function escapePdfText(value: string) {
  return removeAccents(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildPdfLines(input: PdfExportInput) {
  const lines: string[] = [input.title];

  if (input.subtitle) {
    lines.push(input.subtitle);
  }

  lines.push('');

  for (const section of input.sections) {
    if (section.title) {
      lines.push(section.title.toUpperCase());
    }

    for (const row of section.rows) {
      lines.push(...wrapLine(row));
    }

    lines.push('');
  }

  while (lines.length > 0 && lines.at(-1) === '') {
    lines.pop();
  }

  return lines;
}

function buildSimplePdfDocument(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 40;
  const marginTop = 790;
  const lineHeight = 16;
  const linesPerPage = 44;
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push(['Relatorio vazio']);
  }

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pages
    .map((_, index) => `${4 + index * 2} 0 R`)
    .join(' ')}] >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let nextObjectId = 4;

  for (const pageLines of pages) {
    const pageObjectId = nextObjectId++;
    const contentObjectId = nextObjectId++;

    const commands = [
      'BT',
      '/F1 12 Tf',
      `${lineHeight} TL`,
      `${marginLeft} ${marginTop} Td`,
    ];

    pageLines.forEach((line, index) => {
      commands.push(`(${escapePdfText(line)}) Tj`);
      if (index < pageLines.length - 1) {
        commands.push('T*');
      }
    });

    commands.push('ET');
    const stream = commands.join('\n');

    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

export function exportCsvReport(input: CsvExportInput) {
  const header = input.columns.map(escapeCsvCell).join(';');
  const body = input.rows
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\n');
  const csv = `${header}\n${body}`;

  downloadBlob(csv, 'text/csv;charset=utf-8;', `${toSafeFilename(input.filename)}.csv`);
}

export function exportPdfReport(input: PdfExportInput) {
  const lines = buildPdfLines(input);
  const pdf = buildSimplePdfDocument(lines);

  downloadBlob(pdf, 'application/pdf', `${toSafeFilename(input.filename)}.pdf`);
}

export function buildPeriodLabel(from: Date, to: Date) {
  return `${format(from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(to, 'dd/MM/yyyy', {
    locale: ptBR,
  })}`;
}
