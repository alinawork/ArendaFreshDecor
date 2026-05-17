// ===== Telegram Web App =====
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : {
  ready() {}, expand() {}, MainButton: { hide() {} }, BackButton: { onClick() {}, show() {}, hide() {} },
  HapticFeedback: null, openTelegramLink(url) { window.open(url, "_blank"); }, showAlert(message) { alert(message); }
};

tg.ready();
tg.expand();
try {
  tg.setHeaderColor && tg.setHeaderColor("#ffffff");
  tg.setBackgroundColor && tg.setBackgroundColor("#ffffff");
  tg.MainButton.hide();
} catch (e) {}

// ===== Настройки =====
const MANAGER_USERNAME = "AnastasiayaTrofimova";  // без @
const FAVORITES_STORAGE_KEY = "freshdecor_favorites_v1";

// ===== Состояние =====
let catalog = { products: [], categories: [] };
let currentChip = null;
let currentSearch = "";
const navStack = ["home"];
let currentProduct = null;
let favoriteSkus = loadFavorites();

// ===== Загрузка =====
async function loadCatalog() {
  try {
    const response = await fetch("data.json?v=" + Date.now());
    if (!response.ok) throw new Error("HTTP " + response.status);
    catalog = await response.json();
    document.getElementById("catalog-loader").classList.add("hidden");
    renderChips();
    renderProducts();
    renderFavorites();
    renderBottomNav();
  } catch (e) {
    console.error(e);
    document.getElementById("catalog-loader").textContent =
      "Не удалось загрузить каталог. Попробуйте позже.";
  }
}

// ===== Утилиты =====
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch (e) {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteSkus]));
}

function isFavorite(sku) {
  return favoriteSkus.has(String(sku));
}

function toggleFavorite(sku) {
  sku = String(sku);
  if (favoriteSkus.has(sku)) {
    favoriteSkus.delete(sku);
  } else {
    favoriteSkus.add(sku);
  }
  saveFavorites();
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
  renderProducts();
  renderFavorites();
  updateDetailFavoriteButton();
  renderBottomNav();
}

function getFavoriteProducts() {
  return catalog.products.filter(p => favoriteSkus.has(String(p.sku)));
}

function heartIcon(filled) {
  return `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function productImageHtml(p, big) {
  const cls = big ? "detail-image-placeholder" : "product-card-placeholder";
  const size = big ? 54 : 34;

  const fallbackClass = p.photo ? " image-placeholder-fallback" : "";
  const placeholder = `
    <div class="${cls}${fallbackClass}">
      <div class="image-placeholder-glass">
        <svg class="image-placeholder-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <img class="image-placeholder-logo" src="logo.png" alt="Fresh Decor">
      </div>
    </div>`;

  if (p.photo) {
    return `<img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.classList.add('is-missing'); this.remove();">${placeholder}`;
  }

  return placeholder;
}

// ===== Навигация =====
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(el => el.classList.add("hidden"));
  document.getElementById("screen-" + name).classList.remove("hidden");

  const showBack = name === "product";
  document.getElementById("back-btn").classList.toggle("hidden", !showBack);

  try {
    if (showBack) tg.BackButton.show();
    else tg.BackButton.hide();
  } catch (e) {}

  renderBottomNav(name);
  window.scrollTo(0, 0);
}

function pushScreen(name) {
  navStack.push(name);
  showScreen(name);
}

function goBack() {
  if (navStack.length <= 1) {
    openHome();
    return;
  }
  navStack.pop();
  showScreen(navStack[navStack.length - 1]);
}

function openHome() {
  navStack.length = 0;
  navStack.push("home");
  showScreen("home");
}

function openFavorites() {
  navStack.length = 0;
  navStack.push("favorites");
  renderFavorites();
  showScreen("favorites");
}

function renderBottomNav(activeScreen) {
  const current = activeScreen || navStack[navStack.length - 1] || "home";
  const catalogBtn = document.getElementById("nav-catalog");
  const favoritesBtn = document.getElementById("nav-favorites");
  const countEl = document.getElementById("favorites-count");

  if (!catalogBtn || !favoritesBtn || !countEl) return;

  catalogBtn.classList.toggle("active", current === "home");
  favoritesBtn.classList.toggle("active", current === "favorites");

  const count = favoriteSkus.size;
  countEl.textContent = String(count);
  countEl.classList.toggle("hidden", count === 0);
}

// ===== Чипы-фильтры по подкатегориям =====
function renderChips() {
  const subs = new Set();
  catalog.products.forEach(p => { if (p.subcategory) subs.add(p.subcategory); });

  const counts = {};
  catalog.products.forEach(p => {
    if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
  });
  const sorted = Array.from(subs).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

  const chips = [{ label: "Все", value: null }, ...sorted.map(s => ({ label: s, value: s }))];
  document.getElementById("chips-row").innerHTML = chips.map(c => {
    const active = (c.value === currentChip) ? "active" : "";
    return `<button class="chip ${active}" data-val="${escapeHtml(c.value || "")}">${escapeHtml(c.label)}</button>`;
  }).join("");

  document.getElementById("chips-row").querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      currentChip = btn.dataset.val || null;
      renderChips();
      renderProducts();
    });
  });
}

// ===== Сетка товаров =====
function renderProducts() {
  let list = catalog.products;
  if (currentChip) list = list.filter(p => p.subcategory === currentChip);
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.subcategory || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  }

  const gridEl = document.getElementById("products-grid");
  const emptyEl = document.getElementById("products-empty");
  document.getElementById("catalog-count").textContent =
    list.length === catalog.products.length
      ? `${catalog.products.length} позиций`
      : `${list.length} из ${catalog.products.length}`;

  if (list.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  gridEl.innerHTML = list.map(productCardHtml).join("");
  bindProductGrid(gridEl);
}

function productCardHtml(p) {
  const fav = isFavorite(p.sku);
  return `
    <article class="product-card" data-sku="${escapeHtml(p.sku)}" role="button" tabindex="0">
      <div class="product-card-image${!p.photo ? " is-missing" : ""}">
        ${productImageHtml(p, false)}
        <button class="favorite-btn product-favorite-btn ${fav ? "active" : ""}" data-favorite-sku="${escapeHtml(p.sku)}" type="button" aria-label="${fav ? "Убрать из избранного" : "Добавить в избранное"}">
          ${heartIcon(fav)}
        </button>
        ${p.booked ? `<span class="product-card-booking">до ${escapeHtml(p.booked_until || "")}</span>` : ""}
      </div>
      <div class="product-card-body">
        <div class="product-card-name">${escapeHtml(p.name)}</div>
        <div class="product-card-price">${p.price} BYN</div>
      </div>
    </article>
  `;
}

function bindProductGrid(container) {
  container.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".favorite-btn")) return;
      openProduct(card.dataset.sku);
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProduct(card.dataset.sku);
      }
    });
  });

  container.querySelectorAll(".favorite-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.favoriteSku);
    });
  });
}

// ===== Карточка товара =====
function openProduct(sku) {
  const p = catalog.products.find(x => String(x.sku) === String(sku));
  if (!p) return;
  currentProduct = p;

  const fav = isFavorite(p.sku);
  const statusClass = p.booked ? "detail-chip--booked" : "detail-chip--available";
  const statusValue = p.booked
    ? `в брони${p.booked_until ? "<br>до " + escapeHtml(p.booked_until) : ""}`
    : "доступно";

  document.getElementById("product-detail").innerHTML = `
    <div class="detail-image${!p.photo ? " is-missing" : ""}">
      ${productImageHtml(p, true)}
      <button class="detail-favorite ${fav ? "active" : ""}" id="detail-favorite" type="button" aria-label="${fav ? "Убрать из избранного" : "Добавить в избранное"}">
        ${heartIcon(fav)}
      </button>
    </div>

    ${p.subcategory ? `<span class="detail-category-chip">${escapeHtml(p.subcategory)}</span>` : ""}

    <div class="detail-sku">${escapeHtml(p.sku)}</div>
    <h2 class="detail-name">${escapeHtml(p.name)}</h2>

    <div class="detail-chips">
      <div class="detail-chip">
        <div class="detail-chip-label">Аренда</div>
        <div class="detail-chip-value">${p.price} BYN</div>
      </div>
      <div class="detail-chip">
        <div class="detail-chip-label">Кол-во</div>
        <div class="detail-chip-value">${p.qty} шт.</div>
      </div>
      <div class="detail-chip ${statusClass}">
        <div class="detail-chip-label">Статус</div>
        <div class="detail-chip-value">${statusValue}</div>
      </div>
    </div>

    ${p.notes ? `<div class="detail-notes">${escapeHtml(p.notes)}</div>` : ""}

    <div class="detail-cta">
      <button class="btn-dark" id="ask-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        Уточнить у менеджера
      </button>
    </div>
  `;

  document.getElementById("detail-favorite").addEventListener("click", () => toggleFavorite(p.sku));
  document.getElementById("ask-btn").addEventListener("click", () => askManager(p));
  pushScreen("product");
}

function updateDetailFavoriteButton() {
  const btn = document.getElementById("detail-favorite");
  if (!btn || !currentProduct) return;
  const fav = isFavorite(currentProduct.sku);
  btn.classList.toggle("active", fav);
  btn.setAttribute("aria-label", fav ? "Убрать из избранного" : "Добавить в избранное");
  btn.innerHTML = heartIcon(fav);
}

// ===== Избранное =====
function renderFavorites() {
  const gridEl = document.getElementById("favorites-grid");
  const emptyEl = document.getElementById("favorites-empty");
  const askBtn = document.getElementById("ask-favorites-btn");
  if (!gridEl || !emptyEl || !askBtn) return;

  const list = getFavoriteProducts();

  if (list.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    askBtn.disabled = true;
    return;
  }

  emptyEl.classList.add("hidden");
  askBtn.disabled = false;
  gridEl.innerHTML = list.map(productCardHtml).join("");
  bindProductGrid(gridEl);
}

// ===== Переход в чат с менеджером =====
function openManagerWithText(text) {
  const url = `https://t.me/${MANAGER_USERNAME}?text=${encodeURIComponent(text)}`;

  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");

  try {
    navigator.clipboard && navigator.clipboard.writeText(text);
  } catch (e) {}

  try {
    tg.openTelegramLink(url);
  } catch (e) {
    window.open(url, "_blank");
  }
}

function askManager(p) {
  const text = `Здравствуйте! Интересует позиция:\n${p.sku} — «${p.name}» — ${p.price} BYN/сутки.\n\nФото декора подготовлю и отправлю в чат.`;
  openManagerWithText(text);
}

function askFavoritesManager() {
  const list = getFavoriteProducts();

  if (list.length === 0) {
    tg.showAlert ? tg.showAlert("В избранном пока нет позиций.") : alert("В избранном пока нет позиций.");
    return;
  }

  const lines = list.map((p, index) => {
    const booked = p.booked && p.booked_until ? `, в брони до ${p.booked_until}` : "";
    return `${index + 1}. ${p.sku} — «${p.name}» — ${p.price} BYN/сутки, ${p.qty} шт.${booked}`;
  });

  const text = `Здравствуйте! Интересуют позиции из избранного:\n\n${lines.join("\n")}\n\nФото декора подготовлю и отправлю в чат.`;
  openManagerWithText(text);
}

// ===== События =====
document.getElementById("back-btn").addEventListener("click", goBack);
document.getElementById("nav-catalog").addEventListener("click", openHome);
document.getElementById("nav-favorites").addEventListener("click", openFavorites);
document.getElementById("ask-favorites-btn").addEventListener("click", askFavoritesManager);

let searchTimer;
document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value.trim();
    renderProducts();
  }, 200);
});

try {
  tg.BackButton.onClick(goBack);
} catch (e) {}

// ===== Запуск =====
loadCatalog();
