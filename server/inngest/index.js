import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create client
export const inngest = new Inngest({ id: "project-management" });

/*
  ------------------------------------------------------------
  Helper functions (shared by all events)
  ------------------------------------------------------------
*/

async function upsertUser(data) {
  if (!data?.id) return;

  await prisma.user.upsert({
    where: { id: data.id },
    update: {
      email: data.email_addresses?.[0]?.email_address,
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      image: data.image_url
    },
    create: {
      id: data.id,
      email: data.email_addresses?.[0]?.email_address,
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      image: data.image_url
    }
  });
}

async function updateUser(data) {
  if (!data?.id) return;

  await prisma.user.update({
    where: { id: data.id },
    data: {
      email: data.email_addresses?.[0]?.email_address,
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      image: data.image_url
    }
  });
}

async function deleteUser(id) {
  if (!id) return;

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    // ignore record not found
  }
}

/*
  ------------------------------------------------------------
  CREATE USER
  ------------------------------------------------------------
*/

// Clerk: clerk/user.created
const syncUserCreationClerk = inngest.createFunction(
  { id: "sync-user-clerk-created" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    await upsertUser(event.data);
  }
);

// Webhook: webhook-integration/user.created
const syncUserCreationWebhook = inngest.createFunction(
  { id: "sync-user-webhook-created" },
  { event: "webhook-integration/user.created" },
  async ({ event }) => {
    await upsertUser(event.data);
  }
);

/*
  ------------------------------------------------------------
  UPDATE USER
  ------------------------------------------------------------
*/

// Webhook: webhook-integration/user.updated
const syncUserUpdationWebhook = inngest.createFunction(
  { id: "sync-user-webhook-updated" },
  { event: "webhook-integration/user.updated" },
  async ({ event }) => {
    await updateUser(event.data);
  }
);

/*
  ------------------------------------------------------------
  DELETE USER
  ------------------------------------------------------------
*/

// Webhook: webhook-integration/user.deleted
const syncUserDeletionWebhook = inngest.createFunction(
  { id: "sync-user-webhook-deleted" },
  { event: "webhook-integration/user.deleted" },
  async ({ event }) => {
    await deleteUser(event.data?.id);
  }
);

/*
  ------------------------------------------------------------
  Export all functions to Inngest
  ------------------------------------------------------------
*/
export const functions = [
  syncUserCreationClerk,
  syncUserCreationWebhook,
  syncUserUpdationWebhook,
  syncUserDeletionWebhook
];
