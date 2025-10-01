import webpush from "web-push";
import { prisma } from "./db";

// Initialize web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@kitfriend.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function savePushSubscription(subscription: PushSubscriptionData) {
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return { success: false, error: "Failed to save subscription" };
  }
}

export async function sendPushNotification(
  title: string,
  body: string,
  data?: any
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return { success: false, error: "No push subscriptions found" };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: data || {},
      requireInteraction: false,
      silent: true, // Silent notification
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error(
            "Error sending push to subscription:",
            sub.endpoint,
            error
          );
          // If subscription is invalid, remove it
          if (error instanceof Error && error.message.includes("410")) {
            await prisma.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            });
          }
          return { success: false, endpoint: sub.endpoint, error };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - successful;

    return {
      success: successful > 0,
      sent: successful,
      failed,
      total: results.length,
    };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return { success: false, error: "Failed to send push notifications" };
  }
}
