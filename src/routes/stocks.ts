import { Router } from "express";
import StockService from "../services/stockService";

const router = Router();

// GET /stocks - List All Stocks (Paginated)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: "page and limit must be positive integers",
      });
    }

    const result = await StockService.getAllStocks({ page, limit });

    res.json({
      success: true,
      data: result.stocks,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({
      error: "Failed to fetch stocks",
      details: error,
    });
  }
});

// POST /stocks/receive - Receive Stock (GRN)
router.post("/receive", async (req, res) => {
  try {
    const { sku, qty } = req.body;

    // Validation
    if (!sku || !qty) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "sku and qty are required",
      });
    }

    if (typeof qty !== "number" || qty <= 0) {
      return res.status(400).json({
        error: "Invalid quantity",
        details: "qty must be a positive number",
      });
    }

    const stock = await StockService.receiveStock({ sku, qty });

    res.status(200).json({
      success: true,
      message: `Successfully received ${qty} units of ${sku}`,
      data: stock,
    });
  } catch (error) {
    console.error("Error receiving stock:", error);
   
    res.status(500).json({
      error: "Failed to receive stock",
      details: error,
    });
  }
});

// GET /stocks/low?threshold=5 - Low Stock Alert
router.get("/low", async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (threshold < 0) {
      return res.status(400).json({
        error: "Invalid threshold",
        details: "threshold must be non-negative",
      });
    }

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        error: "Invalid pagination parameters",
        details: "page and limit must be positive integers",
      });
    }

    const result = await StockService.getLowStockItems(threshold, {
      page,
      limit,
    });

    res.json({
      success: true,
      message: `Found ${result.lowStockItems.length} items with stock <= ${threshold}`,
      data: result.lowStockItems,
      threshold: result.threshold,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    res.status(500).json({
      error: "Failed to fetch low stock items",
      details: error,
    });
  }
});

// GET /stocks/check/availability - Check Stock Availability (for bulk items)
router.post("/check/availability", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Invalid items array",
        details: "items must be a non-empty array of {sku, qty} objects",
      });
    }

    // Validate each item
    for (const item of items) {
      if (
        !item.sku ||
        !item.qty ||
        typeof item.qty !== "number" ||
        item.qty <= 0
      ) {
        return res.status(400).json({
          error: "Invalid item format",
          details: "Each item must have sku (string) and qty (positive number)",
        });
      }
    }

    const result = await StockService.checkStockAvailability(items);

    res.json({
      success: true,
      available: result.available,
      unavailableItems: result.unavailableItems,
      message: result.available
        ? "All items are available"
        : `${result.unavailableItems.length} items have insufficient stock`,
    });
  } catch (error) {
    console.error("Error checking stock availability:", error);
    res.status(500).json({
      error: "Failed to check stock availability",
      details: error,
    });
  }
});

// GET /stocks/:sku - View Stock by SKU
router.get("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku) {
      return res.status(400).json({
        error: "SKU parameter is required",
      });
    }

    const stock = await StockService.getStockBySku(sku);

    if (!stock) {
      return res.status(404).json({
        error: `Product with SKU '${sku}' not found`,
      });
    }

    res.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    res.status(500).json({
      error: "Failed to fetch stock details",
      details: error,
    });
  }
});

export default router;
