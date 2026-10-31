import { AppName } from '@waha/apps/app_sdk/apps/apps';
import { McpToolsPreset } from '@waha/apps/mcp/dto/config.dto';
import { ToolDef } from '@waha/apps/mcp/decorators/tool';
import { listMcpToolDefs } from '@waha/apps/mcp/tools/registry';

/**
 * Fields of McpAppConfig that choose which tools POST /mcp registers.
 * Kept structural so policy resolution does not depend on class-transformer.
 */
export interface McpToolSelection {
  toolsPreset?: McpToolsPreset | string;
  tools?: string[];
}

// Outbound send/status/typing/reaction tools, plus the chat reads a client
// needs in order to reply. Session admin and destructive tools stay out.
const MESSAGING_TOOLS = new Set<string>([
  'ping',
  'start-typing',
  'stop-typing',
  'set-reaction',
  'set-star',
  'new-message-id',
  'status-new-message-id',
  'chats-list',
  'chats-overview',
  'chats-overview-post',
  'chats-get-messages',
  'chats-get-message',
  'chats-get-picture',
  'chats-read-messages',
  'contacts-check-exists',
]);

export function normalizeMcpToolNames(tools: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of tools) {
    if (typeof raw !== 'string') {
      continue;
    }
    const name = raw.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function knownMcpToolNames(): Set<string> {
  const names = new Set<string>();
  for (const def of listMcpToolDefs()) {
    names.add(def.name);
  }
  return names;
}

export function unknownMcpToolNames(tools: string[]): string[] {
  const known = knownMcpToolNames();
  const unknown: string[] = [];
  for (const name of tools) {
    if (!known.has(name)) {
      unknown.push(name);
    }
  }
  return unknown;
}

export function isReadonlyTool(def: ToolDef): boolean {
  return def.config?.annotations?.readOnlyHint === true;
}

export function isMessagingTool(name: string): boolean {
  if (MESSAGING_TOOLS.has(name)) {
    return true;
  }
  if (name.startsWith('send-')) {
    return true;
  }
  if (name.startsWith('status-send-')) {
    return true;
  }
  if (name.startsWith('forward-')) {
    return true;
  }
  return false;
}

/**
 * Allowlist for a stored app, or null when this app does not restrict tools.
 * Keys that are not attached to an MCP app keep the full tool list.
 */
export function allowlistForApp(
  app: { app: string; config?: McpToolSelection | null } | null,
): Set<string> | null {
  if (!app || app.app !== AppName.mcp) {
    return null;
  }
  return resolveAllowedToolNames(app.config);
}

/**
 * null means no restriction: register every tool, including ones added later.
 * A Set is the exact allowlist. An empty Set exposes no tools.
 * An explicit `tools` array wins over `toolsPreset`, including when it is empty.
 */
export function resolveAllowedToolNames(
  config: McpToolSelection | null | undefined,
): Set<string> | null {
  if (Array.isArray(config?.tools)) {
    return new Set(normalizeMcpToolNames(config.tools));
  }
  const preset = config?.toolsPreset ?? McpToolsPreset.all;
  if (preset === McpToolsPreset.readonly) {
    return toolNamesWhere(isReadonlyTool);
  }
  if (preset === McpToolsPreset.messaging) {
    return toolNamesWhere(isMessagingToolDef);
  }
  return null;
}

function isMessagingToolDef(def: ToolDef): boolean {
  return isMessagingTool(def.name);
}

function toolNamesWhere(include: (def: ToolDef) => boolean): Set<string> {
  const names = new Set<string>();
  for (const def of listMcpToolDefs()) {
    if (include(def)) {
      names.add(def.name);
    }
  }
  return names;
}
