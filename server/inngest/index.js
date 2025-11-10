import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

// --- Sync new user creation ---
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    if (!data?.id) {
      console.error("❌ Missing user ID in clerk/user.created event:", data);
      return;
    }

    await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url,
      },
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

// --- Sync user deletion ---
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;

    if (!data?.id) {
      console.error("❌ Missing user ID in clerk/user.deleted event:", data);
      return;
    }

    try {
      await prisma.user.delete({
        where: { id: data.id },
      });
      console.log(`✅ Deleted user ${data.id} from database.`);
    } catch (err) {
      if (err.code === "P2025") {
        // Prisma error for "record not found"
        console.warn(`⚠️ Tried to delete non-existent user: ${data.id}`);
      } else {
        console.error("❌ Error deleting user:", err);
      }
    }
  }
);

// --- Sync user updates ---
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;

    if (!data?.id) {
      console.error("❌ Missing user ID in clerk/user.updated event:", data);
      return;
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

// --- Export all Inngest functions ---
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
