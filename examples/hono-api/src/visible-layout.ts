export type VisibleLayoutInput = {
  imageBase64: string;
  llx?: number;
  lly?: number;
  urx?: number;
  ury?: number;
  page?: string;
};

export const DEFAULT_VISIBLE_LAYOUT = {
  llx: 150,
  lly: 72,
  urx: 560,
  ury: 205,
  page: "LAST",
} as const;

export function createVisibleSignatureLayout(input: VisibleLayoutInput): string {
  const imageBase64 = normalizeBase64Image(input.imageBase64);
  const llx = normalizeCoordinate(input.llx, DEFAULT_VISIBLE_LAYOUT.llx);
  const lly = normalizeCoordinate(input.lly, DEFAULT_VISIBLE_LAYOUT.lly);
  const urx = normalizeCoordinate(input.urx, DEFAULT_VISIBLE_LAYOUT.urx);
  const ury = normalizeCoordinate(input.ury, DEFAULT_VISIBLE_LAYOUT.ury);
  const page = normalizePage(input.page);

  if (urx <= llx || ury <= lly) {
    throw new Error("Visible signature coordinates are invalid");
  }

  return `<AgileSignerConfig><Application id="THIS-CONFIG"><pdfPassword/><Signature><Visible active="true" layer2="false" label="true" pos="1"><llx>${llx}</llx><lly>${lly}</lly><urx>${urx}</urx><ury>${ury}</ury><page>${page}</page><image>BASE64</image><BASE64VALUE>${imageBase64}</BASE64VALUE></Visible></Signature></Application></AgileSignerConfig>`;
}

function normalizeBase64Image(value: string): string {
  const imageBase64 = value
    .trim()
    .replace(/^data:image\/(?:png|jpeg|jpg);base64,/i, "")
    .replace(/\s+/g, "");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new Error("Visible signature image must be base64 PNG or JPEG content");
  }

  return imageBase64;
}

function normalizeCoordinate(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 0 || value > 5000) {
    throw new Error("Visible signature coordinates must be positive integers");
  }

  return value;
}

function normalizePage(value: string | undefined): string {
  const page = value?.trim().toUpperCase() || DEFAULT_VISIBLE_LAYOUT.page;

  if (page === "LAST" || /^[1-9]\d{0,3}$/.test(page)) {
    return page;
  }

  throw new Error("Visible signature page must be LAST or a positive integer");
}
