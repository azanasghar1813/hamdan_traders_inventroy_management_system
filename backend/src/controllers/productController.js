const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: 'i',
          },
        }
      : {};

    const products = await Product.find({ ...keyword, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const { name, unit, purchasePrice, salePrice, minimumStock, expiryDate, openingStock = 0 } = req.body;
    const initialStock = Math.max(0, Number(openingStock) || 0);

    const product = await Product.create({
      name,
      unit,
      purchasePrice,
      salePrice,
      minimumStock,
      expiryDate,
      currentStock: initialStock
    });

    if (initialStock > 0) {
      try {
        await StockMovement.create({
          productId: product._id,
          type: 'ADJUSTMENT',
          quantity: initialStock,
          reason: 'Initial Opening Stock'
        });
      } catch (smErr) {
        console.error('Failed to log opening stock movement:', smErr);
      }
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const fieldsToUpdate = ['name', 'unit', 'purchasePrice', 'salePrice', 'minimumStock', 'expiryDate', 'isActive'];
    
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updatedProduct = await product.save();
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a product (Soft delete)
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    product.isDeleted = true;
    await product.save();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
