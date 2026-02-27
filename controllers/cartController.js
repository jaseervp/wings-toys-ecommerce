const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Offer = require("../models/Offer");
const { calculateProductFinalPrice } = require("../utils/priceCalculator");
/* =========================
    ADD TO CART
========================= */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: userId });

    //  FETCH PRODUCT TO CHECK STOCK

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

    //  STOCK VALIDATION
    // Retrieve product to check stock
    const product = await Product.findById(productId);

    if (product && !product.isUnlimited) {
      if (quantity > product.stockQuantity) {
        return res.status(400).json({
          message: `Only ${product.stockQuantity} items available in stock.`,
          availableStock: product.stockQuantity
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
    GET CART
========================= */
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product", "name price images stockQuantity isUnlimited category discountPrice"); // Populate category and price for calc

    if (!cart) return res.json({ items: [] });

    // --- Dynamic Price Calculation ---
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    const initialCount = cart.items.length;
    //  Filter out products that might have been deleted (null)
    const validItems = cart.items.filter(item => item.product);

    if (validItems.length !== initialCount) {
      cart.items = validItems;
      await cart.save();
    }

    const itemsWithOffers = validItems.map(item => {
      const itemObj = item.toObject();
      if (itemObj.product) {
        const priceDetails = calculateProductFinalPrice(itemObj.product, activeOffers);
        itemObj.product = { ...itemObj.product, ...priceDetails };
      }
      return itemObj;
    });

    res.json({ ...cart.toObject(), items: itemsWithOffers });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
    REMOVE ITEM
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
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
    VALIDATE CART STOCK
========================= */
exports.validateCartStock = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product", "name stockQuantity isUnlimited isActive");

    const initialCount = cart.items.length;
    //  Auto-clean: Remove products that are deleted (null) or inactive
    cart.items = cart.items.filter(item => item.product && item.product.isActive);

    if (cart.items.length !== initialCount) {
      await cart.save();
    }

    const errors = [];

    for (const item of cart.items) {
      const product = item.product;

      // Check Stock Availability (for active products)
      if (!product.isUnlimited) {
        if (product.stockQuantity === 0) {
          errors.push({
            productId: product._id,
            name: product.name,
            issue: "Out of Stock",
            available: 0,
            requested: item.quantity
          });
        } else if (item.quantity > product.stockQuantity) {
          errors.push({
            productId: product._id,
            name: product.name,
            issue: `Only ${product.stockQuantity} items left`,
            available: product.stockQuantity,
            requested: item.quantity
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(409).json({
        valid: false,
        message: "Some items in your cart are not available",
        errors
      });
    }

    res.status(200).json({ valid: true, message: "Stock validated" });

  } catch (error) {
    console.error("STOCK VALIDATION ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

