import { Router } from "express";
import Product from "../models/productModel.js";

const productRoute = Router();

// Create Product Route
productRoute.post("/create-product", async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    const result = await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
});

// Get All Products Route
productRoute.get("/get-product", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
});

// Update Product Visibility Route
productRoute.put("/update-visibility", async (req, res) => {
  try {
    const { productId, visibility } = req.body;

    // Find and update the product, creating visibility field if it doesn't exist
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: productId },
      { $set: { visibility: visibility } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product visibility updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product visibility",
      error: error.message,
    });
  }
});

// Get Product by ID Route
productRoute.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
});

// Update Stock Status Route
productRoute.post("/instock-update", async (req, res) => {
  try {
    const { productId, inStockValue, soldStockValue } = req.body;

    // Find and update the product
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: productId },
      {
        $set: {
          inStockValue: inStockValue,
          soldStockValue: soldStockValue,
        },
      },
      { new: true, upsert: false }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock status updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating stock status",
      error: error.message,
    });
  }
});

// Assign Product ID Route
productRoute.get("/assign-productid", async (req, res) => {
  try {
    // Find all products
    const products = await Product.find();

    if (products.length === 0) {
      return res.status(404).send("No products found to assign productIds.");
    }

    // Update each product to add a productId
    const updatedProducts = [];
    const usedIds = new Set(); // Track used IDs to ensure uniqueness

    for (const product of products) {
      let productId;
      // Generate unique 6 digit number
      do {
        productId = Math.floor(100000 + Math.random() * 900000).toString();
      } while (usedIds.has(productId));

      usedIds.add(productId);

      const updateResult = await Product.findOneAndUpdate(
        { _id: product._id },
        { $set: { productId } },
        { new: true }
      );

      if (updateResult) {
        updatedProducts.push(updateResult);
      } else {
        console.error(`Failed to update product with ID: ${product._id}`);
      }
    }

    // Save all updated products
    await Promise.all(updatedProducts.map((product) => product.save()));

    res.status(200).json({
      success: true,
      message: "Product IDs assigned successfully",
      products: updatedProducts,
    });
  } catch (err) {
    console.error("Error during product ID assignment:", err);
    res.status(500).json({
      success: false,
      message: "Error assigning product IDs",
      error: err.message,
    });
  }
});

export default productRoute;
