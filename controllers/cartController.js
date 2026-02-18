const Cart = require("../models/Cart");
const Product = require("../models/Product");
/* =========================
    ADD TO CART
========================= */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: userId });

    // 🔍 FETCH PRODUCT TO CHECK STOCK
  
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🔒 STOCK VALIDATION
    if (!product.isUnlimited) {
      const currentCartItem = cart ? cart.items.find(i => i.product.toString() === productId) : null;
      const currentQty = currentCartItem ? currentCartItem.quantity : 0;
      const requestedTotal = currentQty + quantity;

      if (requestedTotal > product.stockQuantity) {
        return res.status(400).json({
          message: `Cannot add ${quantity} item(s). You already have ${currentQty} in cart, and only ${product.stockQuantity} are available in stock.`
        });
      }
    }

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }]
      });
    } else {
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }

      await cart.save();
    }

    res.status(200).json({ message: "Added to cart", cart });

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
    UPDATE CART QTY
========================= */
exports.updateCartQty = async (req, res) => {
  try {
    const userId = req.user.id;
    let { productId, quantity } = req.body;

    quantity = parseInt(quantity);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      i => i.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔒 STOCK VALIDATION
    // Retrieve product to check stock
    const Product = require("../models/Product");
    const product = await Product.findById(productId);

    if (product && !product.isUnlimited) {
      if (quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `Cannot update to ${quantity}. Only ${product.stockQuantity} items in stock.`
        });
      }
    }

    if (quantity < 1) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    res.json({ message: "Cart updated", cart });

  } catch (error) {
    console.error("UPDATE CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   📦 GET CART
========================= */
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product", "name finalPrice images stockQuantity isUnlimited");

    res.json(cart || { items: [] });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ❌ REMOVE ITEM
========================= */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    res.json({ message: "Item removed", cart });

  } catch (error) {
    console.error("REMOVE CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
