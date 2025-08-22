import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "./config/config.service";

@ApiTags("API Information")
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: "Get API information" })
  @ApiResponse({
    status: 200,
    description: "API information retrieved successfully",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        description: { type: "string" },
        environment: { type: "string" },
        timestamp: { type: "string" },
        endpoints: {
          type: "object",
          properties: {
            health: { type: "string" },
            docs: { type: "string" },
            api: { type: "string" },
          },
        },
      },
    },
  })
  getApiInfo() {
    return {
      name: "T3 Chat Clone API",
      version: "1.0.0",
      description:
        "A modern chat application API with real-time communication and LLM integration",
      environment: this.configService.nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        docs: "/api/docs",
        api: "/api/v1",
      },
    };
  }
}
