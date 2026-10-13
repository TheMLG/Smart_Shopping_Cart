import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Handle NFC scan from ESP device
export const handleNFCScan = asyncHandler(async (req, res) => {
  const { cartId, nfcId } = req.body;

  console.log('\n========== NFC SCAN API HIT ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request Body:', { cartId, nfcId });
  console.log('IP Address:', req.ip || req.socket.remoteAddress);

  // Validate input
  if (!cartId || !nfcId) {
    console.log('❌ Validation Error: Missing cartId or nfcId');
    throw new ApiError(400, 'cartId and nfcId are required');
  }

  // Find the cart
  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    console.log('❌ Cart not found:', cartId);
    throw new ApiError(404, 'Cart not found');
  }

  console.log('✅ Cart found:', { cartId: cart.cartId, status: cart.status, itemCount: cart.items.length, totalAmount: cart.totalAmount });

  // Check if cart is already checked out
  if (cart.status === 'checkedout') {
    console.log('❌ Cart already checked out');
    throw new ApiError(400, 'Cannot add items to a checked out cart');
  }

  // Find the product by NFC tag ID
  const product = await Product.findOne({ nfcTagId: nfcId });

  if (!product) {
    console.log('❌ Product not found for NFC tag:', nfcId);
    throw new ApiError(404, 'Product not found for this NFC tag');
  }

  console.log('✅ Product found:', { productId: product.productId, name: product.name, price: product.price, stock: product.stock, nfcTagId: product.nfcTagId });

  // Check if product already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId === product.productId
  );

  if (existingItemIndex > -1) {
    // A second scan toggles the product out of the cart.
    cart.items.splice(existingItemIndex, 1);
    console.log('🗑️ Removed existing item from cart:', { productId: product.productId });
  } else {
    // Stock is only required when adding a new product.
    if (product.stock <= 0) {
      console.log('❌ Product out of stock');
      throw new ApiError(400, 'Product is out of stock');
    }

    // Add new product to cart
    cart.items.push({
      productId: product.productId,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image || '',
    });
    console.log('✨ Added new item to cart:', { productId: product.productId, name: product.name, price: product.price });
  }

  // Recalculate total amount
  const oldTotal = cart.totalAmount;
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  console.log('💰 Total amount updated:', { oldTotal, newTotal: cart.totalAmount });

  // Save the cart
  await cart.save();
  console.log('💾 Cart saved successfully');

  const responseData = {
    cart,
    addedProduct: {
      productId: product.productId,
      name: product.name,
      price: product.price,
      nfcTagId: product.nfcTagId,
    },
  };

  console.log('✅ Response sent:', { success: true, itemsInCart: cart.items.length, totalAmount: cart.totalAmount });
  console.log('======================================\n');

  res.status(200).json(
    new ApiResponse(
      200,
      responseData,
      existingItemIndex > -1
        ? 'Product removed from cart successfully'
        : 'Product added to cart successfully'
    )
  );
});

// Remove item from cart via NFC (optional feature)
export const removeNFCItem = asyncHandler(async (req, res) => {
  const { cartId, nfcId } = req.body;

  console.log('\n========== NFC REMOVE API HIT ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request Body:', { cartId, nfcId });

  // Validate input
  if (!cartId || !nfcId) {
    console.log('❌ Validation Error: Missing cartId or nfcId');
    throw new ApiError(400, 'cartId and nfcId are required');
  }

  // Find the cart
  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    console.log('❌ Cart not found:', cartId);
    throw new ApiError(404, 'Cart not found');
  }

  console.log('✅ Cart found:', { cartId: cart.cartId, itemCount: cart.items.length });

  // Check if cart is already checked out
  if (cart.status === 'checkedout') {
    console.log('❌ Cart already checked out');
    throw new ApiError(400, 'Cannot modify a checked out cart');
  }

  // Find the product by NFC tag ID
  const product = await Product.findOne({ nfcTagId: nfcId });

  if (!product) {
    console.log('❌ Product not found for NFC tag:', nfcId);
    throw new ApiError(404, 'Product not found for this NFC tag');
  }

  console.log('✅ Product found:', { productId: product.productId, name: product.name });

  // Find and remove/decrement the item in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId === product.productId
  );

  if (existingItemIndex === -1) {
    console.log('❌ Product not found in cart');
    throw new ApiError(404, 'Product not found in cart');
  }

  if (cart.items[existingItemIndex].quantity > 1) {
    // Decrement quantity
    const oldQuantity = cart.items[existingItemIndex].quantity;
    cart.items[existingItemIndex].quantity -= 1;
    console.log('➖ Decremented quantity:', { productId: product.productId, oldQuantity, newQuantity: cart.items[existingItemIndex].quantity });
  } else {
    // Remove item from cart
    cart.items.splice(existingItemIndex, 1);
    console.log('🗑️ Removed item from cart:', { productId: product.productId });
  }

  // Recalculate total amount
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  console.log('💰 Total amount updated:', cart.totalAmount);

  // Save the cart
  await cart.save();
  console.log('💾 Cart saved successfully');
  console.log('======================================\n');

  res.status(200).json(
    new ApiResponse(200, cart, 'Product removed/decremented from cart successfully')
  );
});

// Get product info by NFC ID (for ESP to verify scan)
export const getProductByNFC = asyncHandler(async (req, res) => {
  const { nfcId } = req.params;

  console.log('\n========== NFC PRODUCT INFO API HIT ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('NFC ID:', nfcId);

  if (!nfcId) {
    console.log('❌ Validation Error: Missing nfcId');
    throw new ApiError(400, 'nfcId is required');
  }

  const product = await Product.findOne({ nfcTagId: nfcId });

  if (!product) {
    console.log('❌ Product not found for NFC tag:', nfcId);
    throw new ApiError(404, 'Product not found for this NFC tag');
  }

  console.log('✅ Product found:', { productId: product.productId, name: product.name, price: product.price, stock: product.stock });
  console.log('======================================\n');

  res.status(200).json(
    new ApiResponse(200, product, 'Product fetched successfully')
  );
});
