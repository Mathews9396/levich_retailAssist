import {
  PrismaClient,
  ProductType,
  ProductBrand,
  WeightUnit,
} from "../generated/prisma";
import { generateUniqueSKU, formatWeight } from "../src/utils/skuGenerator";

const prisma = new PrismaClient();

// Product data with structured information
const productDataLess = [
  {
    name: "Parle-G Gold Biscuits",
    productType: ProductType.BISCUIT,
    brand: ProductBrand.PARLE,
    weight: 800,
    weightUnit: WeightUnit.GRAM,
    price: 100.0,
    active: true,
    initialStock: 50,
  },
];

const productData = [
  {
    name: "Parle-G Gold Biscuits",
    productType: ProductType.BISCUIT,
    brand: ProductBrand.PARLE,
    weight: 800,
    weightUnit: WeightUnit.GRAM,
    price: 100.0,
    active: true,
    initialStock: 50,
  },
  {
    name: "Tata Sugar",
    productType: ProductType.SUGAR,
    brand: ProductBrand.TATA,
    weight: 1,
    weightUnit: WeightUnit.KILOGRAM,
    price: 50.0,
    active: true,
    initialStock: 100,
  },
  {
    name: "Tata Salt",
    productType: ProductType.SALT,
    brand: ProductBrand.TATA,
    weight: 1,
    weightUnit: WeightUnit.KILOGRAM,
    price: 25.0,
    active: true,
    initialStock: 75,
  },
  {
    name: "Maggi 2-Minute Noodles",
    productType: ProductType.NOODLES,
    brand: ProductBrand.MAGGI,
    weight: 70,
    weightUnit: WeightUnit.GRAM,
    price: 15.0,
    active: true,
    initialStock: 200,
  },
  {
    name: "Britannia Bread",
    productType: ProductType.BREAD,
    brand: ProductBrand.BRITANNIA,
    weight: 400,
    weightUnit: WeightUnit.GRAM,
    price: 35.0,
    active: false,
    initialStock: 0,
  },
  {
    name: "Fortune Sunflower Oil",
    productType: ProductType.OIL,
    brand: ProductBrand.FORTUNE,
    weight: 1,
    weightUnit: WeightUnit.LITER,
    price: 120.0,
    active: true,
    initialStock: 30,
  },
  {
    name: "Aashirvaad Atta",
    productType: ProductType.FLOUR,
    brand: ProductBrand.AASHIRVAAD,
    weight: 5,
    weightUnit: WeightUnit.KILOGRAM,
    price: 280.0,
    active: true,
    initialStock: 25,
  },
  {
    name: "Everest Red Chili Powder",
    productType: ProductType.SPICE,
    brand: ProductBrand.EVEREST,
    weight: 100,
    weightUnit: WeightUnit.GRAM,
    price: 45.0,
    active: true,
    initialStock: 80,
  },
  {
    name: "Amul Fresh Milk",
    productType: ProductType.DAIRY,
    brand: ProductBrand.AMUL,
    weight: 500,
    weightUnit: WeightUnit.MILLILITER,
    price: 28.0,
    active: true,
    initialStock: 60,
  },
  {
    name: "Patanjali Basmati Rice",
    productType: ProductType.RICE,
    brand: ProductBrand.PATANJALI,
    weight: 1,
    weightUnit: WeightUnit.KILOGRAM,
    price: 85.0,
    active: true,
    initialStock: 40,
  },
];

async function checkSKUUniqueness(sku: string): Promise<boolean> {
  const existing = await prisma.product.findUnique({
    where: { sku },
  });
  return !existing;
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data in correct order (due to foreign keys)
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  console.log("🗑️  Cleared existing data");

  console.log("\n📦 Creating products with generated SKUs...");

  const createdProducts: any[] = [];

  // Create products with stocks
  for (const productInfo of productData) {
    try {
      // Generate unique SKU
      const sku = await generateUniqueSKU(
        {
          productType: productInfo.productType,
          brand: productInfo.brand,
          weight: productInfo.weight,
          weightUnit: productInfo.weightUnit,
        },
        checkSKUUniqueness
      );

      // Create product
      const product = await prisma.product.create({
        data: {
          sku,
          name: productInfo.name,
          productType: productInfo.productType,
          brand: productInfo.brand,
          weight: productInfo.weight,
          weightUnit: productInfo.weightUnit,
          price: productInfo.price,
          active: productInfo.active,
        },
      });

      console.log(product);

      // Create stock for the product
      const stock = await prisma.stock.create({
        data: {
          productId: product.id,
          quantity: productInfo.initialStock,
          receivedTotal: productInfo.initialStock,
          soldTotal: 0,
          lastReceivedAt: new Date(),
        },
      });

      createdProducts.push({ ...product, stock });

      const weightDisplay = formatWeight(
        productInfo.weight,
        productInfo.weightUnit
      );
      console.log(
        `✅ ${sku} — "${product.name}" — ${weightDisplay} — ₹${product.price} — Stock: ${productInfo.initialStock}`
      );
    } catch (error) {
      console.error(`❌ Failed to create product: ${productInfo.name}`, error);
    }
  }

  console.log("\n🧾 Creating sample invoices...");

  // Sample Invoice 1
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 1001,
      subtotal: 0, // Will be calculated
      grandTotal: 0, // Will be calculated
      paymentMethod: "cash",
      idempotencyKey: "invoice-001-" + Date.now(),
      status: "paid",
    },
  });

  // Invoice 1 Items
  const invoice1Items = [
    { productIndex: 0, qty: 2 }, // Parle-G: 2 × 100 = 200
    { productIndex: 1, qty: 1 }, // Sugar: 1 × 50 = 50
    { productIndex: 3, qty: 5 }, // Maggi: 5 × 15 = 75
  ];

  let invoice1Subtotal = 0;

  for (const item of invoice1Items) {
    const product = createdProducts[item.productIndex];
    const lineTotal = product.price * item.qty;
    invoice1Subtotal += lineTotal;

    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        lineTotal: lineTotal,
      },
    });

    // Update stock
    await prisma.stock.update({
      where: { productId: product.id },
      data: {
        quantity: { decrement: item.qty },
        soldTotal: { increment: item.qty },
      },
    });
  }

  // Update invoice totals
  await prisma.invoice.update({
    where: { id: invoice1.id },
    data: {
      subtotal: invoice1Subtotal,
      grandTotal: invoice1Subtotal, // No tax for now
    },
  });

  console.log(
    `✅ Invoice #1001 created — ₹${invoice1Subtotal} — ${invoice1Items.length} items`
  );

  // Sample Invoice 2
  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 1002,
      subtotal: 0,
      grandTotal: 0,
      paymentMethod: "upi",
      idempotencyKey: "invoice-002-" + Date.now(),
      status: "paid",
    },
  });

  // Invoice 2 Items
  const invoice2Items = [
    { productIndex: 2, qty: 3 }, // Salt: 3 × 25 = 75
    { productIndex: 5, qty: 1 }, // Oil: 1 × 120 = 120
    { productIndex: 7, qty: 2 }, // Spice: 2 × 45 = 90
    { productIndex: 8, qty: 4 }, // Milk: 4 × 28 = 112
  ];

  let invoice2Subtotal = 0;

  for (const item of invoice2Items) {
    const product = createdProducts[item.productIndex];
    const lineTotal = product.price * item.qty;
    invoice2Subtotal += lineTotal;

    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice2.id,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        lineTotal: lineTotal,
      },
    });

    // Update stock
    await prisma.stock.update({
      where: { productId: product.id },
      data: {
        quantity: { decrement: item.qty },
        soldTotal: { increment: item.qty },
      },
    });
  }

  // Update invoice totals
  await prisma.invoice.update({
    where: { id: invoice2.id },
    data: {
      subtotal: invoice2Subtotal,
      grandTotal: invoice2Subtotal,
    },
  });

  console.log(
    `✅ Invoice #1002 created — ₹${invoice2Subtotal} — ${invoice2Items.length} items`
  );

  // Display final summary
  const totalProducts = await prisma.product.count();
  const totalStocks = await prisma.stock.count();
  const totalInvoices = await prisma.invoice.count();
  const totalInvoiceItems = await prisma.invoiceItem.count();

  console.log(`\n📊 Database Summary:`);
  console.log(`   Products: ${totalProducts}`);
  console.log(`   Stocks: ${totalStocks}`);
  console.log(`   Invoices: ${totalInvoices}`);
  console.log(`   Invoice Items: ${totalInvoiceItems}`);

  // Show updated stock levels
  console.log(`\n📦 Current Stock Levels:`);
  const stockLevels = await prisma.stock.findMany({
    include: {
      product: {
        select: { sku: true, name: true },
      },
    },
    orderBy: {
      product: { sku: "asc" },
    },
  });

  stockLevels.forEach((stock) => {
    console.log(
      `   ${stock.product.sku}: ${stock.quantity} units (sold: ${stock.soldTotal})`
    );
  });

  console.log("\n✅ Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
