import React, { useEffect, useState } from "react";
import Navbar from "../../components/user/navbar/navbar";
import { Helmet } from "react-helmet";

function MyOrders() {
  const userId = sessionStorage.getItem("userId");
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    if (userId) {
      getOrders();
      console.log(userId);
    }
  }, []);

  const getOrders = async () => {
    try {
      const response = await fetch(
        "https://e-commerce-backend-rho-lovat.vercel.app/order/get-my-orders",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userId),
        }
      );
      const data = await response.json();
      if (data.success) {
        setMyOrders(data.orders);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const OrderStatusBadge = ({ status }) => {
    const statusColors = {
      "Order Placed": "bg-blue-100 text-blue-800",
      Packing: "bg-yellow-100 text-yellow-800",
      Shipped: "bg-green-100 text-green-800",
      "Out for delivery": "bg-green-100 text-green-800",
      Delivered: "bg-purple-100 text-purple-800",
      Cancelled: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div>
      <Helmet>
        <title>My Orders | Mera Bestie</title>
      </Helmet>
      <Navbar />

      <div className="max-w-screen-lg mx-10 lg:mx-auto py-20">
        <div className="inline-flex gap-2 items-center mb-3">
          <p className="text-gray-500 text-3xl">
            MY <span className="text-gray-700 font-medium">ORDERS</span>
          </p>
          <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-700"></p>
        </div>
        <div className="divide-y divide-gray-200">
          {myOrders.map(({ product, orderStatus, date, paymentType }) =>
            product.map(({ name, quantity, imgUrl, price }, index) => (
              <div
                key={index}
                className="flex items-center gap-5 py-3 last:pb-0"
              >
                <div>
                  <div className="h-20 w-16 shadow-lg">
                    <img src={imgUrl} alt="Product Image" />
                  </div>
                  <div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold tracking-wide text-gray-600">
                        {name}
                      </p>
                      <div>
                        <p>{price}</p>
                        <p>Quantity: {quantity}</p>
                      </div>
                      <p>Date: {date}</p>
                      <p>Payment :{paymentType}</p>
                    </div>
                  </div>
                </div>

                <div>{<OrderStatusBadge status={orderStatus} />}</div>
                <div>Track Order</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
