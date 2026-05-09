const express = require("express");
const os = require("node:os");
const { Pool } = require("pg");
const { createClient } = require("redis");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const INSTANCE_ID = (process.env.INSTANCE_ID || os.hostname() || "unknown").trim();

const POSTGRES_HOST = process.env.POSTGRES_HOST || "db";
const POSTGRES_PORT = Number(process.env.POSTGRES_PORT) || 5432;
const POSTGRES_DB = process.env.POSTGRES_DB || "products";
const POSTGRES_USER = process.env.POSTGRES_USER || "products";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "";

const REDIS_HOST = process.env.REDIS_HOST || "cache";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 30;
const ITEMS_CACHE_KEY = "api:items";
const CACHE_HITS_KEY = "api:items:cache_hits";

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

const db = new Pool({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DB,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const redis = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0
    );
  `);
}

function normalizeProduct(row) {
  return {
    id: Number(row.id),
    name: row.name,
    price: Number(row.price),
  };
}

async function fetchItemsFromDatabase() {
  const result = await db.query(
    "SELECT id, name, price FROM products ORDER BY id ASC",
  );

  return result.rows.map(normalizeProduct);
}

async function getCacheHits() {
  const value = await redis.get(CACHE_HITS_KEY);
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getItems(req, res, next) {
  try {
    const cachedPayload = await redis.get(ITEMS_CACHE_KEY);

    if (cachedPayload) {
      await redis.incr(CACHE_HITS_KEY);
      return res.status(200).json(JSON.parse(cachedPayload));
    }

    const items = await fetchItemsFromDatabase();
    const payload = { items };

    await redis.setEx(
      ITEMS_CACHE_KEY,
      CACHE_TTL_SECONDS,
      JSON.stringify(payload),
    );

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function addItem(req, res, next) {
  try {
    const { name, price } = req.body ?? {};

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const numericPrice = Number(price);

    if (!normalizedName) {
      return res.status(400).json({ error: "Field 'name' is required." });
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res
        .status(400)
        .json({ error: "Field 'price' must be a number >= 0." });
    }

    const result = await db.query(
      "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price",
      [normalizedName, numericPrice.toFixed(2)],
    );

    await redis.del(ITEMS_CACHE_KEY);

    return res.status(201).json(normalizeProduct(result.rows[0]));
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const countResult = await db.query("SELECT COUNT(*)::int AS total FROM products");
    const cacheHits = await getCacheHits();

    return res.status(200).json({
      totalProducts: countResult.rows[0].total,
      cache_hits: cacheHits,
      cacheHits,
      instanceId: INSTANCE_ID,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

async function health(req, res) {
  try {
    await db.query("SELECT 1");
    await redis.ping();

    return res.status(200).json({
      status: "ok",
      instanceId: INSTANCE_ID,
    });
  } catch (error) {
    return res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
}

const router = express.Router();
router.get("/items", getItems);
router.post("/items", addItem);
router.get("/stats", getStats);

app.get("/health", health);
app.use("/api", router);
app.use("/", router);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error." });
});

async function start() {
  await redis.connect();
  await ensureSchema();

  const server = app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`INSTANCE_ID=${INSTANCE_ID}`);
    console.log(`PostgreSQL=${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`);
    console.log(`Redis=${REDIS_HOST}:${REDIS_PORT}`);
    console.log(`CACHE_TTL_SECONDS=${CACHE_TTL_SECONDS}`);
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}. Closing connections...`);
    server.close(async () => {
      await Promise.allSettled([redis.quit(), db.end()]);
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch(async (error) => {
  console.error("Failed to start backend:", error);
  await Promise.allSettled([redis.quit(), db.end()]);
  process.exit(1);
});
