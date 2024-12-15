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
      price: String,
      imgUrl: String,
      quantity: Number,
    },
  ],
  paymentType: String,
  paymentStatus: { type: String, default: "Pending" },
  orderStatus: { type: String, default: "Payment Processing" },
  price: Number,
});

const Order = model("Order", orderSchema);

export default Order;
