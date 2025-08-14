import StockService from "./stockService";

import { prisma } from "@app";

interface CheckoutItem {
  sku: string;
  qty: number;
}

interface CheckoutData {
  items: CheckoutItem[];
  paymentMethod: string;
}

interface InvoiceResponse {
  id: string;
  invoiceNumber: number;
  subtotal: number;
  grandTotal: number;
  paymentMethod: string;
  idempotencyKey: string;
  newInvoice: boolean;
  status: string;
  createdAt: Date;
  items: {
    sku: string;
    productName: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class BillingService {
  // Get next invoice number
  private async getNextInvoiceNumber(): Promise<number> {
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });

    return lastInvoice ? lastInvoice.invoiceNumber + 1 : 1001;
  }

  // Create Invoice (Checkout)
  async createInvoice(
    data: CheckoutData,
    idempotencyKey: string
  ): Promise<InvoiceResponse> {
    const { items, paymentMethod } = data;

    // Validate inputs
    if (!items || items.length === 0) {
      throw new Error("Invoice must contain at least one item");
    }

    if (!paymentMethod) {
      throw new Error("Payment method is required");
    }

    // Check idempotency
    const existingInvoice = await prisma.invoice.findUnique({
      where: { idempotencyKey },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
      },
    });

    if (existingInvoice) {
      // Return existing invoice
      return this.formatInvoiceResponse(existingInvoice);
    }

    // Validate stock availability
    const stockCheck = await StockService.checkStockAvailability(items);
    if (!stockCheck.available) {
      throw new Error(
        `Insufficient stock for items: ${stockCheck.unavailableItems
          .map(
            (item) =>
              `${item.sku} (need: ${item.requested}, available: ${item.available})`
          )
          .join(", ")}`
      );
    }

    // Start transaction
    return await prisma.$transaction(async (tx) => {
      // Get invoice number
      const invoiceNumber = await this.getNextInvoiceNumber();

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subtotal: 0, // Will be updated after items are created
          grandTotal: 0,
          paymentMethod,
          idempotencyKey,
          status: "paid",
        },
      });

      let subtotal = 0;
      const invoiceItems = [];

      // Process each item
      for (const item of items) {
        // Get product details
        const product = await tx.product.findUnique({
          where: { sku: item.sku },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.sku}`);
        }

        if (!product.active) {
          throw new Error(`Product is not active: ${item.sku}`);
        }

        const lineTotal = product.price * item.qty;
        subtotal += lineTotal;

        // Create invoice item
        const invoiceItem = await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            qty: item.qty,
            unitPrice: product.price,
            lineTotal,
          },
        });

        invoiceItems.push({
          ...invoiceItem,
          product: { sku: product.sku, name: product.name },
        });

        // Decrease stock
        await tx.stock.update({
          where: { productId: product.id },
          data: {
            quantity: { decrement: item.qty },
            soldTotal: { increment: item.qty },
          },
        });
      }

      // Update invoice totals
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          subtotal,
          grandTotal: subtotal, // For now, grandTotal = subtotal (no tax/discount)
        },
        include: {
          items: {
            include: {
              product: { select: { sku: true, name: true } },
            },
          },
        },
      });

      return this.formatInvoiceResponse(updatedInvoice, true);
    });
  }

  // Get Invoice by Number
  async getInvoiceByNumber(
    invoiceNumber: number
  ): Promise<InvoiceResponse | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
      },
    });

    return invoice ? this.formatInvoiceResponse(invoice) : null;
  }

  // List All Invoices (Paginated)
  async getAllInvoices(options: PaginationOptions = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { sku: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count(),
    ]);

    const formattedInvoices = invoices.map((invoice) =>
      this.formatInvoiceResponse(invoice)
    );

    return {
      invoices: formattedInvoices,
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

  // Cancel Invoice
  async cancelInvoice(
    invoiceNumber: number,
    reason?: string
  ): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        items: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new Error(`Invoice #${invoiceNumber} not found`);
    }

    if (invoice.status === "cancelled") {
      throw new Error(`Invoice #${invoiceNumber} is already cancelled`);
    }

    if (invoice.status !== "paid") {
      throw new Error(
        `Can only cancel paid invoices. Current status: ${invoice.status}`
      );
    }

    // Start transaction to cancel invoice and restore stock
    return await prisma.$transaction(async (tx) => {
      // Restore stock for each item
      for (const item of invoice.items) {
        await tx.stock.update({
          where: { productId: item.productId },
          data: {
            quantity: { increment: item.qty },
            soldTotal: { decrement: item.qty },
          },
        });
      }

      // Mark invoice as cancelled
      const cancelledInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "cancelled",
          // Optionally store cancellation reason in a separate field or audit log
        },
        include: {
          items: {
            include: {
              product: { select: { sku: true, name: true } },
            },
          },
        },
      });

      return this.formatInvoiceResponse(cancelledInvoice);
    });
  }

  // Get Invoice Statistics
  async getInvoiceStats(fromDate?: Date, toDate?: Date) {
    const dateFilter =
      fromDate && toDate
        ? {
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          }
        : {};

    const [totalInvoices, totalRevenue, cancelledInvoices] = await Promise.all([
      prisma.invoice.count({
        where: {
          status: "paid",
          ...dateFilter,
        },
      }),
      prisma.invoice.aggregate({
        where: {
          status: "paid",
          ...dateFilter,
        },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.count({
        where: {
          status: "cancelled",
          ...dateFilter,
        },
      }),
    ]);

    return {
      totalInvoices,
      totalRevenue: Number(totalRevenue._sum.grandTotal) || 0,
      cancelledInvoices,
      period: fromDate && toDate ? { from: fromDate, to: toDate } : "all_time",
    };
  }

  // Helper method to format invoice response
  private formatInvoiceResponse(
    invoice: any,
    newInvoice: boolean = false
  ): InvoiceResponse {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: Number(invoice.subtotal),
      grandTotal: Number(invoice.grandTotal),
      paymentMethod: invoice.paymentMethod,
      idempotencyKey: invoice.idempotencyKey,
      newInvoice,
      status: invoice.status,
      createdAt: invoice.createdAt,
      items: invoice.items.map((item: any) => ({
        sku: item.sku,
        productName: item.productName,
        qty: item.qty,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }
}

export default new BillingService();
