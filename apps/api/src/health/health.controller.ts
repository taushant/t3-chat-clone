import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
} from "@nestjs/terminus";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Custom health checks - removed HTTP dependency for minimal setup
      () =>
        Promise.resolve({
          application: {
            status: "up",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || "1.0.0",
          },
        }),
    ]);
  }

  @Get("ready")
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Add readiness checks here (database, external services, etc.)
      () =>
        Promise.resolve({
          readiness: {
            status: "up",
            timestamp: new Date().toISOString(),
          },
        }),
    ]);
  }

  @Get("live")
  @HealthCheck()
  liveness() {
    return this.health.check([
      // Add liveness checks here (basic app health)
      () =>
        Promise.resolve({
          liveness: {
            status: "up",
            timestamp: new Date().toISOString(),
          },
        }),
    ]);
  }
}
