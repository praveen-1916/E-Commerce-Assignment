import { model, Schema } from "mongoose";

// Cart Schema
const cartSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  productsInCart: [
    {
      productId: {
        type: String,
        required: true,
      },
      productQty: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
});

const Cart = model("Cart", cartSchema);

export default Cart;
