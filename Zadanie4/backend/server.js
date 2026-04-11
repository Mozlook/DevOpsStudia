const express = require("express");
const os = require("node:os");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const INSTANCE_ID = (process.env.INSTANCE_ID || os.hostname() || "unknown").trim();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

let nextId = 4;

const items = [
  {
    id: 1,
    name: "Laptop Pro 14",
    category: "Elektronika",
    price: 4999.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  {
    id: 2,
    name: "Monitor 27",
    category: "Elektronika",
    price: 1299.5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 3,
    name: "Biurko Smart",
    category: "Meble",
    price: 899.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

app.get("/items", (req, res) => {
  res.status(200).json({ items });
});

app.post("/items", (req, res) => {
  const { name, category, price } = req.body ?? {};

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedCategory = typeof category === "string" ? category.trim() : "";
  const numericPrice = Number(price);

  if (!normalizedName) {
    return res.status(400).json({ error: "Field 'name' is required." });
  }

  if (!normalizedCategory) {
    return res.status(400).json({ error: "Field 'category' is required." });
  }

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: "Field 'price' must be a number >= 0." });
  }

  const newItem = {
    id: nextId++,
    name: normalizedName,
    category: normalizedCategory,
    price: Number(numericPrice.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  items.push(newItem);

  return res.status(201).json(newItem);
});

app.get("/stats", (req, res) => {
  res.status(200).json({
    totalProducts: items.length,
    instanceId: INSTANCE_ID,
    generatedAt: new Date().toISOString()
  });
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

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log(`INSTANCE_ID=${INSTANCE_ID}`);
});
