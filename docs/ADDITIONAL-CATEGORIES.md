# Manual additional warehouse categories

The owner can expand “Показывать в других категориях” under the primary product category and tick active leaf categories. Up to 20 additional categories, no primary-category duplication. Names, price, photos, article and primary-category photo presets remain attached to one product. Unchecking removes placement. Main category continues to control title/materials/sizes/photo studio.

Saved field: additionalCategoryIds. Public categoryIds is the unique union of primary plus additional categories; public output remains one record per product. Warehouse list category filter checks all placements. New colors inherit selections; owner batch creation applies them to each SKU. Old clients that omit the field preserve it. Managers cannot change owner placements. Normal save of a published product returns it to review; publication is explicit.

Validation: PHP 7.4 lint, Node syntax, actual owner/manager UI with mocked API; real local PHP API tests for invalid/inactive/parent category rejection, count limit, deduplication, removal, manager and legacy-save preservation, public single record with three categories, batch idempotency. No production records or paid generations used.
