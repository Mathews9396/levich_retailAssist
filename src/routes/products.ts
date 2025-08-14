import { Router } from 'express';
import { ProductType, ProductBrand } from '../../generated/prisma';
import ProductService from  '../services/productService';

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await ProductService.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get active products
router.get('/active', async (req, res) => {
  try {
    const products = await ProductService.getActiveProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active products' });
  }
});

// Get product by SKU
router.get('/:sku', async (req, res) => {
  try {
    const product = await ProductService.getProductBySKU(req.params.sku);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const { name, productType, brand, weightString, price, active } = req.body;
    
    const product = await ProductService.createProductFromInput({
      name,
      productType: productType as ProductType,
      brand: brand as ProductBrand,
      weightString,
      price: parseFloat(price),
      active,
    });
    
    res.status(201).json(product);
  } catch (error) {
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message: string }).message
      : 'An error occurred';
    res.status(400).json({ error: errorMessage });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const products = await ProductService.searchProducts(req.params.query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' });
  }
});

export default router;