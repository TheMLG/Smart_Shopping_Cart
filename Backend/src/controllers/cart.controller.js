import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Get cart by cartId
export const getCartByCartId = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ApiError(400, 'Cart ID is required');
  }

  const cart = await Cart.findOne({ cartId });

  // If cart doesn't exist, return error
  if (!cart) {
    throw new ApiError(404, 'Cart not found. Please scan a valid QR code or contact admin.');
  }

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart fetched successfully')
  );
});

// Add item to cart
export const addItemToCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;
  const { productId, name, price, quantity } = req.body;

  if (!cartId || !productId || !name || !price) {
    throw new ApiError(400, 'Missing required fields');
  }

  let cart = await Cart.findOne({ cartId });

  // If cart doesn't exist, return error (cart must be created by admin first)
  if (!cart) {
    throw new ApiError(404, 'Cart not found. Cart must be created by admin first.');
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    cart.items[existingItemIndex].quantity += quantity || 1;
  } else {
    // Add new item
    cart.items.push({
      productId,
      name,
      price,
      quantity: quantity || 1,
    });
  }

  // Update total amount
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  await cart.save();

  res.status(200).json(
    new ApiResponse(200, cart, 'Item added to cart successfully')
  );
});

// Update item quantity in cart
export const updateCartItem = asyncHandler(async (req, res) => {
  const { cartId, productId } = req.params;
  const { quantity } = req.body;

  if (!cartId || !productId || quantity === undefined) {
    throw new ApiError(400, 'Missing required fields');
  }

  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart');
  }

  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cart.items.splice(itemIndex, 1);
  } else {
    // Update quantity
    cart.items[itemIndex].quantity = quantity;
  }

  // Update total amount
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  await cart.save();

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart updated successfully')
  );
});

// Remove item from cart
export const removeCartItem = asyncHandler(async (req, res) => {
  const { cartId, productId } = req.params;

  if (!cartId || !productId) {
    throw new ApiError(400, 'Cart ID and Product ID are required');
  }

  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = cart.items.filter((item) => item.productId !== productId);

  // Update total amount
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  await cart.save();

  res.status(200).json(
    new ApiResponse(200, cart, 'Item removed from cart successfully')
  );
});

// Clear cart
export const clearCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ApiError(400, 'Cart ID is required');
  }

  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = [];
  cart.totalAmount = 0;
  cart.status = 'active';
  await cart.save();

  res.status(200).json(
    new ApiResponse(200, cart, 'Cart cleared successfully')
  );
});

// Create a new cart (admin only)
export const createCart = asyncHandler(async (req, res) => {
  const { cartId } = req.body;

  if (!cartId) {
    throw new ApiError(400, 'Cart ID is required');
  }

  // Check if cart already exists
  const existingCart = await Cart.findOne({ cartId });
  if (existingCart) {
    throw new ApiError(400, 'Cart with this ID already exists');
  }

  // Create new cart
  const cart = await Cart.create({
    cartId,
    items: [],
    totalAmount: 0,
    status: 'active',
  });

  res.status(201).json(
    new ApiResponse(201, cart, 'Cart created successfully')
  );
});

// Get all carts (admin only)
export const getAllCarts = asyncHandler(async (req, res) => {
  const carts = await Cart.find()
    .select('cartId status totalAmount createdAt updatedAt')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, carts, 'All carts fetched successfully')
  );
});

// Delete a cart by cartId (admin only)
export const deleteCart = asyncHandler(async (req, res) => {
  const { cartId } = req.params;

  if (!cartId) {
    throw new ApiError(400, 'Cart ID is required');
  }

  const cart = await Cart.findOneAndDelete({ cartId });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'Cart deleted successfully')
  );
});
