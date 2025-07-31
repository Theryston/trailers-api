import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Trailers API",
      version: "1.0.0",
      description:
        "A API that downloads movie and tv shows trailers in high resolution from services like Netflix, Apple TV, Prime Video and more",
    },
    servers: [{ url: process.env.BASE_URL }],
  },
  apis: ["./src/**/*.js"],
};

const specs = swaggerJsdoc(options);

export default specs;
