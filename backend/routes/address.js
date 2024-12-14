import { Router } from "express";
import Address from "../models/addressModel.js";

const addressRouter = Router();

// Update or Create Address Route
addressRouter.post("/update-address", async (req, res) => {
  try {
    const { userId, address } = req.body;

    // Try to find existing address for user
    const existingAddress = await Address.findOne({ userId });

    let result;
    if (existingAddress) {
      // Update existing address
      existingAddress.address = address;
      result = await existingAddress.save();
    } else {
      // Create new address entry
      const newAddress = new Address({
        userId,
        address,
      });
      result = await newAddress.save();
    }

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating address",
      error: error.message,
    });
  }
});

export default addressRouter;
