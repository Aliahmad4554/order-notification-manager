import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { sendNewsletterNotificationEmail } from "../services/email.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } =
    await authenticate.webhook(request);

  console.log("=================================");
  console.log(
    "CUSTOMER EMAIL MARKETING CONSENT WEBHOOK RECEIVED",
  );
  console.log("Topic:", topic);
  console.log("Shop:", shop);
  console.log("Customer ID:", payload?.customer_id);
  console.log("Customer Email:", payload?.email_address);
  console.log(
    "Marketing State:",
    payload?.email_marketing_consent?.state,
  );

  try {
    // =========================================================
    // 1. BASIC WEBHOOK VALIDATION
    // =========================================================

    if (
      topic !==
      "CUSTOMERS_EMAIL_MARKETING_CONSENT_UPDATE"
    ) {
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

    const customerId =
      payload?.customer_id?.toString();

    if (!customerId) {
      console.error(
        "Customer ID missing from webhook payload.",
      );

      return new Response(
        "Customer ID missing",
        {
          status: 400,
        },
      );
    }

    // =========================================================
    // 2. NEWSLETTER / MARKETING DATA
    // =========================================================

    const customerEmail =
      payload?.email_address || "";

    const marketingState =
      payload?.email_marketing_consent?.state ||
      "";

    console.log("---------------------------------");
    console.log("NEWSLETTER DATA");
    console.log(
      "Customer ID:",
      customerId,
    );
    console.log(
      "Customer Email:",
      customerEmail || "N/A",
    );
    console.log(
      "Marketing State:",
      marketingState || "N/A",
    );
    console.log("---------------------------------");

    // =========================================================
    // 3. ONLY SUBSCRIBED CUSTOMERS ARE NEWSLETTER SIGNUPS
    // =========================================================

    if (marketingState !== "subscribed") {
      console.log(
        "Customer is not subscribed to email marketing.",
      );

      console.log(
        "Newsletter notification will NOT be sent.",
      );

      console.log("=================================");

      return new Response(
        "Customer is not subscribed",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 4. CUSTOMER EMAIL CHECK
    // =========================================================

    if (!customerEmail) {
      console.log(
        "Newsletter subscriber has no email address.",
      );

      console.log(
        "Newsletter notification cannot be sent.",
      );

      console.log("=================================");

      return new Response(
        "Customer email missing",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 5. DUPLICATE PROTECTION
    // =========================================================

    const existingNotification =
      await prisma.notificationHistory.findFirst({
        where: {
          shop: shop,
          notificationType: "newsletter",
          resourceId: customerId,
        },
      });

    if (existingNotification) {
      console.log(
        "Duplicate newsletter webhook detected.",
        customerId,
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
    // 6. GET MANAGERS WHO CAN RECEIVE NEWSLETTER
    // =========================================================
    //
    // Manager must have BOTH:
    //
    // General Notifications = ON
    // Newsletter Notifications = ON
    //
    // =========================================================

    const managers =
      await prisma.manager.findMany({
        where: {
          shop: shop,

          // General/master notification switch
          notificationsEnabled: true,

          // Specific newsletter notification switch
          newsletterNotifications: true,
        },
      });

    console.log(
      "Managers enabled for NEWSLETTER notifications:",
      managers.length,
    );

    if (managers.length === 0) {
      console.log(
        "No managers are enabled for newsletter notifications.",
      );

      console.log("=================================");

      return new Response(
        "No managers enabled for newsletter notifications",
        {
          status: 200,
        },
      );
    }

    // =========================================================
    // 7. SEND NEWSLETTER EMAIL TO EACH MANAGER
    // =========================================================

    let sentCount = 0;
    let failedCount = 0;

    for (const manager of managers) {
      console.log("---------------------------------");

      console.log(
        "Processing newsletter notification for:",
        manager.email,
      );

      console.log(
        "General Notifications:",
        manager.notificationsEnabled,
      );

      console.log(
        "Newsletter Notifications:",
        manager.newsletterNotifications,
      );

      try {
        await sendNewsletterNotificationEmail({
          to: manager.email,

          shop: shop,

          customerEmail: customerEmail,

          customerId: customerId,
        });

        sentCount++;

        console.log(
          "Newsletter email sent successfully:",
          manager.email,
        );

        // =====================================================
        // SAVE SUCCESS HISTORY
        // =====================================================

        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,

              notificationType: "newsletter",

              resourceId: customerId,

              resourceName: customerEmail,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "sent",

              errorMessage: null,
            },
          });

          console.log(
            "Newsletter success history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Newsletter email was sent, but success history could not be saved:",
            manager.email,
          );

          console.error(historyError);
        }
      } catch (emailError) {
        failedCount++;

        console.error(
          "Newsletter email sending failed:",
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

              notificationType: "newsletter",

              resourceId: customerId,

              resourceName: customerEmail,

              managerId: manager.id,

              managerEmail: manager.email,

              status: "failed",

              errorMessage:
                emailError?.message ||
                "Unknown email error",
            },
          });

          console.log(
            "Newsletter failed history saved:",
            manager.email,
          );
        } catch (historyError) {
          console.error(
            "Newsletter email failed AND failed history could not be saved:",
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
    // 8. FINAL PROCESSING SUMMARY
    // =========================================================

    console.log("---------------------------------");
    console.log(
      "NEWSLETTER NOTIFICATION SUMMARY",
    );

    console.log(
      "Customer ID:",
      customerId,
    );

    console.log(
      "Customer Email:",
      customerEmail,
    );

    console.log(
      "Marketing State:",
      marketingState,
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
      "Newsletter notification processing completed:",
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
      "CRITICAL NEWSLETTER WEBHOOK ERROR",
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