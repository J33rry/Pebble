"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Phone, Video } from "lucide-react";
import { createWaterSurface } from "@/components/login/waterSurface";
import { drawStone, makeStone, stoneUnderside } from "@/components/login/stone";
import { followTheme, toRgb } from "@/components/chats/waterTheme";
import { collectWords, Word } from "@/components/chats/waterPaint";

// Calls landing: two black stones, one marked with a handset and one with a
// camera, take turns bouncing on the water. Each landing ripples the copy and
// buttons beneath them, which are painted into the water while the real
// (transparent) DOM stays on top for clicks, focus and screen readers.

const BOUNCE_PERIOD = 2.1;
const HOP_SHARE = 0.62; // part of the period spent in the air
// Waterline as a share of the stone slot's height, and the stone's half-length vs its width.
const WATERLINE = 0.72;
const STONE_RX = 0.34;
const REST_ANGLES = [-0.22, 0.18];

const PHONE_PATH =
  "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384";
const VIDEO_PATH =
  "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ButtonLayout extends Rect {
  r: number;
  icon: { x: number; y: number; size: number };
  words: Word[];
}

interface Layout {
  buttons: ButtonLayout[];
  slots: Rect[];
  words: Word[];
}

/** A mark cut into the stone's top face, foreshortened to lie flat on it. */
function drawGlyph(g: CanvasRenderingContext2D, glyph: Path2D, x: number, y: number, size: number, angle: number) {
  g.save();
  g.translate(x, y);
  g.scale(1, 0.8);
  g.rotate(angle * 0.5);
  g.scale(size / 24, size / 24);
  g.translate(-12, -12);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.lineWidth = 2.1;
  g.save();
  g.translate(0, 0.9);
  g.strokeStyle = "rgba(0,0,0,0.75)";
  g.stroke(glyph);
  g.restore();
  g.strokeStyle = "rgba(233,234,250,0.94)";
  g.stroke(glyph);
  g.restore();
}

export function CallsWater({
  onVoice,
  onVideo,
  disabled,
  children,
}: {
  onVoice: () => void;
  onVideo: () => void;
  disabled: boolean;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const stoneRef = useRef<HTMLCanvasElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const voiceSlotRef = useRef<HTMLDivElement>(null);
  const videoSlotRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const voiceRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const waterCanvas = waterRef.current;
    const stoneCanvas = stoneRef.current;
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const voiceSlot = voiceSlotRef.current;
    const videoSlot = videoSlotRef.current;
    const title = titleRef.current;
    const body = bodyRef.current;
    const voice = voiceRef.current;
    const video = videoRef.current;
    if (
      !container || !waterCanvas || !stoneCanvas || !scroller || !content ||
      !voiceSlot || !videoSlot || !title || !body || !voice || !video
    ) return;

    const water = createWaterSurface(waterCanvas, { light: true, refract: 0.02, simSize: 320 });
    if (!water) return; // No WebGL2: the plain DOM buttons stay visible.
    container.dataset.water = "on";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = document.createElement("canvas");
    const octx = overlay.getContext("2d")!;
    const sctx = stoneCanvas.getContext("2d")!;
    const mirror = document.createElement("canvas");
    const mctx = mirror.getContext("2d")!;

    const buttonEls = [voice, video];
    const buttonIcons = [new Path2D(PHONE_PATH), new Path2D(VIDEO_PATH)];
    const stones = [new Path2D(PHONE_PATH), new Path2D(VIDEO_PATH)].map((glyph, i) => {
      const stone = makeStone("dark");
      stone.spin = 0;
      stone.spinPhase = REST_ANGLES[i];
      // The stones take turns: one lands while the other is at the top of its hop.
      return { stone, glyph, rest: REST_ANGLES[i], offset: (i * BOUNCE_PERIOD) / 2, clock: 0, lastLanding: -1 };
    });

    let W = 0;
    let H = 0;
    let dpr = 1;
    let layout: Layout | null = null;
    let rim = 0;
    let colors = {
      fg: "#000",
      muted: "#555",
      accent: "#7b7cf6",
      accentHover: "#6a6bef",
      accentFg: "#fff",
      soft: "#eeedfd",
      softHover: "#e2e1fb",
    };

    const readColors = () => {
      const cs = getComputedStyle(container);
      const v = (name: string) => cs.getPropertyValue(name).trim();
      colors = {
        fg: v("--fg"),
        muted: v("--muted"),
        accent: v("--accent"),
        accentHover: v("--accent-hover"),
        accentFg: v("--accent-fg"),
        soft: v("--surface-2"),
        softHover: v("--surface-3"),
      };
      const base = toRgb(v("--bg"));
      water.setBase(base);
      // Black stones on dark water need an edge light to read.
      rim = base[0] * 0.299 + base[1] * 0.587 + base[2] * 0.114 < 0.4 ? 1 : 0;
    };

    // Where the buttons and stones sit right now; re-run whenever the content moves.
    const place = () => {
      const origin = container.getBoundingClientRect();
      const rel = (r: DOMRect): Rect => ({
        x: r.left - origin.left,
        y: r.top - origin.top,
        w: r.width,
        h: r.height,
      });
      const words: Word[] = [];
      collectWords(octx, title, origin, "fg", words);
      collectWords(octx, body, origin, "muted", words);
      layout = {
        words,
        slots: [voiceSlot, videoSlot].map((s) => rel(s.getBoundingClientRect())),
        buttons: buttonEls.map((el, i) => {
          const words: Word[] = [];
          collectWords(octx, el, origin, i === 0 ? "accent-fg" : "accent", words);
          const icon = rel(el.querySelector("svg")!.getBoundingClientRect());
          return {
            ...rel(el.getBoundingClientRect()),
            r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16,
            icon: { x: icon.x, y: icon.y, size: icon.w },
            words,
          };
        }),
      };
    };

    const resize = () => {
      const origin = container.getBoundingClientRect();
      W = origin.width;
      H = origin.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [overlay, stoneCanvas, mirror]) {
        c.width = Math.max(1, Math.round(W * dpr));
        c.height = Math.max(1, Math.round(H * dpr));
      }
      water.resize(W, H, dpr);
      place();
    };

    readColors();
    resize();
    // Resizing blanks the canvases, so redraw at once rather than show a black frame.
    const resizeObserver = new ResizeObserver(() => {
      resize();
      cancelAnimationFrame(raf);
      step(performance.now());
    });
    resizeObserver.observe(container);
    // The contact cards load in after mount and re-centre everything.
    const contentObserver = new ResizeObserver(place);
    contentObserver.observe(content);
    scroller.addEventListener("scroll", place, { passive: true });
    document.fonts?.ready.then(place);
    const stopTheme = followTheme(readColors);

    // Tapping the water makes rings too.
    const onPointerDown = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      water.drop(e.clientX - r.left, e.clientY - r.top, 0.018, -0.22);
    };
    container.addEventListener("pointerdown", onPointerDown);

    const paintOverlay = (L: Layout) => {
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, W, H);

      // Reflections: the stones mirrored about the waterline, fading with depth.
      const slot = L.slots[0];
      const line = slot.y + slot.h * WATERLINE;
      octx.save();
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalAlpha = 0.3;
      octx.translate(0, line * 2 * dpr);
      octx.scale(1, -1);
      octx.drawImage(mirror, 0, 0);
      octx.restore();
      octx.save();
      octx.globalCompositeOperation = "destination-out";
      const fade = octx.createLinearGradient(0, line, 0, line + slot.h * 0.4);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      octx.fillStyle = fade;
      octx.fillRect(0, line, W, slot.h);
      octx.restore();

      const ink = { fg: colors.fg, muted: colors.muted, accent: colors.accent, "accent-fg": colors.accentFg };
      const paintWords = (words: Word[]) => {
        octx.textBaseline = "alphabetic";
        for (const w of words) {
          octx.font = w.font;
          octx.letterSpacing = w.spacing;
          octx.fillStyle = ink[w.ink];
          octx.fillText(w.text, w.x, w.y);
        }
      };
      paintWords(L.words);

      L.buttons.forEach((B, i) => {
        const el = buttonEls[i];
        const hover = !el.disabled && el.matches(":hover");
        const primary = i === 0;
        octx.save();
        octx.globalAlpha = el.disabled ? 0.5 : 1;

        octx.save();
        if (primary) {
          octx.shadowColor = `color-mix(in srgb, ${colors.accent} 55%, transparent)`;
          octx.shadowBlur = 30;
          octx.shadowOffsetY = 12;
          octx.fillStyle = hover ? colors.accentHover : colors.accent;
        } else {
          octx.fillStyle = hover ? colors.softHover : colors.soft;
        }
        octx.beginPath();
        octx.roundRect(B.x, B.y, B.w, B.h, B.r);
        octx.fill();
        octx.restore();

        octx.save();
        octx.translate(B.icon.x, B.icon.y);
        octx.scale(B.icon.size / 24, B.icon.size / 24);
        octx.strokeStyle = primary ? colors.accentFg : colors.accent;
        octx.lineWidth = 1.8;
        octx.lineCap = "round";
        octx.lineJoin = "round";
        octx.stroke(buttonIcons[i]);
        octx.restore();

        paintWords(B.words);
        octx.restore();
      });
    };

    let time = 0;
    let last = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      raf = requestAnimationFrame(step);
      const L = layout;
      if (!L || W < 10 || H < 10) return;

      for (const g of [sctx, mctx]) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
      }

      stones.forEach((s, i) => {
        const slot = L.slots[i];
        const rx = slot.w * STONE_RX;
        const cx = slot.x + slot.w * 0.5;
        const line = slot.y + slot.h * WATERLINE;
        // Sits a touch low, like a wet stone settled into the surface.
        const restZ = stoneUnderside(s.stone, rx) - rx * 0.12;

        // One hop per period: a parabola in the air, then it settles with a small bob.
        let lift = 0;
        if (!reduceMotion) {
          const t = time + s.offset;
          const cycle = Math.floor(t / BOUNCE_PERIOD);
          const phase = (t % BOUNCE_PERIOD) / BOUNCE_PERIOD;
          if (phase < HOP_SHARE) {
            const p = phase / HOP_SHARE;
            lift = 4 * slot.h * 0.24 * p * (1 - p);
            s.stone.spinPhase = s.rest + 0.18 * Math.sin(p * Math.PI);
            s.clock += dt;
          } else {
            const since = (phase - HOP_SHARE) * BOUNCE_PERIOD; // seconds since touchdown
            lift = -Math.exp(-since * 7) * Math.sin(since * 18) * rx * 0.06;
            s.stone.spinPhase = s.rest;
            if (cycle !== s.lastLanding) {
              s.lastLanding = cycle;
              water.drop(cx, line, 0.03, -0.32);
            }
          }
        }

        s.stone.size = rx / 15;
        const z = restZ + lift;
        // The body's centre sits half a thickness below its drawn origin.
        const glyphY = line - z + (rx * s.stone.thickness) / 2 - rx * 0.04;
        drawStone(sctx, s.stone, cx, line, z, 1, s.clock, rim);
        drawGlyph(sctx, s.glyph, cx, glyphY, rx * 0.92, s.stone.spinPhase);
        // Only the part above the waterline is reflected.
        mctx.save();
        mctx.beginPath();
        mctx.rect(0, 0, W, line);
        mctx.clip();
        drawStone(mctx, s.stone, cx, line, z, 1, s.clock, rim);
        drawGlyph(mctx, s.glyph, cx, glyphY, rx * 0.92, s.stone.spinPhase);
        mctx.restore();
      });

      paintOverlay(L);
      water.update(dt);
      water.render(time, overlay);
    };
    water.setAmbient(0.45);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      scroller.removeEventListener("scroll", place);
      stopTheme();
      container.removeEventListener("pointerdown", onPointerDown);
      delete container.dataset.water;
      water.dispose();
    };
  }, []);

  const onWater =
    "group-data-[water=on]:bg-transparent group-data-[water=on]:hover:bg-transparent group-data-[water=on]:text-transparent group-data-[water=on]:shadow-none";
  const slot = "mx-auto hidden h-44 w-48 group-data-[water=on]:block";
  const button =
    "flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg font-medium transition-colors disabled:opacity-50 group-data-[water=on]:disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg";

  return (
    <div ref={containerRef} className="group relative flex-1 overflow-hidden select-none">
      <canvas ref={waterRef} className="absolute inset-0 hidden h-full w-full group-data-[water=on]:block" aria-hidden="true" />
      <canvas ref={stoneRef} className="pointer-events-none absolute inset-0 hidden h-full w-full group-data-[water=on]:block" aria-hidden="true" />
      <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-8 sm:px-8">
          <div ref={contentRef} className="w-full max-w-3xl">
            <div className="mx-auto grid max-w-xl grid-cols-2 gap-x-3">
              <div ref={voiceSlotRef} className={slot} />
              <div ref={videoSlotRef} className={slot} />
            </div>
            <div className="mx-auto mt-4 max-w-xl text-center">
              <h1
                ref={titleRef}
                className="text-[40px] font-semibold leading-[1.15] text-fg tracking-tight group-data-[water=on]:text-transparent"
              >
                Calls
              </h1>
              <p ref={bodyRef} className="mt-2 text-lg text-muted leading-relaxed group-data-[water=on]:text-transparent">
                Make a call, catch up, or meet face-to-face on Pebble.
              </p>
            </div>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-x-3">
              <div>
                <button
                  ref={voiceRef}
                  onClick={onVoice}
                  disabled={disabled}
                  className={`bg-accent text-accent-fg shadow-[0_12px_30px_-14px_var(--accent)] hover:bg-accent-hover ${button} ${onWater}`}
                >
                  <Phone className="h-6 w-6 shrink-0" strokeWidth={1.8} />
                  Start a voice call
                </button>
              </div>
              <div>
                <button
                  ref={videoRef}
                  onClick={onVideo}
                  disabled={disabled}
                  className={`bg-surface-2 text-accent hover:bg-surface-3 ${button} ${onWater}`}
                >
                  <Video className="h-6 w-6 shrink-0" strokeWidth={1.8} />
                  Start a video call
                </button>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
