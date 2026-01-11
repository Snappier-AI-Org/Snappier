/**
 * Discord Trigger Worker
 * ----------------------
 * Listens for Discord message events and forwards them to the Chattoflow
 * Discord trigger webhook.
 *
 * How to run (recommended as a standalone worker):
 * 1) mkdir discord-trigger-worker && cd discord-trigger-worker
 * 2) npm init -y
 * 3) npm install discord.js dotenv
 * 4) Copy this file into the folder
 * 5) Create a .env with:
 *    DISCORD_BOT_TOKEN=your_bot_token
 *    TRIGGER_ENDPOINT=https://your-domain.com/api/webhooks/discord
 *    TRIGGER_SECRET=optional_shared_secret (must match env in Next app)
 *    ALLOWED_GUILD_IDS=comma,separated,guild,ids    # optional filter
 *    ALLOWED_CHANNEL_IDS=comma,separated,channel,ids # optional filter
 * 6) node discord-trigger-worker.ts
 */

import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Message,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
const triggerEndpoint = process.env.TRIGGER_ENDPOINT;
const triggerSecret = process.env.TRIGGER_SECRET;
const allowedGuildIds = (process.env.ALLOWED_GUILD_IDS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const allowedChannelIds = (process.env.ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

if (!token) throw new Error("DISCORD_BOT_TOKEN is required");
if (!triggerEndpoint) throw new Error("TRIGGER_ENDPOINT is required");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

async function forwardMessage(message: Message) {
  try {
    const isDM = message.channel?.isDMBased();
    const guildId = message.guild?.id;
    const channelId = message.channel?.id;

    if (allowedGuildIds.length && guildId && !allowedGuildIds.includes(guildId)) return;
    if (allowedChannelIds.length && channelId && !allowedChannelIds.includes(channelId)) return;

    const body = {
      guildId: guildId ?? null,
      channelId: channelId ?? null,
      messageId: message.id,
      content: message.content || "",
      authorId: message.author.id,
      authorUsername: message.author.username,
      isBot: message.author.bot,
      isDM: !!isDM,
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map((a) => ({
        id: a.id,
        url: a.url,
        filename: a.name ?? undefined,
      })),
    };

    await fetch(triggerEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(triggerSecret ? { "x-discord-trigger-secret": triggerSecret } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[Discord Trigger Worker] Failed to forward message", error);
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`[Discord Trigger Worker] Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Skip our own bot messages unless explicitly allowed downstream
  // (route also filters bots by default).
  await forwardMessage(message);
});

client.login(token);
