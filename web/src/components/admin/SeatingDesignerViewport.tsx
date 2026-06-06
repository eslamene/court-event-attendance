"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Hand, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.45;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.12;

type Props = {
  children: ReactNode;
  className?: string;
};

export function SeatingDesignerViewport({ children, className }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const clampScale = (value: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((delta: number, origin?: { x: number; y: number }) => {
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (!origin || !containerRef.current) return next;

      const rect = containerRef.current.getBoundingClientRect();
      const ox = origin.x - rect.left;
      const oy = origin.y - rect.top;
      const ratio = next / prev;

      setPan((p) => ({
        x: ox - (ox - p.x) * ratio,
        y: oy - (oy - p.y) * ratio,
      }));

      return next;
    });
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      zoomBy(delta, { x: e.clientX, y: e.clientY });
    },
    [zoomBy]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (el.contains(e.target as Node)) e.preventDefault();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    dragging.current = true;
    setIsPanning(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-[#ebe6dc]",
        className
      )}
    >
      <div className="absolute end-2 top-2 z-30 flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-8 bg-card/95 shadow-sm"
          onClick={() => zoomBy(ZOOM_STEP)}
          title={t("seating.zoomIn")}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-8 bg-card/95 shadow-sm"
          onClick={() => zoomBy(-ZOOM_STEP)}
          title={t("seating.zoomOut")}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-8 bg-card/95 shadow-sm"
          onClick={resetView}
          title={t("seating.resetView")}
        >
          <RotateCcw className="size-4" />
        </Button>
        <span className="rounded-md bg-card/95 px-2 py-1 text-[10px] font-medium text-bronze shadow-sm">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <p className="absolute bottom-2 start-2 z-30 flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-[10px] text-bronze shadow-sm">
        <Hand className="size-3.5 shrink-0" />
        {t("seating.panHint")}
      </p>

      <div
        className={cn(
          "h-full w-full touch-none select-none",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div className="flex h-full min-h-[min(320px,55vh)] w-full min-w-full items-stretch p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
