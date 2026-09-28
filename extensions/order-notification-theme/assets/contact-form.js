(function () {
  "use strict";

  const APP_PROXY_URL = "/apps/order-notification-contact";

  function setupContactForms() {
    const forms = document.querySelectorAll(
      'form[action*="/contact"]',
    );

    console.log(
      "Order Notification Manager: Contact forms found:",
      forms.length,
    );

    forms.forEach((form) => {
      if (
        form.dataset.orderNotificationConnected ===
        "true"
      ) {
        return;
      }

      form.dataset.orderNotificationConnected = "true";

      console.log(
        "Order Notification Manager: Contact form connected.",
      );

      const button = form.querySelector(
        'button[type="submit"]',
      );

      if (!button) {
        console.warn(
          "Order Notification Manager: Submit button not found.",
        );

        return;
      }

      button.addEventListener(
        "click",
        async function () {
          console.log(
            "=================================",
          );

          console.log(
            "ORDER NOTIFICATION MANAGER: CONTACT BUTTON CLICK",
          );

          const name =
            form.querySelector(
              'input[name="contact[Name]"]',
            )?.value || "";

          const email =
            form.querySelector(
              'input[name="contact[email]"]',
            )?.value || "";

          const phone =
            form.querySelector(
              'input[name="contact[Phone number]"]',
            )?.value || "";

          const message =
            form.querySelector(
              'textarea[name="contact[Comment]"]',
            )?.value || "";

          console.log(
            "DIRECT INPUT VALUES:",
            {
              name: name,
              email: email,
              phone: phone,
              message: message,
            },
          );

          if (!email || !message) {
            console.warn(
              "Order Notification Manager:",
              "Email or message is missing.",
            );

            return;
          }

          const appFormData = new FormData();

          appFormData.append("name", name);
          appFormData.append("email", email);
          appFormData.append("phone", phone);
          appFormData.append("message", message);

          console.log(
            "APP PROXY URL:",
            APP_PROXY_URL,
          );

          console.log(
            "Sending request to App Proxy...",
          );

          try {
            const response = await fetch(
              APP_PROXY_URL,
              {
                method: "POST",
                body: appFormData,
                credentials: "same-origin",
                keepalive: true,
              },
            );

            console.log(
              "CONTACT APP PROXY STATUS:",
              response.status,
            );

            console.log(
              "CONTACT APP PROXY OK:",
              response.ok,
            );

            const responseText =
              await response.text();

            console.log(
              "CONTACT APP PROXY RESPONSE:",
              responseText,
            );

            console.log(
              "=================================",
            );
          } catch (error) {
            console.error(
              "CONTACT APP PROXY ERROR:",
              error,
            );

            console.log(
              "=================================",
            );
          }
        },
        true,
      );
    });
  }

  function initialize() {
    console.log(
      "Order Notification Manager: Initializing contact form listener...",
    );

    setupContactForms();

    const observer = new MutationObserver(
      function () {
        setupContactForms();
      },
    );

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
    );
  } else {
    initialize();
  }
})();
