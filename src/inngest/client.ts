import { realtimeMiddleware } from "@inngest/realtime/middleware";
import { Inngest } from "inngest";

// In development, Inngest dev server connects to the Next.js app
// The base URL should point to where the Next.js app is running
const getInngestBaseUrl = () => {
  // In development, use localhost:3000 (where Next.js runs)
  if (process.env.NODE_ENV === "development") {
    return process.env.INNGEST_BASE_URL || "http://localhost:3000";
  }
  // In production, use the environment variable or default
  return process.env.INNGEST_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.inngest.com";
};

export const inngest = new Inngest({
  id: "snappier",
  eventKey: process.env.INNGEST_EVENT_KEY, // Make sure this is set correctly
  middleware: [realtimeMiddleware()],
  // Only set baseURL in development to point to local Next.js app
  ...(process.env.NODE_ENV === "development" && {
    baseURL: getInngestBaseUrl(),
  }),
});