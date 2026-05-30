import path from 'node:path';
import fs from 'node:fs';
import type PDFDocumentType from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocumentType>;

/** Lazy-load pdfkit at runtime (avoids webpack breaking require.resolve / createRequire at build). */
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
const PAGE_H = 841.89;
const MARGIN = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 36;

const C = {
  ink: '#0A0E1F',
  inkMuted: '#5A6172',
  inkSoft: '#8B91A3',
  paper: '#FBFAF6',
  paper200: '#F4F3ED',
  line: '#E6E4DC',
  primary: '#2F63FF',
  primaryDark: '#1F48E6',
  white: '#FFFFFF',
};

function ensureSpace(doc: PdfDoc, needed: number) {
  if (doc.y + needed > FOOTER_Y - 8) {
    doc.addPage({ margin: 0 });
    drawRunningHeader(doc);
    doc.y = 88;
  }
}

function drawRunningHeader(doc: PdfDoc) {
  doc.save();
  doc.rect(0, 0, PAGE_W, 56).fill(C.paper);
  doc.rect(0, 55, PAGE_W, 1).fill(C.line);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('NEXUS SERVER', MARGIN, 22, {
    characterSpacing: 1.2,
  });
  doc.fillColor(C.inkMuted).font('Helvetica').fontSize(9).text('API Documentation', MARGIN, 34);
  doc.restore();
}

function drawPageFooters(doc: PdfDoc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.save();
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(MARGIN, FOOTER_Y - 10).lineTo(PAGE_W - MARGIN, FOOTER_Y - 10).stroke();
    doc.fillColor(C.inkSoft).font('Helvetica').fontSize(8);
    doc.text('Confidential · Nexus Server', MARGIN, FOOTER_Y, { lineBreak: false });
    doc.text(`Page ${i} of ${range.count - 1}`, PAGE_W - MARGIN - 50, FOOTER_Y, {
      width: 50,
      align: 'right',
      lineBreak: false,
    });
    doc.restore();
  }
}

function section(doc: PdfDoc, num: number, title: string) {
  ensureSpace(doc, 48);
  const y = doc.y;
  doc.save();
  doc.roundedRect(MARGIN, y, 24, 24, 4).fill(C.primary);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11);
  doc.text(String(num), MARGIN, y + 7, { width: 24, align: 'center', lineBreak: false });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(13).text(title, MARGIN + 32, y + 5);
  doc.restore();
  doc.y = y + 36;
}

function paragraph(doc: PdfDoc, text: string) {
  ensureSpace(doc, 40);
  doc.fillColor(C.inkMuted).font('Helvetica').fontSize(10);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_W, align: 'left', lineGap: 4 });
  doc.moveDown(0.5);
}

function bullet(doc: PdfDoc, text: string) {
  ensureSpace(doc, 24);
  const y = doc.y;
  doc.circle(MARGIN + 4, y + 5, 2).fill(C.primary);
  doc.fillColor(C.inkMuted).font('Helvetica').fontSize(10);
  doc.text(text, MARGIN + 14, y, { width: CONTENT_W - 14, lineGap: 3 });
  doc.moveDown(0.25);
}

function endpoint(doc: PdfDoc, method: string, pathStr: string, description: string) {
  ensureSpace(doc, 56);
  const y = doc.y;
  const methodW = 44;
  doc.roundedRect(MARGIN, y, methodW, 20, 4).fill(C.ink);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8);
  doc.text(method, MARGIN, y + 6, { width: methodW, align: 'center', lineBreak: false });
  doc.fillColor(C.primary).font('Courier').fontSize(9);
  doc.text(pathStr, MARGIN + methodW + 10, y + 5, { width: CONTENT_W - methodW - 10, lineBreak: false });
  doc.y = y + 28;
  paragraph(doc, description);
}

function codeBlock(doc: PdfDoc, text: string) {
  doc.font('Courier').fontSize(8.5);
  const h =
    doc.heightOfString(text, { width: CONTENT_W - 24, lineGap: 2 }) + 20;
  ensureSpace(doc, h + 8);
  const y = doc.y;
  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 6).fill(C.paper200);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 6).lineWidth(0.5).stroke(C.line);
  doc.fillColor(C.ink).font('Courier').fontSize(8.5);
  doc.text(text, MARGIN + 12, y + 10, { width: CONTENT_W - 24, lineGap: 2 });
  doc.restore();
  doc.y = y + h + 14;
  doc.font('Helvetica').fontSize(10);
}

function drawCover(doc: PdfDoc, baseUrl: string) {
  doc.save();
  doc.rect(0, 0, PAGE_W, 240).fill(C.ink);
  doc.fillColor(C.primary).rect(MARGIN, 200, 72, 4).fill();
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10);
  doc.text('NEXUS SERVER', MARGIN, 52, { characterSpacing: 2 });
  doc.fontSize(32).text('API', MARGIN, 78);
  doc.fontSize(32).text('Documentation', MARGIN, 112);
  doc.font('Helvetica').fontSize(11).fillColor('#A8AEBC');
  doc.text('REST v1 · Dhru Fusion · Orders & Services', MARGIN, 158);
  doc.restore();

  const generated = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.y = 272;
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text('Integration reference', MARGIN);
  doc.moveDown(0.4);
  doc.fillColor(C.inkMuted).font('Helvetica').fontSize(10);
  doc.text(`Base URL: ${baseUrl}`, MARGIN);
  doc.text(`Generated: ${generated}`, MARGIN);
  doc.moveDown(1.2);

  const topics = [
    'Authentication & API keys',
    'REST v1 — Services & Orders',
    'Dhru Fusion compatible API',
    'Security, status codes & checklist',
  ];
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10).text('Contents', MARGIN);
  doc.moveDown(0.5);
  topics.forEach((t, i) => {
    doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(10).text(`${i + 1}.`, MARGIN, doc.y, {
      continued: true,
      lineBreak: false,
    });
    doc.fillColor(C.inkMuted).font('Helvetica').text(`  ${t}`);
  });

  doc.moveDown(2);
  doc.save();
  doc.strokeColor(C.line).lineWidth(0.5).moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).stroke();
  doc.restore();
  doc.moveDown(0.8);
  doc.fillColor(C.inkSoft).font('Helvetica').fontSize(9);
  doc.text(
    'This document is for authenticated Nexus Server account holders. Keep API secrets confidential.',
    MARGIN,
    doc.y,
    { width: CONTENT_W, align: 'center' },
  );
}

export async function buildApiDocumentationPdf(baseUrl: string): Promise<Buffer> {
  const PDFDocument = loadPdfKit();
  const origin = baseUrl.replace(/\/$/, '');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawCover(doc, origin);
    doc.addPage({ margin: 0 });
    drawRunningHeader(doc);
    doc.y = 88;

    section(doc, 1, 'Overview');
    paragraph(
      doc,
      'Nexus Server provides reseller APIs for IMEI and Server catalog services. Wallet balance is debited when orders are placed. Pricing respects your user group tier when configured by an administrator.',
    );

    section(doc, 2, 'API keys & authentication');
    paragraph(
      doc,
      'Create keys under Dashboard → API keys. Each key has a unique API username and secret (format nx_live_…). The full secret is shown only once at creation.',
    );
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('Required headers (every REST request)', MARGIN);
    doc.moveDown(0.35);
    codeBlock(
      doc,
      `x-api-username: <your_api_username>\nAuthorization: Bearer <your_api_key>\n\n# Alternative:\nx-api-key: <your_api_key>`,
    );
    bullet(doc, 'Default scopes: orders:write, orders:read, services:read');
    bullet(doc, 'Optional per-key: IP allowlist, rate limits, attempt logs (Security panel)');

    section(doc, 3, 'REST response format');
    paragraph(doc, 'JSON responses use a consistent envelope:');
    codeBlock(doc, '{ "success": true, "data": { … } }\n{ "success": false, "error": "…" }');
    bullet(doc, '401 — Invalid or missing credentials');
    bullet(doc, '403 — Insufficient scope or deactivated account');
    bullet(doc, '402 — Insufficient wallet balance');
    bullet(doc, '409 — Duplicate IMEI order (use acknowledgeDuplicate)');

    section(doc, 4, 'Services (REST v1)');
    endpoint(
      doc,
      'GET',
      '/api/public/v1/services/imei',
      'List active IMEI services (id, title, price, deliveryTime, group). Requires services:read.',
    );
    endpoint(
      doc,
      'GET',
      '/api/public/v1/services/server',
      'List active Server services and required field definitions. Requires services:read.',
    );

    section(doc, 5, 'Orders (REST v1)');
    endpoint(
      doc,
      'POST',
      '/api/public/v1/orders/imei',
      'Place an IMEI order. Requires orders:write. Debits wallet on success.',
    );
    codeBlock(
      doc,
      `{\n  "serviceId": "<cuid>",\n  "imei": "356938035643809",\n  "serialNumber": null,\n  "network": null,\n  "model": null,\n  "provider": null,\n  "pin": null,\n  "note": "optional",\n  "acknowledgeDuplicate": false\n}`,
    );
    paragraph(
      doc,
      'Include optional fields required by the service. Success 201 returns: { id, orderCode, status, referenceId }',
    );

    endpoint(
      doc,
      'POST',
      '/api/public/v1/orders/server',
      'Place a Server order. Body uses requiredFields keyed per service definition.',
    );
    codeBlock(doc, `{\n  "serviceId": "<cuid>",\n  "requiredFields": { "imei": "…", "sn": "…" }\n}`);

    section(doc, 6, 'Dhru Fusion compatible API');
    paragraph(
      doc,
      `POST ${origin}/api/index.php — application/x-www-form-urlencoded (classic Dhru / Fusion style).`,
    );
    codeBlock(
      doc,
      `username=<api_username>\napiaccesskey=<full_api_key>\naction=placeimeiorder\nparameters=<ID>service_cuid</ID><IMEI>356938035643809</IMEI>`,
    );
    bullet(doc, 'Actions: accountinfo, imeiservicelist, serverservicelist, fileservicelist');
    bullet(doc, 'Actions: placeimeiorder, placeserverorder, getimeiorder');
    bullet(doc, 'Response: { "SUCCESS": [ … ] } or { "ERROR": [ { "MESSAGE": "…" } ] }');

    section(doc, 7, 'Order status & public tracking');
    paragraph(doc, 'Status values: PENDING · IN_PROCESS · SUCCESS · REJECTED · CANCELLED');
    endpoint(
      doc,
      'GET',
      '/api/public/track?code=<orderCode>',
      'Public order tracking without an API key (limited fields).',
    );

    section(doc, 8, 'Integration checklist');
    bullet(doc, 'Create an API key — copy username and secret immediately');
    bullet(doc, 'GET /services/imei or /services/server — note serviceId values');
    bullet(doc, 'Ensure wallet has sufficient balance for order price');
    bullet(doc, 'POST order — store orderCode and referenceId');
    bullet(doc, 'Poll status via dashboard, REST, or Dhru getimeiorder');

    drawPageFooters(doc);
    doc.end();
  });
}
