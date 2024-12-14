import express, { json } from "express";
import cors from "cors";
import session from "express-session";
import pkg from "connect-mongo";
const { create } = pkg;
import authRoutes from "./routes/auth.js";
import connectToMongo from "./database.js";
import cookieParser from "cookie-parser";
import productRoute from "./routes/product.js";
import complaintRouter from "./routes/complaint.js";
import cartRouter from "./routes/cart.js";
import orderRouter from "./routes/order.js";
import addressRouter from "./routes/address.js";

const app = express();

// Middleware

app.use(cors());
app.use(json());
app.use(cookieParser());

app.use(
  session({
    secret: "a57cb2f7c4a1ef3a8a3c6a5bf213d998812de8fc7bb47da8b7347a92f9ec48d9",
    resave: false,
    saveUninitialized: false,
    store: create({
      mongoUrl:
        "mongodb+srv://ecommerce:ecommerce@ecommerce.dunf0.mongodb.net/",
      collectionName: "sessions",
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Routes
app.use("/auth", authRoutes);

// MongoDB Connection
connectToMongo();

// Keep-Alive Route
app.get("/keep-alive", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running",
  });
});

//Produce route using
app.use("/product", productRoute);

//Complaint route using
app.use("/complaint", complaintRouter);

// Cart route using
app.use("/cart", cartRouter);

// Address route using
app.use("/address", addressRouter);

// Order route using
app.use("/order", orderRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
