import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pharmacie API",
      version: "1.0.0",
      description: "Authentication + RBAC API (Oracle + Node.js)",
    },
    servers: [
      { url: "http://localhost:4000", description: "Local dev" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.js"], // we will put docs in routes files
});