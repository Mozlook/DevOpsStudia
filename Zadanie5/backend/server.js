const express = require("express");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const INSTANCE_ID = (
  process.env.INSTANCE_ID ||
  os.hostname() ||
  "unknown"
).trim();

const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "items.json");

const DEFAULT_ITEMS = [
  {
    id: 1,
    name: "Laptop Pro 14",
    category: "Elektronika",
    price: 4999.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 2,
    name: "Monitor 27",
    category: "Elektronika",
    price: 1299.5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 3,
    name: "Biurko Smart",
    category: "Meble",
    price: 899.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeItems(items) {
  ensureDataDirectory();

  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tmpFile, DATA_FILE);
}

function readItems() {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE)) {
    writeItems(DEFAULT_ITEMS);
    return [...DEFAULT_ITEMS];
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8").trim();

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && Array.isArray(parsed.items)) {
    return parsed.items;
  }

  return [];
}

function getNextId(items) {
  const maxId = items.reduce((max, item) => {
    const itemId = Number(item.id);
    return Number.isFinite(itemId) && itemId > max ? itemId : max;
  }, 0);

  return maxId + 1;
}

app.get("/items", (req, res, next) => {
  try {
    const items = readItems();
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
});

app.post("/items", (req, res, next) => {
  try {
    const { name, category, price } = req.body ?? {};

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedCategory =
      typeof category === "string" ? category.trim() : "";
    const numericPrice = Number(price);

    if (!normalizedName) {
      return res.status(400).json({ error: "Field 'name' is required." });
    }

    if (!normalizedCategory) {
      return res.status(400).json({ error: "Field 'category' is required." });
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res
        .status(400)
        .json({ error: "Field 'price' must be a number >= 0." });
    }

    const items = readItems();
    const newItem = {
      id: getNextId(items),
      name: normalizedName,
      category: normalizedCategory,
      price: Number(numericPrice.toFixed(2)),
      createdAt: new Date().toISOString(),
    };

    items.push(newItem);
    writeItems(items);

    return res.status(201).json(newItem);
  } catch (error) {
    return next(error);
  }
});

app.get("/stats", (req, res, next) => {
  try {
    const items = readItems();

    return res.status(200).json({
      totalProducts: items.length,
      instanceId: INSTANCE_ID,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

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

readItems();

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log(`INSTANCE_ID=${INSTANCE_ID}`);
  console.log(`DATA_FILE=${DATA_FILE}`);
});
