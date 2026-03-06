import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async () => {
  return { message: "Podara backend running 🚀" };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;

    await fastify.listen({
      port,
      host: "0.0.0.0", // IMPORTANT for Railway
    });

    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
