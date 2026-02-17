import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryLayerEngine } from '../core/engine.js';
import {
  allToolDefinitions,
  handleGatewayCall,
  isGatewayTool,
} from './gateways/index.js';
import { handleToolCall } from './tools.js';
import { resourceDefinitions, handleResourceRead } from './resources.js';
import type { MemoryLayerConfig } from '../types/index.js';

export class MCPServer {
  private server: Server;
  private engine: MemoryLayerEngine;

  constructor(config: MemoryLayerConfig) {
    this.engine = new MemoryLayerEngine(config);

    this.server = new Server(
      {
        name: 'memorylayer',
        version: '0.1.0'
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
    // List available tools - now using gateway pattern (10 tools instead of 51)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: allToolDefinitions.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        }))
      };
    });

    // Handle tool calls - route to gateways or standalone handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        // Check if it's a gateway tool
        if (isGatewayTool(name)) {
          result = await handleGatewayCall(this.engine, name, args || {});
        } else {
          // Standalone tools route to existing handler
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

    console.error('MemoryLayer MCP server started');

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
