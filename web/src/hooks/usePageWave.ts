"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createWaterSurface, type WaterSurface } from "@/components/login/waterSurface";
import { toRgb } from "@/components/chats/waterTheme";

// A page change as a ripple: a train of real rings (the same simulation as the
// app's water) spreads out from beside the clicked nav button to the end of the
// screen. The new page is uncovered inside them, the old one is still beyond
// them. The browser's view transition supplies the two pages; the CSS half (the
// clip and the layer names) is in globals.css.

const SWEEP_MS = 1300;
// How long the old page may stay frozen while a slow route loads.
const MAX_WAIT_MS = 2500;

const SIM_SIZE = 256;
// Distance between rings, and how many the source sends out.
const RING_SPACING = 66;
const RINGS = 4;
const PUSH_RADIUS = 24;
const PUSH_STRENGTH = 0.04;
// Water the eye sees at the front: a soft lip ahead of the first ring, a long fade behind it.
const LIP = 34;
const FEATHER = 80;

function sweep(water: WaterSurface, canvas: HTMLCanvasElement, panel: HTMLElement, from: DOMRect) {
  const rect = panel.getBoundingClientRect();
  const { width, height } = rect;
  // The rail is beside the panel, so its rings start at the panel's edge, level with
  // the button. The bottom nav floats over the panel, so there they start at the button.
  const ox = Math.max(from.left + from.width / 2 - rect.left, 0);
  const oy = Math.min(Math.max(from.top + from.height / 2 - rect.top, 0), height);

  canvas.style.left = `${rect.left}px`;
  canvas.style.top = `${rect.top}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.borderRadius = getComputedStyle(panel).borderTopLeftRadius;
  water.setBase(toRgb(getComputedStyle(canvas).getPropertyValue("--bg")));
  water.resize(width, height, Math.min(window.devicePixelRatio || 1, 1.5));
  water.clear();
  water.setAmbient(0.2);

  const stepPx = water.stepDistance();
  const period = RING_SPACING / stepPx;
  const pushSteps = period * RINGS;
  const tail = Math.max(width * 0.55, 320);
  const farthest = Math.max(
    ...[0, width].flatMap((x) => [0, height].map((y) => Math.hypot(x - ox, y - oy)))
  );
  const totalSteps = Math.ceil((farthest + tail + LIP) / stepPx);

  let done = 0;
  const start = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = Math.min((now - start) / SWEEP_MS, 1);
    const target = Math.round(t * totalSteps);
    for (; done < target; done++) {
      if (done < pushSteps) {
        // Swells in, then dies away, so the rings have no hard start or end.
        const u = done / pushSteps;
        const envelope = Math.min(u / 0.2, 1) * (1 - u);
        water.drop(ox, oy, PUSH_RADIUS, PUSH_STRENGTH * Math.sin((2 * Math.PI * done) / period) * envelope);
      }
      water.advance(1);
    }
    water.render(now / 1000);

    const front = done * stepPx;
    const lead = front + LIP;
    const back = front - tail;
    canvas.style.maskImage = `radial-gradient(circle at ${ox}px ${oy}px, transparent ${back}px, #000 ${back + tail * 0.5}px, #000 ${front - FEATHER * 0.25}px, transparent ${lead}px)`;

    // Under the fully opaque part of the water, so the swap itself is never seen.
    document.documentElement.style.setProperty(
      "--page-wave-clip",
      `circle(${Math.max(front - FEATHER, 0).toFixed(1)}px at ${ox}px ${oy}px)`
    );

    if (t < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => cancelAnimationFrame(raf);
}

export type WaveTo = (href: string, from: HTMLElement) => void;

export function usePageWave() {
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const crestRef = useRef<HTMLCanvasElement>(null);
  const arrivedRef = useRef<(() => void) | null>(null);
  const currentRef = useRef(0);
  const waterRef = useRef<WaterSurface | null>(null);

  // Built ahead of time: compiling shaders on the click would stall the wave's first frames.
  useEffect(() => {
    const crest = crestRef.current;
    if (!crest) return;
    const water = createWaterSurface(crest, { light: true, refract: 0, flat: true, simSize: SIM_SIZE });
    waterRef.current = water;
    return () => {
      waterRef.current = null;
      water?.dispose();
    };
  }, []);

  // Runs once the new route is in the DOM, which is what the browser snapshots.
  useLayoutEffect(() => {
    arrivedRef.current?.();
    arrivedRef.current = null;
  }, [pathname]);

  const waveTo = useCallback<WaveTo>(
    (href, from) => {
      if (href === pathname) return;

      const panel = panelRef.current;
      const crest = crestRef.current;
      const water = waterRef.current;
      if (
        !panel ||
        !crest ||
        !water ||
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        router.push(href);
        return;
      }

      const button = from.getBoundingClientRect();
      const root = document.documentElement;
      const id = ++currentRef.current;
      root.dataset.pageWave = "on";
      root.style.setProperty("--page-wave-clip", "inset(0 100% 0 0)");
      crest.style.maskImage = "linear-gradient(transparent, transparent)";

      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, MAX_WAIT_MS);
            arrivedRef.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            router.push(href);
          })
      );

      let stop = () => {};
      transition.ready.then(
        () => {
          stop = sweep(water, crest, panel, button);
          // Nothing in the CSS animates, so this is what holds the transition open.
          root.animate(
            { opacity: [1, 1] },
            { duration: SWEEP_MS, pseudoElement: "::view-transition-group(page-wave-panel)" }
          );
        },
        () => {} // Skipped by a newer click, which brings its own wave.
      );

      transition.finished.finally(() => {
        stop();
        if (id !== currentRef.current) return;
        delete root.dataset.pageWave;
        root.style.removeProperty("--page-wave-clip");
      });
    },
    [pathname, router]
  );

  return { waveTo, panelRef, crestRef };
}
