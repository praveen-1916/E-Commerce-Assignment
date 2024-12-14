import { Router } from "express";
import Cart from "../models/cartModel.js";

const cartRouter = Router();

// Add to Cart Route
cartRouter.post("/add-to-cart", async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Find existing cart for user
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Cart exists, append new product
      cart.productsInCart.push({
        productId: productId,
        productQty: quantity,
      });
    } else {
      // Create new cart
      cart = new Cart({
        userId,
        productsInCart: [
          {
            productId: productId,
            productQty: quantity,
          },
        ],
      });
    }

    // Save cart
    const savedCart = await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      cart: savedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding product to cart",
      error: error.message,
    });
  }
});

// Get Cart by User ID Route
cartRouter.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user",
      });
    }

    res.status(200).json({
      success: true,
      cart: cart.productsInCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
});
// Delete Item from Cart Route
cartRouter.delete("/delete-items", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Find cart by userId
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user",
      });
    }

    // Filter out the product to be deleted
    cart.productsInCart = cart.productsInCart.filter(
      (item) => item.productId !== productId
    );

    // Save updated cart
    const updatedCart = await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart successfully",
      cart: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing product from cart",
      error: error.message,
    });
  }
});

// Update Product Quantity in Cart Route
cartRouter.put("/update-quantity", async (req, res) => {
  try {
    const { userId, productId, productQty } = req.body;

    // Find cart by userId
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user",
      });
    }

    // Find and update product quantity
    const productIndex = cart.productsInCart.findIndex(
      (item) => item.productId === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    cart.productsInCart[productIndex].productQty = productQty;

    // Save updated cart
    const updatedCart = await cart.save();

    res.status(200).json({
      success: true,
      message: "Product quantity updated successfully",
      cart: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product quantity",
      error: error.message,
    });
  }
});

export default cartRouter;
