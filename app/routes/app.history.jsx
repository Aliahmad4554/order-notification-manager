import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";

import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const [
    notifications,
    totalNotifications,
    sentNotifications,
    failedNotifications,
  ] = await Promise.all([
    prisma.notificationHistory.findMany({
      where: {
        shop: session.shop,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 100,
    }),

    prisma.notificationHistory.count({
      where: {
        shop: session.shop,
      },
    }),

    prisma.notificationHistory.count({
      where: {
        shop: session.shop,
        status: "sent",
      },
    }),

    prisma.notificationHistory.count({
      where: {
        shop: session.shop,
        status: "failed",
      },
    }),
  ]);

  return {
    stats: {
      total: totalNotifications,
      sent: sentNotifications,
      failed: failedNotifications,
    },

    notifications: notifications.map(
      (notification) => ({
        id: notification.id,

        type: notification.notificationType,

        resourceId:
          notification.resourceId,

        resourceName:
          notification.resourceName,

        managerEmail:
          notification.managerEmail,

        status:
          notification.status,

        errorMessage:
          notification.errorMessage,

        createdAt:
          notification.createdAt.toISOString(),
      }),
    ),
  };
};

export default function NotificationHistory() {
  const {
    stats,
    notifications,
  } = useLoaderData();

  return (
    <s-page heading="Notification History">

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <s-section heading="Overview">

        <s-grid
          gridTemplateColumns="repeat(3, 1fr)"
          gap="base"
        >

          {/* TOTAL */}

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >

            <s-stack gap="small">

              <s-heading>
                Total Notifications
              </s-heading>

              <s-title>
                {stats.total}
              </s-title>

            </s-stack>

          </s-box>

          {/* SENT */}

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >

            <s-stack gap="small">

              <s-heading>
                Sent
              </s-heading>

              <s-title>
                {stats.sent}
              </s-title>

              <s-badge tone="success">
                Successful
              </s-badge>

            </s-stack>

          </s-box>

          {/* FAILED */}

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >

            <s-stack gap="small">

              <s-heading>
                Failed
              </s-heading>

              <s-title>
                {stats.failed}
              </s-title>

              <s-badge tone="critical">
                Failed
              </s-badge>

            </s-stack>

          </s-box>

        </s-grid>

      </s-section>

      {/* =====================================================
          HISTORY
      ===================================================== */}

      <s-section heading="Notification Records">

        {notifications.length === 0 ? (

          <s-box
            padding="large"
            borderWidth="base"
            borderRadius="base"
          >

            <s-stack gap="small">

              <s-heading>
                No notification history
              </s-heading>

              <s-paragraph>
                Notification records will appear here
                when your managers receive notifications.
              </s-paragraph>

            </s-stack>

          </s-box>

        ) : (

          <s-table>

            {/* =================================================
                TABLE HEADER
            ================================================= */}

            <s-table-header-row>

              <s-table-header listSlot="primary">
                Type
              </s-table-header>

              <s-table-header listSlot="secondary">
                Resource
              </s-table-header>

              <s-table-header>
                Manager
              </s-table-header>

              <s-table-header>
                Status
              </s-table-header>

              <s-table-header>
                Date
              </s-table-header>

            </s-table-header-row>

            {/* =================================================
                TABLE BODY
            ================================================= */}

            <s-table-body>

              {notifications.map(
                (notification) => (

                  <s-table-row
                    key={notification.id}
                  >

                    {/* TYPE */}

                    <s-table-cell>

                      <s-stack gap="small">

                        <strong>
                          {formatNotificationType(
                            notification.type,
                          )}
                        </strong>

                      </s-stack>

                    </s-table-cell>

                    {/* RESOURCE */}

                    <s-table-cell>

                      <s-stack gap="small">

                        <span>
                          {notification.resourceName ||
                            "N/A"}
                        </span>

                        {notification.resourceId && (
                          <s-paragraph>
                            ID:{" "}
                            {notification.resourceId}
                          </s-paragraph>
                        )}

                      </s-stack>

                    </s-table-cell>

                    {/* MANAGER */}

                    <s-table-cell>

                      {notification.managerEmail ||
                        "N/A"}

                    </s-table-cell>

                    {/* STATUS */}

                    <s-table-cell>

                      <StatusBadge
                        status={
                          notification.status
                        }
                      />

                    </s-table-cell>

                    {/* DATE */}

                    <s-table-cell>

                      {formatDate(
                        notification.createdAt,
                      )}

                    </s-table-cell>

                  </s-table-row>

                ),
              )}

            </s-table-body>

          </s-table>

        )}

      </s-section>

      {/* =====================================================
          INFORMATION
      ===================================================== */}

      <s-section
        slot="aside"
        heading="About Notification History"
      >

        <s-paragraph>
          This page records notification attempts
          made by the app.
        </s-paragraph>

        <s-paragraph>
          A notification is marked as Sent when
          the email service accepts the email.
        </s-paragraph>

        <s-paragraph>
          Failed notifications include an error
          message that can help identify the issue.
        </s-paragraph>

      </s-section>

    </s-page>
  );
}

/* =========================================================
   NOTIFICATION TYPE
========================================================= */

function formatNotificationType(type) {
  const labels = {
    order: "Order",
    customer: "Customer",
    newsletter: "Newsletter",
    product: "Product",
    contact: "Contact Form",
  };

  return labels[type] || type;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(date) {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({ status }) {
  if (status === "sent") {
    return (
      <s-badge tone="success">
        Sent
      </s-badge>
    );
  }

  if (status === "failed") {
    return (
      <s-badge tone="critical">
        Failed
      </s-badge>
    );
  }

  return (
    <s-badge>
      {status}
    </s-badge>
  );
}
