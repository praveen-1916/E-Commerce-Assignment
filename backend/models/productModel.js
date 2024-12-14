import { model, Schema } from "mongoose";

// Product Schema
const productSchema = new Schema({
  name: String,
  price: String,
  img: String,
  category: String,
  rating: Number,
  productId: { type: String, unique: true }, // Added productId field
  inStockValue: Number, // Available stock value
  soldStockValue: Number, // Number of items sold
  visibility: { type: String, default: "on" }, // Visibility field with default 'on'
});

const Product = model("Product", productSchema);

export default Product;