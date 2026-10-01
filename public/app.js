const state = {
  products: [],
  categories: [],
  categoryById: new Map(),
  selectedCategoryId: null,
  query: "",
  sort: "default",
  currency: localStorage.getItem("lucky-wholesale-currency") || "KZT",
  requestIds: new Set(JSON.parse(localStorage.getItem("lucky-wholesale-request") || "[]"))
};

const el = {
  productGrid: document.querySelector("#productGrid"),
  categoryTree: document.querySelector("#categoryTree"),
  productCount: document.querySelector("#productCount"),
  categoryCount: document.querySelector("#categoryCount"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  currencySelect: document.querySelector("#currencySelect"),
  resultsMeta: document.querySelector("#resultsMeta"),
  activeCategoryTitle: document.querySelector("#activeCategoryTitle"),
  clearCategory: document.querySelector("#clearCategory"),
  sidebar: document.querySelector("#sidebar"),
  filtersToggle: document.querySelector("#filtersToggle"),
  emptyState: document.querySelector("#emptyState"),
  productDialog: document.querySelector("#productDialog"),
  dialogContent: document.querySelector("#dialogContent"),
  dialogClose: document.querySelector("#dialogClose"),
  requestButton: document.querySelector("#requestButton"),
  requestCount: document.querySelector("#requestCount"),
  requestDialog: document.querySelector("#requestDialog"),
  requestDialogClose: document.querySelector("#requestDialogClose"),
  requestItems: document.querySelector("#requestItems"),
  requestEmpty: document.querySelector("#requestEmpty"),
  copyRequestButton: document.querySelector("#copyRequestButton"),
  template: document.querySelector("#productCardTemplate")
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value, currency) {
  if (value == null || Number.isNaN(Number(value))) return null;

  const symbols = { KZT: "₸", RUB: "₽", USD: "$" };
  const number = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(Number(value));

  return currency === "USD"
    ? `${symbols[currency]}${number}`
    : `${number} ${symbols[currency]}`;
}

function priceText(product) {
  const currency = state.currency;
  const value = product.priceFrom?.[currency];

  if (value == null) return "По запросу";

  const prefix = currency === "KZT" ? "от " : "≈ от ";
  return prefix + money(value, currency);
}

function selectedCategoryDescendants(id) {
  if (!id) return null;
  const ids = new Set([id]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of state.categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }

  return ids;
}

function filteredProducts() {
  const query = normalize(state.query);
  const categoryIds = selectedCategoryDescendants(state.selectedCategoryId);

  let products = state.products.filter((product) => {
    if (categoryIds && !(product.categoryIds || []).some((id) => categoryIds.has(id))) {
      return false;
    }

    if (!query) return true;

    const haystack = normalize([
      product.title,
      product.brand,
      product.article,
      ...(product.colors || []),
      ...(product.sizes || [])
    ].filter(Boolean).join(" "));

    return haystack.includes(query);
  });

  products = [...products];

  switch (state.sort) {
    case "title":
      products.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
      break;
    case "brand":
      products.sort((a, b) => (a.brand || "").localeCompare(b.brand || "", "ru") || (a.title || "").localeCompare(b.title || "", "ru"));
      break;
    case "priceAsc":
      products.sort((a, b) => (a.priceFrom?.[state.currency] ?? Infinity) - (b.priceFrom?.[state.currency] ?? Infinity));
      break;
    case "priceDesc":
      products.sort((a, b) => (b.priceFrom?.[state.currency] ?? -Infinity) - (a.priceFrom?.[state.currency] ?? -Infinity));
      break;
  }

  return products;
}

function categoryDepth(category) {
  let depth = 0;
  let current = category;
  const guard = new Set();

  while (current?.parentId && !guard.has(current.parentId)) {
    guard.add(current.parentId);
    depth += 1;
    current = state.categoryById.get(current.parentId);
  }

  return Math.min(depth, 2);
}

function categoryPath(id) {
  if (!id) return [];
  const path = [];
  let current = state.categoryById.get(id);
  const guard = new Set();

  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = current.parentId ? state.categoryById.get(current.parentId) : null;
  }

  return path;
}

function renderCategories() {
  el.categoryTree.innerHTML = "";

  for (const category of state.categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button level-${categoryDepth(category)}`;
    button.textContent = category.name;
    button.dataset.categoryId = category.id;
    button.classList.toggle("active", category.id === state.selectedCategoryId);

    button.addEventListener("click", () => {
      state.selectedCategoryId = category.id;
      el.sidebar.classList.remove("open");
      render();
    });

    el.categoryTree.appendChild(button);
  }
}

function firstColor(product) {
  const colors = product.colors || [];
  if (!colors.length) return "";
  return colors.length === 1 ? colors[0] : `${colors[0]} +${colors.length - 1}`;
}

function renderProductCard(product) {
  const fragment = el.template.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const imageButton = fragment.querySelector(".product-image-button");
  const image = fragment.querySelector(".product-image");
  const placeholder = fragment.querySelector(".image-placeholder");
  const brand = fragment.querySelector(".product-brand");
  const title = fragment.querySelector(".product-title");
  const color = fragment.querySelector(".product-color");
  const sizeCount = fragment.querySelector(".product-size-count");
  const article = fragment.querySelector(".product-article");
  const price = fragment.querySelector(".product-price");
  const addButton = fragment.querySelector(".add-button");

  const photo = product.photos?.[0];
  if (photo) {
    image.src = photo;
    image.alt = product.title || "Товар";
    image.addEventListener("load", () => {
      image.classList.add("visible");
      placeholder.hidden = true;
    });
    image.addEventListener("error", () => {
      image.removeAttribute("src");
      image.classList.remove("visible");
      placeholder.hidden = false;
    });
  }

  brand.textContent = product.brand || "Без бренда";
  title.textContent = product.title || "Без названия";
  article.textContent = product.article ? `Артикул: ${product.article}` : "";
  price.textContent = priceText(product);

  const colorText = firstColor(product);
  if (colorText) {
    color.textContent = colorText;
    color.classList.add("visible");
  }

  const sizes = product.sizes || [];
  if (sizes.length) {
    sizeCount.textContent = sizes.length === 1 ? sizes[0] : `${sizes.length} размеров`;
    sizeCount.classList.add("visible");
  }

  const open = () => openProduct(product);
  imageButton.addEventListener("click", open);
  title.addEventListener("click", open);

  const isAdded = state.requestIds.has(product.id);
  addButton.classList.toggle("added", isAdded);
  addButton.textContent = isAdded ? "✓ В заявке" : "+ В заявку";
  addButton.addEventListener("click", () => toggleRequest(product.id));

  card.dataset.productId = product.id;
  return fragment;
}

function renderProducts() {
  const products = filteredProducts();
  el.productGrid.innerHTML = "";
  el.emptyState.hidden = products.length > 0;

  const fragment = document.createDocumentFragment();
  for (const product of products) {
    fragment.appendChild(renderProductCard(product));
  }
  el.productGrid.appendChild(fragment);

  el.resultsMeta.textContent = `${products.length} из ${state.products.length} товаров`;

  const path = categoryPath(state.selectedCategoryId);
  el.activeCategoryTitle.textContent = path.length ? path.map((item) => item.name).join(" / ") : "Все товары";
}

function openProduct(product) {
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const categoryNames = (product.categoryIds || [])
    .map((id) => state.categoryById.get(id)?.name)
    .filter(Boolean);

  el.dialogContent.innerHTML = `
    <div class="dialog-product">
      <div class="dialog-media">
        ${product.photos?.[0]
          ? `<img src="${escapeHtml(product.photos[0])}" alt="${escapeHtml(product.title || "Товар")}" />`
          : ""}
      </div>
      <div class="dialog-info">
        <div class="eyebrow">${escapeHtml(product.brand || "Без бренда")}</div>
        <h2>${escapeHtml(product.title || "Без названия")}</h2>
        <div class="product-article">Артикул: ${escapeHtml(product.article || "—")}</div>

        <div class="info-block">
          <div class="info-label">Оптовая цена</div>
          <div class="dialog-price">${escapeHtml(priceText(product))}</div>
        </div>

        ${colors.length ? `
          <div class="info-block">
            <div class="info-label">Цвет</div>
            <div class="chip-row">${colors.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
          </div>
        ` : ""}

        ${sizes.length ? `
          <div class="info-block">
            <div class="info-label">Размеры</div>
            <div class="chip-row">${sizes.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
          </div>
        ` : ""}

        ${categoryNames.length ? `
          <div class="info-block">
            <div class="info-label">Категория</div>
            <div class="chip-row">${categoryNames.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
          </div>
        ` : ""}

        ${product.description ? `
          <div class="info-block">
            <div class="info-label">Описание</div>
            <div class="dialog-description">${escapeHtml(product.description)}</div>
          </div>
        ` : ""}

        <div class="info-block">
          <button id="dialogAddButton" class="primary-button wide" type="button">
            ${state.requestIds.has(product.id) ? "Убрать из заявки" : "Добавить в заявку"}
          </button>
        </div>
      </div>
    </div>
  `;

  el.productDialog.showModal();

  document.querySelector("#dialogAddButton")?.addEventListener("click", () => {
    toggleRequest(product.id);
    el.productDialog.close();
  });
}

function saveRequest() {
  localStorage.setItem("lucky-wholesale-request", JSON.stringify([...state.requestIds]));
  el.requestCount.textContent = state.requestIds.size;
}

function toggleRequest(productId) {
  if (state.requestIds.has(productId)) {
    state.requestIds.delete(productId);
  } else {
    state.requestIds.add(productId);
  }

  saveRequest();
  renderProducts();
}

function renderRequest() {
  const items = state.products.filter((product) => state.requestIds.has(product.id));
  el.requestItems.innerHTML = "";
  el.requestEmpty.hidden = items.length > 0;
  el.copyRequestButton.hidden = items.length === 0;

  for (const product of items) {
    const row = document.createElement("div");
    row.className = "request-item";
    row.innerHTML = `
      ${product.photos?.[0]
        ? `<img src="${escapeHtml(product.photos[0])}" alt="" />`
        : `<div></div>`}
      <div>
        <div class="request-item-title">${escapeHtml(product.title || "Без названия")}</div>
        <div class="request-item-meta">
          ${escapeHtml(product.article || "")}
          ${product.colors?.length ? " · " + escapeHtml(product.colors.join(", ")) : ""}
          · ${escapeHtml(priceText(product))}
        </div>
      </div>
      <button class="remove-button" type="button">Удалить</button>
    `;

    row.querySelector(".remove-button").addEventListener("click", () => {
      state.requestIds.delete(product.id);
      saveRequest();
      renderRequest();
      renderProducts();
    });

    el.requestItems.appendChild(row);
  }
}

async function copyRequest() {
  const items = state.products.filter((product) => state.requestIds.has(product.id));
  const lines = [
    "Оптовая заявка Lucky Wholesale",
    "",
    ...items.map((product, index) =>
      `${index + 1}. ${product.title} | ${product.article || "без артикула"} | ${(product.colors || []).join(", ") || "цвет не указан"} | ${priceText(product)}`
    )
  ];

  await navigator.clipboard.writeText(lines.join("\n"));
  el.copyRequestButton.textContent = "Скопировано";
  setTimeout(() => {
    el.copyRequestButton.textContent = "Скопировать список";
  }, 1400);
}

function render() {
  renderCategories();
  renderProducts();
  saveRequest();
}

async function init() {
  try {
    const [catalogResponse, categoriesResponse] = await Promise.all([
      fetch("./data/catalog.json", { cache: "no-store" }),
      fetch("./data/categories.json", { cache: "no-store" })
    ]);

    if (!catalogResponse.ok || !categoriesResponse.ok) {
      throw new Error("Не удалось загрузить данные каталога");
    }

    const catalog = await catalogResponse.json();
    const categories = await categoriesResponse.json();

    state.products = Array.isArray(catalog.products) ? catalog.products : [];
    state.categories = Array.isArray(categories) ? categories : [];
    state.categoryById = new Map(state.categories.map((category) => [category.id, category]));

    el.productCount.textContent = state.products.length;
    el.categoryCount.textContent = state.categories.filter((category) => !category.parentId).length;
    el.currencySelect.value = state.currency;

    render();
  } catch (error) {
    console.error(error);
    el.resultsMeta.textContent = "Ошибка загрузки каталога";
    el.productGrid.innerHTML = "";
    el.emptyState.hidden = false;
    el.emptyState.querySelector("strong").textContent = "Каталог не загрузился";
    el.emptyState.querySelector("span").textContent = "Откройте проект через локальный HTTP-сервер или хостинг, а не напрямую как file://.";
  }
}

el.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

el.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

el.currencySelect.addEventListener("change", (event) => {
  state.currency = event.target.value;
  localStorage.setItem("lucky-wholesale-currency", state.currency);
  renderProducts();
});

el.clearCategory.addEventListener("click", () => {
  state.selectedCategoryId = null;
  render();
});

el.filtersToggle.addEventListener("click", () => {
  el.sidebar.classList.toggle("open");
});

el.dialogClose.addEventListener("click", () => el.productDialog.close());
el.requestDialogClose.addEventListener("click", () => el.requestDialog.close());

el.requestButton.addEventListener("click", () => {
  renderRequest();
  el.requestDialog.showModal();
});

el.copyRequestButton.addEventListener("click", copyRequest);

el.productDialog.addEventListener("click", (event) => {
  if (event.target === el.productDialog) el.productDialog.close();
});

el.requestDialog.addEventListener("click", (event) => {
  if (event.target === el.requestDialog) el.requestDialog.close();
});

init();
