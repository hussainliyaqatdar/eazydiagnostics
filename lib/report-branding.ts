// SERVER-ONLY. Puts a clinic's header (logo, clinic name and address, and the prescribing
// doctor's name and qualifications) on top of every page of a lab report PDF.
//
// The lab's report is not edited: each original page is placed, untouched, and the header goes
// into blank space at the top of the page when there is room (a "headerless" report), or in a new
// band added above it, so nothing the lab printed is covered or moved. (A report that carries a
// digital signature will no longer verify once re-saved this way; a password-protected one
// cannot be read and is refused.)
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { HEADER_ZONE, measureTop, type TopLayout } from "./report-layout";

export type ReportHeader = {
  clinicName: string;
  clinicAddress?: string;
  // PNG bytes (see normalizeLogo in lib/clinics.ts).
  logoPng?: Buffer | null;
  doctorName?: string;
  doctorQualifications?: string;
};

// Height of the band added above each page, in PDF points (1/72 inch).
const BAND = 66;
// A page whose top is blank for at least this many points gets the header printed there (at most
// IN_PLACE_MAX points tall) instead of a band added above it.
const IN_PLACE_H = HEADER_ZONE - 10;
const GAP = 12;
const MIN_GAP = 110;
const MARGIN = 36;
const TEAL = rgb(0.059, 0.431, 0.431);
const INK = rgb(0.09, 0.19, 0.18);
const GREY = rgb(0.38, 0.43, 0.43);

export function looksLikePdf(file: Uint8Array): boolean {
  return file.length > 5 && String.fromCharCode(...file.slice(0, 5)) === "%PDF-";
}

// The standard PDF fonts only cover Latin-1; anything else would fail to encode.
function winAnsi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^ -~ -ÿ]/g, "?");
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let t = winAnsi(text).trim();
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

export class ReportError extends Error {}

export async function brandReport(original: Uint8Array, header: ReportHeader): Promise<Uint8Array> {
  if (!looksLikePdf(original)) throw new ReportError("That file is not a PDF.");

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(original); // throws on an encrypted file
  } catch {
    throw new ReportError("That PDF could not be read (it may be password-protected or damaged).");
  }

  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);
  const logo = header.logoPng ? await out.embedPng(header.logoPng).catch(() => null) : null;
  // How much blank space each page leaves at the top (a "headerless" lab report leaves room for a letterhead).
  const layouts: (TopLayout | undefined)[] = await measureTop(original);

  const pages = source.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const embedded = await out.embedPage(page);

    // Room at the top: print the header there and keep the page size (working around anything already in
    // that strip, such as an accreditation logo). Otherwise add a band above the page.
    const lay = layouts[i];
    const gaps = lay && lay.blank >= HEADER_ZONE ? freeSpans(lay.obstacles, width) : [];
    const inPlace = gaps.length > 0;
    const sheet = out.addPage([width, inPlace ? height : height + BAND]);
    sheet.drawPage(embedded, { x: 0, y: 0, width, height });

    if (inPlace) drawHeader(sheet, { top: height - 6, regionH: IN_PLACE_H, spans: gaps, header, logo, bold, regular, compact: true });
    else drawHeader(sheet, { top: height + BAND, regionH: BAND, spans: [[MARGIN, width - MARGIN]], header, logo, bold, regular, compact: false });
  }

  return out.save();
}

// The stretches of the header strip that are free, from the left margin to the right margin. Empty when
// they are too narrow to hold a clinic name (the caller then adds a band instead).
function freeSpans(obstacles: [number, number][], width: number): [number, number][] {
  const sorted = [...obstacles].sort((a, b) => a[0] - b[0]);
  const spans: [number, number][] = [];
  let from = MARGIN;
  for (const [x0, x1] of sorted) {
    if (x0 - GAP > from) spans.push([from, x0 - GAP]);
    from = Math.max(from, x1 + GAP);
  }
  if (width - MARGIN > from) spans.push([from, width - MARGIN]);
  return spans.some(([a, b]) => b - a >= MIN_GAP) ? spans.filter(([a, b]) => b - a >= 60) : [];
}

type PdfImage = Awaited<ReturnType<PDFDocument["embedPng"]>>;

// Clinic (logo, name, address) in the widest free span; doctor (name, qualifications) right-aligned in the
// last free span, or in the right part of the same span when there is only one.
function drawHeader(
  sheet: PDFPage,
  o: { top: number; regionH: number; spans: [number, number][]; header: ReportHeader; logo: PdfImage | null; bold: PDFFont; regular: PDFFont; compact: boolean }
) {
  const { top, regionH, spans, header, logo, bold, regular, compact } = o;
  const nameSize = compact ? 12.5 : 14;
  const smallSize = compact ? 8 : 8.5;
  const docSize = compact ? 10.5 : 11;
  const nameY = top - (compact ? regionH * 0.42 : 28);
  const lineY = nameY - (compact ? 11.5 : 14);

  const widest = spans.reduce((best, s) => (s[1] - s[0] > best[1] - best[0] ? s : best), spans[0]);
  const last = spans[spans.length - 1];
  const separate = last !== widest && last[1] - last[0] >= 70;
  // One span: clinic takes the left 58%, the doctor the right 38%.
  const clinicSpan: [number, number] = separate ? widest : [widest[0], widest[0] + (widest[1] - widest[0]) * 0.6];
  const doctorSpan: [number, number] = separate ? last : [widest[1] - (widest[1] - widest[0]) * 0.38, widest[1]];

  let textLeft = clinicSpan[0];
  if (logo) {
    const maxH = regionH - (compact ? 6 : 22);
    const scale = Math.min(maxH / logo.height, 110 / logo.width, (clinicSpan[1] - clinicSpan[0]) * 0.35 / logo.width);
    const w = logo.width * scale;
    const h = logo.height * scale;
    sheet.drawImage(logo, { x: clinicSpan[0], y: top - regionH / 2 - h / 2, width: w, height: h });
    textLeft = clinicSpan[0] + w + 10;
  }
  const leftMax = Math.max(60, clinicSpan[1] - textLeft);
  sheet.drawText(fit(header.clinicName, bold, nameSize, leftMax), { x: textLeft, y: nameY, size: nameSize, font: bold, color: TEAL });
  if (header.clinicAddress) {
    sheet.drawText(fit(header.clinicAddress, regular, smallSize, leftMax), { x: textLeft, y: lineY, size: smallSize, font: regular, color: GREY });
  }

  if (header.doctorName) {
    const rightMax = doctorSpan[1] - doctorSpan[0];
    const name = fit(header.doctorName, bold, docSize, rightMax);
    sheet.drawText(name, { x: doctorSpan[1] - bold.widthOfTextAtSize(name, docSize), y: nameY, size: docSize, font: bold, color: INK });
    if (header.doctorQualifications) {
      const q = fit(header.doctorQualifications, regular, smallSize, rightMax);
      sheet.drawText(q, { x: doctorSpan[1] - regular.widthOfTextAtSize(q, smallSize), y: lineY, size: smallSize, font: regular, color: GREY });
    }
  }
  // A rule beneath, only across the free spans.
  const ruleY = compact ? top - regionH : top - BAND + 4;
  for (const [x0, x1] of spans) sheet.drawLine({ start: { x: x0, y: ruleY }, end: { x: x1, y: ruleY }, thickness: 1.2, color: TEAL });
}
