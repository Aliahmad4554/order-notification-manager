import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { sendOrderNotificationEmail } from "../services/email.server";

export const action = async ({ request }) => {
  const { topic, shop, payload, admin, session } =
    await authenticate.webhook(request);

  console.log("=================================");
  console.log("ORDER CREATED WEBHOOK RECEIVED");
  console.log("Topic:", topic);
  console.log("Shop:", shop);
  console.log("Order ID:", payload?.id);
  console.log("Order Name:", payload?.name);
  console.log("Total Price:", payload?.total_price);

  try {
    // =========================================================
    // 1. BASIC WEBHOOK VALIDATION
    // =========================================================

    if (topic !== "ORDERS_CREATE") {
      console.error("Unexpected webhook topic:", topic);

      return new Response("Unexpected webhook topic", {
        status: 400,
      });
    }

    if (!session || !admin) {
      console.error("Shopify Admin session is not available.");

      return new Response("Admin session unavailable", {
        status: 401,
      });
    }

    if (!shop) {
      console.error("Shop is missing from webhook.");

      return new Response("Shop is missing", {
        status: 400,
      });
    }

    const orderId = payload?.id?.toString();

    if (!orderId) {
      console.error("Order ID missing from webhook payload.");

      return new Response("Order ID missing", {
        status: 400,
      });
    }

    // =========================================================
    // 2. DUPLICATE PROTECTION
    // =========================================================

    const existingNotification =
      await prisma.notificationHistory.findFirst({
        where: {
          shop: shop,
          notificationType: "order",
          resourceId: orderId,
        },
      });

    if (existingNotification) {
      console.log(
        "Duplicate webhook detected. Order already processed:",
        orderId,
      );

      console.log("=================================");

      return new Response("Already processed", {
        status: 200,
      });
    }

    // =========================================================
    // 3. DEFAULT DATA FROM WEBHOOK
    // =========================================================

    let orderName = payload?.name || "New Order";

    let totalPrice = payload?.total_price || "0.00";

    let currencyCode = payload?.currency || "";

    let customerName = payload?.customer
      ? `${payload.customer.first_name || ""} ${
          payload.customer.last_name || ""
        }`.trim()
      : "";

    let customerEmail =
      payload?.email ||
      payload?.contact_email ||
      "";

    let lineItems = (payload?.line_items || []).map((item) => ({
      title: item?.title || item?.name || "Product",
      quantity: item?.quantity || 1,
      price:
        `${item?.price || "0.00"} ${currencyCode || ""}`.trim(),
      variant: item?.variant_title || "",
      sku: item?.sku || "",
    }));

    // =========================================================
    // 4. FETCH EXTRA DATA FROM SHOPIFY GRAPHQL
    // =========================================================

    try {
      const orderGid = `gid://shopify/Order/${orderId}`;

      console.log(
        "Fetching additional order details from Shopify GraphQL...",
      );

      const response = await admin.graphql(
        `#graphql
          query GetOrderDetails($orderId: ID!) {
            order(id: $orderId) {
              id
              name
              email

              customer {
                firstName
                lastName
              }

              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }

              lineItems(first: 100) {
                nodes {
                  name
                  quantity

                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }

                  discountedUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }

                  variant {
                    title
                    sku
                  }
                }
              }
            }
          }
        `,
        {
          variables: {
            orderId: orderGid,
          },
        },
      );

      const result = await response.json();

      if (result?.errors?.length) {
        console.error(
          "Shopify GraphQL returned errors:",
        );

        for (const error of result.errors) {
          console.error(
            "GraphQL Message:",
            error?.message,
          );

          console.error(
            "GraphQL Path:",
            error?.path,
          );
        }

        console.log(
          "Continuing with webhook payload data.",
        );
      } else {
        const order = result?.data?.order;

        if (!order) {
          console.log(
            "GraphQL order not found. Using webhook payload data.",
          );
        } else {
          console.log(
            "GraphQL order fetched successfully:",
            order.name,
          );

          orderName = order.name || orderName;

          const graphqlCustomerName =
            order.customer
              ? `${order.customer.firstName || ""} ${
                  order.customer.lastName || ""
                }`.trim()
              : "";

          if (graphqlCustomerName) {
            customerName = graphqlCustomerName;
          }

          if (order.email) {
            customerEmail = order.email;
          }

          totalPrice =
            order.totalPriceSet?.shopMoney?.amount ||
            totalPrice;

          currencyCode =
            order.totalPriceSet?.shopMoney?.currencyCode ||
            currencyCode;

          const graphqlLineItems =
            (order.lineItems?.nodes || []).map((item) => {
              const price =
                item?.discountedUnitPriceSet?.shopMoney
                  ?.amount ||
                item?.originalUnitPriceSet?.shopMoney
                  ?.amount ||
                "0.00";

              const itemCurrency =
                item?.discountedUnitPriceSet?.shopMoney
                  ?.currencyCode ||
                item?.originalUnitPriceSet?.shopMoney
                  ?.currencyCode ||
                currencyCode ||
                "";

              return {
                title: item?.name || "Product",
                quantity: item?.quantity || 1,
                price:
                  `${price} ${itemCurrency}`.trim(),
                variant: item?.variant?.title || "",
                sku: item?.variant?.sku || "",
              };
            });

          if (graphqlLineItems.length > 0) {
            lineItems = graphqlLineItems;
          }
        }
      }
    } catch (graphqlError) {
      console.error(
        "Shopify GraphQL request failed:",
        graphqlError,
      );

      console.log(
        "Continuing with webhook payload data.",
      );
    }

    // =========================================================
    // 5. FINAL ORDER DATA
    // =========================================================

    console.log("---------------------------------");
    console.log("FINAL ORDER DATA");

    console.log(
      "Order:",
      orderName,
    );

    console.log(
      "Customer Name:",
      customerName || "N/A",
    );

    console.log(
      "Customer Email:",
      customerEmail || "N/A",
    );

    console.log(
      "Items:",
      lineItems.length,
    );

    console.log(
      "Total:",
      totalPrice,
      currencyCode,
    );

    console.log("---------------------------------");

    // =========================================================
    // 6. GET MANAGERS WHO CAN RECEIVE ORDER NOTIFICATIONS
    // =========================================================
    //
    // Manager must have BOTH:
    //
    // General Notifications = ON
    // Order Notifications = ON
    //
    // If either one is OFF, order email will NOT be sent.
    // =========================================================

    const managers = await prisma.manager.findMany({
      where: {
        shop: shop,

        // General/master notification switch
        notificationsEnabled: true,

        // Specific order notification switch
        orderNotifications: true,
      },
    });

    console.log(
      "Managers enabled for ORDER notifications:",
      managers.length,
    );

    if (managers.length === 0) {
      console.log(
        "No managers are enabled for order notifications.",
      );

      console.log("=================================");

      return new Response(
        "No managers enabled for order notifications",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 7. SEND EMAIL TO EACH MANAGER
    // =========================================================

    let sentCount = 0;
    let failedCount = 0;

    for (const manager of managers) {
      console.log("---------------------------------");

      console.log(
        "Processing order notification for:",
        manager.email,
      );

      console.log(
        "General Notifications:",
        manager.notificationsEnabled,
      );

      console.log(
        "Order Notifications:",
        manager.orderNotifications,
      );

      try {
        await sendOrderNotificationEmail({
          to: manager.email,

          orderName: orderName,

          totalPrice:
            `${totalPrice} ${currencyCode || ""}`.trim(),

          shop: shop,

          customerName:
            customerName || "N/A",

          customerEmail:
            customerEmail || "N/A",

          lineItems: lineItems,
        });

        sentCount++;

        console.log(
          "Order email sent successfully:",
          manager.email,
        );

        // =====================================================
        // SAVE SUCCESS HISTORY
        // =====================================================

        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,

              notificationType: "order",

              resourceId: orderId,

              resourceName: orderName,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "sent",

              errorMessage: null,
            },
          });

          console.log(
            "Success history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Email was sent, but success history could not be saved:",
            manager.email,
          );

          console.error(historyError);
        }
      } catch (emailError) {
        failedCount++;

        console.error(
          "Order email sending failed:",
          manager.email,
        );

        console.error(
          "Email Error:",
          emailError,
        );

        // =====================================================
        // SAVE FAILED HISTORY
        // =====================================================

        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,

              notificationType: "order",

              resourceId: orderId,

              resourceName: orderName,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "failed",

              errorMessage:
                emailError?.message ||
                "Unknown email error",
            },
          });

          console.log(
            "Failed history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Email failed AND failed history could not be saved:",
            manager.email,
          );

          console.error(
            "History Error:",
            historyError,
          );
        }

        // =====================================================
        // IMPORTANT:
        // One manager failure must NOT stop other managers.
        // =====================================================

        console.log(
          "Continuing with next manager...",
        );
      }
    }

    // =========================================================
    // 8. FINAL PROCESSING SUMMARY
    // =========================================================

    console.log("---------------------------------");
    console.log("ORDER NOTIFICATION SUMMARY");

    console.log(
      "Order ID:",
      orderId,
    );

    console.log(
      "Order Name:",
      orderName,
    );

    console.log(
      "Eligible Managers:",
      managers.length,
    );

    console.log(
      "Emails Sent:",
      sentCount,
    );

    console.log(
      "Emails Failed:",
      failedCount,
    );

    console.log("---------------------------------");

    console.log(
      "Order notification processing completed:",
      orderId,
    );

    console.log("=================================");

    return new Response("OK", {
      status: 200,
    });
  } catch (error) {
    console.error(
      "=================================",
    );

    console.error(
      "CRITICAL WEBHOOK PROCESSING ERROR",
    );

    console.error(
      "Error:",
      error,
    );

    console.error(
      "=================================",
    );

    return new Response(
      "Webhook processing failed",
      {
        status: 500,
      },
    );
  }
};
