import { ProductType, ProductBrand, WeightUnit } from "@generated/prisma";
import {
  generateUniqueSKU,
  formatWeight,
  parseWeight,
} from "../utils/skuGenerator";

import { prisma } from "@app";

interface CreateProductData {
  name: string;
  productType: ProductType;
  brand: ProductBrand;
  weight: number;
  weightUnit: WeightUnit;
  price: number;
  active?: boolean;
  initialStock?: number; // Optional initial stock quantity
}

interface CreateProductFromInput {
  name: string;
  productType: ProductType;
  brand: ProductBrand;
  weightString: string; // e.g., "800g", "1.5kg", "500ml"
  price: number;
  active?: boolean;
  initialStock?: number; // Optional initial stock quantity
}

export class ProductService {
  // Check if SKU is unique
  private async checkSKUUniqueness(sku: string): Promise<boolean> {
    const existing = await prisma.product.findUnique({
      where: { sku },
    });
    return !existing;
  }

  // Create product with auto-generated SKU and stock entry
  async createProduct(data: CreateProductData) {
    try {
      // Generate unique SKU
      const sku = await generateUniqueSKU(
        {
          productType: data.productType,
          brand: data.brand,
          weight: data.weight,
          weightUnit: data.weightUnit,
        },
        this.checkSKUUniqueness.bind(this)
      );

      // Use transaction to create both product and stock entry
      const result = await prisma.$transaction(async (tx) => {
        // Create product
        const product = await tx.product.create({
          data: {
            sku,
            name: data.name,
            productType: data.productType,
            brand: data.brand,
            weight: data.weight,
            weightUnit: data.weightUnit,
            price: data.price,
            active: data.active ?? true,
          },
        });

        // Create stock entry with initial quantity (default 0)
        const stock = await tx.stock.create({
          data: {
            productId: product.id,
            quantity: data.initialStock ?? 0,
            soldTotal: 0,
          },
        });

        return { product, stock };
      });

      return {
        ...result.product,
        weightDisplay: formatWeight(result.product.weight, result.product.weightUnit),
        stock: {
          quantity: result.stock.quantity,
          soldTotal: result.stock.soldTotal,
        },
      };
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  // Create product from user-friendly input
  async createProductFromInput(data: CreateProductFromInput) {
    try {
      const { weight, unit } = parseWeight(data.weightString);

      return await this.createProduct({
        name: data.name,
        productType: data.productType,
        brand: data.brand,
        weight,
        weightUnit: unit,
        price: data.price,
        active: data.active,
        initialStock: data.initialStock,
      });
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  // Get all products with formatted display and stock info
  async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    }));
  }

  // Get products by type with stock info
  async getProductsByType(productType: ProductType) {
    const products = await prisma.product.findMany({
      where: { productType },
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    }));
  }

  // Get products by brand with stock info
  async getProductsByBrand(brand: ProductBrand) {
    const products = await prisma.product.findMany({
      where: { brand },
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    }));
  }

  // Get active products only with stock info
  async getActiveProducts() {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    }));
  }

  // Search products by name or SKU with stock info
  async searchProducts(query: string) {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    }));
  }

  // Get product by SKU with stock info
  async getProductBySKU(sku: string) {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: {
        Stock: true,
      },
    });

    if (!product) {
      return null;
    }

    return {
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    };
  }

  // Update product (SKU remains same)
  async updateProduct(sku: string, updateData: Partial<CreateProductData>) {
    const product = await prisma.product.update({
      where: { sku },
      data: updateData,
      include: {
        Stock: true,
      },
    });

    return {
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
      } : null,
    };
  }

  // Delete product (this will cascade delete the stock entry if foreign key is set up properly)
  async deleteProduct(sku: string) {
    // Use transaction to ensure both product and stock are deleted
    return await prisma.$transaction(async (tx) => {
      // First get the product to get its ID
      const product = await tx.product.findUnique({
        where: { sku },
        select: { id: true },
      });

      if (!product) {
        throw new Error(`Product with SKU ${sku} not found`);
      }

      // Delete stock entry first (if cascade delete is not set up)
      await tx.stock.deleteMany({
        where: { productId: product.id },
      });

      // Then delete the product
      return await tx.product.delete({
        where: { sku },
      });
    });
  }

  // Get products with low stock (using a configurable threshold)
  async getLowStockProducts(threshold: number = 10) {
    const products = await prisma.product.findMany({
      where: {
        active: true,
        Stock: {
          quantity: {
            lte: threshold,
          },
        },
      },
      include: {
        Stock: true,
      },
      orderBy: { sku: "asc" },
    });

    return products.map((product) => ({
      ...product,
      weightDisplay: formatWeight(product.weight, product.weightUnit),
      stock: product.Stock ? {
        quantity: product.Stock.quantity,
        soldTotal: product.Stock.soldTotal,
        isLowStock: product.Stock.quantity <= threshold,
      } : null,
    }));
  }
}

export default new ProductService();
