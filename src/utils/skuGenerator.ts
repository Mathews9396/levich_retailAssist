import { ProductType, ProductBrand, WeightUnit } from '../../generated/prisma';

// Type mappings for SKU generation
const PRODUCT_TYPE_CODES = {
  BISCUIT: 'BIS',
  SUGAR: 'SUG',
  SALT: 'SAL',
  NOODLES: 'NOO',
  BREAD: 'BRE',
  OIL: 'OIL',
  RICE: 'RIC',
  FLOUR: 'FLO',
  SPICE: 'SPI',
  DAIRY: 'DAI',
} as const;

const BRAND_CODES = {
  PARLE: 'PAR',
  TATA: 'TAT',
  MAGGI: 'MAG',
  BRITANNIA: 'BRI',
  FORTUNE: 'FOR',
  AASHIRVAAD: 'AAS',
  AMUL: 'AMU',
  EVEREST: 'EVE',
  PATANJALI: 'PAT',
  GENERIC: 'GEN',
} as const;

const UNIT_CODES = {
  GRAM: 'G',
  KILOGRAM: 'K',
  LITER: 'L',
  MILLILITER: 'M',
  PIECE: 'P',
} as const;

interface ProductInfo {
  productType: ProductType;
  brand: ProductBrand;
  weight: number;
  weightUnit: WeightUnit;
}

/**
 * Generates SKU based on product information
 * Format: [TYPE][BRAND][WEIGHT][UNIT][SEQUENCE]
 * Example: BISPAR800G01 = Biscuit, Parle, 800 Grams, sequence 01
 */
export function generateBaseSKU(productInfo: ProductInfo): string {
  const typeCode = PRODUCT_TYPE_CODES[productInfo.productType];
  const brandCode = BRAND_CODES[productInfo.brand];
  const unitCode = UNIT_CODES[productInfo.weightUnit];
  
  // Format weight to remove decimal places if it's a whole number
  const formattedWeight = productInfo.weight % 1 === 0 
    ? productInfo.weight.toString()
    : productInfo.weight.toString().replace('.', '_');
  
  return `${typeCode}${brandCode}${formattedWeight}${unitCode}`;
}

/**
 * Generates a unique SKU by adding sequence number if needed
 */
export async function generateUniqueSKU(
  productInfo: ProductInfo,
  checkUniqueness: (sku: string) => Promise<boolean>
): Promise<string> {
  const baseSKU = generateBaseSKU(productInfo);
  
  // Check if base SKU is unique
  if (await checkUniqueness(baseSKU)) {
    return baseSKU;
  }
  
  // If not unique, add sequence number
  let sequence = 1;
  let uniqueSKU: string;
  
  do {
    const sequenceStr = sequence.toString().padStart(2, '0');
    uniqueSKU = `${baseSKU}${sequenceStr}`;
    sequence++;
  } while (!(await checkUniqueness(uniqueSKU)) && sequence <= 99);
  
  if (sequence > 99) {
    throw new Error('Unable to generate unique SKU - too many similar products');
  }
  
  return uniqueSKU;
}

/**
 * Converts weight to display format
 */
export function formatWeight(weight: number, unit: WeightUnit): string {
  switch (unit) {
    case WeightUnit.GRAM:
      return weight >= 1000 ? `${weight/1000}kg` : `${weight}g`;
    case WeightUnit.KILOGRAM:
      return `${weight}kg`;
    case WeightUnit.LITER:
      return `${weight}L`;
    case WeightUnit.MILLILITER:
      return weight >= 1000 ? `${weight/1000}L` : `${weight}ml`;
    case WeightUnit.PIECE:
      return `${weight} ${weight === 1 ? 'piece' : 'pieces'}`;
    default:
      return `${weight} ${(unit as string).toLowerCase()}`;
  }
}

/**
 * Parses display weight to weight + unit
 * Examples: "800g" -> {weight: 800, unit: GRAM}
 *          "1.5kg" -> {weight: 1.5, unit: KILOGRAM}
 */
export function parseWeight(weightStr: string): { weight: number; unit: WeightUnit } {
  const cleanStr = weightStr.toLowerCase().trim();
  
  // Extract number and unit
  const match = cleanStr.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) {
    throw new Error(`Invalid weight format: ${weightStr}`);
  }
  
  const [, weightValue, unitStr] = match;
  const weight = parseFloat(weightValue);
  
  // Map unit string to enum
  const unitMapping: Record<string, WeightUnit> = {
    'g': WeightUnit.GRAM,
    'gram': WeightUnit.GRAM,
    'grams': WeightUnit.GRAM,
    'kg': WeightUnit.KILOGRAM,
    'kilogram': WeightUnit.KILOGRAM,
    'kilograms': WeightUnit.KILOGRAM,
    'l': WeightUnit.LITER,
    'liter': WeightUnit.LITER,
    'liters': WeightUnit.LITER,
    'litre': WeightUnit.LITER,
    'litres': WeightUnit.LITER,
    'ml': WeightUnit.MILLILITER,
    'milliliter': WeightUnit.MILLILITER,
    'milliliters': WeightUnit.MILLILITER,
    'millilitre': WeightUnit.MILLILITER,
    'millilitres': WeightUnit.MILLILITER,
    'pc': WeightUnit.PIECE,
    'piece': WeightUnit.PIECE,
    'pieces': WeightUnit.PIECE,
  };
  
  const unit = unitMapping[unitStr];
  if (!unit) {
    throw new Error(`Unknown unit: ${unitStr}`);
  }
  
  return { weight, unit };
}

// Example SKUs this system would generate:
// BISPAR800G    - Parle-G 800g (Biscuit, Parle, 800 Grams)
// SUGTAT1K      - Tata Sugar 1kg (Sugar, Tata, 1 Kilogram)
// SALTAT1K      - Tata Salt 1kg (Salt, Tata, 1 Kilogram)
// NOOMAG70G     - Maggi 2-min 70g (Noodles, Maggi, 70 Grams)
// OILFOR1L      - Fortune Oil 1L (Oil, Fortune, 1 Liter)
// DAIAMUGEN500ML - Amul Milk 500ml (Dairy, Amul, Generic, 500 Milliliters)