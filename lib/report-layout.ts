// SERVER-ONLY. Measures how much blank space each page of a lab report leaves at the top, so a
// clinic header can be printed there (the "headerless" reports leave room for a letterhead) instead of
// making every page taller. Looks at text and images; anything it cannot read counts as "no room".

// The strip at the top of a page where a header can go, in points from the top edge.
export const HEADER_ZONE = 52;

export type TopLayout = {
  // Points from the top edge to the first thing printed below the header strip.
  blank: number;
  // Horizontal spans [from, to] already used inside the header strip (e.g. an accreditation logo).
  obstacles: [number, number][];
};

// How much blank space each page leaves at the top, and what already sits in the header strip.
export async function measureTop(file: Uint8Array): Promise<TopLayout[]> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(file), useSystemFonts: true, verbosity: 0 }).promise;
    const result: TopLayout[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const top = page.view[3];
      let minTop = top;
      const obstacles: [number, number][] = [];
      const note = (t: number, x0: number, x1: number) => {
        if (t < HEADER_ZONE) obstacles.push([x0, x1]);
        else minTop = Math.min(minTop, t);
      };

      const text = await page.getTextContent();
      for (const it of text.items) {
        if (!("str" in it) || !it.str.trim()) continue;
        note(top - (it.transform[5] + (it.height || 0)), it.transform[4], it.transform[4] + (it.width || 0));
      }

      // Images: follow the transformation matrix; an image fills the unit square.
      const { OPS } = pdfjs;
      const ops = await page.getOperatorList();
      let m = [1, 0, 0, 1, 0, 0];
      const stack: number[][] = [];
      const mul = (a: number[], b: number[]) => [
        a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
      ];
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i] as unknown;
        if (fn === OPS.save) stack.push(m);
        else if (fn === OPS.paintFormXObjectBegin) {
          stack.push(m);
          if (Array.isArray(args) && Array.isArray(args[0])) m = mul(m, args[0] as number[]);
        } else if (fn === OPS.restore || fn === OPS.paintFormXObjectEnd) m = stack.pop() ?? m;
        else if (fn === OPS.transform) m = mul(m, args as number[]);
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
          const ys = [0, 1].flatMap((x) => [0, 1].map((y) => m[1] * x + m[3] * y + m[5]));
          const xs = [0, 1].flatMap((x) => [0, 1].map((y) => m[0] * x + m[2] * y + m[4]));
          note(top - Math.max(...ys), Math.min(...xs), Math.max(...xs));
        }
      }
      result.push({ blank: Math.max(0, minTop), obstacles });
    }
    return result;
  } catch (err) {
    console.error("Report layout could not be measured:", err);
    return [];
  }
}
