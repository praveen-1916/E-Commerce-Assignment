import { model, Schema } from "mongoose";

// Address Schema
const addressSchema = new Schema({
  userId: { type: String, unique: true },
  address: String,
});

const Address = model("Address", addressSchema);

export default Address;
