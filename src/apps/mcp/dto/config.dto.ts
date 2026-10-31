import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SessionActionsDTO } from '@waha/structures/apikeys.dto';

/**
 * Named sets of MCP tools. An explicit `tools` list overrides the preset.
 * "all" is the default and matches servers that have no tool policy yet.
 */
export enum McpToolsPreset {
  all = 'all',
  readonly = 'readonly',
  messaging = 'messaging',
}

export class McpAppConfig {
  @ApiProperty({
    type: SessionActionsDTO,
    description: 'Permission scopes for the generated API key.',
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => SessionActionsDTO)
  actions: SessionActionsDTO;

  @ApiProperty({
    example: 'key_id_00000000000000000000000000',
    required: false,
    nullable: true,
    readOnly: true,
    description: 'ID of the API key created for this app. Read-only.',
  })
  @IsOptional()
  @IsString()
  key_id?: string;

  @ApiProperty({
    example: 'key_11111111111AAAAAAAAAAAAAAAAAAAAA',
    required: false,
    nullable: true,
    readOnly: true,
    description:
      'The API key value. Populated on read; not persisted in this record.',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({
    description:
      'Built-in set of MCP tools exposed for this app. ' +
      '"all" (default) exposes every tool. ' +
      '"readonly" exposes tools marked read-only. ' +
      '"messaging" exposes send, typing, reaction, and the chat reads needed to reply. ' +
      'Ignored when "tools" is set. ' +
      'The policy applies when a client calls POST /mcp with the API key created for this app. ' +
      'The server admin key is not restricted by an app.',
    enum: McpToolsPreset,
    required: false,
    default: McpToolsPreset.all,
    example: McpToolsPreset.readonly,
  })
  @IsOptional()
  @IsEnum(McpToolsPreset)
  toolsPreset?: McpToolsPreset = McpToolsPreset.all;

  @ApiProperty({
    description:
      'Allowlist of MCP tool names, for example "ping", "send-text", "chats-list". ' +
      'When set, only these tools are exposed and toolsPreset is ignored. ' +
      'An empty list exposes no tools. Omit the field to use toolsPreset.',
    required: false,
    type: [String],
    example: ['ping', 'chats-list', 'send-text'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];
}
