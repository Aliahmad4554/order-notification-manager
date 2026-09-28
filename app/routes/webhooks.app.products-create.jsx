import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { sendProductNotificationEmail } from "../services/email.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } =
    await authenticate.webhook(request);

  console.log("=================================");
  console.log("PRODUCT CREATED WEBHOOK RECEIVED");
  console.log("Topic:", topic);
  console.log("Shop:", shop);
  console.log("Product ID:", payload?.id);
  console.log("Product Title:", payload?.title);
  console.log("Product Vendor:", payload?.vendor);

  try {
    // =========================================================
    // 1. BASIC WEBHOOK VALIDATION
    // =========================================================

    if (topic !== "PRODUCTS_CREATE") {
      console.error(
        "Unexpected webhook topic:",
        topic,
      );

      return new Response(
        "Unexpected webhook topic",
        {
          status: 400,
        },
      );
    }

    if (!shop) {
      console.error(
        "Shop is missing from webhook.",
      );

      return new Response(
        "Shop is missing",
        {
          status: 400,
        },
      );
    }

    const productId =
      payload?.id?.toString();

    if (!productId) {
      console.error(
        "Product ID missing from webhook payload.",
      );

      return new Response(
        "Product ID missing",
        {
          status: 400,
        },
      );
    }

    // =========================================================
    // 2. PRODUCT DATA
    // =========================================================

    const productTitle =
      payload?.title ||
      "New Product";

    const productVendor =
      payload?.vendor ||
      "N/A";

    const productType =
      payload?.product_type ||
      "N/A";

    const productHandle =
      payload?.handle ||
      "N/A";

    const productStatus =
      payload?.status ||
      "N/A";

    console.log("---------------------------------");
    console.log("PRODUCT DATA");
    console.log("Product ID:", productId);
    console.log("Product Title:", productTitle);
    console.log("Product Vendor:", productVendor);
    console.log("Product Type:", productType);
    console.log("Product Handle:", productHandle);
    console.log("Product Status:", productStatus);
    console.log("---------------------------------");

    // =========================================================
    // 3. DUPLICATE PROTECTION
    // =========================================================

    const existingNotification =
      await prisma.notificationHistory.findFirst({
        where: {
          shop: shop,
          notificationType: "product",
          resourceId: productId,
        },
      });

    if (existingNotification) {
      console.log(
        "Duplicate webhook detected. Product already processed:",
        productId,
      );

      console.log("=================================");

      return new Response(
        "Already processed",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 4. GET MANAGERS WHO CAN RECEIVE PRODUCT NOTIFICATIONS
    // =========================================================
    //
    // Manager must have BOTH:
    //
    // General Notifications = ON
    // Product Notifications = ON
    //
    // =========================================================

    const managers =
      await prisma.manager.findMany({
        where: {
          shop: shop,

          // General/master notification switch
          notificationsEnabled: true,

          // Specific product notification switch
          productNotifications: true,
        },
      });

    console.log(
      "Managers enabled for PRODUCT notifications:",
      managers.length,
    );

    if (managers.length === 0) {
      console.log(
        "No managers are enabled for product notifications.",
      );

      console.log("=================================");

      return new Response(
        "No managers enabled for product notifications",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 5. SEND EMAIL TO EACH MANAGER
    // =========================================================

    let sentCount = 0;
    let failedCount = 0;

    for (const manager of managers) {
      console.log("---------------------------------");

      console.log(
        "Processing product notification for:",
        manager.email,
      );

      console.log(
        "General Notifications:",
        manager.notificationsEnabled,
      );

      console.log(
        "Product Notifications:",
        manager.productNotifications,
      );

      try {
        await sendProductNotificationEmail({
          to: manager.email,

          shop: shop,

          productId: productId,

          productTitle: productTitle,

          productVendor: productVendor,

          productType: productType,

          productHandle: productHandle,

          productStatus: productStatus,
        });

        sentCount++;

        console.log(
          "Product email sent successfully:",
          manager.email,
        );

        // =====================================================
        // SAVE SUCCESS HISTORY
        // =====================================================

        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,

              notificationType: "product",

              resourceId: productId,

              resourceName: productTitle,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "sent",

              errorMessage: null,
            },
          });

          console.log(
            "Product success history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Product email was sent, but success history could not be saved:",
            manager.email,
          );

          console.error(historyError);
        }
      } catch (emailError) {
        failedCount++;

        console.error(
          "Product email sending failed:",
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

              notificationType: "product",

              resourceId: productId,

              resourceName: productTitle,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "failed",

              errorMessage:
                emailError?.message ||
                "Unknown email error",
            },
          });

          console.log(
            "Product failed history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Product email failed AND failed history could not be saved:",
            manager.email,
          );

          console.error(
            "History Error:",
            historyError,
          );
        }

        // One manager failure must NOT stop
        // other managers.

        console.log(
          "Continuing with next manager...",
        );
      }
    }

    // =========================================================
    // 6. FINAL PROCESSING SUMMARY
    // =========================================================

    console.log("---------------------------------");
    console.log(
      "PRODUCT NOTIFICATION SUMMARY",
    );

    console.log(
      "Product ID:",
      productId,
    );

    console.log(
      "Product Title:",
      productTitle,
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
      "Product notification processing completed:",
      productId,
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
      "CRITICAL PRODUCT WEBHOOK ERROR",
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
