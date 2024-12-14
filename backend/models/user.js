import { Schema, model } from "mongoose";
import { genSalt, hash } from "bcrypt";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  userId: { type: String, unique: true, required: true }, // Add unique userId
  accountStatus: { type: String, default: "open" }, // Default account status
  phone: { type: String, default: "not available" }, // Phone number field with default value
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await genSalt(10);
  this.password = await hash(this.password, salt);
  next();
});

const User = model("User", UserSchema);

export default User;
