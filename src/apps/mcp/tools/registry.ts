import { WAHASelf } from '@waha/apps/app_sdk/waha/WAHASelf';
import { McpController } from '@waha/apps/mcp/decorators/controller';
import { getTools, ToolDef } from '@waha/apps/mcp/decorators/tool';
import { ApiTools } from '@waha/apps/mcp/tools/api.tools';
import { AppsTools } from '@waha/apps/mcp/tools/apps.tools';
import { AuthTools } from '@waha/apps/mcp/tools/auth.tools';
import { CallTools } from '@waha/apps/mcp/tools/calls.tools';
import { ChannelTools } from '@waha/apps/mcp/tools/channels.tools';
import { ChatTools } from '@waha/apps/mcp/tools/chats.tools';
import { ContactTools } from '@waha/apps/mcp/tools/contacts.tools';
import { GroupTools } from '@waha/apps/mcp/tools/groups.tools';
import { KeysTools } from '@waha/apps/mcp/tools/keys.tools';
import { LabelTools } from '@waha/apps/mcp/tools/labels.tools';
import { LidTools } from '@waha/apps/mcp/tools/lids.tools';
import { PingTools } from '@waha/apps/mcp/tools/ping.tools';
import { PresenceTools } from '@waha/apps/mcp/tools/presence.tools';
import { ProfileTools } from '@waha/apps/mcp/tools/profile.tools';
import { SendTools } from '@waha/apps/mcp/tools/send.tools';
import { ServerTools } from '@waha/apps/mcp/tools/server.tools';
import { SessionTools } from '@waha/apps/mcp/tools/sessions.tools';
import { StatusTools } from '@waha/apps/mcp/tools/status.tools';

type McpToolControllerClass = new (api: WAHASelf) => McpController;

/**
 * Every MCP tool controller. Registration and the allowlist both read this
 * list, so a new tool is exposed and selectable together.
 */
export const MCP_TOOL_CONTROLLERS: McpToolControllerClass[] = [
  PingTools,
  SendTools,
  AuthTools,
  SessionTools,
  ChatTools,
  ApiTools,
  CallTools,
  ChannelTools,
  ContactTools,
  GroupTools,
  LabelTools,
  LidTools,
  PresenceTools,
  ProfileTools,
  StatusTools,
  ServerTools,
  KeysTools,
  AppsTools,
];

export function createMcpControllers(api: WAHASelf): McpController[] {
  const controllers: McpController[] = [];
  for (const ToolClass of MCP_TOOL_CONTROLLERS) {
    controllers.push(new ToolClass(api));
  }
  return controllers;
}

export function listMcpToolDefs(): ToolDef[] {
  const defs: ToolDef[] = [];
  for (const ToolClass of MCP_TOOL_CONTROLLERS) {
    const found = getTools(ToolClass.prototype as McpController);
    for (const def of found) {
      defs.push(def);
    }
  }
  return defs;
}
