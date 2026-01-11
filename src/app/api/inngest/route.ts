import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { renewGmailWatches } from "@/inngest/gmail-watch-renewal";
import { executeScheduledWorkflow } from "@/inngest/schedule-executor";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    renewGmailWatches,
    // Event-driven scheduler with cancelOn support (replaces polling)
    executeScheduledWorkflow,
  ],
});