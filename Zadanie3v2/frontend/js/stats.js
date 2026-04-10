const STATS_API_URL = `/api/stats?refresh=${Date.now()}`;

const statsMessage = document.getElementById("stats-message");
const refreshStatsButton = document.getElementById("refresh-stats");

const totalProductsElement = document.getElementById("stats-total-products");
const instanceIdElement = document.getElementById("stats-instance-id");
const cacheStatusElement = document.getElementById("stats-cache-status");
const generatedAtElement = document.getElementById("stats-generated-at");
const loadedAtElement = document.getElementById("stats-loaded-at");

function setMessage(text, type = "info") {
  statsMessage.textContent = text;
  statsMessage.className = `notice notice-${type}`;
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

function normalizeStats(payload) {
  return {
    totalProducts:
      payload.totalProducts ??
      payload.total_products ??
      payload.totalItems ??
      payload.total_items ??
      payload.count ??
      0,

    instanceId:
      payload.instanceId ??
      payload.instance_id ??
      payload.hostname ??
      payload.backendInstanceId ??
      "unknown",

    generatedAt:
      payload.generatedAt ?? payload.generated_at ?? payload.timestamp ?? null,
  };
}

function resetStats() {
  totalProductsElement.textContent = "-";
  instanceIdElement.textContent = "-";
  cacheStatusElement.textContent = "-";
  generatedAtElement.textContent = "-";
  loadedAtElement.textContent = "-";
}

async function loadStats() {
  refreshStatsButton.disabled = true;
  setMessage("Pobieranie statystyk z API...", "info");

  try {
    const response = await fetch(STATS_API_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Błąd HTTP ${response.status}`);
    }

    const data = await response.json();
    const stats = normalizeStats(data);

    totalProductsElement.textContent = String(stats.totalProducts);
    instanceIdElement.textContent = String(stats.instanceId);
    cacheStatusElement.textContent =
      response.headers.get("x-cache-status") || "BRAK";
    generatedAtElement.textContent = formatDate(stats.generatedAt);
    loadedAtElement.textContent = new Date().toLocaleString("pl-PL");

    setMessage("Statystyki zostały pomyślnie odświeżone.", "success");
  } catch (error) {
    resetStats();
    setMessage(`Nie udało się pobrać statystyk: ${error.message}`, "error");
  } finally {
    refreshStatsButton.disabled = false;
  }
}

refreshStatsButton.addEventListener("click", loadStats);

loadStats();
