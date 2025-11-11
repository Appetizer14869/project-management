import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

export const inngest = new Inngest({ id: "project-management" });

//
// Shared event names
//
const USER_CREATED_EVENTS = [
  "clerk/user.created",
  "webhook-integration/user.created"
];

const USER_UPDATED_EVENTS = [
  "clerk/user.updated",
  "webhook-integration/user.updated"
];

const USER_DELETED_EVENTS = [
  "clerk/user.deleted",
  "webhook-integration/user.deleted"
];

//
// CREATE user
//
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: USER_CREATED_EVENTS },
  async ({ event }) => {
    const data = event.data;

    if (!data?.id) {
      console.error("Missing user ID in user.created event:", data);
      return;
    }

    await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url
      },
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url
      }
    });
  }
);

//
// UPDATE user
//
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: USER_UPDATED_EVENTS },
  async ({ event }) => {
    const data = event.data;

    if (!data?.id) {
      console.error("Missing user ID in user.updated event:", data);
      return;
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url
      }
    });
  }
);

//
// DELETE user
//
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: USER_DELETED_EVENTS },
  async ({ event }) => {
    const data = event.data;

    if (!data?.id) {
      console.error("Missing user ID in user.deleted event:", data);
      return;
    }

    try {
      await prisma.user.delete({
        where: { id: data.id }
      });
      console.log(`Deleted user ${data.id} from database.`);
    } catch (err) {
      if (err.code === "P2025") {
        console.warn(`Attempted to delete non-existent user: ${data.id}`);
      } else {
        console.error("Error deleting user:", err);
      }
    }
  }
);

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion
];
