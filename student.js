import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const PMIST_BUSES = PMIST_ROUTES;
const center = [10.79, 79.10]; // Approximate PMIST area; verify campus coordinates before deployment.
const map = L.map("map").setView(center, 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let selected = "";
let latest = {};
const markerLayer = L.layerGroup().addTo(map);

function showStatus(message) {
  document.getElementById("status").textContent = message;
}

function timeAgo(ts) {
  if (typeof ts !== "number") return "time unavailable";
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  return sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`;
}

function render(filter = "") {
  const found = PMIST_BUSES.filter(b =>
    `${b.id} ${b.route} ${b.description}`.toLowerCase().includes(filter.toLowerCase())
  );
  document.getElementById("count").textContent = `${found.length} buses`;
  const root = document.getElementById("busList");
  root.replaceChildren();

  if (!found.length) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = "No matching bus found.";
    root.appendChild(note);
    return;
  }

  found.forEach(b => {
    const loc = latest[b.id];
    const el = document.createElement("button");
    el.className = "bus" + (selected === b.id ? " active" : "");
    const icon = document.createElement("span");
    icon.className = "busIcon";
    icon.textContent = "🚌";
    const text = document.createElement("span");
    text.className = "busText";
    const title = document.createElement("b");
    title.textContent = `Bus ${b.id}`;
    const route = document.createElement("small");
    route.textContent = b.route;
    text.append(title, route);
    const time = document.createElement("span");
    time.className = "busTime";
    time.textContent = loc && typeof loc.updatedAt === "number" ? timeAgo(loc.updatedAt) : "No GPS";
    el.append(icon, text, time);
    el.addEventListener("click", () => selectBus(b.id));
    root.appendChild(el);
  });
}

function drawMarkers() {
  markerLayer.clearLayers();
  Object.entries(latest).forEach(([id, loc]) => {
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return;
    const age = Date.now() - (loc.updatedAt || 0);
    const fresh = age < 120000 && loc.status !== "stopped";
    const marker = L.marker([loc.lat, loc.lng]).bindPopup(
      `<b>Bus ${id}</b><br>${fresh ? "GPS updated " + timeAgo(loc.updatedAt) : "Location may be stale: " + timeAgo(loc.updatedAt)}`
    );
    marker.addTo(markerLayer);
    if (id === selected) marker.openPopup();
  });

  render(document.getElementById("q").value);
  if (selected && latest[selected]) {
    const loc = latest[selected];
    document.getElementById("details").textContent =
      `Bus ${selected} · Last update: ${timeAgo(loc.updatedAt)} · ` +
      (Date.now() - (loc.updatedAt || 0) < 120000 && loc.status !== "stopped"
        ? "Status: recent GPS update"
        : "Status: location may be stale or tracking is stopped");
  }
}

function selectBus(id) {
  selected = id;
  render(document.getElementById("q").value);
  const bus = PMIST_BUSES.find(x => x.id === id);
  document.getElementById("selectedTitle").textContent = `Bus ${id} · ${bus ? bus.route : ""}`;
  const loc = latest[id];
  if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
    map.setView([loc.lat, loc.lng], 14);
    document.getElementById("details").textContent =
      `Bus ${id} · Last update: ${timeAgo(loc.updatedAt)} · ` +
      (Date.now() - (loc.updatedAt || 0) < 120000 && loc.status !== "stopped"
        ? "Status: recent GPS update"
        : "Status: location may be stale or tracking is stopped");
  } else {
    document.getElementById("details").textContent =
      "No GPS update received for this bus yet. The driver must sign in and start tracking.";
  }
}

function doSearch() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  render(q);
  const bus = PMIST_BUSES.find(x =>
    `${x.id} ${x.route} ${x.description}`.toLowerCase().includes(q)
  );
  if (bus) selectBus(bus.id);
}

document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("q").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});
render();

try {
  onValue(ref(db, "locations"), snapshot => {
    latest = snapshot.val() || {};
    drawMarkers();
    showStatus(`${Object.keys(latest).length} bus location record(s) received. Markers with recent updates are live.`);
  }, error => {
    showStatus("Database error: " + error.message);
  });
} catch (error) {
  showStatus("Firebase error: " + error.message);
}

setInterval(() => {
  if (Object.keys(latest).length) drawMarkers();
}, 15000);
