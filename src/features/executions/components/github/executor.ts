import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { githubChannel } from "@/inngest/channels/github";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type LabelInput = {
  name: string;
};

type GithubData = {
  variableName?: string;
  credentialId?: string;
  operation?:
    | "list_repos"
    | "get_repo"
    | "list_issues"
    | "get_issue"
    | "create_issue"
    | "update_issue"
    | "close_issue"
    | "list_pull_requests"
    | "get_pull_request"
    | "create_pull_request"
    | "merge_pull_request"
    | "list_branches"
    | "get_file_content"
    | "create_or_update_file";
  owner?: string;
  repo?: string;
  issueNumber?: string;
  title?: string;
  body?: string;
  labels?: LabelInput[];
  assignees?: string;
  state?: "open" | "closed" | "all";
  prNumber?: string;
  head?: string;
  base?: string;
  draft?: boolean;
  path?: string;
  branch?: string;
  content?: string;
  message?: string;
  sha?: string;
};

type OAuthTokenData = {
  accessToken: string;
  tokenType?: string;
  scope?: string;
  username?: string;
};

// =============================================================================
// GitHub API Helpers
// =============================================================================

const GITHUB_API_BASE = "https://api.github.com";

function getGithubHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function getAccessToken(
  credentialId: string,
  userId: string
): Promise<string> {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("GitHub credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError("Invalid GitHub credential format");
  }

  if (!tokenData.accessToken) {
    throw new NonRetriableError("GitHub access token not found in credential");
  }

  return tokenData.accessToken;
}

// processTemplate is now imported from handlebars-utils

// =============================================================================
// GitHub API Operations
// =============================================================================

async function listRepos(accessToken: string): Promise<unknown[]> {
  const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`, {
    headers: getGithubHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list repositories: ${error}`);
  }

  return response.json();
}

async function getRepo(accessToken: string, owner: string, repo: string): Promise<unknown> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: getGithubHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get repository: ${error}`);
  }

  return response.json();
}

async function listIssues(
  accessToken: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<unknown[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=${state}&per_page=100`,
    { headers: getGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list issues: ${error}`);
  }

  return response.json();
}

async function getIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<unknown> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`,
    { headers: getGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get issue: ${error}`);
  }

  return response.json();
}

async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[],
  assignees?: string[]
): Promise<unknown> {
  const payload: Record<string, unknown> = { title };
  if (body) payload.body = body;
  if (labels && labels.length > 0) payload.labels = labels;
  if (assignees && assignees.length > 0) payload.assignees = assignees;

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: getGithubHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create issue: ${error}`);
  }

  return response.json();
}

async function updateIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  updates: { title?: string; body?: string; labels?: string[]; assignees?: string[]; state?: string }
): Promise<unknown> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: "PATCH",
      headers: getGithubHeaders(accessToken),
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update issue: ${error}`);
  }

  return response.json();
}

async function closeIssue(
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<unknown> {
  return updateIssue(accessToken, owner, repo, issueNumber, { state: "closed" });
}

async function listPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<unknown[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
    { headers: getGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list pull requests: ${error}`);
  }

  return response.json();
}

async function getPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<unknown> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: getGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get pull request: ${error}`);
  }

  return response.json();
}

async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
  draft?: boolean
): Promise<unknown> {
  const payload: Record<string, unknown> = { title, head, base };
  if (body) payload.body = body;
  if (draft !== undefined) payload.draft = draft;

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: getGithubHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create pull request: ${error}`);
  }

  return response.json();
}

async function mergePullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<unknown> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: getGithubHeaders(accessToken),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to merge pull request: ${error}`);
  }

  return response.json();
}

async function listBranches(
  accessToken: string,
  owner: string,
  repo: string
): Promise<unknown[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: getGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list branches: ${error}`);
  }

  return response.json();
}

async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<unknown> {
  let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  if (branch) url += `?ref=${branch}`;

  const response = await fetch(url, { headers: getGithubHeaders(accessToken) });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get file content: ${error}`);
  }

  const data = await response.json();
  
  // Decode base64 content if present
  if (data.content && data.encoding === "base64") {
    data.decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
  }

  return data;
}

async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string,
  sha?: string
): Promise<unknown> {
  const payload: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  if (branch) payload.branch = branch;
  if (sha) payload.sha = sha;

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: getGithubHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create/update file: ${error}`);
  }

  return response.json();
}

// =============================================================================
// Executor
// =============================================================================

export const githubExecutor: NodeExecutor<GithubData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    githubChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.credentialId) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("GitHub node: Credential is required");
  }

  if (!data.operation) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("GitHub node: Operation is required");
  }

  if (!data.variableName) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("GitHub node: Variable name is required");
  }

  try {
    const result = await step.run("github-operation", async () => {
      const accessToken = await getAccessToken(data.credentialId!, userId);

      // Process template variables
      const owner = processTemplate(data.owner, context);
      const repo = processTemplate(data.repo, context);
      const title = processTemplate(data.title, context);
      const body = processTemplate(data.body, context);
      const path = processTemplate(data.path, context);
      const branch = processTemplate(data.branch, context);
      const content = processTemplate(data.content, context);
      const message = processTemplate(data.message, context);
      const sha = processTemplate(data.sha, context);
      const issueNumber = data.issueNumber ? parseInt(processTemplate(data.issueNumber, context), 10) : undefined;
      const prNumber = data.prNumber ? parseInt(processTemplate(data.prNumber, context), 10) : undefined;
      const assignees = data.assignees
        ? processTemplate(data.assignees, context).split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const labels = data.labels?.map((l) => processTemplate(l.name, context)).filter(Boolean);

      let operationResult: unknown;

      switch (data.operation) {
        case "list_repos":
          operationResult = await listRepos(accessToken);
          break;

        case "get_repo":
          if (!owner || !repo) throw new NonRetriableError("GitHub: Owner and repo are required");
          operationResult = await getRepo(accessToken, owner, repo);
          break;

        case "list_issues":
          if (!owner || !repo) throw new NonRetriableError("GitHub: Owner and repo are required");
          operationResult = await listIssues(accessToken, owner, repo, data.state);
          break;

        case "get_issue":
          if (!owner || !repo || !issueNumber) throw new NonRetriableError("GitHub: Owner, repo, and issue number are required");
          operationResult = await getIssue(accessToken, owner, repo, issueNumber);
          break;

        case "create_issue":
          if (!owner || !repo || !title) throw new NonRetriableError("GitHub: Owner, repo, and title are required");
          operationResult = await createIssue(accessToken, owner, repo, title, body, labels, assignees);
          break;

        case "update_issue":
          if (!owner || !repo || !issueNumber) throw new NonRetriableError("GitHub: Owner, repo, and issue number are required");
          operationResult = await updateIssue(accessToken, owner, repo, issueNumber, {
            title: title || undefined,
            body: body || undefined,
            labels,
            assignees,
          });
          break;

        case "close_issue":
          if (!owner || !repo || !issueNumber) throw new NonRetriableError("GitHub: Owner, repo, and issue number are required");
          operationResult = await closeIssue(accessToken, owner, repo, issueNumber);
          break;

        case "list_pull_requests":
          if (!owner || !repo) throw new NonRetriableError("GitHub: Owner and repo are required");
          operationResult = await listPullRequests(accessToken, owner, repo, data.state);
          break;

        case "get_pull_request":
          if (!owner || !repo || !prNumber) throw new NonRetriableError("GitHub: Owner, repo, and PR number are required");
          operationResult = await getPullRequest(accessToken, owner, repo, prNumber);
          break;

        case "create_pull_request":
          if (!owner || !repo || !title || !data.head || !data.base) {
            throw new NonRetriableError("GitHub: Owner, repo, title, head, and base are required");
          }
          operationResult = await createPullRequest(
            accessToken,
            owner,
            repo,
            title,
            processTemplate(data.head, context),
            processTemplate(data.base, context),
            body,
            data.draft
          );
          break;

        case "merge_pull_request":
          if (!owner || !repo || !prNumber) throw new NonRetriableError("GitHub: Owner, repo, and PR number are required");
          operationResult = await mergePullRequest(accessToken, owner, repo, prNumber);
          break;

        case "list_branches":
          if (!owner || !repo) throw new NonRetriableError("GitHub: Owner and repo are required");
          operationResult = await listBranches(accessToken, owner, repo);
          break;

        case "get_file_content":
          if (!owner || !repo || !path) throw new NonRetriableError("GitHub: Owner, repo, and path are required");
          operationResult = await getFileContent(accessToken, owner, repo, path, branch || undefined);
          break;

        case "create_or_update_file":
          if (!owner || !repo || !path || !content || !message) {
            throw new NonRetriableError("GitHub: Owner, repo, path, content, and message are required");
          }
          operationResult = await createOrUpdateFile(
            accessToken,
            owner,
            repo,
            path,
            content,
            message,
            branch || undefined,
            sha || undefined
          );
          break;

        default:
          throw new NonRetriableError(`GitHub: Unknown operation: ${data.operation}`);
      }

      return {
        ...context,
        [data.variableName!]: {
          operation: data.operation,
          success: true,
          data: operationResult,
        },
      };
    });

    await publish(githubChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(githubChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
