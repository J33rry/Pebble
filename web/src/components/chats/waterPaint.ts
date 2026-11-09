// Helpers for redrawing real DOM text into a water overlay, so ripples can bend it.

export interface Word {
  text: string;
  x: number;
  y: number;
  font: string;
  spacing: string;
  ink: "fg" | "muted" | "accent" | "accent-fg";
}

/** Position every word of `el` (relative to `origin`) so it can be redrawn on canvas. */
export function collectWords(
  ctx: CanvasRenderingContext2D,
  el: HTMLElement,
  origin: DOMRect,
  ink: Word["ink"],
  out: Word[]
) {
  const cs = getComputedStyle(el);
  const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const spacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.font = font;
  ctx.letterSpacing = spacing;
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getBoundingClientRect();
      const metrics = ctx.measureText(m[0]);
      const asc = metrics.fontBoundingBoxAscent;
      const desc = metrics.fontBoundingBoxDescent;
      out.push({
        text: m[0],
        x: r.left - origin.left,
        y: r.top - origin.top + (r.height - (asc + desc)) / 2 + asc,
        font,
        spacing,
        ink,
      });
    }
  }
}
