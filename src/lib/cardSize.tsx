"use client";

import { createContext, useContext } from "react";

// The card's visual (post-rotation) size in pixels, as measured by
// RotatableCard. CSS container queries can't be used for this: this app
// rotates cards via `transform: rotate()`, and container-query size
// evaluation doesn't reliably track the post-rotation visual footprint in
// every browser engine — so sizing is driven from this JS measurement
// instead.
const CardSizeContext = createContext<{ width: number; height: number }>({
  width: 400,
  height: 400,
});

export const CardSizeProvider = CardSizeContext.Provider;

export function useCardSize() {
  return useContext(CardSizeContext);
}

// Discrete scale tier (0-3) matching the card's visual width to a small
// number of size steps, roughly aligned with phone (4p quadrant / 2p
// full-width) through iPad (2p landscape) card widths.
const TIER_THRESHOLDS = [384, 512, 768];

export function useCardSizeTier(): number {
  const { width } = useCardSize();
  return TIER_THRESHOLDS.filter((t) => width >= t).length;
}
