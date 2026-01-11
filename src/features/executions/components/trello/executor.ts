import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { trelloChannel } from "@/inngest/channels/trello";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type TrelloOperation = "createCard" | "getCard" | "updateCard" | "moveCard" | "deleteCard" | "addComment" | "searchCards";

type TrelloData = {
  variableName?: string;
  credentialId?: string;
  operation?: TrelloOperation;
  boardId?: string;
  listId?: string;
  cardId?: string;
  cardName?: string;
  cardDescription?: string;
  comment?: string;
  searchQuery?: string;
  dueDate?: string;
  labels?: string;
};

type TrelloCredentials = {
  apiKey: string;
  token: string;
};

// =============================================================================
// API Client
// =============================================================================

const TRELLO_API_BASE = "https://api.trello.com/1";

async function getTrelloCredentials(credentialId: string, userId: string): Promise<TrelloCredentials> {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Trello credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let credentials: TrelloCredentials;

  try {
    credentials = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please update your Trello credentials."
    );
  }

  if (!credentials.apiKey || !credentials.token) {
    throw new NonRetriableError(
      "Invalid Trello credentials: missing API key or token. Please update your credentials."
    );
  }

  return credentials;
}

function buildTrelloUrl(path: string, credentials: TrelloCredentials, params: Record<string, string> = {}): string {
  const url = new URL(`${TRELLO_API_BASE}${path}`);
  url.searchParams.set("key", credentials.apiKey);
  url.searchParams.set("token", credentials.token);
  
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  
  return url.toString();
}

// =============================================================================
// Trello Operations
// =============================================================================

async function createCard(
  credentials: TrelloCredentials,
  listId: string,
  name: string,
  desc?: string,
  due?: string,
  labels?: string
) {
  const params: Record<string, string> = { idList: listId, name };
  if (desc) params.desc = desc;
  if (due) params.due = due;
  if (labels) params.idLabels = labels;

  const url = buildTrelloUrl("/cards", credentials, params);
  
  const response = await ky.post(url).json();
  return response;
}

async function getCard(credentials: TrelloCredentials, cardId: string) {
  const url = buildTrelloUrl(`/cards/${cardId}`, credentials, {
    fields: "id,name,desc,url,shortUrl,due,labels,idList,idBoard",
  });
  
  const response = await ky.get(url).json();
  return response;
}

async function updateCard(
  credentials: TrelloCredentials,
  cardId: string,
  name?: string,
  desc?: string,
  due?: string,
  labels?: string
) {
  const params: Record<string, string> = {};
  if (name) params.name = name;
  if (desc) params.desc = desc;
  if (due) params.due = due;
  if (labels) params.idLabels = labels;

  const url = buildTrelloUrl(`/cards/${cardId}`, credentials, params);
  
  const response = await ky.put(url).json();
  return response;
}

async function moveCard(credentials: TrelloCredentials, cardId: string, listId: string) {
  const url = buildTrelloUrl(`/cards/${cardId}`, credentials, { idList: listId });
  
  const response = await ky.put(url).json();
  return response;
}

async function deleteCard(credentials: TrelloCredentials, cardId: string) {
  const url = buildTrelloUrl(`/cards/${cardId}`, credentials);
  
  await ky.delete(url);
  return { success: true };
}

async function addComment(credentials: TrelloCredentials, cardId: string, text: string) {
  const url = buildTrelloUrl(`/cards/${cardId}/actions/comments`, credentials, { text });
  
  const response = await ky.post(url).json();
  return response;
}

async function searchCards(credentials: TrelloCredentials, query: string, boardId?: string) {
  const params: Record<string, string> = {
    query,
    modelTypes: "cards",
    cards_limit: "20",
  };
  
  if (boardId) {
    params.idBoards = boardId;
  }

  const url = buildTrelloUrl("/search", credentials, params);
  
  const response = await ky.get(url).json<{ cards: unknown[] }>();
  return {
    cards: response.cards || [],
    count: response.cards?.length || 0,
  };
}

// =============================================================================
// Executor
// =============================================================================

export const trelloExecutor: NodeExecutor<TrelloData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    trelloChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.credentialId) {
    await publish(trelloChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Trello node: Credential is required");
  }

  if (!data.variableName) {
    await publish(trelloChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Trello node: Variable name is required");
  }

  if (!data.operation) {
    await publish(trelloChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Trello node: Operation is required");
  }

  try {
    const result = await step.run("trello-operation", async () => {
      const credentials = await getTrelloCredentials(data.credentialId!, userId);

      // Compile templates with context
      const compileTemplate = (template?: string) => {
        if (!template) return undefined;
        return processTemplate(template, context);
      };

      const cardName = compileTemplate(data.cardName);
      const cardDescription = compileTemplate(data.cardDescription);
      const comment = compileTemplate(data.comment);
      const searchQuery = compileTemplate(data.searchQuery);
      const cardId = compileTemplate(data.cardId);
      const listId = compileTemplate(data.listId);
      const boardId = compileTemplate(data.boardId);

      let operationResult: unknown;

      switch (data.operation) {
        case "createCard": {
          if (!listId) {
            throw new NonRetriableError("Trello createCard: List ID is required");
          }
          if (!cardName) {
            throw new NonRetriableError("Trello createCard: Card name is required");
          }
          operationResult = await createCard(
            credentials,
            listId,
            cardName,
            cardDescription,
            data.dueDate,
            data.labels
          );
          break;
        }

        case "getCard": {
          if (!cardId) {
            throw new NonRetriableError("Trello getCard: Card ID is required");
          }
          operationResult = await getCard(credentials, cardId);
          break;
        }

        case "updateCard": {
          if (!cardId) {
            throw new NonRetriableError("Trello updateCard: Card ID is required");
          }
          operationResult = await updateCard(
            credentials,
            cardId,
            cardName,
            cardDescription,
            data.dueDate,
            data.labels
          );
          break;
        }

        case "moveCard": {
          if (!cardId) {
            throw new NonRetriableError("Trello moveCard: Card ID is required");
          }
          if (!listId) {
            throw new NonRetriableError("Trello moveCard: List ID is required");
          }
          operationResult = await moveCard(credentials, cardId, listId);
          break;
        }

        case "deleteCard": {
          if (!cardId) {
            throw new NonRetriableError("Trello deleteCard: Card ID is required");
          }
          operationResult = await deleteCard(credentials, cardId);
          break;
        }

        case "addComment": {
          if (!cardId) {
            throw new NonRetriableError("Trello addComment: Card ID is required");
          }
          if (!comment) {
            throw new NonRetriableError("Trello addComment: Comment text is required");
          }
          operationResult = await addComment(credentials, cardId, comment);
          break;
        }

        case "searchCards": {
          if (!searchQuery) {
            throw new NonRetriableError("Trello searchCards: Search query is required");
          }
          operationResult = await searchCards(credentials, searchQuery, boardId);
          break;
        }

        default:
          throw new NonRetriableError(`Trello node: Unknown operation: ${data.operation}`);
      }

      return {
        ...context,
        [data.variableName!]: operationResult,
      };
    });

    await publish(
      trelloChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      trelloChannel().status({
        nodeId,
        status: "error",
      })
    );

    if (error instanceof NonRetriableError) {
      throw error;
    }

    // Handle HTTP errors from ky
    if (error instanceof Error) {
      const message = error.message || "Unknown Trello API error";
      throw new NonRetriableError(`Trello API error: ${message}`);
    }

    throw new NonRetriableError("Unknown error occurred while executing Trello operation");
  }
};
