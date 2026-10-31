import { Injectable } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { WMcpServer } from './mcp.server';
import { WAHASelf } from '@waha/apps/app_sdk/waha/WAHASelf';
import { AppRepository } from '@waha/apps/app_sdk/storage/AppRepository';
import { allowlistForApp } from '@waha/apps/mcp/tools/policy';
import { createMcpControllers } from '@waha/apps/mcp/tools/registry';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class McpService {
  constructor(
    private readonly manager: SessionManager,
    @InjectPinoLogger('McpService')
    private readonly logger: PinoLogger,
  ) {}

  async handlePost(req: Request, res: Response) {
    const apiKey = apiKeyFromRequest(req);
    const api = new WAHASelf(apiKey);
    const allowed = await this.allowedTools(apiKey);
    const server = new WMcpServer(createMcpControllers(api), allowed);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  /**
   * Tool policy for the API key on this request.
   * null means the key is not owned by an MCP app (server admin key, or a key
   * with no app), so every tool stays available.
   */
  private async allowedTools(
    apiKey: string | undefined,
  ): Promise<Set<string> | null> {
    if (!apiKey) {
      return null;
    }
    const record = await this.manager.apiKeyRepository.getByKey(apiKey);
    const appId = record?.app_id;
    if (!appId) {
      return null;
    }
    const repo = new AppRepository(this.manager.store.getWAHADatabase());
    const app = await repo.getById(appId);
    const allowed = allowlistForApp(app);
    if (allowed) {
      this.logger.debug(
        `MCP exposing ${allowed.size} tools for app ${appId}`,
      );
    }
    return allowed;
  }
}

function apiKeyFromRequest(req: Request): string | undefined {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  if (Array.isArray(header)) {
    const first = header[0];
    if (typeof first === 'string' && first.length > 0) {
      return first;
    }
  }
  return undefined;
}
