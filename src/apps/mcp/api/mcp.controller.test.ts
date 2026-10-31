import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { McpController } from '@waha/apps/mcp/api/mcp.controller';
import { McpService } from '@waha/apps/mcp/mcp.service';
import request = require('supertest');

describe('McpController HTTP methods', () => {
  let app: INestApplication;
  const handlePost = jest.fn((req, res) => {
    res.status(200).json({ ok: true });
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        {
          provide: McpService,
          useValue: {
            handlePost: handlePost,
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    handlePost.mockClear();
  });

  it('accepts POST', async () => {
    await request(app.getHttpServer())
      .post('/mcp')
      .send({ jsonrpc: '2.0' })
      .expect(200);
    expect(handlePost).toHaveBeenCalledTimes(1);
  });

  it('returns 405 for GET', async () => {
    const response = await request(app.getHttpServer())
      .get('/mcp')
      .expect(405);
    expect(response.headers.allow).toBe('POST');
    expect(response.body.statusCode).toBe(405);
    expect(handlePost).not.toHaveBeenCalled();
  });

  it('returns 405 for DELETE', async () => {
    const response = await request(app.getHttpServer())
      .delete('/mcp')
      .expect(405);
    expect(response.headers.allow).toBe('POST');
    expect(response.body.message).toBe('Only POST is supported on /mcp');
    expect(handlePost).not.toHaveBeenCalled();
  });
});
