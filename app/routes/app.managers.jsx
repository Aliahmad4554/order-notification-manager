import {
  Form,
  useLoaderData,
  useActionData,
} from "react-router";

import { authenticate } from "../shopify.server";

import prisma from "../db.server";

import {
  sendTestNotificationEmail,
} from "../services/email.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const managers = await prisma.manager.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { managers };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  const actionType = formData.get("action");

  // =========================================================
  // ADD MANAGER
  // =========================================================

  if (actionType === "add") {
    const name = formData.get("name");
    const email = formData.get("email");

    if (!name || !email) {
      return {
        error: "Name and email are required.",
      };
    }

    const cleanName = name.toString().trim();
    const cleanEmail = email
      .toString()
      .trim()
      .toLowerCase();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return {
        error: "Please enter a valid email address.",
      };
    }

    if (cleanName.length < 2) {
      return {
        error:
          "Manager name must be at least 2 characters.",
      };
    }

    try {
      await prisma.manager.create({
        data: {
          shop: session.shop,
          name: cleanName,
          email: cleanEmail,

          notificationsEnabled: true,

          orderNotifications: true,
          customerNotifications: true,
          newsletterNotifications: true,
          productNotifications: true,
          contactNotifications: true,
        },
      });

      return {
        success: "Manager added successfully.",
      };
    } catch (error) {
      console.error(
        "Manager create error:",
        error,
      );

      return {
        error:
          "This manager email may already exist.",
      };
    }
  }

  // =========================================================
  // DELETE MANAGER
  // =========================================================

  if (actionType === "delete") {
    const managerId = formData.get("managerId");

    if (!managerId) {
      return {
        error: "Manager ID is required.",
      };
    }

    try {
      await prisma.manager.deleteMany({
        where: {
          id: managerId.toString(),
          shop: session.shop,
        },
      });

      return {
        success: "Manager deleted successfully.",
      };
    } catch (error) {
      console.error(
        "Manager delete error:",
        error,
      );

      return {
        error: "Unable to delete manager.",
      };
    }
  }

  // =========================================================
  // TOGGLE GENERAL NOTIFICATIONS
  // =========================================================

  if (actionType === "toggleGeneral") {
    const managerId = formData.get("managerId");

    if (!managerId) {
      return {
        error: "Manager ID is required.",
      };
    }

    try {
      const manager =
        await prisma.manager.findFirst({
          where: {
            id: managerId.toString(),
            shop: session.shop,
          },
        });

      if (!manager) {
        return {
          error: "Manager not found.",
        };
      }

      await prisma.manager.update({
        where: {
          id: manager.id,
        },

        data: {
          notificationsEnabled:
            !manager.notificationsEnabled,
        },
      });

      return {
        success:
          "General notification setting updated.",
      };
    } catch (error) {
      console.error(
        "General notification toggle error:",
        error,
      );

      return {
        error:
          "Unable to update notification setting.",
      };
    }
  }

  // =========================================================
  // TOGGLE INDIVIDUAL NOTIFICATION
  // =========================================================

  if (actionType === "togglePreference") {
    const managerId = formData.get("managerId");
    const preference = formData.get("preference");

    const allowedPreferences = [
      "orderNotifications",
      "customerNotifications",
      "newsletterNotifications",
      "productNotifications",
      "contactNotifications",
    ];

    if (!managerId) {
      return {
        error: "Manager ID is required.",
      };
    }

    if (!allowedPreferences.includes(preference)) {
      return {
        error: "Invalid notification preference.",
      };
    }

    try {
      const manager =
        await prisma.manager.findFirst({
          where: {
            id: managerId.toString(),
            shop: session.shop,
          },
        });

      if (!manager) {
        return {
          error: "Manager not found.",
        };
      }

      await prisma.manager.update({
        where: {
          id: manager.id,
        },

        data: {
          [preference]: !manager[preference],
        },
      });

      return {
        success:
          "Notification preference updated.",
      };
    } catch (error) {
      console.error(
        "Notification preference error:",
        error,
      );

      return {
        error:
          "Unable to update notification preference.",
      };
    }
  }

  // =========================================================
  // TEST NOTIFICATION
  // =========================================================

  if (actionType === "test") {
    const managerId = formData.get("managerId");

    if (!managerId) {
      return {
        error: "Manager ID is required.",
      };
    }

    try {
      const manager =
        await prisma.manager.findFirst({
          where: {
            id: managerId.toString(),
            shop: session.shop,
          },
        });

      if (!manager) {
        return {
          error: "Manager not found.",
        };
      }

      await sendTestNotificationEmail({
        to: manager.email,
        managerName: manager.name,
        shop: session.shop,
      });

      return {
        success: `Test notification sent to ${manager.email}.`,
      };
    } catch (error) {
      console.error(
        "Test notification error:",
        error,
      );

      return {
        error:
          "Unable to send test notification.",
      };
    }
  }

  return null;
};

export default function Managers() {
  const { managers } = useLoaderData();

  const actionData = useActionData();

  return (
    <s-page heading="Order Notification Managers">

      {/* =====================================================
          SUCCESS / ERROR MESSAGE
      ===================================================== */}

      {actionData?.success && (
        <s-banner tone="success">
          {actionData.success}
        </s-banner>
      )}

      {actionData?.error && (
        <s-banner tone="critical">
          {actionData.error}
        </s-banner>
      )}

      {/* =====================================================
          INTRODUCTION
      ===================================================== */}

      <s-section>
        <s-stack gap="small">
          <s-heading>
            Manage Notification Managers
          </s-heading>

          <s-paragraph>
            Add managers who should receive store
            notifications. You can control each
            notification type separately.
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* =====================================================
          ADD MANAGER
      ===================================================== */}

      <s-section heading="Add Manager">

        <Form method="post">

          <input
            type="hidden"
            name="action"
            value="add"
          />

          <s-stack gap="base">

            <s-text-field
              label="Manager Name"
              name="name"
              placeholder="e.g. Ali Ahmad"
              required
            />

            <s-text-field
              label="Manager Email"
              name="email"
              type="email"
              placeholder="manager@example.com"
              required
            />

            <s-button
              type="submit"
              variant="primary"
            >
              Add Manager
            </s-button>

          </s-stack>

        </Form>

      </s-section>

      {/* =====================================================
          MANAGERS LIST
      ===================================================== */}

      <s-section
        heading={`Managers (${managers.length})`}
      >

        {managers.length === 0 ? (

          <s-stack gap="small">

            <s-heading>
              No managers added
            </s-heading>

            <s-paragraph>
              Add your first manager above to start
              sending notifications.
            </s-paragraph>

          </s-stack>

        ) : (

          <s-stack gap="base">

            {managers.map((manager) => (

              <s-box
                key={manager.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >

                <s-stack gap="base">

                  {/* =================================================
                      MANAGER INFORMATION
                  ================================================= */}

                  <s-stack gap="small">

                    <s-heading>
                      {manager.name}
                    </s-heading>

                    <s-paragraph>
                      {manager.email}
                    </s-paragraph>

                    <s-badge
                      tone={
                        manager.notificationsEnabled
                          ? "success"
                          : "neutral"
                      }
                    >
                      {manager.notificationsEnabled
                        ? "Notifications Enabled"
                        : "Notifications Disabled"}
                    </s-badge>

                  </s-stack>

                  {/* =================================================
                      GENERAL NOTIFICATIONS
                  ================================================= */}

                  <s-box
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                  >

                    <s-stack gap="small">

                      <s-heading>
                        General Notifications
                      </s-heading>

                      <s-paragraph>
                        Master switch for this manager.
                        When disabled, no notification
                        will be sent to this manager.
                      </s-paragraph>

                      <Form method="post">

                        <input
                          type="hidden"
                          name="action"
                          value="toggleGeneral"
                        />

                        <input
                          type="hidden"
                          name="managerId"
                          value={manager.id}
                        />

                        <s-button type="submit">
                          {manager.notificationsEnabled
                            ? "Disable All Notifications"
                            : "Enable All Notifications"}
                        </s-button>

                      </Form>

                    </s-stack>

                  </s-box>

                  {/* =================================================
                      NOTIFICATION PREFERENCES
                  ================================================= */}

                  <s-box
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                  >

                    <s-stack gap="base">

                      <s-heading>
                        Notification Preferences
                      </s-heading>

                      <s-paragraph>
                        Choose which events this manager
                        should receive.
                      </s-paragraph>

                      {/* ORDER */}

                      <PreferenceRow
                        manager={manager}
                        preference="orderNotifications"
                        label="Order Notifications"
                      />

                      {/* CUSTOMER */}

                      <PreferenceRow
                        manager={manager}
                        preference="customerNotifications"
                        label="Customer Notifications"
                      />

                      {/* NEWSLETTER */}

                      <PreferenceRow
                        manager={manager}
                        preference="newsletterNotifications"
                        label="Newsletter Notifications"
                      />

                      {/* PRODUCT */}

                      <PreferenceRow
                        manager={manager}
                        preference="productNotifications"
                        label="Product Notifications"
                      />

                      {/* CONTACT */}

                      <PreferenceRow
                        manager={manager}
                        preference="contactNotifications"
                        label="Contact Form Notifications"
                      />

                    </s-stack>

                  </s-box>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <s-stack
                    direction="inline"
                    gap="small"
                  >

                    {/* TEST EMAIL */}

                    <Form method="post">

                      <input
                        type="hidden"
                        name="action"
                        value="test"
                      />

                      <input
                        type="hidden"
                        name="managerId"
                        value={manager.id}
                      />

                      <s-button type="submit">
                        Send Test Email
                      </s-button>

                    </Form>

                    {/* DELETE */}

                    <Form method="post">

                      <input
                        type="hidden"
                        name="action"
                        value="delete"
                      />

                      <input
                        type="hidden"
                        name="managerId"
                        value={manager.id}
                      />

                      <s-button
                        type="submit"
                        tone="critical"
                      >
                        Delete
                      </s-button>

                    </Form>

                  </s-stack>

                </s-stack>

              </s-box>

            ))}

          </s-stack>

        )}

      </s-section>

    </s-page>
  );
}

function PreferenceRow({
  manager,
  preference,
  label,
}) {
  const enabled = manager[preference];

  return (
    <s-box
      padding="small"
      borderWidth="base"
      borderRadius="base"
    >

      <s-stack
        direction="inline"
        gap="base"
      >

        <Form method="post">

          <input
            type="hidden"
            name="action"
            value="togglePreference"
          />

          <input
            type="hidden"
            name="managerId"
            value={manager.id}
          />

          <input
            type="hidden"
            name="preference"
            value={preference}
          />

          <s-button type="submit">
            {enabled ? "Disable" : "Enable"}
          </s-button>

        </Form>

        <s-stack gap="small">

          <s-paragraph>
            <strong>{label}</strong>
          </s-paragraph>

          <s-badge
            tone={
              enabled
                ? "success"
                : "neutral"
            }
          >
            {enabled
              ? "Enabled"
              : "Disabled"}
          </s-badge>

        </s-stack>

      </s-stack>

    </s-box>
  );
}
