const SECTION_HEADER = /^\/?\/?\s*(commanders?|deck|mainboard|maindeck|sideboard|companion|tokens?)\s*:?$/i;
const CARD_LINE = /^(\d+)\s*x?\s+(.+)$/i;
const TRAILING_SET_INFO = /\s*\([A-Za-z0-9]{2,6}\)\s*[\w-]*\s*$/;
const TRAILING_FOIL = /\s*\*f\*\s*$/i;

function cleanCardName(raw: string): string {
  return raw.replace(TRAILING_SET_INFO, "").replace(TRAILING_FOIL, "").trim();
}

/** Extracts commander card name(s) from a pasted decklist (Moxfield-style text export). */
export function parseCommanderNames(decklistText: string): string[] {
  const lines = decklistText.split(/\r?\n/);
  const names: string[] = [];
  let inCommanderSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      inCommanderSection = false;
      continue;
    }
    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      inCommanderSection = /^commanders?$/i.test(sectionMatch[1]);
      continue;
    }
    if (!inCommanderSection) continue;

    const cardMatch = line.match(CARD_LINE);
    const name = cleanCardName(cardMatch ? cardMatch[2] : line);
    if (name) names.push(name);
  }

  return names;
}
