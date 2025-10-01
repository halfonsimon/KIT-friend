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
    // Use raw SQL to avoid coupling to generated Prisma client types during rollout
    await prisma.$executeRawUnsafe(
      'INSERT INTO "PushSubscription" ("id", "endpoint", "p256dh", "auth") VALUES (gen_random_uuid(), $1, $2, $3)\n       ON CONFLICT ("endpoint") DO UPDATE SET "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth"',
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    return { success: true };
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return { success: false, error: "Failed to save subscription" };
  }
}

export type PushPayloadData = Record<string, unknown> | undefined;
type PushRow = { endpoint: string; p256dh: string; auth: string };

export async function sendPushNotification(
  title: string,
  body: string,
  data?: PushPayloadData
) {
  try {
    const subscriptions = await prisma.$queryRawUnsafe<PushRow[]>(
      'SELECT "endpoint", "p256dh", "auth" FROM "PushSubscription"'
    );

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

    const results: PromiseSettledResult<{ success: boolean }>[] =
      await Promise.allSettled(
        subscriptions.map(async (sub: PushRow) => {
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
              await prisma.$executeRawUnsafe(
                'DELETE FROM "PushSubscription" WHERE "endpoint" = $1',
                sub.endpoint
              );
            }
            const message =
              error instanceof Error ? error.message : String(error);
            return { success: false, endpoint: sub.endpoint, error: message };
          }
        })
      );

    const successful = results.filter(
      (r) =>
        r.status === "fulfilled" &&
        (r as PromiseFulfilledResult<{ success: boolean }>).value.success
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
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
