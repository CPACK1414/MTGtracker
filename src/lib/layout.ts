export type Rotation = 0 | 90 | 180 | 270;

export type CardPlacement = {
  area: string;
  rotation: Rotation;
  // Horizontal/vertical center of this seat within the grid (0 = left/top,
  // 1 = right/bottom, 0.5 = spans/sits in the middle). Used to figure out
  // where another player's seat is relative to this card (which quadrant).
  colCenter: number;
  rowCenter: number;
};

export type LayoutTemplate = {
  columns: string;
  rows: string;
  areas: string[];
  placements: CardPlacement[];
};

export type QuadrantBucket = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

// Given "my" seat and "their" seat, which quadrant of my card should
// their indicator show in (i.e. which direction are they from me).
export function getQuadrant(mine: CardPlacement, theirs: CardPlacement): QuadrantBucket {
  const horiz: "left" | "right" = theirs.colCenter < mine.colCenter ? "left" : "right";
  const vert: "top" | "bottom" = theirs.rowCenter < mine.rowCenter ? "top" : "bottom";
  return `${vert}${horiz[0].toUpperCase()}${horiz.slice(1)}` as QuadrantBucket;
}

// Seat order (index 0..n-1) maps 1:1 to placements[i] below. Index 0 is
// always "your" seat (nearest, unrotated) where that convention applies.
export function getLayoutTemplate(count: number): LayoutTemplate {
  if (count === 2) {
    return {
      columns: "1fr",
      rows: "1fr 1fr",
      areas: ["top", "bottom"],
      placements: [
        { area: "bottom", rotation: 0, colCenter: 0.5, rowCenter: 1 },
        { area: "top", rotation: 180, colCenter: 0.5, rowCenter: 0 },
      ],
    };
  }

  if (count === 3) {
    return {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: ["top-left top-right", "bottom bottom"],
      placements: [
        { area: "bottom", rotation: 0, colCenter: 0.5, rowCenter: 1 },
        { area: "top-left", rotation: 180, colCenter: 0, rowCenter: 0 },
        { area: "top-right", rotation: 180, colCenter: 1, rowCenter: 0 },
      ],
    };
  }

  if (count === 4) {
    return {
      columns: "1fr 1fr",
      rows: "1fr 1fr",
      areas: ["top-left top-right", "bottom-left bottom-right"],
      placements: [
        { area: "bottom-left", rotation: 0, colCenter: 0, rowCenter: 1 },
        { area: "top-left", rotation: 180, colCenter: 0, rowCenter: 0 },
        { area: "top-right", rotation: 180, colCenter: 1, rowCenter: 0 },
        { area: "bottom-right", rotation: 0, colCenter: 1, rowCenter: 1 },
      ],
    };
  }

  return buildFallbackGrid(count);
}

function buildFallbackGrid(count: number): LayoutTemplate {
  const rows = Math.max(1, Math.ceil(count / 2));
  const areaRows: string[] = [];
  const placements: CardPlacement[] = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    const remaining = count - idx;
    if (remaining === 1) {
      const area = `p${idx}`;
      areaRows.push(`${area} ${area}`);
      placements.push({ area, rotation: 0, colCenter: 0.5, rowCenter: r });
      idx += 1;
    } else {
      const a1 = `p${idx}`;
      const a2 = `p${idx + 1}`;
      areaRows.push(`${a1} ${a2}`);
      placements.push({ area: a1, rotation: 0, colCenter: 0, rowCenter: r });
      placements.push({ area: a2, rotation: 0, colCenter: 1, rowCenter: r });
      idx += 2;
    }
  }

  return {
    columns: "1fr 1fr",
    rows: `repeat(${rows}, 1fr)`,
    areas: areaRows,
    placements,
  };
}

export function gridTemplateAreas(template: LayoutTemplate): string {
  return template.areas.map((row) => `"${row}"`).join(" ");
}
