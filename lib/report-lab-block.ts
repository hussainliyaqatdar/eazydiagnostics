// SERVER-ONLY. Finds the lab's "CODE/NAME & ADDRESS" block on each page of a lab report - the partner's code,
// then their name and address lines and a phone number - so the clinic's own name and address can be printed
// in its place (see applyLabBlock in lib/report-branding.ts). Only text positions are read; anything that
// does not look like this block is left alone.

export type LabBlock = {
  // Left edge of the lines, PDF points from the left (user space: y grows upward).
  x: number;
  // The width the replacement text may use before it would run into the next column of the page.
  maxWidth: number;
  // The rectangle to white out: every old line of the block (not the label or the code beside it).
  cover: { x: number; y: number; width: number; height: number };
  // Baseline of the first old line (the partner's name); the address lines follow below it.
  nameBaseline: number;
  lineStep: number;
  fontSize: number;
  // How many address lines the old block had room for.
  addressSlots: number;
  // Where each old line starts (user space), so its text can be removed from the page, not just covered.
  lines: { x: number; y: number }[];
};

type Item = { str: string; x: number; y: number; w: number; h: number };

const PHONE = /^\+?\d[\d\s-]{8,}$/;

// One entry per page: the block, or null when the page does not have one.
export async function findLabBlocks(file: Uint8Array): Promise<(LabBlock | null)[]> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(file), useSystemFonts: true, verbosity: 0 }).promise;
    const result: (LabBlock | null)[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const text = await page.getTextContent();
      const items: Item[] = [];
      for (const it of text.items) {
        if (!("str" in it) || !it.str.trim()) continue;
        items.push({ str: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width || 0, h: it.height || 8 });
      }
      result.push(blockOf(items));
    }
    return result;
  } catch (err) {
    console.error("Report lab block could not be located:", err);
    return [];
  }
}

function blockOf(items: Item[]): LabBlock | null {
  const label = items.find((i) => /CODE\s*\/\s*NAME\s*&\s*ADDRESS/i.test(i.str));
  if (!label) return null;
  const left = label.x;

  // The lines beneath the label's own row, left-aligned with it, top to bottom, up to the phone number.
  const below = items
    .filter((i) => Math.abs(i.x - left) < 3 && i.y < label.y - 6)
    .sort((a, b) => b.y - a.y);
  const lines: Item[] = [];
  let last = label.y;
  for (const it of below) {
    if (last - it.y > 16) break; // a gap: the block has ended
    lines.push(it);
    last = it.y;
    if (PHONE.test(it.str.replace(/\s+/g, " "))) break;
    if (lines.length >= 8) break;
  }
  if (lines.length < 2) return null;

  const first = lines[0];
  const lowest = Math.min(...lines.map((l) => l.y));
  const fontSize = Math.max(6, Math.min(10, Math.round(first.h)));

  // Address rows: the lines after the name, ignoring the phone line, merged when they sit on the same row.
  const rows: number[] = [];
  for (const l of lines.slice(1)) {
    if (PHONE.test(l.str.replace(/\s+/g, " "))) continue;
    if (!rows.some((r) => Math.abs(r - l.y) < 4)) rows.push(l.y);
  }
  rows.sort((a, b) => b - a);
  const steps = rows.slice(1).map((r, i) => rows[i] - r);
  const lineStep = steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : fontSize + 2;

  // The next column starts at the nearest item to the right of the block on the same rows.
  const top = first.y + first.h;
  const rightEdges = items.filter((i) => i.x > left + 40 && i.y > lowest - 3 && i.y < top).map((i) => i.x);
  const maxWidth = Math.max(110, Math.min(240, (rightEdges.length ? Math.min(...rightEdges) : left + 215) - left - 12));
  const right = Math.max(...lines.map((l) => l.x + l.w));

  return {
    x: left,
    maxWidth,
    cover: { x: left - 1.5, y: lowest - 2.5, width: right - left + 3.5, height: top - lowest + 2.5 + 0.5 },
    nameBaseline: first.y,
    lineStep: Math.max(fontSize + 1, Math.min(14, lineStep)),
    fontSize,
    addressSlots: Math.max(2, rows.length),
    lines: lines.map((l) => ({ x: l.x, y: l.y })),
  };
}
