import { Router, Request, Response, NextFunction } from "express";
import BillingService from "@/services/billingService";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Async handler wrapper
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error handler middleware for this router
const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Billing API Error:", error);
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";

  // Handle specific error types
  if (
    errorMessage.includes("Insufficient stock") ||
    errorMessage.includes("not found") ||
    errorMessage.includes("not active")
  ) {
    return res.status(400).json({
      error: "Operation failed",
      details: errorMessage,
    });
  }

  if (
    errorMessage.includes("already cancelled") ||
    errorMessage.includes("Can only cancel")
  ) {
    return res.status(400).json({
      error: "Cannot perform operation",
      details: errorMessage,
    });
  }

  // Default server error
  res.status(500).json({
    error: "Internal server error",
    details: errorMessage,
  });
};

// POST /billing/checkout - Create Invoice (Checkout)
router.post(
  "/checkout",
  asyncHandler(async (req: Request, res: Response) => {
    const { items, paymentMethod } = req.body;
    const idempotencyKey =
      (req.headers["idempotency-key"] as string) || uuidv4();
    console.log(`idempotencyKey - ${idempotencyKey}`);

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Invalid items",
        details: "items must be a non-empty array of {sku, qty} objects",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        error: "Missing payment method",
        details: "paymentMethod is required (cash, card, upi, etc.)",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.sku || typeof item.sku !== "string") {
        return res.status(400).json({
          error: "Invalid item format",
          details: "Each item must have sku (string)",
        });
      }

      if (!item.qty || typeof item.qty !== "number" || item.qty <= 0) {
        return res.status(400).json({
          error: "Invalid item format",
          details: "Each item must have qty (positive number)",
        });
      }
    }

    const invoice = await BillingService.createInvoice(
      { items, paymentMethod },
      idempotencyKey
    );
    const invoiceStatus = invoice.newInvoice ? "created" : "fecthed";
    const httpStatus = invoice.newInvoice ? 201 : 200;
    res.status(httpStatus).json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} ${invoiceStatus} successfully`,
      data: invoice,
    });
  })
);

// GET /billing/invoices/:invoice_no - Get Invoice by Number
router.get(
  "/invoices/:invoice_no",
  asyncHandler(async (req: Request, res: Response) => {
    const invoiceNumber = parseInt(req.params.invoice_no);

    if (isNaN(invoiceNumber)) {
      return res.status(400).json({
        error: "Invalid invoice number",
        details: "invoice_no must be a valid number",
      });
    }

    const invoice = await BillingService.getInvoiceByNumber(invoiceNumber);

    if (!invoice) {
      return res.status(404).json({
        error: `Invoice #${invoiceNumber} not found`,
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  })
);

// GET /billing/invoices - List All Invoices (Paginated)
router.get(
  "/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: "page and limit must be positive integers",
      });
    }

    const result = await BillingService.getAllInvoices({ page, limit });

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  })
);

// POST /billing/invoices/:invoice_no/cancel - Cancel Invoice
router.post(
  "/invoices/:invoice_no/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    const invoiceNumber = parseInt(req.params.invoice_no);
    const { reason } = req.body;

    if (isNaN(invoiceNumber)) {
      return res.status(400).json({
        error: "Invalid invoice number",
        details: "invoice_no must be a valid number",
      });
    }

    const cancelledInvoice = await BillingService.cancelInvoice(
      invoiceNumber,
      reason
    );

    res.json({
      success: true,
      message: `Invoice #${invoiceNumber} cancelled successfully`,
      data: cancelledInvoice,
    });
  })
);

// GET /billing/stats - Get Invoice Statistics
router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const fromDate = req.query.from_date
      ? new Date(req.query.from_date as string)
      : undefined;
    const toDate = req.query.to_date
      ? new Date(req.query.to_date as string)
      : undefined;

    // Validate dates
    if (fromDate && isNaN(fromDate.getTime())) {
      return res.status(400).json({
        error: "Invalid from_date",
        details: "from_date must be a valid date (YYYY-MM-DD or ISO format)",
      });
    }

    if (toDate && isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: "Invalid to_date",
        details: "to_date must be a valid date (YYYY-MM-DD or ISO format)",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        error: "Invalid date range",
        details: "from_date must be before or equal to to_date",
      });
    }

    const stats = await BillingService.getInvoiceStats(fromDate, toDate);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Apply error handler to this router
router.use(errorHandler);

export default router;
