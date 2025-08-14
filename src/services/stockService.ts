// import { PrismaClient } from '../generated/prisma';

import { prisma } from "../app";

interface ReceiveStockData {
  sku: string;
  qty: number;
}

interface StockResponse {
  sku: string;
  productName: string;
  quantity: number;
  receivedTotal: number;
  soldTotal: number;
  lastReceivedAt: Date | null;
  updatedAt: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class StockService {
  // Receive Stock (GRN)
  async receiveStock(data: ReceiveStockData): Promise<StockResponse> {
    const { sku, qty } = data;

    if (qty <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Find product by SKU
    const product = await prisma.product.findUnique({
      where: { sku },
      include: { Stock: true },
    });

    if (!product) {
      throw new Error(`Product with SKU '${sku}' not found`);
    }

    if (!product.active) {
      throw new Error(`Product '${sku}' is not active`);
    }

    // Update or create stock
    const stock = await prisma.stock.upsert({
      where: { productId: product.id },
      update: {
        quantity: { increment: qty },
        receivedTotal: { increment: qty },
        lastReceivedAt: new Date(),
      },
      create: {
        productId: product.id,
        quantity: qty,
        receivedTotal: qty,
        soldTotal: 0,
        lastReceivedAt: new Date(),
      },
      include: {
        product: {
          select: { sku: true, name: true },
        },
      },
    });

    return {
      sku: stock.product.sku,
      productName: stock.product.name,
      quantity: stock.quantity,
      receivedTotal: stock.receivedTotal,
      soldTotal: stock.soldTotal,
      lastReceivedAt: stock.lastReceivedAt,
      updatedAt: stock.updatedAt,
    };
  }

  // View Stock by SKU
  async getStockBySku(sku: string): Promise<StockResponse | null> {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: { Stock: true },
    });

    if (!product) {
      return null;
    }

    if (!product.Stock) {
      // Product exists but no stock record
      return {
        sku: product.sku,
        productName: product.name,
        quantity: 0,
        receivedTotal: 0,
        soldTotal: 0,
        lastReceivedAt: null,
        updatedAt: product.updatedAt,
      };
    }

    return {
      sku: product.sku,
      productName: product.name,
      quantity: product.Stock.quantity,
      receivedTotal: product.Stock.receivedTotal,
      soldTotal: product.Stock.soldTotal,
      lastReceivedAt: product.Stock.lastReceivedAt,
      updatedAt: product.Stock.updatedAt,
    };
  }

  // List All Stocks with Pagination
  async getAllStocks(options: PaginationOptions = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [stocks, totalCount] = await Promise.all([
      prisma.stock.findMany({
        skip,
        take: limit,
        include: {
          product: {
            select: { sku: true, name: true, active: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.stock.count(),
    ]);

    const stocksResponse: StockResponse[] = stocks.map((stock) => ({
      sku: stock.product.sku,
      productName: stock.product.name,
      quantity: stock.quantity,
      receivedTotal: stock.receivedTotal,
      soldTotal: stock.soldTotal,
      lastReceivedAt: stock.lastReceivedAt,
      updatedAt: stock.updatedAt,
    }));

    return {
      stocks: stocksResponse,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Low Stock Alert
  async getLowStockItems(
    threshold: number = 5,
    options: PaginationOptions = {}
  ) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    if (threshold < 0) {
      throw new Error("Threshold must be non-negative");
    }

    const [lowStocks, totalCount] = await Promise.all([
      prisma.stock.findMany({
        where: {
          quantity: { lte: threshold },
          product: { active: true }, // Only active products
        },
        skip,
        take: limit,
        include: {
          product: {
            select: { sku: true, name: true },
          },
        },
        orderBy: { quantity: "asc" }, // Lowest stock first
      }),
      prisma.stock.count({
        where: {
          quantity: { lte: threshold },
          product: { active: true },
        },
      }),
    ]);

    const lowStockResponse: (StockResponse & { alertLevel: string })[] =
      lowStocks.map((stock) => ({
        sku: stock.product.sku,
        productName: stock.product.name,
        quantity: stock.quantity,
        receivedTotal: stock.receivedTotal,
        soldTotal: stock.soldTotal,
        lastReceivedAt: stock.lastReceivedAt,
        updatedAt: stock.updatedAt,
        alertLevel: stock.quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      }));

    return {
      lowStockItems: lowStockResponse,
      threshold,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Check stock availability for multiple items
  async checkStockAvailability(items: { sku: string; qty: number }[]): Promise<{
    available: boolean;
    unavailableItems: { sku: string; requested: number; available: number }[];
  }> {
    const unavailableItems: {
      sku: string;
      requested: number;
      available: number;
    }[] = [];

    for (const item of items) {
      const stock = await this.getStockBySku(item.sku);

      if (!stock) {
        unavailableItems.push({
          sku: item.sku,
          requested: item.qty,
          available: 0,
        });
      } else if (stock.quantity < item.qty) {
        unavailableItems.push({
          sku: item.sku,
          requested: item.qty,
          available: stock.quantity,
        });
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    };
  }

  // Decrease stock (used during billing)
  async decreaseStock(sku: string, qty: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: { Stock: true },
    });

    if (!product || !product.Stock) {
      throw new Error(`Stock not found for product: ${sku}`);
    }

    if (product.Stock.quantity < qty) {
      throw new Error(
        `Insufficient Stock for ${sku}. Available: ${product.Stock.quantity}, Required: ${qty}`
      );
    }

    await prisma.stock.update({
      where: { productId: product.id },
      data: {
        quantity: { decrement: qty },
        soldTotal: { increment: qty },
      },
    });
  }

  // Increase stock (used during invoice cancellation)
  async increaseStock(sku: string, qty: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { sku },
    });

    if (!product) {
      throw new Error(`Product not found: ${sku}`);
    }

    await prisma.stock.upsert({
      where: { productId: product.id },
      update: {
        quantity: { increment: qty },
        soldTotal: { decrement: qty },
      },
      create: {
        productId: product.id,
        quantity: qty,
        receivedTotal: 0,
        soldTotal: 0,
        lastReceivedAt: null,
      },
    });
  }
}

export default new StockService();
