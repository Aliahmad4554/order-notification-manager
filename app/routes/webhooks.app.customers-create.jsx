import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { sendCustomerNotificationEmail } from "../services/email.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } =
    await authenticate.webhook(request);

  console.log("=================================");
  console.log("CUSTOMER CREATED WEBHOOK RECEIVED");
  console.log("Topic:", topic);
  console.log("Shop:", shop);
  console.log("Customer ID:", payload?.id);
  console.log(
    "Customer Name:",
    `${payload?.first_name || ""} ${payload?.last_name || ""}`.trim(),
  );
  console.log("Customer Email:", payload?.email);

  try {
    // =========================================================
    // 1. BASIC WEBHOOK VALIDATION
    // =========================================================

    if (topic !== "CUSTOMERS_CREATE") {
      console.error("Unexpected webhook topic:", topic);

      return new Response("Unexpected webhook topic", {
        status: 400,
      });
    }

    if (!shop) {
      console.error("Shop is missing from webhook.");

      return new Response("Shop is missing", {
        status: 400,
      });
    }

    const customerId = payload?.id?.toString();

    if (!customerId) {
      console.error(
        "Customer ID missing from webhook payload.",
      );

      return new Response("Customer ID missing", {
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
          notificationType: "customer",
          resourceId: customerId,
        },
      });

    if (existingNotification) {
      console.log(
        "Duplicate webhook detected. Customer already processed:",
        customerId,
      );

      console.log("=================================");

      return new Response("Already processed", {
        status: 200,
      });
    }

    // =========================================================
    // 3. CUSTOMER DATA
    // =========================================================

    const firstName = payload?.first_name || "";
    const lastName = payload?.last_name || "";

    const customerName =
      `${firstName} ${lastName}`.trim() || "New Customer";

    const customerEmail =
      payload?.email || "";

    const customerPhone =
      payload?.phone || "";

    const customerState =
      payload?.state || "";

    const customerCurrency =
      payload?.currency || "";

    console.log("---------------------------------");
    console.log("CUSTOMER DATA");
    console.log("Customer ID:", customerId);
    console.log("Customer Name:", customerName);
    console.log(
      "Customer Email:",
      customerEmail || "N/A",
    );
    console.log(
      "Customer Phone:",
      customerPhone || "N/A",
    );
    console.log(
      "Customer State:",
      customerState || "N/A",
    );
    console.log(
      "Customer Currency:",
      customerCurrency || "N/A",
    );
    console.log("---------------------------------");

    // =========================================================
    // 4. GET MANAGERS WHO CAN RECEIVE CUSTOMER NOTIFICATIONS
    // =========================================================
    //
    // Manager must have BOTH:
    //
    // General Notifications = ON
    // Customer Notifications = ON
    //
    // If either one is OFF, customer email will NOT be sent.
    // =========================================================

    const managers = await prisma.manager.findMany({
      where: {
        shop: shop,

        // General/master notification switch
        notificationsEnabled: true,

        // Specific customer notification switch
        customerNotifications: true,
      },
    });

    console.log(
      "Managers enabled for CUSTOMER notifications:",
      managers.length,
    );

    if (managers.length === 0) {
      console.log(
        "No managers are enabled for customer notifications.",
      );

      console.log("=================================");

      return new Response(
        "No managers enabled for customer notifications",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 5. CUSTOMER EMAIL CHECK
    // =========================================================

    if (!customerEmail) {
      console.log(
        "Customer has no email address.",
      );

      console.log(
        "Customer notification cannot be sent.",
      );

      console.log("=================================");

      return new Response(
        "Customer has no email",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 6. SEND EMAIL TO EACH MANAGER
    // =========================================================

    let sentCount = 0;
    let failedCount = 0;

    for (const manager of managers) {
      console.log("---------------------------------");

      console.log(
        "Processing customer notification for:",
        manager.email,
      );

      console.log(
        "General Notifications:",
        manager.notificationsEnabled,
      );

      console.log(
        "Customer Notifications:",
        manager.customerNotifications,
      );

      try {
        await sendCustomerNotificationEmail({
          to: manager.email,

          shop: shop,

          customerName: customerName,

          customerEmail: customerEmail,

          customerPhone:
            customerPhone || "N/A",

          customerState:
            customerState || "N/A",

          customerCurrency:
            customerCurrency || "N/A",
        });

        sentCount++;

        console.log(
          "Customer email sent successfully:",
          manager.email,
        );

        // =====================================================
        // SAVE SUCCESS HISTORY
        // =====================================================

        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,

              notificationType: "customer",

              resourceId: customerId,

              resourceName: customerName,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "sent",

              errorMessage: null,
            },
          });

          console.log(
            "Customer success history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Customer email was sent, but success history could not be saved:",
            manager.email,
          );

          console.error(historyError);
        }
      } catch (emailError) {
        failedCount++;

        console.error(
          "Customer email sending failed:",
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

              notificationType: "customer",

              resourceId: customerId,

              resourceName: customerName,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "failed",

              errorMessage:
                emailError?.message ||
                "Unknown email error",
            },
          });

          console.log(
            "Customer failed history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Customer email failed AND failed history could not be saved:",
            manager.email,
          );

          console.error(
            "History Error:",
            historyError,
          );
        }

        // IMPORTANT:
        // One manager failure must NOT stop other managers.

        console.log(
          "Continuing with next manager...",
        );
      }
    }

    // =========================================================
    // 7. FINAL PROCESSING SUMMARY
    // =========================================================

    console.log("---------------------------------");
    console.log("CUSTOMER NOTIFICATION SUMMARY");

    console.log(
      "Customer ID:",
      customerId,
    );

    console.log(
      "Customer Name:",
      customerName,
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
      "Customer notification processing completed:",
      customerId,
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
      "CRITICAL CUSTOMER WEBHOOK ERROR",
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
