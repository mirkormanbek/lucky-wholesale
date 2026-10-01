# Lucky Wholesale

Тестовый репозиторий оптового каталога Lucky.

## Синхронизация с Wildberries

GitHub Actions запускает `scripts/sync-wb.mjs` и выгружает данные из WB Content API.

Результаты:
- `data/categories.json` — категории/предметы WB, которые реально используются в карточках.
- `data/categories.csv` — те же категории в табличном виде.
- `data/products.json` — карточки товаров в нормализованном виде.
- `data/skus.csv` — все SKU/штрихкоды по размерам и карточкам.
- `data/summary.json` — сводка по количеству карточек, категорий и SKU.

Токен хранится только в GitHub Secret `WB_API_TOKEN` и не попадает в репозиторий.
