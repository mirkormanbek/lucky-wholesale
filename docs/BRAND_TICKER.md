# Brand ticker

`public/index.html` and `public/styles.css` are the deployed storefront. Keep the root copies in sync: `sync-wb.yml` copies the public versions into the root after catalog generation. Catalog generation and image caching write catalog data/product images, not ticker HTML, CSS, or brand SVGs.

Both `.brand-quality-track` groups must contain identical markup; only the second track has `aria-hidden="true"`. The stage moves by half its own width. Do not add gaps or margins between the two tracks. Every item, including the last, has the same absolutely positioned separator.

Logos occupy a fixed 78 × 32 CSS slot at all viewport sizes. Small optical corrections live in `--logo-scale` rules selected by `data-brand`. Names are hidden at viewport widths up to 720px; desktop names remain visible. The loop runs in 26 seconds normally and 52 seconds with `prefers-reduced-motion: reduce`; reduced motion slows it down instead of hiding later brands behind a permanently paused overflow viewport. Do not restore positional selectors, fallback pseudo-wordmarks, or layered `!important` rules.

## Artwork normalization

SVG bounds were measured with Chromium `SVGGraphicsElement.getBBox()` over the existing paths. Paths and brand artwork are unchanged. The viewBox includes 0.5 SVG units of padding on every side to protect antialiased edges. Intrinsic width/height now match the viewBox aspect ratio; previously the original canvas aspect ratio introduced a second layer of letterboxing even after a viewBox trim.

| SVG | Measured artwork bounds: x, y, width, height |
| --- | --- |
| Everlast | -0.023, 0.426, 235.181, 121.826 |
| Top Ten | 15.297, 21.730, 79.724, 17.087 |
| Green Hill | 26.422, 77.607, 145.723, 40.423 |
| Essimo | 5.139, 5.113, 117.462, 29.435 |
| Tatami | 9.500, 44.698, 226.487, 58.326 |

The first six logos are embedded raster assets, not SVGs. Their alpha bounds were inspected too. Kusakura, Nike, Venum, and Kingz had transparent edge padding, which was cropped without changing artwork; Mizuno and Adidas already filled their canvases.

## Validation

Local Chromium preview at 1440, 390, and 320 CSS pixels verified decoded images, matching track markup and widths, all 11 names and separators, consistent item heights, no page overflow or JavaScript errors, reduced-motion support, and the animation seam (less than 0.001 CSS pixels from the next cycle). A wrapped contact sheet was visually inspected for optical balance.

The repository does not contain `package.json` or raw `data/products.json`. A catalog build in an isolated copy can verify preservation of the static ticker assets but cannot validate a live WB sync. Do not run token-dependent synchronization just to test this presentation change.
