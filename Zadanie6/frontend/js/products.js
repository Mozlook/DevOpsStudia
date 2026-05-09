const PRODUCTS_API_URL = "/api/items";

const productsList = document.getElementById("products-list");
const productsMessage = document.getElementById("products-message");
const productForm = document.getElementById("product-form");
const reloadProductsButton = document.getElementById("reload-products");
const submitProductButton = document.getElementById("submit-product");
const totalProductsElement = document.getElementById("total-products");

function setMessage(text, type = "info") {
  productsMessage.textContent = text;
  productsMessage.className = `notice notice-${type}`;
}

function formatPrice(value) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("pl-PL");
}

function normalizeItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

function updateTotalProducts(count) {
  totalProductsElement.textContent = String(count);
}

function renderEmptyState(text) {
  productsList.innerHTML = `
    <article class="empty-state">
      <h3>Brak produktów</h3>
      <p>${text}</p>
    </article>
  `;
  updateTotalProducts(0);
}

function createMetaRow(label, value) {
  const row = document.createElement("p");
  row.className = "product-meta";

  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;

  const span = document.createElement("span");
  span.textContent = value;

  row.appendChild(strong);
  row.appendChild(span);

  return row;
}

function createProductCard(item) {
  const card = document.createElement("article");
  card.className = "product-card";

  const top = document.createElement("div");
  top.className = "product-card-top";

  const title = document.createElement("h3");
  title.className = "product-name";
  title.textContent = item.name || "Produkt bez nazwy";

  const price = document.createElement("span");
  price.className = "product-price";
  price.textContent = formatPrice(item.price);

  top.appendChild(title);
  top.appendChild(price);

  const details = document.createElement("div");
  details.className = "product-details";
  details.appendChild(createMetaRow("ID", String(item.id ?? "—")));
  details.appendChild(createMetaRow("Kategoria", item.category || "—"));
  details.appendChild(createMetaRow("Dodano", formatDate(item.createdAt)));

  card.appendChild(top);
  card.appendChild(details);

  return card;
}

function renderProducts(items) {
  productsList.replaceChildren();

  if (!items.length) {
    renderEmptyState("API zwróciło pustą listę.");
    return;
  }

  const sortedItems = [...items].sort(
    (a, b) => Number(b.id ?? 0) - Number(a.id ?? 0),
  );

  sortedItems.forEach((item) => {
    productsList.appendChild(createProductCard(item));
  });

  updateTotalProducts(sortedItems.length);
}

async function loadProducts(options = {}) {
  const successMessage = options.successMessage || null;

  reloadProductsButton.disabled = true;
  setMessage("Pobieranie listy produktów...", "info");

  try {
    const response = await fetch(PRODUCTS_API_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Błąd HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = normalizeItems(data);

    renderProducts(items);

    if (successMessage) {
      setMessage(successMessage, "success");
    } else {
      setMessage(`Załadowano ${items.length} produktów.`, "success");
    }
  } catch (error) {
    renderEmptyState("Nie udało się pobrać produktów z API.");
    setMessage(`Nie udało się pobrać danych: ${error.message}`, "error");
  } finally {
    reloadProductsButton.disabled = false;
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const formData = new FormData(productForm);

  const payload = {
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    price: Number(formData.get("price")),
  };

  if (!payload.name || !payload.category || Number.isNaN(payload.price)) {
    setMessage("Uzupełnij poprawnie wszystkie pola formularza.", "error");
    return;
  }

  submitProductButton.disabled = true;
  setMessage("Zapisywanie produktu...", "info");

  try {
    const response = await fetch(PRODUCTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Błąd HTTP ${response.status}`);
    }

    productForm.reset();

    await loadProducts({
      successMessage: "Produkt został dodany i lista została odświeżona.",
    });
  } catch (error) {
    setMessage(`Nie udało się dodać produktu: ${error.message}`, "error");
  } finally {
    submitProductButton.disabled = false;
  }
}

reloadProductsButton.addEventListener("click", () => {
  loadProducts();
});

productForm.addEventListener("submit", handleProductSubmit);

loadProducts();
