import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ========================================
// ORDER NOTIFICATION EMAIL
// ========================================
export async function sendOrderNotificationEmail({
  to,
  orderName,
  totalPrice,
  shop,
  customerName,
  customerEmail,
  lineItems,
}) {
  const itemsHtml =
    lineItems && lineItems.length > 0
      ? lineItems
          .map(
            (item) => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                  ${item.title}
                </td>

                <td style="
                  padding: 12px;
                  border-bottom: 1px solid #eee;
                  text-align: center;
                ">
                  ${item.quantity}
                </td>

                <td style="
                  padding: 12px;
                  border-bottom: 1px solid #eee;
                  text-align: right;
                ">
                  ${item.price}
                </td>
              </tr>
            `,
          )
          .join("")
      : `
          <tr>
            <td colspan="3" style="padding: 12px;">
              No product information available.
            </td>
          </tr>
        `;

  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",
    to: [to],
    subject: `New Order ${orderName}`,

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>New Order ${orderName}</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 650px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 25px;
              text-align: center;
            ">
              <h1 style="margin: 0; font-size: 24px;">
                New Order Received
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>
            </div>

            <!-- Order Summary -->
            <div style="padding: 25px;">

              <h2 style="
                margin-top: 0;
                color: #111111;
              ">
                Order ${orderName}
              </h2>

              <p style="color: #555555;">
                A new order has been received in your Shopify store.
              </p>

              <div style="
                background: #f8f8f8;
                padding: 18px;
                border-radius: 8px;
                margin: 20px 0;
              ">

                <p style="margin: 6px 0;">
                  <strong>Store:</strong> ${shop}
                </p>

                <p style="margin: 6px 0;">
                  <strong>Total:</strong> ${totalPrice}
                </p>

                ${
                  customerName
                    ? `
                      <p style="margin: 6px 0;">
                        <strong>Customer:</strong> ${customerName}
                      </p>
                    `
                    : ""
                }

                ${
                  customerEmail
                    ? `
                      <p style="margin: 6px 0;">
                        <strong>Customer Email:</strong> ${customerEmail}
                      </p>
                    `
                    : ""
                }

              </div>

              <!-- Products -->
              <h3 style="
                color: #111111;
                margin-top: 30px;
              ">
                Order Items
              </h3>

              <table style="
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
              ">

                <thead>
                  <tr style="background: #f5f5f5;">

                    <th style="
                      padding: 12px;
                      text-align: left;
                    ">
                      Product
                    </th>

                    <th style="
                      padding: 12px;
                      text-align: center;
                    ">
                      Qty
                    </th>

                    <th style="
                      padding: 12px;
                      text-align: right;
                    ">
                      Price
                    </th>

                  </tr>
                </thead>

                <tbody>
                  ${itemsHtml}
                </tbody>

              </table>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  This notification was sent by
                  Order Notification Manager.
                </p>

                <p style="margin: 5px 0;">
                  Shopify Order Notification System
                </p>

              </div>

            </div>

          </div>

        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ========================================
// CUSTOMER NOTIFICATION EMAIL
// ========================================
export async function sendCustomerNotificationEmail({
  to,
  shop,
  customerName,
  customerEmail,
  customerPhone,
  customerState,
  customerCurrency,
}) {
  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",

    to: [to],

    subject: `New Customer - ${customerName}`,

    html: `
      <!DOCTYPE html>
      <html>

        <head>
          <meta charset="UTF-8" />
          <title>New Customer - ${customerName}</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 650px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 25px;
              text-align: center;
            ">

              <h1 style="
                margin: 0;
                font-size: 24px;
              ">
                New Customer
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>

            </div>

            <!-- Customer Information -->
            <div style="padding: 25px;">

              <h2 style="
                margin-top: 0;
                color: #111111;
              ">
                ${customerName}
              </h2>

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                A new customer has been created in your Shopify store.
              </p>

              <!-- Customer Details -->
              <div style="
                background: #f8f8f8;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
              ">

                <p style="margin: 8px 0;">
                  <strong>Store:</strong>
                  ${shop}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Customer Name:</strong>
                  ${customerName}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Email:</strong>
                  ${customerEmail}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Phone:</strong>
                  ${customerPhone || "N/A"}
                </p>

                <p style="margin: 8px 0;">
                  <strong>State:</strong>
                  ${customerState || "N/A"}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Currency:</strong>
                  ${customerCurrency || "N/A"}
                </p>

              </div>

              <!-- Status -->
              <div style="
                background: #f1f1f1;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              ">

                <p style="
                  margin: 0;
                  color: #333333;
                  font-weight: bold;
                ">
                  New customer successfully created
                </p>

              </div>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  This notification was sent by
                  Order Notification Manager.
                </p>

                <p style="margin: 5px 0;">
                  Shopify Customer Notification System
                </p>

              </div>

            </div>

          </div>

        </body>

      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ========================================
// NEWSLETTER NOTIFICATION EMAIL
// ========================================
export async function sendNewsletterNotificationEmail({
  to,
  shop,
  customerEmail,
  customerId,
}) {
  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",

    to: [to],

    subject: "New Newsletter Subscriber",

    html: `
      <!DOCTYPE html>
      <html>

        <head>
          <meta charset="UTF-8" />
          <title>New Newsletter Subscriber</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 650px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 25px;
              text-align: center;
            ">

              <h1 style="
                margin: 0;
                font-size: 24px;
              ">
                New Newsletter Subscriber
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>

            </div>

            <!-- Content -->
            <div style="padding: 25px;">

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                A customer has subscribed to email marketing
                on your Shopify store.
              </p>

              <div style="
                background: #f8f8f8;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
              ">

                <p style="margin: 8px 0;">
                  <strong>Store:</strong>
                  ${shop}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Customer Email:</strong>
                  ${customerEmail}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Customer ID:</strong>
                  ${customerId}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Status:</strong>
                  Subscribed
                </p>

              </div>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  This notification was sent by
                  Order Notification Manager.
                </p>

                <p style="margin: 5px 0;">
                  Shopify Newsletter Notification System
                </p>

              </div>

            </div>

          </div>

        </body>

      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ========================================
// PRODUCT NOTIFICATION EMAIL
// ========================================
export async function sendProductNotificationEmail({
  to,
  shop,
  productId,
  productTitle,
  productVendor,
  productType,
  productHandle,
  productStatus,
}) {
  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",

    to: [to],

    subject: `New Product - ${productTitle}`,

    html: `
      <!DOCTYPE html>
      <html>

        <head>
          <meta charset="UTF-8" />
          <title>New Product - ${productTitle}</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 650px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 25px;
              text-align: center;
            ">

              <h1 style="
                margin: 0;
                font-size: 24px;
              ">
                New Product Created
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>

            </div>

            <!-- Product Information -->
            <div style="padding: 25px;">

              <h2 style="
                margin-top: 0;
                color: #111111;
              ">
                ${productTitle}
              </h2>

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                A new product has been created in your Shopify store.
              </p>

              <div style="
                background: #f8f8f8;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
              ">

                <p style="margin: 8px 0;">
                  <strong>Store:</strong>
                  ${shop}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Product:</strong>
                  ${productTitle}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Vendor:</strong>
                  ${productVendor}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Product Type:</strong>
                  ${productType}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Product Handle:</strong>
                  ${productHandle}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Status:</strong>
                  ${productStatus}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Product ID:</strong>
                  ${productId}
                </p>

              </div>

              <!-- Status -->
              <div style="
                background: #f1f1f1;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              ">

                <p style="
                  margin: 0;
                  color: #333333;
                  font-weight: bold;
                ">
                  New product successfully created
                </p>

              </div>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  This notification was sent by
                  Order Notification Manager.
                </p>

                <p style="margin: 5px 0;">
                  Shopify Product Notification System
                </p>

              </div>

            </div>

          </div>

        </body>

      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ========================================
// CONTACT FORM NOTIFICATION EMAIL
// ========================================
export async function sendContactNotificationEmail({
  to,
  shop,
  name,
  email,
  phone,
  message,
}) {
  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",

    to: [to],

    subject: `New Contact Form Message - ${name || "Customer"}`,

    html: `
      <!DOCTYPE html>
      <html>

        <head>
          <meta charset="UTF-8" />
          <title>New Contact Form Message</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 650px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 25px;
              text-align: center;
            ">

              <h1 style="
                margin: 0;
                font-size: 24px;
              ">
                New Contact Form Message
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>

            </div>

            <!-- Contact Information -->
            <div style="padding: 25px;">

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                A customer has submitted a new message
                through your Shopify store contact form.
              </p>

              <div style="
                background: #f8f8f8;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
              ">

                <p style="margin: 8px 0;">
                  <strong>Store:</strong>
                  ${shop}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Name:</strong>
                  ${name || "N/A"}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Email:</strong>
                  ${email}
                </p>

                <p style="margin: 8px 0;">
                  <strong>Phone:</strong>
                  ${phone || "N/A"}
                </p>

              </div>

              <!-- Message -->
              <div style="
                background: #ffffff;
                border: 1px solid #e5e7eb;
                padding: 20px;
                border-radius: 8px;
              ">

                <h2 style="
                  margin: 0 0 12px;
                  color: #111111;
                  font-size: 18px;
                ">
                  Message
                </h2>

                <p style="
                  margin: 0;
                  color: #555555;
                  font-size: 15px;
                  line-height: 1.7;
                  white-space: pre-wrap;
                ">
                  ${message}
                </p>

              </div>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  This notification was sent by
                  Order Notification Manager.
                </p>

                <p style="margin: 5px 0;">
                  Shopify Contact Form Notification System
                </p>

              </div>

            </div>

          </div>

        </body>

      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ========================================
// TEST NOTIFICATION EMAIL
// ========================================
export async function sendTestNotificationEmail({
  to,
  managerName,
  shop,
}) {
  const { data, error } = await resend.emails.send({
    from: "Order Notification Manager <onboarding@resend.dev>",
    to: [to],
    subject: "Test Notification - Order Notification Manager",

    html: `
      <!DOCTYPE html>
      <html>

        <head>
          <meta charset="UTF-8" />
          <title>Test Notification</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          ">

            <!-- Header -->
            <div style="
              background: #111111;
              color: #ffffff;
              padding: 30px;
              text-align: center;
            ">

              <h1 style="
                margin: 0;
                font-size: 24px;
              ">
                Test Notification
              </h1>

              <p style="
                margin: 10px 0 0;
                color: #cccccc;
              ">
                Order Notification Manager
              </p>

            </div>

            <!-- Content -->
            <div style="padding: 30px;">

              <h2 style="
                margin-top: 0;
                color: #111111;
              ">
                Hello ${managerName},
              </h2>

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                This is a test notification from
                Order Notification Manager.
              </p>

              <div style="
                background: #f8f8f8;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
              ">

                <p style="margin: 6px 0;">
                  <strong>Store:</strong> ${shop}
                </p>

                <p style="margin: 6px 0;">
                  <strong>Status:</strong>
                  Email delivery is working.
                </p>

              </div>

              <p style="
                color: #555555;
                line-height: 1.6;
              ">
                If you received this email, your manager
                notification setup is working correctly.
              </p>

              <!-- Footer -->
              <div style="
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                text-align: center;
                color: #777777;
                font-size: 13px;
              ">

                <p style="margin: 5px 0;">
                  Order Notification Manager
                </p>

                <p style="margin: 5px 0;">
                  Shopify Order Notification System
                </p>

              </div>

            </div>

          </div>

        </body>

      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}