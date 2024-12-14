import { model, Schema } from "mongoose";

// Order Schema
const orderSchema = new Schema({
  orderId: String,
  date: String,
  time: String,
  address: String,
  userId: String,
  userEmail: String,
  userName: String,
  product: [
    {
      productId: String,
      name: String,
      price: Number,
      imgUrl: String,
      quantity: Number,
    },
  ],
  paymentStatus: { type: Boolean, default: false },
  orderStatus: { type: String, default: "Payment Processing" },
  price: Number,
});

const Order = model("Order", orderSchema);

export default Order;
