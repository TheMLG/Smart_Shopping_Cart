import Order from '../models/Order.model.js';
import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateBillPDF } from '../utils/pdfGenerator.js';
import { TAX_RATE } from '../utils/constants.js';

const restoreProductStock = async (items) => {
  for (const item of items) {
    await Product.findOneAndUpdate(
      { productId: item.productId },
      { $inc: { stock: item.quantity } }
    );
  }
};

const reserveProductStock = async (items) => {
  const reservedItems = [];

  try {
    for (const item of items) {
      if (!item?.productId || !item?.quantity || item.quantity <= 0) {
        throw new ApiError(400, 'Invalid order item in cart');
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { productId: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new ApiError(
          400,
          `Insufficient stock for product ${item.name || item.productId}`
        );
      }

      reservedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    return reservedItems;
  } catch (error) {
    if (reservedItems.length > 0) {
      await restoreProductStock(reservedItems);
    }

    throw error;
  }
};

// Create order from cart
export const createOrder = asyncHandler(async (req, res) => {
  const { cartId, customerInfo, paymentInfo, notes } = req.body;

  if (!cartId || !customerInfo || !paymentInfo) {
    throw new ApiError(400, 'Missing required fields');
  }

  // Find the cart
  const cart = await Cart.findOne({ cartId });

  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  if (cart.items.length === 0) {
    throw new ApiError(400, 'Cannot create order from empty cart');
  }

  let reservedItems = [];
  let createdOrder = null;

  try {
    reservedItems = await reserveProductStock(cart.items);

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate subtotal, tax, and total
    const subtotal = cart.totalAmount; // Cart stores subtotal
    const tax = subtotal * TAX_RATE;
    const totalAmount = subtotal + tax;

    // Create order
    createdOrder = await Order.create({
      orderId,
      cartId,
      items: cart.items,
      subtotal,
      tax,
      totalAmount,
      customerInfo,
      paymentInfo,
      notes: notes || '',
      status: 'pending',
    });

    // Reset the cart after the order is created so it is ready for the next customer.
    cart.items = [];
    cart.totalAmount = 0;
    cart.status = 'active';
    await cart.save();

    res.status(201).json(
      new ApiResponse(201, createdOrder, 'Order created successfully')
    );
  } catch (error) {
    if (createdOrder?._id) {
      await Order.findByIdAndDelete(createdOrder._id);
    }

    if (reservedItems.length > 0) {
      await restoreProductStock(reservedItems);
    }
    throw error;
  }
});

// Get order by orderId
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, 'Order ID is required');
  }

  const order = await Order.findOne({ orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Order fetched successfully')
  );
});

// Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, limit = 50, skip = 0 } = req.query;

  const query = {};
  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

  const total = await Order.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, { orders, total, limit: parseInt(limit), skip: parseInt(skip) }, 'Orders fetched successfully')
  );
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!orderId || !status) {
    throw new ApiError(400, 'Order ID and status are required');
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid order status');
  }

  const order = await Order.findOne({ orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.status = status;
  await order.save();

  res.status(200).json(
    new ApiResponse(200, order, 'Order status updated successfully')
  );
});

// Update payment status
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus, transactionId } = req.body;

  if (!orderId || !paymentStatus) {
    throw new ApiError(400, 'Order ID and payment status are required');
  }

  const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
  if (!validStatuses.includes(paymentStatus)) {
    throw new ApiError(400, 'Invalid payment status');
  }

  const order = await Order.findOne({ orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.paymentInfo.status = paymentStatus;
  if (transactionId) {
    order.paymentInfo.transactionId = transactionId;
  }

  await order.save();

  // Completing payment starts a new shopping session for the same cart.
  // Reset both fields so carts previously marked as checked out can be reused.
  if (paymentStatus === 'completed') {
    await Cart.findOneAndUpdate(
      { cartId: order.cartId },
      { $set: { items: [], totalAmount: 0, status: 'active' } }
    );
  }

  res.status(200).json(
    new ApiResponse(200, order, 'Payment status updated successfully')
  );
});

// Delete order
export const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, 'Order ID is required');
  }

  const order = await Order.findOneAndDelete({ orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'Order deleted successfully')
  );
});

// Get orders by customer email
export const getOrdersByCustomer = asyncHandler(async (req, res) => {
  const { email } = req.params;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const orders = await Order.find({ 'customerInfo.email': email }).sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, orders, 'Orders fetched successfully')
  );
});

// Generate and download PDF bill
export const downloadBillPDF = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, 'Order ID is required');
  }

  const order = await Order.findOne({ orderId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice_${orderId}.pdf`);

  // Generate PDF and pipe to response
  await generateBillPDF(order, res);
});
