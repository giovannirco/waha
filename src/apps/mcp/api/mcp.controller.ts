import {
  Controller,
  Delete,
  Get,
  Header,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { McpService } from '../mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  post(@Req() req: Request, @Res() res: Response) {
    return this.mcp.handlePost(req, res);
  }

  // Streamable HTTP here is stateless and POST-only. GET (SSE listen) and
  // DELETE (session terminate) are not implemented; say so instead of 404.
  @Get()
  @Header('Allow', 'POST')
  @ApiExcludeEndpoint()
  get() {
    this.methodNotAllowed();
  }

  @Delete()
  @Header('Allow', 'POST')
  @ApiExcludeEndpoint()
  delete() {
    this.methodNotAllowed();
  }

  private methodNotAllowed(): never {
    throw new MethodNotAllowedException('Only POST is supported on /mcp');
  }
}
