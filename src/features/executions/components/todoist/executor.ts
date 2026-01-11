import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { todoistChannel } from "@/inngest/channels/todoist";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import ky from "ky";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type TodoistOperation =
  | "createTask"
  | "getTask"
  | "updateTask"
  | "closeTask"
  | "reopenTask"
  | "deleteTask"
  | "getActiveTasks"
  | "createProject"
  | "getProject"
  | "getProjects"
  | "deleteProject"
  | "createComment"
  | "getComments"
  | "createLabel"
  | "getLabels";

type TodoistData = {
  variableName?: string;
  credentialId?: string;
  operation?: TodoistOperation;
  // Task fields
  taskId?: string;
  content?: string;
  description?: string;
  projectId?: string;
  sectionId?: string;
  parentId?: string;
  order?: string;
  labels?: string;
  priority?: string;
  dueString?: string;
  dueDate?: string;
  dueDatetime?: string;
  assigneeId?: string;
  duration?: string;
  durationUnit?: string;
  // Project fields
  projectName?: string;
  projectColor?: string;
  projectViewStyle?: string;
  isFavorite?: boolean;
  // Comment fields
  commentContent?: string;
  // Label fields
  labelName?: string;
  labelColor?: string;
  // Filter fields
  filter?: string;
};

type TodoistCredentials = {
  accessToken: string;
  tokenType?: string;
};

// =============================================================================
// API Client
// =============================================================================

const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";

async function getTodoistCredentials(credentialId: string, userId: string): Promise<TodoistCredentials> {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Todoist credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let credentials: TodoistCredentials;

  try {
    credentials = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please update your Todoist credentials."
    );
  }

  if (!credentials.accessToken) {
    throw new NonRetriableError(
      "Invalid Todoist credentials: missing access token. Please reconnect your Todoist account."
    );
  }

  return credentials;
}

function getAuthHeaders(credentials: TodoistCredentials): Record<string, string> {
  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    "Content-Type": "application/json",
  };
}

// =============================================================================
// Task Operations
// =============================================================================

async function createTask(
  credentials: TodoistCredentials,
  content: string,
  options: {
    description?: string;
    projectId?: string;
    sectionId?: string;
    parentId?: string;
    order?: number;
    labels?: string[];
    priority?: number;
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    assigneeId?: string;
    duration?: number;
    durationUnit?: string;
  }
) {
  const body: Record<string, unknown> = { content };
  
  if (options.description) body.description = options.description;
  if (options.projectId) body.project_id = options.projectId;
  if (options.sectionId) body.section_id = options.sectionId;
  if (options.parentId) body.parent_id = options.parentId;
  if (options.order !== undefined) body.order = options.order;
  if (options.labels && options.labels.length > 0) body.labels = options.labels;
  if (options.priority) body.priority = options.priority;
  if (options.dueString) body.due_string = options.dueString;
  if (options.dueDate) body.due_date = options.dueDate;
  if (options.dueDatetime) body.due_datetime = options.dueDatetime;
  if (options.assigneeId) body.assignee_id = options.assigneeId;
  if (options.duration && options.durationUnit) {
    body.duration = options.duration;
    body.duration_unit = options.durationUnit;
  }

  const response = await ky.post(`${TODOIST_API_BASE}/tasks`, {
    headers: getAuthHeaders(credentials),
    json: body,
  }).json();

  return response;
}

async function getTask(credentials: TodoistCredentials, taskId: string) {
  const response = await ky.get(`${TODOIST_API_BASE}/tasks/${taskId}`, {
    headers: getAuthHeaders(credentials),
  }).json();

  return response;
}

async function updateTask(
  credentials: TodoistCredentials,
  taskId: string,
  options: {
    content?: string;
    description?: string;
    labels?: string[];
    priority?: number;
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    assigneeId?: string;
    duration?: number;
    durationUnit?: string;
  }
) {
  const body: Record<string, unknown> = {};
  
  if (options.content) body.content = options.content;
  if (options.description) body.description = options.description;
  if (options.labels && options.labels.length > 0) body.labels = options.labels;
  if (options.priority) body.priority = options.priority;
  if (options.dueString) body.due_string = options.dueString;
  if (options.dueDate) body.due_date = options.dueDate;
  if (options.dueDatetime) body.due_datetime = options.dueDatetime;
  if (options.assigneeId) body.assignee_id = options.assigneeId;
  if (options.duration && options.durationUnit) {
    body.duration = options.duration;
    body.duration_unit = options.durationUnit;
  }

  const response = await ky.post(`${TODOIST_API_BASE}/tasks/${taskId}`, {
    headers: getAuthHeaders(credentials),
    json: body,
  }).json();

  return response;
}

async function closeTask(credentials: TodoistCredentials, taskId: string) {
  await ky.post(`${TODOIST_API_BASE}/tasks/${taskId}/close`, {
    headers: getAuthHeaders(credentials),
  });

  return { success: true, taskId, status: "completed" };
}

async function reopenTask(credentials: TodoistCredentials, taskId: string) {
  await ky.post(`${TODOIST_API_BASE}/tasks/${taskId}/reopen`, {
    headers: getAuthHeaders(credentials),
  });

  return { success: true, taskId, status: "active" };
}

async function deleteTask(credentials: TodoistCredentials, taskId: string) {
  await ky.delete(`${TODOIST_API_BASE}/tasks/${taskId}`, {
    headers: getAuthHeaders(credentials),
  });

  return { success: true, taskId };
}

async function getActiveTasks(
  credentials: TodoistCredentials,
  options: { projectId?: string; sectionId?: string; filter?: string }
) {
  const params = new URLSearchParams();
  
  if (options.projectId) params.set("project_id", options.projectId);
  if (options.sectionId) params.set("section_id", options.sectionId);
  if (options.filter) params.set("filter", options.filter);

  const url = params.toString()
    ? `${TODOIST_API_BASE}/tasks?${params.toString()}`
    : `${TODOIST_API_BASE}/tasks`;

  const response = await ky.get(url, {
    headers: getAuthHeaders(credentials),
  }).json<unknown[]>();

  return { tasks: response, count: response.length };
}

// =============================================================================
// Project Operations
// =============================================================================

async function createProject(
  credentials: TodoistCredentials,
  name: string,
  options: { color?: string; viewStyle?: string; isFavorite?: boolean }
) {
  const body: Record<string, unknown> = { name };
  
  if (options.color) body.color = options.color;
  if (options.viewStyle) body.view_style = options.viewStyle;
  if (options.isFavorite !== undefined) body.is_favorite = options.isFavorite;

  const response = await ky.post(`${TODOIST_API_BASE}/projects`, {
    headers: getAuthHeaders(credentials),
    json: body,
  }).json();

  return response;
}

async function getProject(credentials: TodoistCredentials, projectId: string) {
  const response = await ky.get(`${TODOIST_API_BASE}/projects/${projectId}`, {
    headers: getAuthHeaders(credentials),
  }).json();

  return response;
}

async function getProjects(credentials: TodoistCredentials) {
  const response = await ky.get(`${TODOIST_API_BASE}/projects`, {
    headers: getAuthHeaders(credentials),
  }).json<unknown[]>();

  return { projects: response, count: response.length };
}

async function deleteProject(credentials: TodoistCredentials, projectId: string) {
  await ky.delete(`${TODOIST_API_BASE}/projects/${projectId}`, {
    headers: getAuthHeaders(credentials),
  });

  return { success: true, projectId };
}

// =============================================================================
// Comment Operations
// =============================================================================

async function createComment(
  credentials: TodoistCredentials,
  taskId: string,
  content: string
) {
  const response = await ky.post(`${TODOIST_API_BASE}/comments`, {
    headers: getAuthHeaders(credentials),
    json: {
      task_id: taskId,
      content,
    },
  }).json();

  return response;
}

async function getComments(credentials: TodoistCredentials, taskId: string) {
  const response = await ky.get(`${TODOIST_API_BASE}/comments?task_id=${taskId}`, {
    headers: getAuthHeaders(credentials),
  }).json<unknown[]>();

  return { comments: response, count: response.length };
}

// =============================================================================
// Label Operations
// =============================================================================

async function createLabel(
  credentials: TodoistCredentials,
  name: string,
  color?: string
) {
  const body: Record<string, unknown> = { name };
  if (color) body.color = color;

  const response = await ky.post(`${TODOIST_API_BASE}/labels`, {
    headers: getAuthHeaders(credentials),
    json: body,
  }).json();

  return response;
}

async function getLabels(credentials: TodoistCredentials) {
  const response = await ky.get(`${TODOIST_API_BASE}/labels`, {
    headers: getAuthHeaders(credentials),
  }).json<unknown[]>();

  return { labels: response, count: response.length };
}

// =============================================================================
// Executor
// =============================================================================

export const todoistExecutor: NodeExecutor<TodoistData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    todoistChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.credentialId) {
    await publish(todoistChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Todoist node: Credential is required");
  }

  if (!data.variableName) {
    await publish(todoistChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Todoist node: Variable name is required");
  }

  if (!data.operation) {
    await publish(todoistChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Todoist node: Operation is required");
  }

  try {
    const result = await step.run("todoist-operation", async () => {
      const credentials = await getTodoistCredentials(data.credentialId!, userId);

      // Compile templates with context
      const compileTemplate = (template?: string) => {
        if (!template) return undefined;
        return processTemplate(template, context);
      };

      const content = compileTemplate(data.content);
      const description = compileTemplate(data.description);
      const taskId = compileTemplate(data.taskId);
      const projectId = compileTemplate(data.projectId);
      const sectionId = compileTemplate(data.sectionId);
      const parentId = compileTemplate(data.parentId);
      const labels = data.labels ? compileTemplate(data.labels)?.split(",").map(l => l.trim()).filter(Boolean) : undefined;
      const priority = data.priority ? parseInt(data.priority) : undefined;
      const dueString = compileTemplate(data.dueString);
      const dueDate = compileTemplate(data.dueDate);
      const dueDatetime = compileTemplate(data.dueDatetime);
      const assigneeId = compileTemplate(data.assigneeId);
      const duration = data.duration ? parseInt(data.duration) : undefined;
      const durationUnit = data.durationUnit;
      const order = data.order ? parseInt(data.order) : undefined;
      const projectName = compileTemplate(data.projectName);
      const commentContent = compileTemplate(data.commentContent);
      const labelName = compileTemplate(data.labelName);
      const filter = compileTemplate(data.filter);

      let operationResult: unknown;

      switch (data.operation) {
        case "createTask": {
          if (!content) {
            throw new NonRetriableError("Todoist createTask: Content is required");
          }
          operationResult = await createTask(credentials, content, {
            description,
            projectId,
            sectionId,
            parentId,
            order,
            labels,
            priority,
            dueString,
            dueDate,
            dueDatetime,
            assigneeId,
            duration,
            durationUnit,
          });
          break;
        }

        case "getTask": {
          if (!taskId) {
            throw new NonRetriableError("Todoist getTask: Task ID is required");
          }
          operationResult = await getTask(credentials, taskId);
          break;
        }

        case "updateTask": {
          if (!taskId) {
            throw new NonRetriableError("Todoist updateTask: Task ID is required");
          }
          operationResult = await updateTask(credentials, taskId, {
            content,
            description,
            labels,
            priority,
            dueString,
            dueDate,
            dueDatetime,
            assigneeId,
            duration,
            durationUnit,
          });
          break;
        }

        case "closeTask": {
          if (!taskId) {
            throw new NonRetriableError("Todoist closeTask: Task ID is required");
          }
          operationResult = await closeTask(credentials, taskId);
          break;
        }

        case "reopenTask": {
          if (!taskId) {
            throw new NonRetriableError("Todoist reopenTask: Task ID is required");
          }
          operationResult = await reopenTask(credentials, taskId);
          break;
        }

        case "deleteTask": {
          if (!taskId) {
            throw new NonRetriableError("Todoist deleteTask: Task ID is required");
          }
          operationResult = await deleteTask(credentials, taskId);
          break;
        }

        case "getActiveTasks": {
          operationResult = await getActiveTasks(credentials, {
            projectId,
            sectionId,
            filter,
          });
          break;
        }

        case "createProject": {
          if (!projectName) {
            throw new NonRetriableError("Todoist createProject: Project name is required");
          }
          operationResult = await createProject(credentials, projectName, {
            color: data.projectColor,
            viewStyle: data.projectViewStyle,
            isFavorite: data.isFavorite,
          });
          break;
        }

        case "getProject": {
          if (!projectId) {
            throw new NonRetriableError("Todoist getProject: Project ID is required");
          }
          operationResult = await getProject(credentials, projectId);
          break;
        }

        case "getProjects": {
          operationResult = await getProjects(credentials);
          break;
        }

        case "deleteProject": {
          if (!projectId) {
            throw new NonRetriableError("Todoist deleteProject: Project ID is required");
          }
          operationResult = await deleteProject(credentials, projectId);
          break;
        }

        case "createComment": {
          if (!taskId) {
            throw new NonRetriableError("Todoist createComment: Task ID is required");
          }
          if (!commentContent) {
            throw new NonRetriableError("Todoist createComment: Comment content is required");
          }
          operationResult = await createComment(credentials, taskId, commentContent);
          break;
        }

        case "getComments": {
          if (!taskId) {
            throw new NonRetriableError("Todoist getComments: Task ID is required");
          }
          operationResult = await getComments(credentials, taskId);
          break;
        }

        case "createLabel": {
          if (!labelName) {
            throw new NonRetriableError("Todoist createLabel: Label name is required");
          }
          operationResult = await createLabel(credentials, labelName, data.labelColor);
          break;
        }

        case "getLabels": {
          operationResult = await getLabels(credentials);
          break;
        }

        default:
          throw new NonRetriableError(`Todoist node: Unknown operation: ${data.operation}`);
      }

      return {
        ...context,
        [data.variableName!]: operationResult,
      };
    });

    await publish(
      todoistChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      todoistChannel().status({
        nodeId,
        status: "error",
      })
    );

    if (error instanceof NonRetriableError) {
      throw error;
    }

    // Handle HTTP errors from ky
    if (error instanceof Error) {
      const message = error.message || "Unknown Todoist API error";
      throw new NonRetriableError(`Todoist API error: ${message}`);
    }

    throw new NonRetriableError("Unknown error occurred while executing Todoist operation");
  }
};
