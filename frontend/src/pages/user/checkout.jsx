import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  MapPin,
  ShoppingCart,
  CreditCard,
  Tag,
} from "lucide-react";
import confetti from "canvas-confetti";
import Swal from "sweetalert2";
import { Helmet } from "react-helmet";
import Navbar from "../../components/user/navbar/navbar";
import { useLocation } from "react-router-dom";

const Checkout = () => {
  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const alertFunc = (msg, success) => {
    if (success) {
      Toast.fire({
        icon: "success",
        title: msg,
      });
    } else {
      Toast.fire({
        icon: "error",
        title: msg,
      });
    }
  };

  const location = useLocation();
  const total = parseFloat(location.state?.total || 0);
  const discount = parseFloat(location.state?.discount || 0);
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setorderLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });
  const [saveAddress, setSaveAddress] = useState(false);
  useEffect(() => {
    const savedAddress = localStorage.getItem("savedShippingAddress");
    const savedSaveAddressPreference = localStorage.getItem(
      "saveAddressPreference"
    );

    if (savedAddress) {
      try {
        const parsedAddress = JSON.parse(savedAddress);
        setAddress(parsedAddress);
      } catch (error) {
        console.error("Error parsing saved address:", error);
        alertFunc(error.message, false);
      }
    }

    if (savedSaveAddressPreference) {
      setSaveAddress(JSON.parse(savedSaveAddressPreference));
    }
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const handlePaymentType = (e) => {
    setPaymentType(e.target.value);
    console.log(e.target.value);
  };

  const fetchCartItems = async () => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      const cartResponse = await fetch(
        `https://e-commerce-backend-rho-lovat.vercel.app/cart/${userId}`
      );
      const cartData = await cartResponse.json();

      if (!cartData.success) {
        setLoading(false);
        return;
      }

      const groupedItems = cartData.cart.reduce((acc, item) => {
        if (!acc[item.productId]) {
          acc[item.productId] = {
            productId: item.productId,
            productQty: item.productQty,
          };
        } else {
          acc[item.productId].productQty += item.productQty;
        }
        return acc;
      }, {});

      const productPromises = Object.values(groupedItems).map(async (item) => {
        const productResponse = await fetch(
          `https://e-commerce-backend-rho-lovat.vercel.app/product/${item.productId}`
        );
        const productData = await productResponse.json();

        if (productData.success) {
          return {
            ...productData.product,
            quantity: item.productQty,
          };
        }
        return null;
      });

      const products = await Promise.all(productPromises);
      setCartItems(products.filter((product) => product !== null));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching cart items:", err);
      setLoading(false);
      alertFunc(err.message, false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    const updatedAddress = {
      ...address,
      [name]: value,
    };

    setAddress(updatedAddress);

    if (saveAddress) {
      localStorage.setItem(
        "savedShippingAddress",
        JSON.stringify(updatedAddress)
      );
    }
  };

  const handleSaveAddressToggle = (e) => {
    const isChecked = e.target.checked;
    setSaveAddress(isChecked);

    // Save address preference
    localStorage.setItem("saveAddressPreference", JSON.stringify(isChecked));

    if (isChecked) {
      // Save current address to localStorage
      localStorage.setItem("savedShippingAddress", JSON.stringify(address));
    } else {
      // Remove saved address from localStorage
      localStorage.removeItem("savedShippingAddress");
    }
  };

  const isAddressValid = () => {
    return Object.values(address).every((value) => value.trim() !== "");
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return (
        total + parseFloat(item.price.replace(/[^\d.]/g, "")) * item.quantity
      );
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * (discount / 100)).toFixed(2);
  };

  const handlePlaceOrder = async () => {
    const userId = sessionStorage.getItem("userId");
    setorderLoading(true);

    if (saveAddress) {
      try {
        await fetch(
          "https://e-commerce-backend-rho-lovat.vercel.app/address/update-address",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              address: Object.values(address).join(", "),
            }),
          }
        );
      } catch (err) {
        console.error("Error saving address:", err);
        alertFunc(err.message, false);
      }
    }

    const now = new Date();
    const date = now.toLocaleDateString("en-GB");
    const time = now.toLocaleTimeString("en-GB");

    const productsOrdered = cartItems.map((item) => ({
      productId: item._id,
      productQty: item.quantity,
    }));

    try {
      const response = await fetch(
        "https://e-commerce-backend-rho-lovat.vercel.app/order/place-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentType,
            userId,
            date,
            time,
            address: Object.values(address).join(", "),
            price: total,
            productsOrdered,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setorderLoading(false);
        razorInitPay(data.order);
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setorderLoading(false);
      alertFunc(err.message, false);
    }
  };

  const razorInitPay = async (order) => {
    try {
      const options = {
        key: "rzp_test_aWuOd2pr4hMQ9G",
        amount: order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: "E-Commerce Product Order Payment", //your business name
        description: "Test Transaction",
        order_id: order.id,
        receipt: order.receipt,
        handler: async (responce) => {
          razorpayPaymentVerification(responce);
        },
      };

      const razorpayWindow = new window.Razorpay(options);
      razorpayWindow.open();
    } catch (error) {
      console.error(error.message);
      alertFunc(error.message, false);
    }
  };

  const razorpayPaymentVerification = async (orderDetails) => {
    try {
      const responce = await fetch(
        "https://e-commerce-backend-rho-lovat.vercel.app/order/verify-razorpay",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderDetails),
        }
      );
      const data = await responce.json();
      if (data.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setShowSuccess(true);
        setTimeout(() => {
          navigate("/cart");
        }, 5000);
      } else {
        alertFunc(data.message, data.success);
      }
    } catch (error) {
      console.error(error.message);
      alertFunc(error.message, false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Helmet>
        <title>Checkout | Mera Bestie</title>
      </Helmet>
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Address Section */}
          <div className="md:w-2/3 bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6 space-x-4">
              <MapPin className="text-pink-600 w-8 h-8" />
              <h2 className="text-3xl font-bold text-gray-800">
                Shipping Details
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={address.street}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={address.city}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={address.state}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={address.pincode}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="saveAddress"
                  checked={saveAddress}
                  onChange={handleSaveAddressToggle}
                  className="text-pink-600 focus:ring-pink-500 rounded"
                />
                <label htmlFor="saveAddress" className="text-sm text-gray-700">
                  Save this address for future orders
                </label>
              </div>
            </div>
          </div>
          <div className="md:w-1/3 bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6 space-x-4">
              <ShoppingCart className="text-pink-600 w-8 h-8" />
              <h2 className="text-3xl font-bold text-gray-800">
                Order Summary
              </h2>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex justify-between items-center border-b pb-4"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg shadow-sm"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-800">
                    Rs.{" "}
                    {(
                      parseFloat(item.price.replace(/[^\d.]/g, "")) *
                      item.quantity
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold">
                  Rs. {calculateSubtotal().toFixed(2)}
                </span>
              </div>

              {/* Discount Section */}
              {discount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    <span>Discount ({discount}%)</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    - Rs. {calculateDiscountAmount()}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>

              <div className="flex justify-between text-xl font-bold border-t pt-4">
                <span>Total</span>
                <span className="text-pink-600">Rs. {total.toFixed(2)}</span>
              </div>

              <div>
                <h4 className="text-lg font-semibold track mb-2">
                  Payment Methods
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label
                      className="relative flex items-center cursor-pointer"
                      htmlFor="razorpay"
                    >
                      <input
                        name="framework"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="razorpay"
                        onChange={handlePaymentType}
                        value="razorpay"
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></span>
                    </label>
                    <label htmlFor="razorpay">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-24 h-8"
                        fill="#072654"
                        viewBox="0 0 1896 401"
                        id="razorpay"
                      >
                        <path
                          fill="#3395FF"
                          d="m122.63 105.7-15.75 57.97 90.15-58.3-58.96 219.98 59.88.05L285.05.48"
                        ></path>
                        <path d="M25.6 232.92.8 325.4h122.73l50.22-188.13L25.6 232.92m426.32-81.42c-3 11.15-8.78 19.34-17.4 24.57-8.6 5.22-20.67 7.84-36.25 7.84h-49.5l17.38-64.8h49.5c15.56 0 26.25 2.6 32.05 7.9 5.8 5.3 7.2 13.4 4.22 24.6m51.25-1.4c6.3-23.4 3.7-41.4-7.82-54-11.5-12.5-31.68-18.8-60.48-18.8H324.4l-66.5 248.1h53.67l26.8-100h35.2c7.9 0 14.12 1.3 18.66 3.8 4.55 2.6 7.22 7.1 8.04 13.6l9.58 82.6h57.5l-9.32-77c-1.9-17.2-9.77-27.3-23.6-30.3 17.63-5.1 32.4-13.6 44.3-25.4a92.6 92.6 0 0 0 24.44-42.5m130.46 86.4c-4.5 16.8-11.4 29.5-20.73 38.4-9.34 8.9-20.5 13.3-33.52 13.3-13.26 0-22.25-4.3-27-13-4.76-8.7-4.92-21.3-.5-37.8 4.42-16.5 11.47-29.4 21.17-38.7 9.7-9.3 21.04-13.95 34.06-13.95 13 0 21.9 4.5 26.4 13.43 4.6 8.97 4.7 21.8.2 38.5zm23.52-87.8-6.72 25.1c-2.9-9-8.53-16.2-16.85-21.6-8.34-5.3-18.66-8-30.97-8-15.1 0-29.6 3.9-43.5 11.7-13.9 7.8-26.1 18.8-36.5 33-10.4 14.2-18 30.3-22.9 48.4-4.8 18.2-5.8 34.1-2.9 47.9 3 13.9 9.3 24.5 19 31.9 9.8 7.5 22.3 11.2 37.6 11.2a82.4 82.4 0 0 0 35.2-7.7 82.11 82.11 0 0 0 28.4-21.2l-7 26.16h51.9L709.3 149h-52zm238.65 0H744.87l-10.55 39.4h87.82l-116.1 100.3-9.92 37h155.8l10.55-39.4h-94.1l117.88-101.8m142.4 52c-4.67 17.4-11.6 30.48-20.75 39-9.15 8.6-20.23 12.9-33.24 12.9-27.2 0-36.14-17.3-26.86-51.9 4.6-17.2 11.56-30.13 20.86-38.84 9.3-8.74 20.57-13.1 33.82-13.1 13 0 21.78 4.33 26.3 13.05 4.52 8.7 4.48 21.67-.13 38.87m30.38-80.83c-11.95-7.44-27.2-11.16-45.8-11.16-18.83 0-36.26 3.7-52.3 11.1a113.09 113.09 0 0 0-41 32.06c-11.3 13.9-19.43 30.2-24.42 48.8-4.9 18.53-5.5 34.8-1.7 48.73 3.8 13.9 11.8 24.6 23.8 32 12.1 7.46 27.5 11.17 46.4 11.17 18.6 0 35.9-3.74 51.8-11.18 15.9-7.48 29.5-18.1 40.8-32.1 11.3-13.94 19.4-30.2 24.4-48.8 5-18.6 5.6-34.84 1.8-48.8-3.8-13.9-11.7-24.6-23.6-32.05m185.1 40.8 13.3-48.1c-4.5-2.3-10.4-3.5-17.8-3.5-11.9 0-23.3 2.94-34.3 8.9-9.46 5.06-17.5 12.2-24.3 21.14l6.9-25.9-15.07.06h-37l-47.7 176.7h52.63l24.75-92.37c3.6-13.43 10.08-24 19.43-31.5 9.3-7.53 20.9-11.3 34.9-11.3 8.6 0 16.6 1.97 24.2 5.9m146.5 41.1c-4.5 16.5-11.3 29.1-20.6 37.8-9.3 8.74-20.5 13.1-33.5 13.1s-21.9-4.4-26.6-13.2c-4.8-8.85-4.9-21.6-.4-38.36 4.5-16.75 11.4-29.6 20.9-38.5 9.5-8.97 20.7-13.45 33.7-13.45 12.8 0 21.4 4.6 26 13.9 4.6 9.3 4.7 22.2.28 38.7m36.8-81.4c-9.75-7.8-22.2-11.7-37.3-11.7-13.23 0-25.84 3-37.8 9.06-11.95 6.05-21.65 14.3-29.1 24.74l.18-1.2 8.83-28.1h-51.4l-13.1 48.9-.4 1.7-54 201.44h52.7l27.2-101.4c2.7 9.02 8.2 16.1 16.6 21.22 8.4 5.1 18.77 7.63 31.1 7.63 15.3 0 29.9-3.7 43.75-11.1 13.9-7.42 25.9-18.1 36.1-31.9 10.2-13.8 17.77-29.8 22.6-47.9 4.9-18.13 5.9-34.3 3.1-48.45-2.85-14.17-9.16-25.14-18.9-32.9m174.65 80.65c-4.5 16.7-11.4 29.5-20.7 38.3-9.3 8.86-20.5 13.27-33.5 13.27-13.3 0-22.3-4.3-27-13-4.8-8.7-4.9-21.3-.5-37.8 4.4-16.5 11.42-29.4 21.12-38.7 9.7-9.3 21.05-13.94 34.07-13.94 13 0 21.8 4.5 26.4 13.4 4.6 8.93 4.63 21.76.15 38.5zm23.5-87.85-6.73 25.1c-2.9-9.05-8.5-16.25-16.8-21.6-8.4-5.34-18.7-8-31-8-15.1 0-29.68 3.9-43.6 11.7-13.9 7.8-26.1 18.74-36.5 32.9-10.4 14.16-18 30.3-22.9 48.4-4.85 18.17-5.8 34.1-2.9 47.96 2.93 13.8 9.24 24.46 19 31.9 9.74 7.4 22.3 11.14 37.6 11.14 12.3 0 24.05-2.56 35.2-7.7a82.3 82.3 0 0 0 28.33-21.23l-7 26.18h51.9l47.38-176.7h-51.9zm269.87.06.03-.05h-31.9c-1.02 0-1.92.05-2.85.07h-16.55l-8.5 11.8-2.1 2.8-.9 1.4-67.25 93.68-13.9-109.7h-55.08l27.9 166.7-61.6 85.3h54.9l14.9-21.13c.42-.62.8-1.14 1.3-1.8l17.4-24.7.5-.7 77.93-110.5 65.7-93 .1-.06h-.03z"></path>
                      </svg>
                    </label>
                  </div>

                  <div className="inline-flex items-center">
                    <label
                      className="relative flex items-center cursor-pointer"
                      htmlFor="cash-on-delivery"
                    >
                      <input
                        name="framework"
                        type="radio"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
                        id="cash-on-delivery"
                        value="cod"
                        onChange={handlePaymentType}
                      />
                      <span className="absolute bg-slate-800 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></span>
                    </label>
                    <label
                      className="ml-2 text-slate-600 flex items-center gap-1 cursor-pointer text-base"
                      htmlFor="cash-on-delivery"
                    >
                      COD
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        id="cash-on-delivery"
                        className="h-7 w-8"
                      >
                        <path
                          fill="#ffc166"
                          d="M115.283 218.556c-2.49.63-12.253 3.903-14.743 4.533a12.44 12.44 0 0 0-9.33 13.12 1.634 1.634 0 0 0 .02.22 12.431 12.431 0 0 0 12.82 11.37q16.875-.585 33.76-1.18 22.584-10.485 21.506-17.145-1.421-8.789-44.033-10.918Z"
                        ></path>
                        <path
                          fill="#ffc570"
                          d="M156.734 233.367 128.8 252.719a13.498 13.498 0 0 0 11.94 23.95l48.13-16.47c.742-2.9 1.886-9.27-1.21-15.413-4.71-9.343-17.354-14.452-30.926-11.42Z"
                        ></path>
                        <rect
                          width="341.42"
                          height="203.94"
                          x="163.08"
                          y="243.259"
                          fill="#79ed97"
                          rx="30"
                        ></rect>
                        <path
                          fill="#63ea86"
                          d="M474.5 243.26h-15a30 30 0 0 1 30 30V417.2a30 30 0 0 1-30 30h15a30 30 0 0 0 30-30V273.26a30 30 0 0 0-30-30Z"
                        ></path>
                        <path
                          fill="#fff"
                          d="M193.08 395.2v-99.94a22 22 0 0 0 22-22H452.5a22 22 0 0 0 22 22v99.94a22 22 0 0 0-22 22H215.08a22 22 0 0 0-22-22Z"
                        ></path>
                        <path
                          fill="#eee"
                          d="M452.5 273.26h-15a22 22 0 0 0 22 22v99.94a22 22 0 0 0-22 22h15a22 22 0 0 1 22-22v-99.94a22 22 0 0 1-22-22Z"
                        ></path>
                        <path
                          fill="#ffcd85"
                          d="m259.43 252.54-11.79-9.28-57-44.88a14.546 14.546 0 0 1-5.57-11.48 14.168 14.168 0 0 1 .09-1.59c.02-.22.05-.45.09-.67a14.43 14.43 0 0 1 1.68-4.86 14.607 14.607 0 0 1 20.72-5.1l6.44 4.2 16.63 10.84 8.95 5.85 5.87 47.69h33.3l-6.54-64.53a65.448 65.448 0 0 0-7.25-23.75l-3.27-6.15c-.06-.12-.12-.23-.18-.35l-.06-.12q-13.71-27.12-27.43-54.25a19.75 19.75 0 0 0-16.79-10.83q-58.575 3.975-117.14 7.94l-13.62.93c-.79.05-1.59.11-2.38.16q-4.08-.12-8.35-.39c-2.21-.14-13.86-1.37-15.99-1.56l-24.467 89.485L64.86 199.78a39.762 39.762 0 0 0 9.83 4.94l48.32 16.47 30.76 10.49 11.47 6.53 13.2 7.52 21.83 12.43 3.6 2.04.16.09 23.07 13.14.42.24 12.79 7.28a17.18 17.18 0 0 0 25.29-11.25 17.29 17.29 0 0 0-1.05-10.55 17.056 17.056 0 0 0-5.12-6.61Z"
                        ></path>
                        <path
                          fill="#ffc570"
                          d="M190.64 198.38a14.546 14.546 0 0 1-5.57-11.48 14.168 14.168 0 0 1 .09-1.59c.02-.22.05-.45.09-.67a14.6 14.6 0 0 1 6.902-10.248 14.594 14.594 0 0 0-20.222 5.388 14.43 14.43 0 0 0-1.68 4.86c-.04.22-.07.45-.09.67a14.168 14.168 0 0 0-.09 1.59 14.546 14.546 0 0 0 5.57 11.48l57 44.88h15zm28.47-104.27q13.71 27.12 27.43 54.25l.06.12c.06.12.12.23.18.35l3.27 6.15a65.448 65.448 0 0 1 7.25 23.75l6.54 64.53h15l-6.54-64.53a65.448 65.448 0 0 0-7.25-23.75l-3.27-6.15c-.06-.12-.12-.23-.18-.35l-.06-.12q-13.71-27.12-27.43-54.25a19.75 19.75 0 0 0-16.79-10.83l-10.553.715A19.72 19.72 0 0 1 219.11 94.11zM60.83 91.92q4.275.27 8.35.39c.79-.05 1.59-.11 2.38-.16l3.837-.262c-2.977-.235-13.537-1.347-15.556-1.527l-.396 1.446c.6.054 1.085.094 1.385.113z"
                        ></path>
                        <path
                          fill="#ffc570"
                          d="m259.43 252.54-11.79-9.28h-15l11.79 9.28a17.056 17.056 0 0 1 5.12 6.61 17.147 17.147 0 0 1-2.59 17.94 17.082 17.082 0 0 1-5.662 4.38A17.179 17.179 0 0 0 265.6 269.7a17.29 17.29 0 0 0-1.05-10.55 17.056 17.056 0 0 0-5.12-6.61Z"
                        ></path>
                        <path
                          fill="#f66"
                          d="m0 64.8 56.234 12.208a9 9 0 0 1 6.787 10.767L38.747 194.861a9 9 0 0 1-10.767 6.787L0 197.006"
                        ></path>
                        <path
                          fill="#ff4e4e"
                          d="M56.234 77.008 0 64.801v11.537l41.234 8.952a9 9 0 0 1 6.787 10.767L24.227 201.026l3.753.622a9 9 0 0 0 10.767-6.787L63.021 87.775a9 9 0 0 0-6.787-10.767Z"
                        ></path>
                        <path
                          fill="#272a33"
                          d="M304.683 328.776a7.5 7.5 0 0 0 7.5 7.5h22.06a16.08 16.08 0 0 1-14.203 8.572h-7.858a7.5 7.5 0 0 0-5.423 12.68l31.428 32.905a7.5 7.5 0 1 0 10.848-10.36l-20.457-21.418a31.187 31.187 0 0 0 21.61-22.379h5.21a7.5 7.5 0 0 0 0-15h-5.207a30.896 30.896 0 0 0-3.568-8.57h8.774a7.5 7.5 0 0 0 0-15h-43.214a7.5 7.5 0 0 0 0 15h7.857a16.08 16.08 0 0 1 14.203 8.57h-22.06a7.5 7.5 0 0 0-7.5 7.5ZM474.5 235.76H285.618l-5.864-57.817a72.454 72.454 0 0 0-8.085-26.487l-3.266-6.145-.122-.24-.048-.095-27.425-54.242a27.279 27.279 0 0 0-23.163-14.947 7.901 7.901 0 0 0-.833.01l-11.727.796q-52.71 3.577-105.416 7.144L84.04 84.801a242.476 242.476 0 0 1-7.736-.367c-1.833-.116-3.703-.26-5.667-.431a16.465 16.465 0 0 0-12.652-14.288L9.322 57.525a7.5 7.5 0 0 0-3.644 14.55L54.41 84.284l.165.04a1.501 1.501 0 0 1 1.13 1.794L31.433 193.203a1.498 1.498 0 0 1-1.793 1.13l-20.48-4.642a7.5 7.5 0 0 0-3.317 14.629l20.481 4.642a16.62 16.62 0 0 0 3.679.414 16.515 16.515 0 0 0 16.06-12.857l.12-.531 14.418 9.964a47.154 47.154 0 0 0 11.67 5.866l20.09 6.849a19.865 19.865 0 0 0-8.637 17.996c.01.196.027.395.052.597a19.913 19.913 0 0 0 19.83 18.047c.233 0 .47-.004.704-.013q6.568-.227 13.14-.459a20.983 20.983 0 0 0 25.718 28.931l12.413-4.245V417.2a37.542 37.542 0 0 0 37.5 37.5H474.5a37.542 37.542 0 0 0 37.5-37.5V273.26a37.542 37.542 0 0 0-37.5-37.5Zm-370.711 4.544a4.946 4.946 0 0 1-5.085-4.508 5.322 5.322 0 0 0-.018-.173c0-.017-.002-.035-.004-.053a4.922 4.922 0 0 1 3.697-5.21c1.367-.345 3.862-1.133 7.81-2.39 1.619-.517 3.478-1.109 4.91-1.55l25.8 8.795-5.766 3.994q-15.678.555-31.344 1.095Zm53.166 22.894-18.66 6.382a5.994 5.994 0 0 1-7.757-4.259 6.057 6.057 0 0 1 2.533-6.435l7.863-5.448a7.493 7.493 0 0 0 2.12-1.469l14.072-9.749 8.914 5.076a37.345 37.345 0 0 0-9.085 15.902Zm.525-38.036a7.5 7.5 0 0 0-1.29-.58l-38.334-13.07-.109-.037-40.655-13.86a32.188 32.188 0 0 1-7.968-4.005l-17.38-12.01a7.5 7.5 0 0 0-2.073-1.002l18.535-81.77c.15.022.296.049.448.062a258.007 258.007 0 0 0 15.305.917c.228.007.465.003.697-.012l16.03-1.092q52.712-3.564 105.414-7.144l11.262-.765a12.267 12.267 0 0 1 10.055 6.7l27.426 54.241.24.471.074.144 3.263 6.14a57.483 57.483 0 0 1 6.413 20.995l5.707 56.275h-18.362l-5.065-41.107a7.498 7.498 0 0 0-3.345-5.364l-8.81-5.75c-.05-.032-.093-.07-.143-.102l-23.072-15.042a22.108 22.108 0 0 0-31.353 7.714 21.907 21.907 0 0 0-2.538 7.293c-.065.377-.117.767-.153 1.145a21.422 21.422 0 0 0-.129 2.353 21.918 21.918 0 0 0 8.43 17.373l56.864 44.77.02.016 11.905 9.373a9.525 9.525 0 0 1 2.892 3.728 9.796 9.796 0 0 1 .593 5.93 9.693 9.693 0 0 1-.745 2.146c-.015.036-.035.07-.05.107a9.647 9.647 0 0 1-8.68 5.357 9.553 9.553 0 0 1-4.78-1.268Zm110.228 56.745q.472-.563.905-1.147h177.353A29.61 29.61 0 0 0 467 301.793v86.872a29.61 29.61 0 0 0-21.034 21.035H221.614a29.61 29.61 0 0 0-21.034-21.034v-86.873a29.61 29.61 0 0 0 21.034-21.034h3.204l11.782 6.708a24.698 24.698 0 0 0 31.108-5.56Zm-32.058-57.635-40.39-31.8a7.019 7.019 0 0 1-2.69-5.572 6.549 6.549 0 0 1 .041-.738c.008-.063.012-.114.018-.177l.032-.192a6.947 6.947 0 0 1 .813-2.35 7.108 7.108 0 0 1 10.079-2.482l6.41 4.18.028.02 22.661 14.785ZM497 417.2a22.526 22.526 0 0 1-22.5 22.5H193.08a22.526 22.526 0 0 1-22.5-22.5V273.26a22.548 22.548 0 0 1 9.204-18.14l28.109 16.003a7.488 7.488 0 0 0-.313 2.136 14.517 14.517 0 0 1-14.5 14.5 7.5 7.5 0 0 0-7.5 7.5v99.94a7.5 7.5 0 0 0 7.5 7.5 14.517 14.517 0 0 1 14.5 14.5 7.5 7.5 0 0 0 7.5 7.5H452.5a7.5 7.5 0 0 0 7.5-7.5 14.517 14.517 0 0 1 14.5-14.5 7.5 7.5 0 0 0 7.5-7.5v-99.94a7.5 7.5 0 0 0-7.5-7.5 14.517 14.517 0 0 1-14.5-14.5 7.5 7.5 0 0 0-7.5-7.5H273.472a24.748 24.748 0 0 0-2.043-9.597 24.35 24.35 0 0 0-3.248-5.403H474.5a22.526 22.526 0 0 1 22.5 22.5Z"
                        ></path>
                      </svg>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!isAddressValid() && paymentType}
                className={`w-full flex items-center justify-center space-x-2 py-4 rounded-lg transition-all duration-300 ${
                  isAddressValid() && paymentType
                    ? "bg-black text-white hover:bg-gray-800 hover:shadow-lg"
                    : "bg-gray-300 cursor-not-allowed opacity-50"
                }`}
              >
                {orderLoading ? (
                  <div className="grid w-full place-items-center overflow-x-scroll rounded-lg lg:overflow-visible">
                    <svg
                      className="text-gray-300 animate-spin"
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                    >
                      <path
                        d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>
                      <path
                        d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        className="text-gray-900"
                      ></path>
                    </svg>
                  </div>
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    <span>Place Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl p-10 text-center shadow-2xl">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Order Placed Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Your order has been processed. Check your email for tracking
                details.
              </p>
              <button
                onClick={() => navigate("/cart")}
                className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
              >
                Back to Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
