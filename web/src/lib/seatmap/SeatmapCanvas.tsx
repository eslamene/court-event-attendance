"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { SeatMapCanvas } from "@/lib/seatmap/vendor/seatmap.canvas.js";
import type {
  SeatmapBlockData,
  SeatmapCanvasProps,
  SeatmapCanvasRef,
} from "@/types/seatmap-canvas";

const SeatmapCanvas = forwardRef<SeatmapCanvasRef, SeatmapCanvasProps>(
  function SeatmapCanvas(
    {
      options = {},
      data = [],
      className = "",
      style = {},
      autoZoomToVenue = true,
      onReady,
      onSeatClick,
      onSeatSelect,
      onSeatUnselect,
      onBlockClick,
      onDataChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const seatmapRef = useRef<InstanceType<typeof SeatMapCanvas> | null>(null);
    const [mounted, setMounted] = useState(false);

    const optionsRef = useRef(options);
    const onReadyRef = useRef(onReady);
    const eventHandlersRef = useRef({
      onSeatClick,
      onSeatSelect,
      onSeatUnselect,
      onBlockClick,
    });

    useEffect(() => {
      optionsRef.current = options;
    }, [options]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      eventHandlersRef.current = {
        onSeatClick,
        onSeatSelect,
        onSeatUnselect,
        onBlockClick,
      };
    }, [onSeatClick, onSeatSelect, onSeatUnselect, onBlockClick]);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!mounted || !containerRef.current) return;

      const instance = new SeatMapCanvas(
        containerRef.current,
        optionsRef.current as unknown as ConstructorParameters<
          typeof SeatMapCanvas
        >[1]
      );
      seatmapRef.current = instance;

      instance.eventManager.addEventListener("SEAT.CLICK", (seat: unknown) => {
        eventHandlersRef.current.onSeatClick?.(
          seat as Parameters<NonNullable<typeof onSeatClick>>[0]
        );
      });
      instance.eventManager.addEventListener("SEAT.SELECT", (seat: unknown) => {
        eventHandlersRef.current.onSeatSelect?.(seat);
      });
      instance.eventManager.addEventListener("SEAT.UNSELECT", (seat: unknown) => {
        eventHandlersRef.current.onSeatUnselect?.(seat);
      });
      instance.eventManager.addEventListener("BLOCK.CLICK", (block: unknown) => {
        eventHandlersRef.current.onBlockClick?.(
          block as Parameters<NonNullable<typeof onBlockClick>>[0]
        );
      });

      onReadyRef.current?.(instance);

      return () => {
        seatmapRef.current = null;
      };
    }, [mounted]);

    const dataSignature = useMemo(() => {
      if (!data || data.length === 0) return "";
      try {
        return JSON.stringify(data);
      } catch {
        return String(data.length);
      }
    }, [data]);

    useEffect(() => {
      if (!mounted) return;
      const instance = seatmapRef.current;
      if (!instance || !data || data.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance.data.replaceData(data as any);

      if (autoZoomToVenue) {
        const timer = setTimeout(() => {
          seatmapRef.current?.zoomManager.zoomToVenue();
        }, 100);
        onDataChange?.(data);
        return () => clearTimeout(timer);
      }

      onDataChange?.(data);
    }, [mounted, dataSignature, autoZoomToVenue, data, onDataChange]);

    useImperativeHandle(ref, () => ({
      getInstance: () => seatmapRef.current,
      seatmap: seatmapRef.current,
    }));

    if (!mounted) {
      return (
        <div
          className={className}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f0e8",
            ...style,
          }}
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: "100%", height: "100%", ...style }}
      />
    );
  }
);

export default SeatmapCanvas;
