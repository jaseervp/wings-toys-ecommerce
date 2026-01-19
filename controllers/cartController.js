const Cart = require("../models/Cart");

/* =========================
   ➕ ADD TO CART
========================= */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: userId });

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

    res.status(200).json({
      message: "Added to cart",
      cart
    });

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   🔄 UPDATE CART QTY
========================= */
exports.updateCartQty = async (req, res) => {
  try {
    const userId = req.user.id;
    let { productId, quantity } = req.body;

    quantity = parseInt(quantity); // 🔥 FIX 1: ensure number

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      i => i.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔥 FIX 2: remove item if qty < 1
    if (quantity < 1) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    res.json({
      message: "Cart updated successfully",
      cart
    });

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
      .populate("items.product", "name finalPrice images");

    res.json(cart || { items: [] });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

