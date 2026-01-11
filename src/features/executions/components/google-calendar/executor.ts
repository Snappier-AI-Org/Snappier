import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { parseError } from "@/features/executions/lib/error-parser";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google, calendar_v3 } from "googleapis";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type GoogleCalendarData = {
  variableName?: string;
  credentialId?: string;
  calendarId?: string;
  operation?: "list" | "get" | "create" | "update" | "delete" | "listCalendars";
  eventId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  attendees?: string;
  maxResults?: string;
  timeMin?: string;
  timeMax?: string;
};

type OAuthTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  email?: string;
  tokenType: "oauth";
};

// =============================================================================
// OAuth Token Management
// =============================================================================

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URL
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}

async function getCalendarClient(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Google Calendar credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please reconnect your Google Calendar account."
    );
  }

  // Validate OAuth token structure
  if (!tokenData.accessToken) {
    throw new NonRetriableError(
      "Invalid credential: missing access token. Please reconnect your Google Calendar account."
    );
  }

  let accessToken = tokenData.accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = tokenData.tokenExpiry
    ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
    : false;

  if (isExpired && tokenData.refreshToken) {
    console.log("[Google Calendar] Token expired, refreshing...");

    try {
      const refreshed = await refreshAccessToken(tokenData.refreshToken);
      accessToken = refreshed.accessToken;

      // Update stored credential with new access token
      const updatedTokenData: OAuthTokenData = {
        ...tokenData,
        accessToken: refreshed.accessToken,
        tokenExpiry: refreshed.expiryDate,
        tokenType: "oauth",
      };

      await prisma.credential.update({
        where: { id: credentialId },
        data: { value: encrypt(JSON.stringify(updatedTokenData)) },
      });

      console.log("[Google Calendar] Token refreshed successfully");
    } catch (refreshError) {
      console.error("[Google Calendar] Failed to refresh token:", refreshError);
      throw new NonRetriableError(
        "Failed to refresh Google Calendar access token. Please reconnect your account."
      );
    }
  }

  // Create OAuth2 client with access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URL
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: tokenData.refreshToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// =============================================================================
// Calendar Operations
// =============================================================================

type CalendarClient = calendar_v3.Calendar;

async function listCalendars(calendar: CalendarClient): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  console.log("[Google Calendar] Listing calendars");
  
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

async function listEvents(
  calendar: CalendarClient,
  calendarId: string,
  options: {
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
  }
): Promise<calendar_v3.Schema$Event[]> {
  console.log(`[Google Calendar] Listing events from calendar: ${calendarId}`);

  const response = await calendar.events.list({
    calendarId,
    maxResults: options.maxResults || 10,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: options.timeMin || new Date().toISOString(),
    timeMax: options.timeMax,
  });

  return response.data.items || [];
}

async function getEvent(
  calendar: CalendarClient,
  calendarId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event> {
  console.log(`[Google Calendar] Getting event: ${eventId} from calendar: ${calendarId}`);

  const response = await calendar.events.get({
    calendarId,
    eventId,
  });

  return response.data;
}

async function createEvent(
  calendar: CalendarClient,
  calendarId: string,
  eventData: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    attendees?: string[];
  }
): Promise<calendar_v3.Schema$Event> {
  console.log(`[Google Calendar] Creating event in calendar: ${calendarId}`);

  const event: calendar_v3.Schema$Event = {
    summary: eventData.summary,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startDateTime,
      timeZone: eventData.timeZone,
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: eventData.timeZone,
    },
    attendees: eventData.attendees?.map((email) => ({ email })),
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: eventData.attendees?.length ? "all" : "none",
  });

  return response.data;
}

async function updateEvent(
  calendar: CalendarClient,
  calendarId: string,
  eventId: string,
  eventData: {
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    attendees?: string[];
  }
): Promise<calendar_v3.Schema$Event> {
  console.log(`[Google Calendar] Updating event: ${eventId} in calendar: ${calendarId}`);

  // First, get the existing event
  const existingEvent = await calendar.events.get({
    calendarId,
    eventId,
  });

  const event: calendar_v3.Schema$Event = {
    ...existingEvent.data,
    summary: eventData.summary || existingEvent.data.summary,
    description: eventData.description ?? existingEvent.data.description,
    location: eventData.location ?? existingEvent.data.location,
  };

  if (eventData.startDateTime) {
    event.start = {
      dateTime: eventData.startDateTime,
      timeZone: eventData.timeZone || existingEvent.data.start?.timeZone,
    };
  }

  if (eventData.endDateTime) {
    event.end = {
      dateTime: eventData.endDateTime,
      timeZone: eventData.timeZone || existingEvent.data.end?.timeZone,
    };
  }

  if (eventData.attendees) {
    event.attendees = eventData.attendees.map((email) => ({ email }));
  }

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
    sendUpdates: eventData.attendees?.length ? "all" : "none",
  });

  return response.data;
}

async function deleteEvent(
  calendar: CalendarClient,
  calendarId: string,
  eventId: string
): Promise<void> {
  console.log(`[Google Calendar] Deleting event: ${eventId} from calendar: ${calendarId}`);

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: "all",
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseAttendees(attendeesString?: string): string[] {
  if (!attendeesString?.trim()) return [];
  return attendeesString
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function formatDateTimeForGoogle(dateTimeStr: string): string {
  // Handle datetime-local format (2024-12-04T10:00)
  if (dateTimeStr && !dateTimeStr.includes("Z") && !dateTimeStr.includes("+")) {
    // Append timezone offset or convert to ISO
    const date = new Date(dateTimeStr);
    return date.toISOString();
  }
  return dateTimeStr;
}

// =============================================================================
// Main Executor
// =============================================================================

export const googleCalendarExecutor: NodeExecutor<GoogleCalendarData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Google Calendar Node ${nodeId}] Starting execution`, {
    operation: data.operation,
    hasCredentialId: !!data.credentialId,
    calendarId: data.calendarId,
  });

  await publish(googleCalendarChannel().status({ nodeId, status: "loading" }));

  // ---------------------------------------------------------------------------
  // Input Validation
  // ---------------------------------------------------------------------------

  if (!data.variableName?.trim()) {
    await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Variable name is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  if (!data.credentialId) {
    await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Google Calendar credential is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  if (!data.operation) {
    await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Operation is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  const variableName = data.variableName.trim();

  try {
    const result = await step.run(`calendar-${nodeId}`, async () => {
      // Get authenticated Calendar client
      const calendar = await getCalendarClient(data.credentialId!, userId);

      // Process template variables in inputs
      const calendarId = data.calendarId
        ? processTemplate(data.calendarId, context)
        : "primary";

      // ---------------------------------------------------------------------------
      // Execute Operation
      // ---------------------------------------------------------------------------

      switch (data.operation) {
        case "listCalendars": {
          const calendars = await listCalendars(calendar);

          return {
            ...context,
            [variableName]: {
              calendars: calendars.map((cal) => ({
                id: cal.id,
                summary: cal.summary,
                description: cal.description,
                primary: cal.primary,
                accessRole: cal.accessRole,
              })),
              count: calendars.length,
            },
          };
        }

        case "list": {
          const maxResults = data.maxResults
            ? parseInt(processTemplate(data.maxResults, context), 10)
            : 10;
          const timeMin = data.timeMin
            ? formatDateTimeForGoogle(processTemplate(data.timeMin, context))
            : undefined;
          const timeMax = data.timeMax
            ? formatDateTimeForGoogle(processTemplate(data.timeMax, context))
            : undefined;

          const events = await listEvents(calendar, calendarId, {
            maxResults,
            timeMin,
            timeMax,
          });

          return {
            ...context,
            [variableName]: {
              events: events.map((event) => ({
                id: event.id,
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: event.start,
                end: event.end,
                attendees: event.attendees,
                htmlLink: event.htmlLink,
                status: event.status,
              })),
              count: events.length,
            },
          };
        }

        case "get": {
          if (!data.eventId?.trim()) {
            throw new NonRetriableError("Event ID is required for get operation");
          }

          const eventId = processTemplate(data.eventId, context);
          const event = await getEvent(calendar, calendarId, eventId);

          return {
            ...context,
            [variableName]: {
              event: {
                id: event.id,
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: event.start,
                end: event.end,
                attendees: event.attendees,
                htmlLink: event.htmlLink,
                status: event.status,
                creator: event.creator,
                organizer: event.organizer,
              },
            },
          };
        }

        case "create": {
          if (!data.summary?.trim()) {
            throw new NonRetriableError("Event title (summary) is required for create operation");
          }
          if (!data.startDateTime?.trim()) {
            throw new NonRetriableError("Start date/time is required for create operation");
          }
          if (!data.endDateTime?.trim()) {
            throw new NonRetriableError("End date/time is required for create operation");
          }

          const summary = processTemplate(data.summary, context);
          const description = data.description
            ? processTemplate(data.description, context)
            : undefined;
          const location = data.location
            ? processTemplate(data.location, context)
            : undefined;
          const startDateTime = formatDateTimeForGoogle(
            processTemplate(data.startDateTime, context)
          );
          const endDateTime = formatDateTimeForGoogle(
            processTemplate(data.endDateTime, context)
          );
          // Handle "default" as using calendar's timezone (undefined)
          const timeZone = (data.timeZone && data.timeZone !== "default")
            ? processTemplate(data.timeZone, context)
            : undefined;
          const attendees = data.attendees
            ? parseAttendees(processTemplate(data.attendees, context))
            : undefined;

          const createdEvent = await createEvent(calendar, calendarId, {
            summary,
            description,
            location,
            startDateTime,
            endDateTime,
            timeZone,
            attendees,
          });

          return {
            ...context,
            [variableName]: {
              created: {
                id: createdEvent.id,
                summary: createdEvent.summary,
                htmlLink: createdEvent.htmlLink,
                start: createdEvent.start,
                end: createdEvent.end,
              },
            },
          };
        }

        case "update": {
          if (!data.eventId?.trim()) {
            throw new NonRetriableError("Event ID is required for update operation");
          }

          const eventId = processTemplate(data.eventId, context);
          const summary = data.summary
            ? processTemplate(data.summary, context)
            : undefined;
          const description = data.description
            ? processTemplate(data.description, context)
            : undefined;
          const location = data.location
            ? processTemplate(data.location, context)
            : undefined;
          const startDateTime = data.startDateTime
            ? formatDateTimeForGoogle(processTemplate(data.startDateTime, context))
            : undefined;
          const endDateTime = data.endDateTime
            ? formatDateTimeForGoogle(processTemplate(data.endDateTime, context))
            : undefined;
          // Handle "default" as using calendar's timezone (undefined)
          const timeZone = (data.timeZone && data.timeZone !== "default")
            ? processTemplate(data.timeZone, context)
            : undefined;
          const attendees = data.attendees
            ? parseAttendees(processTemplate(data.attendees, context))
            : undefined;

          const updatedEvent = await updateEvent(calendar, calendarId, eventId, {
            summary,
            description,
            location,
            startDateTime,
            endDateTime,
            timeZone,
            attendees,
          });

          return {
            ...context,
            [variableName]: {
              updated: {
                id: updatedEvent.id,
                summary: updatedEvent.summary,
                htmlLink: updatedEvent.htmlLink,
                start: updatedEvent.start,
                end: updatedEvent.end,
              },
            },
          };
        }

        case "delete": {
          if (!data.eventId?.trim()) {
            throw new NonRetriableError("Event ID is required for delete operation");
          }

          const eventId = processTemplate(data.eventId, context);
          await deleteEvent(calendar, calendarId, eventId);

          return {
            ...context,
            [variableName]: {
              deleted: {
                eventId,
                success: true,
              },
            },
          };
        }

        default:
          throw new NonRetriableError(`Unknown operation: ${data.operation}`);
      }
    });

    await publish(googleCalendarChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    console.error(`[Google Calendar Node ${nodeId}] Execution failed:`, error);

    await publish(googleCalendarChannel().status({ nodeId, status: "error" }));

    // Re-throw NonRetriableError as-is to preserve message
    if (error instanceof NonRetriableError) {
      throw error;
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NonRetriableError(errorMessage);
  }
};
