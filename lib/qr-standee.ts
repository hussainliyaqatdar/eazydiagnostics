// Client-side. Draws a doctor's QR standee - a portrait graphic for a clinic's reception desk - onto a canvas:
// a banner with the clinic's name (and logo, if it has one) and the doctor's name, a QR code that opens the
// doctor's affiliate booking link, the call to action beneath it, and a small "Powered by" footer. Drawing on a canvas (not an image the server makes) means the text uses
// the browser's real fonts and the result downloads as a print-ready PNG.
import QRCode from "qrcode";

export const STANDEE_W = 1200;
export const STANDEE_H = 1800;

export type StandeeInput = {
  // What the QR code opens: the doctor's affiliate link.
  link: string;
  clinicName: string;
  doctorName: string;
  // A public address for the clinic's logo, if it has one.
  logoUrl?: string | null;
};

export const STANDEE_CTA = "Scan here to book a home sample collection";
export const STANDEE_FOOTER = "Powered by Eazy Diagnostics";

const TEAL = "#0F6E6E";
const TEAL_DARK = "#0B4F4F";
const CORAL = "#FF7A45";
const INK = "#0F2F2F";
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

type Ctx = CanvasRenderingContext2D;

// Words onto lines no wider than maxWidth, at the font currently set on the context.
function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// The biggest size (from `max` down to `min`) at which the text fits in `maxLines` lines.
function fitText(ctx: Ctx, text: string, weight: string, maxWidth: number, maxLines: number, max: number, min: number): { size: number; lines: string[] } {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${FONT}`;
  return { size: min, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function drawStandee(canvas: HTMLCanvasElement, input: StandeeInput): Promise<void> {
  canvas.width = STANDEE_W;
  canvas.height = STANDEE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the graphic.");
  // Wait for web fonts so the text is measured and drawn in its real font.
  try {
    await document.fonts?.ready;
  } catch {
    // Fall back to whatever is loaded.
  }
  const cx = STANDEE_W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, STANDEE_W, STANDEE_H);

  // ---- Measure everything first, so each part is sized to leave room for the rest. ----
  const logo = input.logoUrl ? await loadImage(input.logoUrl) : null;
  let logoW = 0;
  let logoH = 0;
  const badgePad = 22;
  if (logo) {
    const s = Math.min(330 / logo.width, 120 / logo.height);
    logoW = logo.width * s;
    logoH = logo.height * s;
  }
  const clinic = fitText(ctx, input.clinicName, "800", 1000, 2, 88, 52);
  const doctor = fitText(ctx, input.doctorName, "600", 1000, 2, 66, 40);
  const clinicH = clinic.lines.length * clinic.size * 1.14;
  const doctorH = doctor.lines.length * doctor.size * 1.14;
  const badgeH = logo ? logoH + badgePad * 2 : 0;
  const bannerPad = 64;
  const bannerH = bannerPad + (logo ? badgeH + 34 : 0) + clinicH + 12 + 8 + 26 + doctorH + bannerPad - 18;
  const accentH = 14;

  const cta = fitText(ctx, STANDEE_CTA, "800", 1000, 2, 70, 44);
  const ctaH = cta.lines.length * cta.size * 1.16;
  const footerH = 74;

  const qr = QRCode.create(input.link, { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  let gapTop = 60;
  let gapMid = 56;
  let gapBottom = 20;
  const avail = STANDEE_H - bannerH - accentH - gapTop - gapMid - ctaH - gapBottom - footerH;
  let cell = Math.floor(660 / n);
  while (cell > 8 && n * cell + 2 * Math.max(4 * cell, 44) > avail) cell--;
  const qrSize = n * cell;
  const quiet = Math.max(4 * cell, 44);
  const card = qrSize + 2 * quiet;
  // Space left over is shared out so the layout stays balanced.
  const extra = Math.max(0, avail - card);
  gapTop += extra * 0.4;
  gapMid += extra * 0.4;
  gapBottom += extra * 0.2;

  // ---- Banner: logo, clinic name, doctor name. ----
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, STANDEE_W, bannerH);
  ctx.fillStyle = CORAL;
  ctx.fillRect(0, bannerH, STANDEE_W, accentH);
  let y = bannerPad;
  if (logo) {
    // The logo sits on a white badge so it reads against the teal.
    const bw = logoW + badgePad * 2;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, cx - bw / 2, y, bw, badgeH, 26);
    ctx.fill();
    ctx.drawImage(logo, cx - logoW / 2, y + badgePad, logoW, logoH);
    y += badgeH + 34;
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${clinic.size}px ${FONT}`;
  let baseline = y + clinic.size * 0.82;
  for (const line of clinic.lines) {
    ctx.fillText(line, cx, baseline);
    baseline += clinic.size * 1.14;
  }
  y = baseline - clinic.size * 1.14 + clinic.size * 0.2 + 12;
  ctx.fillStyle = CORAL;
  roundRect(ctx, cx - 70, y, 140, 8, 4);
  ctx.fill();
  y += 8 + 26;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${doctor.size}px ${FONT}`;
  baseline = y + doctor.size * 0.82;
  for (const line of doctor.lines) {
    ctx.fillText(line, cx, baseline);
    baseline += doctor.size * 1.14;
  }

  // ---- QR code, on a white card with the quiet zone scanners need. ----
  const cardX = cx - card / 2;
  const cardY = bannerH + accentH + gapTop;
  ctx.save();
  ctx.shadowColor = "rgba(15,111,111,0.25)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cardX, cardY, card, card, 36);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 8;
  ctx.strokeStyle = TEAL;
  roundRect(ctx, cardX, cardY, card, card, 36);
  ctx.stroke();
  ctx.fillStyle = INK;
  const qx = cx - qrSize / 2;
  const qy = cardY + quiet;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, cell, cell);
    }
  }

  // ---- Call to action, beneath the QR code. ----
  ctx.fillStyle = TEAL_DARK;
  ctx.font = `800 ${cta.size}px ${FONT}`;
  baseline = cardY + card + gapMid + cta.size * 0.82;
  for (const line of cta.lines) {
    ctx.fillText(line, cx, baseline);
    baseline += cta.size * 1.16;
  }

  // ---- Footer: small, quiet, centred at the very bottom. ----
  ctx.fillStyle = "#6B8383";
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(STANDEE_FOOTER, cx, STANDEE_H - 38);
}

// Whether the link points at a machine only the developer can reach (so the QR would not work for patients).
export function isLocalLink(link: string): boolean {
  try {
    const host = new URL(link).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

export function standeeFileName(doctorName: string): string {
  const slug = doctorName.toLowerCase().replace(/^dr\.?\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "doctor";
  return `qr-standee-${slug}.png`;
}
