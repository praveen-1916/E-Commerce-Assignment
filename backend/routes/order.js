import { Router } from "express";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import User from "../models/user.js";
import { createTransport } from "nodemailer";
import Razorpay from "razorpay";

const orderRouter = Router();
const RAZORPAY_KEY_ID = "rzp_test_aWuOd2pr4hMQ9G";
const RAZORPAY_KEY_SECRET = "ngdyQG7XoIFzwpecKHJAcpw4";
const RAZORPAY_CURRENCY = "INR";

// Configure nodemailer
const transporter = createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "pecommerce8@gmail.com",
    pass: "rqrdabxuzpaecigz",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Place Order Route
orderRouter.post("/place-order", async (req, res) => {
  try {
    const { userId, date, time, address, price, productsOrdered, paymentType } =
      req.body;

    // Generate random 6 digit orderId
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate random 12 digit alphanumeric transactionId
    const transactionId = Math.random()
      .toString(36)
      .substring(2, 14)
      .toUpperCase();

    // Find user details
    const findUserDetails = async (userId) => {
      // Use mongoose model directly instead of undefined User
      const user = await User.findOne({ userId });
      if (!user) {
        throw new Error("User not found");
      }
      return {
        name: user.name,
        email: user.email,
      };
    };

    // Extract product IDs
    // const getProductIds = (productsOrdered) => {
    const product = productsOrdered.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      imgUrl: item.imgUrl,
    }));

    // Find product details
    // const productDetailsFinder = async (productIds) => {
    //   const products = await Product.find({ productId: { $in: productIds } });
    //   return products;
    // };

    // Get user details
    const userDetails = await findUserDetails(userId);

    // Get product IDs array
    // const product = getProductIds(productsOrdered);

    // Get product details
    // const productDetails = await productDetailsFinder(productIds);

    switch (paymentType) {
      case "razorpay": {
        // Create new order
        const newOrder = await Order.create({
          orderId,
          date,
          time,
          address,
          userId,
          userEmail: userDetails.email,
          userName: userDetails.name,
          product,
          transactionId,
          price,
          paymentType: paymentType,
        });

        const options = {
          amount: price * 100,
          currency: RAZORPAY_CURRENCY,
          receipt: newOrder._id,
        };

        await razorpayInstance.orders.create(options, (error, order) => {
          if (error) {
            res.json({
              success: false,
              message: error.message,
            });
          }
          res.json({
            success: true,
            order,
          });
        });

        break;
      }

      case "cod": {
        await Order.create({
          orderId,
          date,
          time,
          address,
          userId,
          userEmail: userDetails.email,
          userName: userDetails.name,
          product,
          transactionId,
          price,
          paymentType: "Cash On Delivery!",
        });

        res.status(200).json({
          success: true,
          message: "Order placed successfully",
          orderId,
        });
        break;
      }

      default:
        break;
    }

    // Send confirmation email
    const sendingMail = async () => {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: pink; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333; margin: 0;">Mera Bestie</h1>
          </div>
          
          <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
          <p>Dear ${userDetails.name},</p>
          <p>Thank you for your order! Your order has been successfully placed.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Tracking ID:</strong> ${transactionId}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Delivery Address:</strong> ${address}</p>
          </div>

          <div style="margin-top: 20px; text-align: right;">
            <p><strong>Total Amount:</strong> ₹${price}</p>
          </div>

          <p style="margin-top: 30px;">You can track your order using the tracking ID provided above.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>Your Mera Bestie Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: '"Mera Bestie Support" <pecommerce8@gmail.com>',
        to: userDetails.email,
        subject: `Order Confirmation - Order #${orderId}`,
        html: emailHtml,
      });
    };

    await sendingMail();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error placing order",
      error: error.message,
    });
  }
});

//Razorpay payment verification
orderRouter.post("/verify-razorpay", async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    const paymentData = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (paymentData.status === "paid") {
      const orderData = await Order.findById(paymentData.receipt);
      if (orderData.paymentStatus) {
        res.json({ success: false, message: "Payment already verified" });
      }

      //making payment status to true
      await Order.findByIdAndUpdate(orderData._id, { paymentStatus: true });
      res.json({ success: true, message: "Order Placed successfully" });
    } else {
      res.json({
        success: false,
        message: "Payment Failed",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
});

// Get All Orders Route
orderRouter.get("/get-orders", async (req, res) => {
  try {
    const orders = await Order.find();

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

orderRouter.get("/get-my-orders", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.json({
        success: false,
        message: "Please login with your account first!",
      });
    }
    const orders = await Order.find({ userId });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

export default orderRouter;
