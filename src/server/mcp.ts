import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryLayerEngine } from '../core/engine.js';
import { toolDefinitions, handleToolCall } from './tools.js';
import { gatewayToolDefinitions, handleGatewayToolCall, isGatewayTool } from './gateway-tools.js';
import { resourceDefinitions, handleResourceRead } from './resources.js';
import type { MemoryLayerConfig } from '../types/index.js';

/**
 * MCP Server — Gateway Pattern
 * 
 * Default mode: 4 gateway tools (memory_query, memory_record, memory_review, memory_status)
 * Legacy mode:  51 individual tools (set MEMORYLAYER_LEGACY_TOOLS=1)
 * 
 * Gateway mode saves ~4,700 tokens per LLM interaction by reducing
 * tool description overhead from 51 descriptions to 4.
 */
export class MCPServer {
  private server: Server;
  private engine: MemoryLayerEngine;
  private useGateway: boolean;

  constructor(config: MemoryLayerConfig) {
    this.engine = new MemoryLayerEngine(config);
    this.useGateway = !process.env.MEMORYLAYER_LEGACY_TOOLS;

    this.server = new Server(
      {
        name: 'memorylayer',
        version: '0.2.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (this.useGateway) {
        // Gateway mode: 4 smart tools
        return {
          tools: gatewayToolDefinitions.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        };
      }

      // Legacy mode: all 51 individual tools
      return {
        tools: toolDefinitions.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        }))
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: unknown;

        if (this.useGateway && isGatewayTool(name)) {
          // Route through gateway
          result = await handleGatewayToolCall(this.engine, name, args || {});
        } else {
          // Direct tool call (legacy mode, or non-gateway tool)
          result = await handleToolCall(this.engine, name, args || {});
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage })
            }
          ],
          isError: true
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: resourceDefinitions.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const result = await handleResourceRead(this.engine, uri);

        return {
          contents: [
            {
              uri,
              mimeType: result.mimeType,
              text: result.contents
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(errorMessage);
      }
    });
  }

  async start(): Promise<void> {
    // Initialize the engine (performs indexing)
    await this.engine.initialize();

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const mode = this.useGateway ? 'gateway (4 tools)' : 'legacy (51 tools)';
    console.error(`MemoryLayer MCP server started [${mode}]`);

    // Handle shutdown
    process.on('SIGINT', () => {
      this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.shutdown();
      process.exit(0);
    });
  }

  shutdown(): void {
    this.engine.shutdown();
  }
}
