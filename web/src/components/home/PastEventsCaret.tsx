"use client";

import { CaretDown } from "@phosphor-icons/react";

export function PastEventsCaret() {
  return (
    <CaretDown
      size={20}
      weight="bold"
      className="text-bronze transition group-open:rotate-180"
      aria-hidden
    />
  );
}
