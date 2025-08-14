import request from "supertest";
import { app } from "../src/app";
import { Server } from "http";
import { productData } from "./testData.skip";

describe("Retail Assist API - Products", () => {
  let server: Server;

  // Setup server before tests
  beforeAll(async () => {
    server = app.listen(3003); // Use random available port
    // Wipe all data before each test
    // await prisma.$executeRawUnsafe(
    //   `TRUNCATE TABLE products RESTART IDENTITY CASCADE`
    // );
    // await prisma.$executeRawUnsafe(
    //   `TRUNCATE TABLE stocks RESTART IDENTITY CASCADE`
    // );
  });

  // Close server after tests
  afterAll((done) => {
    server.close(done);
  });

  describe("Fetch all products", () => {
    it("should return empty product list initially", async () => {
      const response = await request(app)
        .get("/api/products")
        .set({ "auth-token": process.env.AUTHTOKEN })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
  let newProductSKU: any;
  describe("Create new product", () => {
    it("should create a new product", async () => {
      const newProduct = {
        name: "New Biscuit",
        productType: "BISCUIT",
        brand: "PARLE",
        weightString: "500g",
        price: 75,
      };

      const response = await request(app)
        .post("/api/products")
        .set({ "auth-token": process.env.AUTHTOKEN })
        .send(newProduct)
        .expect(201);
      newProductSKU = response.body.sku;
      expect(response.body).toEqual({
        id: expect.any(Number),
        sku: expect.any(String),
        name: "New Biscuit",
        price: 75,
        active: true,
        productType: "BISCUIT",
        brand: "PARLE",
        weight: 500,
        weightUnit: "GRAM",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        weightDisplay: "500g",
        stock: {
          quantity: 0,
          soldTotal: 0,
        },
      });
    });
  });

  describe("Search for a stock", () => {
    it("should return matching products for the search term", async () => {
      const searchTerm = newProductSKU;

      const response = await request(app)
        .get(`/api/products/search/${searchTerm}`)
        .set({ "auth-token": process.env.AUTHTOKEN })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);

      // Check the first product's shape
      expect(response.body[0]).toEqual({
        id: expect.any(Number),
        sku: expect.stringContaining(newProductSKU),
        name: expect.any(String),
        price: expect.any(Number),
        active: expect.any(Boolean),
        productType: expect.any(String),
        brand: expect.any(String),
        weight: expect.any(Number),
        weightUnit: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        Stock: {
          id: expect.any(Number),
          productId: expect.any(Number),
          quantity: expect.any(Number),
          receivedTotal: expect.any(Number),
          soldTotal: expect.any(Number),
          lastReceivedAt: null,
          updatedAt: expect.any(String),
        },
        weightDisplay: expect.any(String),
        stock: {
          quantity: expect.any(Number),
          soldTotal: expect.any(Number),
        },
      });
    });
  });

  let stockQuantity = 100;
  describe("Adding stock", () => {
    it("should receive stock successfully", async () => {
      const requestBody = {
        sku: newProductSKU,
        qty: stockQuantity,
      };

      const response = await request(app)
        .post("/api/stocks/receive")
        .set({ "auth-token": process.env.AUTHTOKEN })
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: `Successfully received ${requestBody.qty} units of ${requestBody.sku}`,
        data: {
          sku: requestBody.sku,
          productName: expect.any(String),
          quantity: 100,
          receivedTotal: expect.any(Number),
          soldTotal: expect.any(Number),
          lastReceivedAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });
  });

  let idempotencyKey: string;
  describe("Checkout, Idempotency, & change in stock", () => {
    let checkoutQty = 10;
    it("should create an invoice successfully", async () => {
      const requestBody = {
        items: [{ sku: newProductSKU, qty: checkoutQty }],
        paymentMethod: "cash",
      };

      const response = await request(app)
        .post("/api/billing/checkout")
        .set({ "auth-token": process.env.AUTHTOKEN })
        .send(requestBody)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringMatching(/^Invoice #\d+ created successfully$/),
        data: {
          id: expect.any(String),
          invoiceNumber: expect.any(Number),
          subtotal: expect.any(Number),
          grandTotal: expect.any(Number),
          paymentMethod: requestBody.paymentMethod,
          idempotencyKey: expect.any(String),
          newInvoice: true,
          status: "paid",
          createdAt: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              sku: expect.any(String),
              productName: expect.any(String),
              qty: expect.any(Number),
              unitPrice: expect.any(Number),
              lineTotal: expect.any(Number),
            }),
          ]),
        },
      });
      idempotencyKey = response.body.data.idempotencyKey;
    });
    console.log(`idempotencyKey - ${idempotencyKey}`);

    it("should fetch a invoice successfully, should not create new one", async () => {
      const requestBody = {
        items: [{ sku: newProductSKU, qty: 2 }],
        paymentMethod: "cash",
      };

      const response = await request(app)
        .post("/api/billing/checkout")
        .set({ "auth-token": process.env.AUTHTOKEN })
        .set({ "idempotency-key": idempotencyKey })
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringMatching(/^Invoice #\d+ fetched successfully$/),
        data: {
          id: expect.any(String),
          invoiceNumber: expect.any(Number),
          subtotal: expect.any(Number),
          grandTotal: expect.any(Number),
          paymentMethod: requestBody.paymentMethod,
          idempotencyKey: expect.any(String),
          newInvoice: false,
          status: "paid",
          createdAt: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              sku: expect.any(String),
              productName: expect.any(String),
              qty: expect.any(Number),
              unitPrice: expect.any(Number),
              lineTotal: expect.any(Number),
            }),
          ]),
        },
      });
    });

    it("should confirm stock has reduced", async () => {
      const searchTerm = newProductSKU;

      const response = await request(app)
        .get(`/api/products/search/${searchTerm}`)
        .set({ "auth-token": process.env.AUTHTOKEN })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);

      // Check the first product's shape
      expect(response.body[0]).toEqual({
        id: expect.any(Number),
        sku: expect.stringContaining(newProductSKU),
        name: expect.any(String),
        price: expect.any(Number),
        active: expect.any(Boolean),
        productType: expect.any(String),
        brand: expect.any(String),
        weight: expect.any(Number),
        weightUnit: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        Stock: {
          id: expect.any(Number),
          productId: expect.any(Number),
          quantity: stockQuantity - checkoutQty,
          receivedTotal: expect.any(Number),
          soldTotal: expect.any(Number),
          lastReceivedAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        weightDisplay: expect.any(String),
        stock: {
          quantity: expect.any(Number),
          soldTotal: expect.any(Number),
        },
      });
    });
  });
});
