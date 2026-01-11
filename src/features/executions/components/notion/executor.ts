import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { notionChannel } from "@/inngest/channels/notion";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

// Friendly property type from dialog
type FriendlyProperty = {
  name: string;
  type: "title" | "rich_text" | "select" | "status" | "date" | "number" | "checkbox" | "url" | "email" | "phone";
  value: string;
};

// Friendly content block type from dialog
type FriendlyContentBlock = {
  type: "paragraph" | "heading_1" | "heading_2" | "heading_3" | "bulleted_list" | "numbered_list" | "to_do" | "quote" | "callout" | "divider" | "code";
  content?: string;
  checked?: boolean;
  language?: string;
};

type NotionData = {
  variableName?: string;
  credentialId?: string;
  operation?:
    | "search"
    | "get_page"
    | "create_page"
    | "update_page"
    | "archive_page"
    | "get_database"
    | "query_database"
    | "create_database_item"
    | "update_database_item"
    | "get_block_children"
    | "append_block_children";
  query?: string;
  pageId?: string;
  databaseId?: string;
  blockId?: string;
  parentType?: "page" | "database";
  parentPageId?: string;
  parentDatabaseId?: string;
  title?: string;
  // Friendly format (new)
  properties?: FriendlyProperty[];
  contentBlocks?: FriendlyContentBlock[];
  // Query database friendly filters
  filterProperty?: string;
  filterType?: "equals" | "does_not_equal" | "contains" | "does_not_contain" | "is_empty" | "is_not_empty";
  filterValue?: string;
  sortProperty?: string;
  sortDirection?: "ascending" | "descending";
  // Advanced mode (raw JSON strings)
  useAdvancedMode?: boolean;
  advancedProperties?: string;
  advancedChildren?: string;
  advancedFilter?: string;
  advancedSorts?: string;
  // Legacy support (old raw JSON format)
  children?: string;
  filter?: string;
  sorts?: string;
};

type OAuthTokenData = {
  accessToken: string;
  workspaceId?: string;
  workspaceName?: string;
  botId?: string;
  tokenType: "oauth";
};

// =============================================================================
// Notion API Headers
// =============================================================================

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getNotionHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

// =============================================================================
// Credential Management
// =============================================================================

async function getAccessToken(
  credentialId: string,
  userId: string
): Promise<string> {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Notion credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please reconnect your Notion account."
    );
  }

  if (!tokenData.accessToken) {
    throw new NonRetriableError(
      "Invalid credential: missing access token. Please reconnect your Notion account."
    );
  }

  // Note: Notion tokens do NOT expire, so no refresh logic needed
  return tokenData.accessToken;
}

// =============================================================================
// Helper Functions
// =============================================================================

// processTemplate is now imported from handlebars-utils

function parseJsonField(
  value: string | undefined,
  context: Record<string, unknown>
): unknown {
  if (!value) return undefined;
  const processed = processTemplate(value, context);
  try {
    return JSON.parse(processed);
  } catch {
    throw new NonRetriableError(`Invalid JSON: ${processed}`);
  }
}

// =============================================================================
// Friendly Format Converters
// =============================================================================

/**
 * Convert friendly property array to Notion API properties object
 */
function convertFriendlyProperties(
  properties: FriendlyProperty[],
  context: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of properties) {
    const name = processTemplate(prop.name, context);
    const value = processTemplate(prop.value, context);

    switch (prop.type) {
      case "title":
        result[name] = {
          title: [{ text: { content: value } }],
        };
        break;
      case "rich_text":
        result[name] = {
          rich_text: [{ text: { content: value } }],
        };
        break;
      case "select":
        result[name] = {
          select: { name: value },
        };
        break;
      case "status":
        result[name] = {
          status: { name: value },
        };
        break;
      case "date":
        result[name] = {
          date: { start: value },
        };
        break;
      case "number":
        result[name] = {
          number: parseFloat(value) || 0,
        };
        break;
      case "checkbox":
        result[name] = {
          checkbox: value.toLowerCase() === "true" || value === "1",
        };
        break;
      case "url":
        result[name] = {
          url: value,
        };
        break;
      case "email":
        result[name] = {
          email: value,
        };
        break;
      case "phone":
        result[name] = {
          phone_number: value,
        };
        break;
    }
  }

  return result;
}

/**
 * Convert friendly content blocks array to Notion API block objects
 */
function convertFriendlyContentBlocks(
  blocks: FriendlyContentBlock[],
  context: Record<string, unknown>
): unknown[] {
  return blocks.map((block) => {
    const content = block.content ? processTemplate(block.content, context) : "";

    switch (block.type) {
      case "paragraph":
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "heading_1":
        return {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "heading_2":
        return {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "heading_3":
        return {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "bulleted_list":
        return {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "numbered_list":
        return {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "to_do":
        return {
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: [{ type: "text", text: { content } }],
            checked: block.checked ?? false,
          },
        };
      case "quote":
        return {
          object: "block",
          type: "quote",
          quote: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
      case "callout":
        return {
          object: "block",
          type: "callout",
          callout: {
            rich_text: [{ type: "text", text: { content } }],
            icon: { emoji: "💡" },
          },
        };
      case "divider":
        return {
          object: "block",
          type: "divider",
          divider: {},
        };
      case "code":
        return {
          object: "block",
          type: "code",
          code: {
            rich_text: [{ type: "text", text: { content } }],
            language: block.language || "plain text",
          },
        };
      default:
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content } }],
          },
        };
    }
  });
}

/**
 * Convert friendly filter to Notion API filter object
 */
function convertFriendlyFilter(
  filterProperty: string,
  filterType: string,
  filterValue: string,
  context: Record<string, unknown>
): unknown {
  const property = processTemplate(filterProperty, context);
  const value = processTemplate(filterValue, context);

  // Try to guess the property type based on filter type
  // Default to rich_text for most cases
  switch (filterType) {
    case "equals":
      return {
        property,
        rich_text: { equals: value },
      };
    case "does_not_equal":
      return {
        property,
        rich_text: { does_not_equal: value },
      };
    case "contains":
      return {
        property,
        rich_text: { contains: value },
      };
    case "does_not_contain":
      return {
        property,
        rich_text: { does_not_contain: value },
      };
    case "is_empty":
      return {
        property,
        rich_text: { is_empty: true },
      };
    case "is_not_empty":
      return {
        property,
        rich_text: { is_not_empty: true },
      };
    default:
      return {
        property,
        rich_text: { equals: value },
      };
  }
}

/**
 * Convert friendly sort to Notion API sort array
 */
function convertFriendlySort(
  sortProperty: string,
  sortDirection: "ascending" | "descending",
  context: Record<string, unknown>
): unknown[] {
  const property = processTemplate(sortProperty, context);
  return [{ property, direction: sortDirection }];
}

async function notionFetch(
  endpoint: string,
  accessToken: string,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const { method = "GET", body } = options;

  const response = await fetch(url, {
    method,
    headers: getNotionHeaders(accessToken),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.message || data.code || "Notion API error";
    console.error(`[Notion] API error:`, data);
    throw new NonRetriableError(`Notion API error: ${errorMessage}`);
  }

  return data;
}

// =============================================================================
// Notion API Operations
// =============================================================================

async function search(
  accessToken: string,
  query: string
): Promise<unknown> {
  console.log(`[Notion] Searching for: ${query}`);
  return notionFetch("/search", accessToken, {
    method: "POST",
    body: { query },
  });
}

async function getPage(
  accessToken: string,
  pageId: string
): Promise<unknown> {
  console.log(`[Notion] Getting page: ${pageId}`);
  return notionFetch(`/pages/${pageId}`, accessToken);
}

async function createPage(
  accessToken: string,
  parent: { page_id?: string; database_id?: string },
  properties: Record<string, unknown>,
  children?: unknown[]
): Promise<unknown> {
  console.log(`[Notion] Creating page`);
  
  const body: Record<string, unknown> = {
    parent,
    properties,
  };
  
  if (children && children.length > 0) {
    body.children = children;
  }

  return notionFetch("/pages", accessToken, {
    method: "POST",
    body,
  });
}

async function updatePage(
  accessToken: string,
  pageId: string,
  properties: Record<string, unknown>
): Promise<unknown> {
  console.log(`[Notion] Updating page: ${pageId}`);
  return notionFetch(`/pages/${pageId}`, accessToken, {
    method: "PATCH",
    body: { properties },
  });
}

async function archivePage(
  accessToken: string,
  pageId: string
): Promise<unknown> {
  console.log(`[Notion] Archiving page: ${pageId}`);
  return notionFetch(`/pages/${pageId}`, accessToken, {
    method: "PATCH",
    body: { archived: true },
  });
}

async function getDatabase(
  accessToken: string,
  databaseId: string
): Promise<unknown> {
  console.log(`[Notion] Getting database: ${databaseId}`);
  return notionFetch(`/databases/${databaseId}`, accessToken);
}

async function queryDatabase(
  accessToken: string,
  databaseId: string,
  filter?: unknown,
  sorts?: unknown[]
): Promise<unknown> {
  console.log(`[Notion] Querying database: ${databaseId}`);
  
  const body: Record<string, unknown> = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  return notionFetch(`/databases/${databaseId}/query`, accessToken, {
    method: "POST",
    body,
  });
}

async function getBlockChildren(
  accessToken: string,
  blockId: string
): Promise<unknown> {
  console.log(`[Notion] Getting block children: ${blockId}`);
  return notionFetch(`/blocks/${blockId}/children`, accessToken);
}

async function appendBlockChildren(
  accessToken: string,
  blockId: string,
  children: unknown[]
): Promise<unknown> {
  console.log(`[Notion] Appending blocks to: ${blockId}`);
  return notionFetch(`/blocks/${blockId}/children`, accessToken, {
    method: "PATCH",
    body: { children },
  });
}

// =============================================================================
// Main Executor
// =============================================================================

export const notionExecutor: NodeExecutor<NotionData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  const variableName = data.variableName || "notion";

  return step.run(`notion-${nodeId}`, async () => {
    try {
      // Publish loading status
      await publish(notionChannel().status({ nodeId, status: "loading" }));

      // Validate required fields
      if (!data.credentialId) {
        throw new NonRetriableError(
          "Notion credential is required. Please configure the node with a valid credential."
        );
      }

      const operation = data.operation || "search";
      console.log(`[Notion] Executing operation: ${operation}`);

      // Get access token
      const accessToken = await getAccessToken(data.credentialId, userId);

      let result: Record<string, unknown>;

      switch (operation) {
        case "search": {
          const processedQuery = processTemplate(data.query || "", context);
          const searchResult = await search(accessToken, processedQuery);
          result = {
            results: (searchResult as { results: unknown[] }).results,
            raw: searchResult,
          };
          break;
        }

        case "get_page": {
          if (!data.pageId) {
            throw new NonRetriableError("Page ID is required for get_page operation");
          }
          const processedPageId = processTemplate(data.pageId, context);
          const page = await getPage(accessToken, processedPageId);
          result = {
            page,
            raw: page,
          };
          break;
        }

        case "create_page": {
          const processedTitle = processTemplate(data.title || "Untitled", context);
          const processedParentPageId = data.parentPageId
            ? processTemplate(data.parentPageId, context)
            : undefined;
          const processedParentDatabaseId = data.parentDatabaseId
            ? processTemplate(data.parentDatabaseId, context)
            : undefined;

          if (!processedParentPageId && !processedParentDatabaseId) {
            throw new NonRetriableError(
              "Either Parent Page ID or Parent Database ID is required for create_page operation"
            );
          }

          const parent = processedParentDatabaseId
            ? { database_id: processedParentDatabaseId }
            : { page_id: processedParentPageId! };

          // Build properties - check for advanced mode first, then friendly format
          let properties: Record<string, unknown> = {};
          if (data.useAdvancedMode && data.advancedProperties) {
            properties = parseJsonField(data.advancedProperties, context) as Record<string, unknown>;
          } else if (data.properties && Array.isArray(data.properties) && data.properties.length > 0) {
            properties = convertFriendlyProperties(data.properties, context);
          }

          // If creating in a database, use "Name" or "title" property
          // If creating under a page, use "title" property
          if (processedParentDatabaseId) {
            // For database items, set the title property (usually "Name")
            if (!properties.Name && !properties.Title && !properties.title) {
              properties.Name = {
                title: [{ text: { content: processedTitle } }],
              };
            }
          } else {
            // For page children, use the title property
            properties.title = {
              title: [{ text: { content: processedTitle } }],
            };
          }

          // Build children - check for advanced mode first, then friendly format
          let children: unknown[] | undefined;
          if (data.useAdvancedMode && data.advancedChildren) {
            children = parseJsonField(data.advancedChildren, context) as unknown[];
          } else if (data.contentBlocks && Array.isArray(data.contentBlocks) && data.contentBlocks.length > 0) {
            children = convertFriendlyContentBlocks(data.contentBlocks, context);
          } else if (data.children) {
            // Legacy support for old JSON format
            children = parseJsonField(data.children, context) as unknown[];
          }

          const created = await createPage(accessToken, parent, properties, children);
          result = {
            created,
            raw: created,
          };
          break;
        }

        case "update_page": {
          if (!data.pageId) {
            throw new NonRetriableError("Page ID is required for update_page operation");
          }
          const processedPageId = processTemplate(data.pageId, context);
          
          // Build properties - check for advanced mode first, then friendly format
          let properties: Record<string, unknown> = {};
          if (data.useAdvancedMode && data.advancedProperties) {
            properties = parseJsonField(data.advancedProperties, context) as Record<string, unknown>;
          } else if (data.properties && Array.isArray(data.properties) && data.properties.length > 0) {
            properties = convertFriendlyProperties(data.properties, context);
          }
          
          if (Object.keys(properties).length === 0) {
            throw new NonRetriableError("At least one property is required for update_page operation");
          }
          
          const updated = await updatePage(accessToken, processedPageId, properties);
          result = {
            updated,
            raw: updated,
          };
          break;
        }

        case "archive_page": {
          if (!data.pageId) {
            throw new NonRetriableError("Page ID is required for archive_page operation");
          }
          const processedPageId = processTemplate(data.pageId, context);
          const archived = await archivePage(accessToken, processedPageId);
          result = {
            archived,
            raw: archived,
          };
          break;
        }

        case "get_database": {
          if (!data.databaseId) {
            throw new NonRetriableError("Database ID is required for get_database operation");
          }
          const processedDatabaseId = processTemplate(data.databaseId, context);
          const database = await getDatabase(accessToken, processedDatabaseId);
          result = {
            database,
            raw: database,
          };
          break;
        }

        case "query_database": {
          if (!data.databaseId) {
            throw new NonRetriableError("Database ID is required for query_database operation");
          }
          const processedDatabaseId = processTemplate(data.databaseId, context);
          
          // Build filter - check for advanced mode first, then friendly format
          let filter: unknown;
          if (data.useAdvancedMode && data.advancedFilter) {
            filter = parseJsonField(data.advancedFilter, context);
          } else if (data.filterProperty && data.filterType) {
            filter = convertFriendlyFilter(
              data.filterProperty,
              data.filterType,
              data.filterValue || "",
              context
            );
          } else if (data.filter) {
            // Legacy support
            filter = parseJsonField(data.filter, context);
          }
          
          // Build sorts - check for advanced mode first, then friendly format
          let sorts: unknown[] | undefined;
          if (data.useAdvancedMode && data.advancedSorts) {
            sorts = parseJsonField(data.advancedSorts, context) as unknown[];
          } else if (data.sortProperty) {
            sorts = convertFriendlySort(
              data.sortProperty,
              data.sortDirection || "descending",
              context
            );
          } else if (data.sorts) {
            // Legacy support
            sorts = parseJsonField(data.sorts, context) as unknown[];
          }
          
          const queryResult = await queryDatabase(
            accessToken,
            processedDatabaseId,
            filter,
            sorts
          );
          result = {
            results: (queryResult as { results: unknown[] }).results,
            raw: queryResult,
          };
          break;
        }

        case "create_database_item": {
          if (!data.databaseId) {
            throw new NonRetriableError(
              "Database ID is required for create_database_item operation"
            );
          }
          const processedDatabaseId = processTemplate(data.databaseId, context);
          const processedTitle = processTemplate(data.title || "Untitled", context);
          
          // Build properties - check for advanced mode first, then friendly format
          let properties: Record<string, unknown> = {};
          if (data.useAdvancedMode && data.advancedProperties) {
            properties = parseJsonField(data.advancedProperties, context) as Record<string, unknown>;
          } else if (data.properties && Array.isArray(data.properties) && data.properties.length > 0) {
            properties = convertFriendlyProperties(data.properties, context);
          }
          
          // Ensure title is set
          if (!properties.Name && !properties.Title && !properties.title) {
            properties.Name = {
              title: [{ text: { content: processedTitle } }],
            };
          }
          
          const created = await createPage(
            accessToken,
            { database_id: processedDatabaseId },
            properties
          );
          result = {
            created,
            raw: created,
          };
          break;
        }

        case "update_database_item": {
          if (!data.blockId) {
            throw new NonRetriableError(
              "Block/Item ID is required for update_database_item operation"
            );
          }
          const processedBlockId = processTemplate(data.blockId, context);
          
          // Build properties - check for advanced mode first, then friendly format
          let properties: Record<string, unknown> = {};
          if (data.useAdvancedMode && data.advancedProperties) {
            properties = parseJsonField(data.advancedProperties, context) as Record<string, unknown>;
          } else if (data.properties && Array.isArray(data.properties) && data.properties.length > 0) {
            properties = convertFriendlyProperties(data.properties, context);
          }
          
          if (Object.keys(properties).length === 0) {
            throw new NonRetriableError("At least one property is required for update_database_item operation");
          }
          
          const updated = await updatePage(accessToken, processedBlockId, properties);
          result = {
            updated,
            raw: updated,
          };
          break;
        }

        case "get_block_children": {
          if (!data.pageId) {
            throw new NonRetriableError(
              "Page/Block ID is required for get_block_children operation"
            );
          }
          const processedPageId = processTemplate(data.pageId, context);
          const blocks = await getBlockChildren(accessToken, processedPageId);
          result = {
            blocks: (blocks as { results: unknown[] }).results,
            raw: blocks,
          };
          break;
        }

        case "append_block_children": {
          if (!data.pageId) {
            throw new NonRetriableError(
              "Page/Block ID is required for append_block_children operation"
            );
          }
          const processedPageId = processTemplate(data.pageId, context);
          
          // Build children - check for advanced mode first, then friendly format
          let children: unknown[] | undefined;
          if (data.useAdvancedMode && data.advancedChildren) {
            children = parseJsonField(data.advancedChildren, context) as unknown[];
          } else if (data.contentBlocks && Array.isArray(data.contentBlocks) && data.contentBlocks.length > 0) {
            children = convertFriendlyContentBlocks(data.contentBlocks, context);
          } else if (data.children) {
            // Legacy support
            children = parseJsonField(data.children, context) as unknown[];
          }
          
          if (!children || children.length === 0) {
            throw new NonRetriableError(
              "At least one content block is required for append_block_children operation"
            );
          }
          
          const appended = await appendBlockChildren(
            accessToken,
            processedPageId,
            children
          );
          result = {
            appended,
            raw: appended,
          };
          break;
        }

        default:
          throw new NonRetriableError(`Unsupported operation: ${operation}`);
      }

      // Publish success status
      await publish(notionChannel().status({ nodeId, status: "success" }));

      console.log(`[Notion] Operation ${operation} completed successfully`);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion/executor.ts:888',message:'Notion returning context',data:{variableName,contextKeys:Object.keys(context),resultKeys:Object.keys(result),contextSnapshot:JSON.stringify(context).slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      return {
        ...context,
        [variableName]: result,
      };
    } catch (error) {
      // Publish error status
      await publish(notionChannel().status({ nodeId, status: "error" }));

      if (error instanceof NonRetriableError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[Notion] Error:`, error);
      throw new NonRetriableError(`Notion error: ${errorMessage}`);
    }
  });
};
