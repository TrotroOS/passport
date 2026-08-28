/**
 * Infer product category from product name/description using keyword matching.
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    "food", "rice", "grain", "meat", "fish", "fruit", "vegetable", "snack",
    "flour", "sugar", "spice", "cereal", "dairy", "frozen", "canned",
  ],
  beverages: [
    "beverage", "drink", "juice", "beer", "wine", "water", "soda",
    "spirit", "liquor", "tea", "coffee",
  ],
  pharmaceuticals: [
    "pharma", "pharmaceutical", "medicine", "drug", "tablet", "capsule",
    "antibiotic", "vaccine", "injection", "prescription",
  ],
  cosmetics: [
    "cosmetic", "beauty", "lotion", "cream", "shampoo", "perfume",
    "makeup", "skincare", "soap",
  ],
  electronics: [
    "electronic", "computer", "phone", "laptop", "tablet", "circuit",
    "semiconductor", "tv", "monitor", "router", "camera",
  ],
  machinery: [
    "machinery", "machine", "engine", "pump", "compressor", "generator",
    "industrial", "equipment", "tool",
  ],
  auto_parts: [
    "auto", "vehicle", "car", "truck", "motor", "engine part", "tire",
    "brake", "transmission", "vin", "automotive",
  ],
  building_materials: [
    "building", "construction", "cement", "steel", "lumber", "tile",
    "brick", "concrete", "roofing", "plumbing", "pipe",
  ],
  chemicals: [
    "chemical", "solvent", "acid", "pesticide", "fertilizer", "polymer",
    "resin", "industrial chemical",
  ],
  textiles: [
    "textile", "fabric", "garment", "clothing", "apparel", "cotton",
    "yarn", "woven", "knit",
  ],
  furniture: [
    "furniture", "chair", "table", "desk", "cabinet", "sofa", "bed",
    "furnishing",
  ],
  toys: [
    "toy", "game", "doll", "puzzle", "playground", "children",
  ],
  medical_devices: [
    "medical device", "surgical", "diagnostic", "implant", "stethoscope",
    "syringe", "monitor", "x-ray", "ultrasound",
  ],
  agricultural_products: [
    "agricultural", "seed", "crop", "livestock", "poultry", "plant",
    "farm", "horticulture", "grain",
  ],
};

export function inferProductCategoryCode(
  name: string,
  description?: string | null
): string {
  const text = `${name} ${description ?? ""}`.toLowerCase();

  let bestCode = "general_consumer_goods";
  let bestScore = 0;

  for (const [code, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCode = code;
    }
  }

  return bestCode;
}

export {
  isGhanaDestination,
  isSupportedImportDestination,
  resolveDestinationJurisdiction,
} from "./jurisdiction";
