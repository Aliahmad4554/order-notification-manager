import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { sendContactNotificationEmail } from "../services/email.server";

export const action = async ({ request }) => {
  try {
    // Authenticate Shopify App Proxy request
    await authenticate.public.appProxy(request);

    // Get shop from App Proxy query string
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return new Response("Shop is missing", {
        status: 400,
      });
    }

    // Get submitted form data
    const formData = await request.formData();

    const name =
      formData.get("name")?.toString().trim() || "";

    const email =
      formData.get("email")?.toString().trim() || "";

    const phone =
      formData.get("phone")?.toString().trim() || "";

    const message =
      formData.get("message")?.toString().trim() || "";

    // Validate required fields
    if (!email || !message) {
      return new Response(
        "Email and message are required",
        {
          status: 400,
        },
      );
    }

    // Unique identifier for this contact submission
    const resourceId = `${email}:${message}`;

    // Find managers who have contact notifications enabled
    const managers = await prisma.manager.findMany({
      where: {
        shop: shop,
        notificationsEnabled: true,
        contactNotifications: true,
      },
    });

    if (managers.length === 0) {
      return new Response(
        "No managers enabled for contact notifications",
        {
          status: 200,
        },
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send notification to every enabled manager
    for (const manager of managers) {
      // Prevent duplicate notification
      const existingNotification =
        await prisma.notificationHistory.findFirst({
          where: {
            shop: shop,
            notificationType: "contact",
            resourceId: resourceId,
            managerId: manager.id,
          },
        });

      if (existingNotification) {
        continue;
      }

      try {
        // Send email
        await sendContactNotificationEmail({
          to: manager.email,
          shop,
          name,
          email,
          phone,
          message,
        });

        sentCount++;

        // Save successful notification
        await prisma.notificationHistory.create({
          data: {
            shop: shop,
            notificationType: "contact",
            resourceId: resourceId,
            resourceName: name || email,
            managerId: manager.id,
            managerEmail: manager.email,
            status: "sent",
            errorMessage: null,
          },
        });
      } catch (error) {
        failedCount++;

        // Save failed notification
        try {
          await prisma.notificationHistory.create({
            data: {
              shop: shop,
              notificationType: "contact",
              resourceId: resourceId,
              resourceName: name || email,
              managerId: manager.id,
              managerEmail: manager.email,
              status: "failed",
              errorMessage:
                error?.message ||
                "Unknown email error",
            },
          });
        } catch (historyError) {
          console.error(
            "Failed to save contact notification history:",
            historyError,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Contact form processing failed:",
      error,
    );

    return new Response(
      "Contact form processing failed",
      {
        status: 500,
      },
    );
  }
};
