import { Router } from "express";
import User from "../models/user.js";
import { compare } from "bcrypt";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create a new user
    const userId = require("crypto").randomBytes(8).toString("hex"); // Generate unique user ID
    const user = new User({ name, email, password, userId, phone });
    await user.save();

    // Automatically log the user in
    req.session.userId = user.userId;

    res.status(201).json({ message: "User registered successfully", userId });
  } catch (err) {
    res.status(500).json({ error: "Error registering user" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check account status
    if (user.accountStatus === "suspended") {
      return res.status(403).json({ error: "Account is suspended" });
    }

    if (user.accountStatus === "blocked") {
      return res.status(403).json({ error: "Account is blocked" });
    }

    // If account status is 'open', proceed with login
    if (user.accountStatus === "open") {
      // Save userId in session
      req.session.userId = user.userId;

      // Respond with success
      return res
        .status(200)
        .json({ message: "Login successful", userId: user.userId });
    }

    // Handle any other unexpected account status
    return res.status(400).json({ error: "Invalid account status" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Error logging out" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful" });
  });
});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await findOne({ userId }, { name: 1, _id: 0 }); // Fetch only name
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ name: user.name });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user details" });
  }
});

// Get User Details Route
router.get("/get-user", async (req, res) => {
  try {
    const users = await User.find(
      {}, // Remove filter to get all users
      "-password" // Exclude only the password field
    );

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
});

// Update Account Status Route
router.put("/update-account-status", async (req, res) => {
  try {
    const { userId, accountStatus } = req.body;

    // Find and update the user, and get the updated document
    const updatedUser = await User.findOneAndUpdate(
      { userId: userId },
      { accountStatus },
      { new: true } // This option returns the modified document rather than the original
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account status updated successfully",
      user: {
        userId: updatedUser.userId,
        accountStatus: updatedUser.accountStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating account status",
      error: error.message,
    });
  }
});

export default router;
