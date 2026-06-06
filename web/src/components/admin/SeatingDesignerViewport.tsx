"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Hand, Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import {
  DesignerViewportProvider,
  type DesignerViewportApi,
} from "@/components/admin/DesignerViewportContext";
import { Button } from "@/components/ui/button";
import {
  clampScale,
  computeFitTransform,
  computeMinFitScale,
  computeZoomToMapRect,
  DESIGNER_VIEWPORT,
  type PercentRect,
  type ViewTransform,
  zoomAboutPoint,
} from "@/lib/seating-viewport-utils";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Re-fit when this key changes (layout/tier counts) without remounting zoom state. */
  contentKey?: string;
};

export function SeatingDesignerViewport({
  children,
  className,
  contentKey,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLElement | null>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [transform, setTransform] = useState<ViewTransform>({
    scale: 1,
    pan: { x: 0, y: 0 },
  });
  const [minFitScale, setMinFitScale] = useState(0.08);
  const [isPanning, setIsPanning] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return null;

    const containerRect = container.getBoundingClientRect();
    const zoom = transform.scale || 1;
    // `zoom` affects layout size — normalize to unscaled logical dimensions.
    const contentW = content.offsetWidth / zoom;
    const contentH = content.offsetHeight / zoom;
    const minScale = computeMinFitScale(
      containerRect.width,
      containerRect.height,
      contentW,
      contentH
    );

    return {
      containerRect,
      contentW,
      contentH,
      minScale,
    };
  }, [transform.scale]);

  const applyFit = useCallback(() => {
    const measured = measure();
    if (!measured) return;
    setMinFitScale(measured.minScale);
    setTransform(
      computeFitTransform(
        measured.containerRect.width,
        measured.containerRect.height,
        measured.contentW,
        measured.contentH
      )
    );
  }, [measure]);

  const resetView = useCallback(() => {
    setTransform({ scale: 1, pan: { x: 0, y: 0 } });
  }, []);

  const zoomBy = useCallback(
    (delta: number, origin?: { x: number; y: number }) => {
      setTransform((prev) => {
        const measured = measure();
        const floor = measured?.minScale ?? minFitScale;
        const nextScale = clampScale(prev.scale + delta, floor * 0.85);
        if (!origin || !containerRef.current) {
          return { ...prev, scale: nextScale };
        }
        const rect = containerRef.current.getBoundingClientRect();
        return zoomAboutPoint(prev, nextScale, origin, rect);
      });
    },
    [measure, minFitScale]
  );

  const zoomToMapRect = useCallback(
    (rect: PercentRect) => {
      const container = containerRef.current;
      const content = contentRef.current;
      const mapEl = mapElementRef.current;
      if (!container || !content || !mapEl) return;

      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const mapRect = mapEl.getBoundingClientRect();
      const zoom = transform.scale || 1;

      const mapOffset = {
        x: (mapRect.left - contentRect.left) / zoom,
        y: (mapRect.top - contentRect.top) / zoom,
      };

      setTransform(
        computeZoomToMapRect(
          containerRect.width,
          containerRect.height,
          content.offsetWidth / zoom,
          content.offsetHeight / zoom,
          mapOffset,
          { width: mapRect.width / zoom, height: mapRect.height / zoom },
          rect
        )
      );
    },
    [transform.scale]
  );

  const registerMapElement = useCallback((el: HTMLElement | null) => {
    mapElementRef.current = el;
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      const measured = measure();
      if (measured) setMinFitScale(measured.minScale);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => applyFit());
    return () => cancelAnimationFrame(id);
  }, [applyFit, contentKey, children]);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? DESIGNER_VIEWPORT.zoomStep : -DESIGNER_VIEWPORT.zoomStep;
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
    setTransform((prev) => ({
      ...prev,
      pan: { x: prev.pan.x + dx, y: prev.pan.y + dy },
    }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-tier-overview]")) return;
    applyFit();
  }

  const api = useMemo<DesignerViewportApi>(
    () => ({
      transform,
      minFitScale,
      fitToContent: applyFit,
      resetView,
      zoomBy,
      zoomToMapRect,
      registerMapElement,
    }),
    [
      transform,
      minFitScale,
      applyFit,
      resetView,
      zoomBy,
      zoomToMapRect,
      registerMapElement,
    ]
  );

  return (
    <DesignerViewportProvider value={api}>
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
            onClick={() => zoomBy(DESIGNER_VIEWPORT.zoomStep)}
            title={t("seating.zoomIn")}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-8 bg-card/95 shadow-sm"
            onClick={() => zoomBy(-DESIGNER_VIEWPORT.zoomStep)}
            title={t("seating.zoomOut")}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-8 bg-card/95 shadow-sm"
            onClick={applyFit}
            title={t("seating.fitView")}
          >
            <Maximize2 className="size-4" />
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
            {Math.round(transform.scale * 100)}%
          </span>
        </div>

        <p className="absolute bottom-2 start-2 z-30 flex max-w-[min(100%,20rem)] items-center gap-1 rounded-md bg-card/90 px-2 py-1 text-[10px] leading-snug text-bronze shadow-sm">
          <Hand className="size-3.5 shrink-0" />
          {t("seating.panHintExtended")}
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
          onDoubleClick={onDoubleClick}
        >
          <div
            className="h-full w-full"
            style={{
              transform: `translate(${transform.pan.x}px, ${transform.pan.y}px)`,
            }}
          >
            <div
              ref={contentRef}
              className="inline-flex h-full min-h-[min(320px,55vh)] w-full min-w-full items-stretch p-4"
              style={{
                zoom: transform.scale,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </DesignerViewportProvider>
  );
}
