"use client";

import type { CSSProperties, ReactNode } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import type { Rotation } from "@/lib/layout";

export default function RotatableCard({
  rotation,
  style,
  children,
}: {
  rotation: Rotation;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const swapped = rotation === 90 || rotation === 270;
  const innerWidth = swapped ? height : width;
  const innerHeight = swapped ? width : height;

  return (
    <div ref={ref} style={style} className="relative overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: innerWidth ? `${innerWidth}px` : "100%",
          height: innerHeight ? `${innerHeight}px` : "100%",
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
