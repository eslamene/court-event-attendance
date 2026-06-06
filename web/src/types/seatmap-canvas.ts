import type { CSSProperties } from "react";

/** Shared seatmap-canvas types for the web app. */

export type SeatmapSeatData = {
  id: string;
  x: number;
  y: number;
  color?: string;
  salable?: boolean;
  custom_data?: Record<string, unknown>;
  note?: string;
  title?: string;
};

export type SeatmapBlockData = {
  id: string;
  title: string;
  labels?: unknown[];
  color?: string;
  seats: SeatmapSeatData[];
  gap?: number;
};

export type SeatmapOptions = Record<string, unknown>;

export type SeatmapCanvasRef = {
  getInstance: () => unknown;
  seatmap: unknown;
};

export type SeatmapCanvasProps = {
  options?: SeatmapOptions;
  data?: SeatmapBlockData[];
  className?: string;
  style?: CSSProperties;
  autoZoomToVenue?: boolean;
  onReady?: (instance: unknown) => void;
  onSeatClick?: (seat: {
    isSelected: () => boolean;
    select: () => void;
    unSelect: () => void;
    item?: SeatmapSeatData;
  }) => void;
  onSeatSelect?: (seat: unknown) => void;
  onSeatUnselect?: (seat: unknown) => void;
  onBlockClick?: (block: { id?: string; item?: { id?: string } }) => void;
  onDataChange?: (data: SeatmapBlockData[]) => void;
};
