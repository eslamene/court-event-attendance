"use client";

import { createContext, useContext } from "react";
import type { PercentRect, ViewTransform } from "@/lib/seating-viewport-utils";

export type DesignerViewportApi = {
  transform: ViewTransform;
  minFitScale: number;
  fitToContent: () => void;
  resetView: () => void;
  zoomBy: (delta: number, origin?: { x: number; y: number }) => void;
  zoomToMapRect: (rect: PercentRect) => void;
  registerMapElement: (el: HTMLElement | null) => void;
};

const DesignerViewportContext = createContext<DesignerViewportApi | null>(null);

export function DesignerViewportProvider({
  value,
  children,
}: {
  value: DesignerViewportApi;
  children: React.ReactNode;
}) {
  return (
    <DesignerViewportContext.Provider value={value}>
      {children}
    </DesignerViewportContext.Provider>
  );
}

export function useDesignerViewport(): DesignerViewportApi | null {
  return useContext(DesignerViewportContext);
}

export function useDesignerViewportScale(): number {
  return useContext(DesignerViewportContext)?.transform.scale ?? 1;
}
