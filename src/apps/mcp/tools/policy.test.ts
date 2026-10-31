import { McpToolsPreset } from '@waha/apps/mcp/dto/config.dto';
import { AppName } from '@waha/apps/app_sdk/apps/apps';
import {
  allowlistForApp,
  isMessagingTool,
  knownMcpToolNames,
  normalizeMcpToolNames,
  resolveAllowedToolNames,
  unknownMcpToolNames,
} from '@waha/apps/mcp/tools/policy';

describe('MCP tool policy', () => {
  it('lists a unique name for every registered tool', () => {
    const names = knownMcpToolNames();
    expect(names.size).toBeGreaterThan(100);
    expect(names.has('ping')).toBe(true);
    expect(names.has('send-text')).toBe(true);
    expect(names.has('server-stop')).toBe(true);
  });

  it('treats a missing policy as every tool', () => {
    expect(resolveAllowedToolNames(undefined)).toBeNull();
    expect(resolveAllowedToolNames({})).toBeNull();
    expect(
      resolveAllowedToolNames({ toolsPreset: McpToolsPreset.all }),
    ).toBeNull();
  });

  it('readonly keeps read-only tools and drops mutations', () => {
    const allowed = resolveAllowedToolNames({
      toolsPreset: McpToolsPreset.readonly,
    });
    expect(allowed.has('ping')).toBe(true);
    expect(allowed.has('chats-list')).toBe(true);
    expect(allowed.has('server-version')).toBe(true);
    expect(allowed.has('send-text')).toBe(false);
    expect(allowed.has('chats-delete')).toBe(false);
    expect(allowed.has('server-stop')).toBe(false);
    expect(allowed.has('api-call')).toBe(false);
    expect(allowed.size).toBeGreaterThan(10);
    expect(allowed.size).toBeLessThan(knownMcpToolNames().size);
  });

  it('messaging keeps send and reply reads, not session admin', () => {
    const allowed = resolveAllowedToolNames({
      toolsPreset: McpToolsPreset.messaging,
    });
    expect(allowed.has('send-text')).toBe(true);
    expect(allowed.has('send-image')).toBe(true);
    expect(allowed.has('forward-message')).toBe(true);
    expect(allowed.has('start-typing')).toBe(true);
    expect(allowed.has('status-send-text')).toBe(true);
    expect(allowed.has('chats-get-messages')).toBe(true);
    expect(allowed.has('ping')).toBe(true);
    expect(allowed.has('sessions-delete')).toBe(false);
    expect(allowed.has('sessions-logout')).toBe(false);
    expect(allowed.has('chats-delete')).toBe(false);
    expect(allowed.has('server-stop')).toBe(false);
    expect(allowed.has('api-call')).toBe(false);
    expect(allowed.has('server-version')).toBe(false);
  });

  it('an explicit allowlist overrides the preset', () => {
    const allowed = resolveAllowedToolNames({
      toolsPreset: McpToolsPreset.messaging,
      tools: ['ping', ' ping ', 'ping', 'chats-list'],
    });
    expect(Array.from(allowed).sort()).toEqual(['chats-list', 'ping']);
  });

  it('an empty allowlist exposes no tools', () => {
    const allowed = resolveAllowedToolNames({
      toolsPreset: McpToolsPreset.all,
      tools: [],
    });
    expect(allowed.size).toBe(0);
  });

  it('ignores apps that are not MCP', () => {
    expect(allowlistForApp(null)).toBeNull();
    expect(
      allowlistForApp({
        app: AppName.chatwoot,
        config: { tools: ['ping'] },
      }),
    ).toBeNull();
    const allowed = allowlistForApp({
      app: AppName.mcp,
      config: { tools: ['ping'] },
    });
    if (!allowed) {
      throw new Error('expected an allowlist');
    }
    expect(Array.from(allowed).sort()).toEqual(['ping']);
  });

  it('normalizes names and reports unknown ones', () => {
    expect(normalizeMcpToolNames([' ping ', 'ping', '', 'send-text'])).toEqual([
      'ping',
      'send-text',
    ]);
    expect(unknownMcpToolNames(['ping', 'not-a-tool'])).toEqual(['not-a-tool']);
    expect(isMessagingTool('send-voice')).toBe(true);
    expect(isMessagingTool('groups-delete')).toBe(false);
  });
});
