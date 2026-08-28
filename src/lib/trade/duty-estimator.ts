import type { Product } from "@/types/database";

/** Ghana CIF duty rates by HS chapter (first 2 digits) — illustrative rates. */
const GHANA_DUTY_BY_CHAPTER: Record<string, number> = {
  "01": 0.2,
  "02": 0.2,
  "03": 0.1,
  "04": 0.2,
  "08": 0.2,
  "09": 0.2,
  "10": 0.2,
  "15": 0.2,
  "17": 0.2,
  "22": 0.5,
  "27": 0.05,
  "28": 0.05,
  "29": 0.05,
  "30": 0.05,
  "39": 0.1,
  "40": 0.1,
  "48": 0.1,
  "61": 0.2,
  "62": 0.2,
  "64": 0.2,
  "72": 0.05,
  "73": 0.05,
  "84": 0.05,
  "85": 0.1,
  "87": 0.2,
  "94": 0.2,
};

const DEFAULT_DUTY_RATE = 0.1;
const VAT_RATE = 0.15;
const NHIL_GETFUND_RATE = 0.05;

const ORIGIN_ADJUSTMENT: Record<string, number> = {
  CN: 1.0,
  NG: 1.05,
  AE: 1.0,
  US: 0.95,
  GB: 0.95,
  IN: 1.0,
  TR: 1.0,
  DE: 0.95,
};

export interface ProductDutyEstimate {
  productId: string;
  productName: string;
  hsCode: string | null;
  cifValue: number;
  dutyRate: number;
  dutyAmount: number;
  vatAmount: number;
  leviesAmount: number;
  totalLanded: number;
}

export interface ShipmentDutyEstimate {
  originCountry: string | null;
  destinationCountry: string | null;
  currency: string;
  products: ProductDutyEstimate[];
  subtotalCif: number;
  totalDuty: number;
  totalVat: number;
  totalLevies: number;
  grandTotal: number;
  disclaimer: string;
}

function hsChapter(hsCode: string | null): string | null {
  if (!hsCode) return null;
  const digits = hsCode.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(0, 2) : null;
}

function dutyRateForHs(hsCode: string | null): number {
  const chapter = hsChapter(hsCode);
  if (!chapter) return DEFAULT_DUTY_RATE;
  return GHANA_DUTY_BY_CHAPTER[chapter] ?? DEFAULT_DUTY_RATE;
}

function originMultiplier(origin: string | null): number {
  if (!origin) return 1;
  const key = origin.trim().toUpperCase().slice(0, 2);
  return ORIGIN_ADJUSTMENT[key] ?? 1;
}

function parseProductValue(product: Product): number {
  if (product.total_value != null && product.total_value > 0) {
    return Number(product.total_value);
  }
  const qty = product.quantity ?? 1;
  const unit = product.unit_price ?? 0;
  return qty * unit;
}

/** Estimate import duty and landed cost for Ghana-bound shipments. */
export function estimateShipmentDuty(
  products: Product[],
  originCountry: string | null,
  destinationCountry: string | null
): ShipmentDutyEstimate {
  const dest = destinationCountry?.trim().toUpperCase().slice(0, 2) ?? "";
  const isGhanaImport = dest === "GH" || dest.includes("GHANA");

  const originMult = originMultiplier(originCountry);
  const productEstimates: ProductDutyEstimate[] = products.map((p) => {
    const cifValue = parseProductValue(p);
    const baseRate = isGhanaImport ? dutyRateForHs(p.hs_code) : DEFAULT_DUTY_RATE * 0.5;
    const dutyRate = Math.min(baseRate * originMult, 0.5);
    const dutyAmount = cifValue * dutyRate;
    const vatBase = cifValue + dutyAmount;
    const vatAmount = isGhanaImport ? vatBase * VAT_RATE : 0;
    const leviesAmount = isGhanaImport ? cifValue * NHIL_GETFUND_RATE : 0;
    const totalLanded = cifValue + dutyAmount + vatAmount + leviesAmount;

    return {
      productId: p.id,
      productName: p.name,
      hsCode: p.hs_code,
      cifValue: Math.round(cifValue * 100) / 100,
      dutyRate: Math.round(dutyRate * 1000) / 10,
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      leviesAmount: Math.round(leviesAmount * 100) / 100,
      totalLanded: Math.round(totalLanded * 100) / 100,
    };
  });

  const subtotalCif = productEstimates.reduce((s, p) => s + p.cifValue, 0);
  const totalDuty = productEstimates.reduce((s, p) => s + p.dutyAmount, 0);
  const totalVat = productEstimates.reduce((s, p) => s + p.vatAmount, 0);
  const totalLevies = productEstimates.reduce((s, p) => s + p.leviesAmount, 0);

  return {
    originCountry,
    destinationCountry,
    currency: "USD",
    products: productEstimates,
    subtotalCif: Math.round(subtotalCif * 100) / 100,
    totalDuty: Math.round(totalDuty * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalLevies: Math.round(totalLevies * 100) / 100,
    grandTotal: Math.round((subtotalCif + totalDuty + totalVat + totalLevies) * 100) / 100,
    disclaimer:
      "Estimates based on HS chapter rates and CIF values. Actual duty is determined by GRA Customs at clearance.",
  };
}
