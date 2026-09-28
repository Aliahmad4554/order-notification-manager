import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const [
    totalManagers,
    activeManagers,
    totalNotifications,
    sentNotifications,
    failedNotifications,
    recentNotifications,
  ] = await Promise.all([
    prisma.manager.count({
      where: {
        shop: session.shop,
      },
    }),

    prisma.manager.count({
      where: {
        shop: session.shop,
        notificationsEnabled: true,
      },
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

    prisma.notificationHistory.findMany({
      where: {
        shop: session.shop,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return {
    stats: {
      totalManagers,
      activeManagers,
      totalNotifications,
      sentNotifications,
      failedNotifications,
    },

    recentNotifications: recentNotifications.map(
      (notification) => ({
        id: notification.id,
        type: notification.notificationType,
        resourceName: notification.resourceName,
        managerEmail: notification.managerEmail,
        status: notification.status,
        createdAt: notification.createdAt.toISOString(),
      }),
    ),
  };
};

export default function Index() {
  const {
    stats,
    recentNotifications,
  } = useLoaderData();

  return (
    <s-page heading="Order Notification Manager">
      <s-button
        slot="primary-action"
        href="/app/managers"
      >
        Manage Managers
      </s-button>

      {/* Overview */}
      <s-section heading="Overview">
        <s-grid
          gridTemplateColumns="repeat(3, 1fr)"
          gap="base"
        >
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Total Managers</s-heading>
            <s-title>
              {stats.totalManagers}
            </s-title>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Active Managers</s-heading>
            <s-title>
              {stats.activeManagers}
            </s-title>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Total Notifications</s-heading>
            <s-title>
              {stats.totalNotifications}
            </s-title>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Sent</s-heading>
            <s-title>
              {stats.sentNotifications}
            </s-title>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Failed</s-heading>
            <s-title>
              {stats.failedNotifications}
            </s-title>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-heading>Notification Types</s-heading>
            <s-paragraph>
              Order, Customer, Newsletter,
              Product & Contact
            </s-paragraph>
          </s-box>
        </s-grid>
      </s-section>

      {/* Notification status */}
      <s-section heading="Notification Status">
        <s-stack
          direction="inline"
          gap="base"
        >
          <s-badge tone="success">
            {stats.sentNotifications} Sent
          </s-badge>

          <s-badge tone="critical">
            {stats.failedNotifications} Failed
          </s-badge>
        </s-stack>
      </s-section>

      {/* Recent notifications */}
      <s-section heading="Recent Notifications">
        {recentNotifications.length === 0 ? (
          <s-paragraph>
            No notification history yet.
          </s-paragraph>
        ) : (
          <s-table>
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

            <s-table-body>
              {recentNotifications.map(
                (notification) => (
                  <s-table-row
                    key={notification.id}
                  >
                    <s-table-cell>
                      <strong>
                        {formatNotificationType(
                          notification.type,
                        )}
                      </strong>
                    </s-table-cell>

                    <s-table-cell>
                      {notification.resourceName ||
                        "N/A"}
                    </s-table-cell>

                    <s-table-cell>
                      {notification.managerEmail ||
                        "N/A"}
                    </s-table-cell>

                    <s-table-cell>
                      <StatusBadge
                        status={
                          notification.status
                        }
                      />
                    </s-table-cell>

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

      {/* Quick actions */}
      <s-section heading="Quick Actions">
        <s-stack
          direction="inline"
          gap="base"
        >
          <s-button href="/app/managers">
            Manage Managers
          </s-button>

          <s-button
            href="/app/history"
            variant="secondary"
          >
            View Notification History
          </s-button>
        </s-stack>
      </s-section>

      {/* How it works */}
      <s-section
        slot="aside"
        heading="How it works"
      >
        <s-paragraph>
          Add managers and choose which
          notifications they should receive.
        </s-paragraph>

        <s-paragraph>
          Supported notifications:
        </s-paragraph>

        <s-unordered-list>
          <s-list-item>
            Order notifications
          </s-list-item>

          <s-list-item>
            Customer notifications
          </s-list-item>

          <s-list-item>
            Newsletter notifications
          </s-list-item>

          <s-list-item>
            Product notifications
          </s-list-item>

          <s-list-item>
            Contact form notifications
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

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

function formatDate(date) {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}

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

  return <s-badge>{status}</s-badge>;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
