import React, { useEffect, useState } from "react";
import Navbar from "../../components/user/navbar/navbar";
import { Helmet } from "react-helmet";

function MyOrders() {
  const userId = sessionStorage.getItem("userId");
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {}, []);

  const getOrders = async () => {
    try {
      const response = await fetch(
        "https://e-commerce-backend-rho-lovat.vercel.app/order/get-my-orders"
      );
      const data = await response.json();
      if (data.success) {
        setMyOrders(data.orders);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div>
      <Helmet>
        <title>My Orders | Mera Bestie</title>
      </Helmet>
      <Navbar />

      <div className="max-w-screen-lg mx-10 lg:mx-auto py-20">
        <div class="inline-flex gap-2 items-center mb-3">
          <p class="text-gray-500 text-3xl">
            MY <span class="text-gray-700 font-medium">ORDERS</span>
          </p>
          <p class="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-700"></p>
        </div>
        {/* <div className="divide-y divide-gray-200">
          {myOrders.map(({productIds,orderStatus})=>(
             productIds.map(
                (productId, index) => (
        
                  <div
                    key={index}
                    className="flex items-center gap-5 py-3 last:pb-0"
                  >
                    <div className="h-10 w-10 rounded-full shadow-lg shadow-indigo-600 flex items-center justify-center bg-indigo-900">
                      <ArrowRightStartOnRectangleIcon
                        strokeWidth={5}
                        className="h-6 w-6"
                        color="white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-bold tracking-wide text-gray-600">
                          {taskDate(date)}
                        </p>
                        <Chip
                          color="indigo"
                          value={subTaskRole ? subTaskRole : "Sub-Assignment"}
                          className="shadow-md shadow-indigo-600"
                        />
                      </div>
                      <Typography color="blue-gray" className="mt-2">
                        {subTaskName}
                      </Typography>
                    </div>
                  </div>
                )
              )
          )) 

        }

        // > 0 ? (
        //   ) : (
        //     <Typography color="blue-gray" variant="lead">
        //       No Orders
        //     </Typography>
        </div> */}
      </div>
    </div>
  );
}

export default MyOrders;
