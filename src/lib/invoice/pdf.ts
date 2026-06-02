/**
 * Invoice PDF generator.
 *
 * Mirrors the lazy pdfkit-loading approach used by api-documentation-pdf.ts
 * (avoids webpack breaking require.resolve at build time). Renders a clean,
 * branded A4 invoice.
 */
import path from 'node:path';
import fs from 'node:fs';
import type PDFDocumentType from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocumentType>;

function loadPdfKit(): typeof PDFDocumentType {
  const projectRoot = process.cwd();
  const dataPath = path.join(projectRoot, 'node_modules', 'pdfkit', 'js', 'data');
  if (!fs.existsSync(path.join(dataPath, 'Helvetica.afm'))) {
    throw new Error(`PDFKit font data missing at ${dataPath}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createRequire } = require('node:module') as typeof import('node:module');
  const nodeRequire = createRequire(path.join(projectRoot, 'package.json'));
  return nodeRequire('pdfkit') as typeof PDFDocumentType;
}

const PAGE_W = 595.28;
const MARGIN = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;

const C = {
  ink: '#0A0E1F',
  inkMuted: '#5A6172',
  inkSoft: '#8B91A3',
  paper200: '#F4F3ED',
  line: '#E6E4DC',
  primary: '#2F63FF',
  white: '#FFFFFF',
  emerald: '#0F9D58',
};

export type InvoicePdfData = {
  number: string;
  kind: string;
  status: string;
  amount: string; // formatted "$12.00"
  currency: string;
  description: string;
  orderCode: string | null;
  sellerName: string;
  sellerEmail: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  issuedAt: Date;
};

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const PDFDocument = loadPdfKit();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header band
    doc.save();
    doc.rect(0, 0, PAGE_W, 120).fill(C.ink);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20).text(data.sellerName, MARGIN, 40, {
      width: CONTENT_W - 160,
    });
    if (data.sellerEmail) {
      doc.fillColor('#A8AEBC').font('Helvetica').fontSize(9).text(data.sellerEmail, MARGIN, 68);
    }
    // INVOICE label
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(22).text('INVOICE', PAGE_W - MARGIN - 160, 40, {
      width: 160,
      align: 'right',
    });
    doc.fillColor('#A8AEBC').font('Helvetica').fontSize(9).text(data.number, PAGE_W - MARGIN - 160, 70, {
      width: 160,
      align: 'right',
    });
    doc.restore();

    // Meta block
    let y = 150;
    doc.fillColor(C.inkSoft).font('Helvetica').fontSize(8).text('BILLED TO', MARGIN, y, {
      characterSpacing: 1,
    });
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text(data.buyerName ?? '—', MARGIN, y + 12);
    if (data.buyerEmail) {
      doc.fillColor(C.inkMuted).font('Helvetica').fontSize(9).text(data.buyerEmail, MARGIN, y + 28);
    }

    // Right meta
    const rightX = PAGE_W - MARGIN - 200;
    doc.fillColor(C.inkSoft).font('Helvetica').fontSize(8).text('ISSUED', rightX, y, {
      width: 200,
      align: 'right',
      characterSpacing: 1,
    });
    doc.fillColor(C.ink).font('Helvetica').fontSize(10).text(
      data.issuedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      rightX,
      y + 12,
      { width: 200, align: 'right' },
    );
    doc.fillColor(C.inkSoft).font('Helvetica').fontSize(8).text('STATUS', rightX, y + 34, {
      width: 200,
      align: 'right',
      characterSpacing: 1,
    });
    doc.fillColor(data.status === 'PAID' ? C.emerald : C.inkMuted).font('Helvetica-Bold').fontSize(10).text(
      data.status,
      rightX,
      y + 46,
      { width: 200, align: 'right' },
    );

    // Line items table
    y = 250;
    doc.save();
    doc.rect(MARGIN, y, CONTENT_W, 28).fill(C.paper200);
    doc.fillColor(C.inkMuted).font('Helvetica-Bold').fontSize(9);
    doc.text('DESCRIPTION', MARGIN + 14, y + 9);
    doc.text('AMOUNT', PAGE_W - MARGIN - 140, y + 9, { width: 126, align: 'right' });
    doc.restore();

    y += 28;
    doc.fillColor(C.ink).font('Helvetica').fontSize(10);
    const descLines = [data.description];
    if (data.orderCode) descLines.push(`Order: ${data.orderCode}`);
    doc.text(descLines.join('\n'), MARGIN + 14, y + 12, { width: CONTENT_W - 180, lineGap: 2 });
    doc.font('Helvetica-Bold').fontSize(11).text(data.amount, PAGE_W - MARGIN - 140, y + 12, {
      width: 126,
      align: 'right',
    });

    doc.strokeColor(C.line).lineWidth(0.5).moveTo(MARGIN, y + 48).lineTo(PAGE_W - MARGIN, y + 48).stroke();

    // Total
    y += 64;
    doc.fillColor(C.inkMuted).font('Helvetica').fontSize(10).text('Total', PAGE_W - MARGIN - 260, y, {
      width: 120,
      align: 'right',
    });
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(16).text(data.amount, PAGE_W - MARGIN - 140, y - 4, {
      width: 126,
      align: 'right',
    });

    // Footer note
    doc.fillColor(C.inkSoft).font('Helvetica').fontSize(8.5).text(
      `This invoice was generated by ${data.sellerName}. Amounts in ${data.currency}.`,
      MARGIN,
      760,
      { width: CONTENT_W, align: 'center' },
    );

    doc.end();
  });
}
