import "reflect-metadata";

async function bootstrap(): Promise<void> {
  // Placeholder: we'll replace with NestFactory later
  // Keeps the API entry deterministic for now
  // eslint-disable-next-line no-console
  console.log("API dev server ready (stub)");
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API:", error);
  process.exit(1);
});
