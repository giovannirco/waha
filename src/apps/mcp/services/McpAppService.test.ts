import { UnprocessableEntityException } from '@nestjs/common';
import { AppName } from '@waha/apps/app_sdk/apps/apps';
import { App } from '@waha/apps/app_sdk/dto/app.dto';
import { McpAppConfig, McpToolsPreset } from '@waha/apps/mcp/dto/config.dto';
import { McpAppService } from '@waha/apps/mcp/services/McpAppService';

function mcpApp(config: Partial<McpAppConfig>): App<McpAppConfig> {
  return {
    id: 'app_mcp_test',
    session: 'default',
    app: AppName.mcp,
    enabled: true,
    config: config as McpAppConfig,
  };
}

describe('McpAppService tool config', () => {
  const service = new McpAppService({} as any);

  it('defaults a missing preset to all and strips the key fields', () => {
    const app = mcpApp({
      key: 'key_secret',
      key_id: 'key_id_secret',
    });
    service.validate(app);
    expect(app.config.toolsPreset).toBe(McpToolsPreset.all);
    expect(app.config.key).toBeUndefined();
    expect(app.config.key_id).toBeUndefined();
  });

  it('rejects unknown tool names', () => {
    const app = mcpApp({
      toolsPreset: McpToolsPreset.all,
      tools: ['ping', 'not-a-tool'],
    });
    expect(() => service.validate(app)).toThrow(UnprocessableEntityException);
  });

  it('dedupes a valid allowlist', () => {
    const app = mcpApp({
      tools: ['send-text', ' send-text ', 'ping'],
    });
    service.validate(app);
    expect(app.config.tools).toEqual(['send-text', 'ping']);
  });

  it('rejects a blank tool name', () => {
    const app = mcpApp({
      tools: ['ping', ' '],
    });
    expect(() => service.validate(app)).toThrow(UnprocessableEntityException);
  });
});
