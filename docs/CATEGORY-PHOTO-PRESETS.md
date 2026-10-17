# Category photo compositions

The photo studio defaults to category composition for supported martial arts belts, gi/uniforms, rashguards and boxing/MMA/karate gloves. The owner can switch to the existing white-background, generic ghost or model modes. Other categories retain white background.

Reference examples are translated into text instructions. The sample images themselves are not sent to the provider and are not copied into output: preserve actual source product identity, color and marks. Belt: waist close-up tied on a neutral unbranded white gi, no advertising text, remove packaging. Gi: invisible mannequin, discipline-specific cut, only evidenced pieces. Rashguard: filled-out top, shorts aligned below only when evidenced, leggings beside only when evidenced. Gloves: staggered outer/palm composition, preserve closed/open finger construction and evidenced quantity.

All product references still use a single provider call for one candidate. Model, resolution and quality unchanged; no extra image-reference charge for the sample templates. Normal input text billing still applies. Existing paid confirmation, revision checks, pending results and explicit acceptance remain.

Server resolves category from saved product rather than trusting a client preset ID. The UI mirrors the supported category map for unsaved category changes. Unsupported category mode requests are rejected before provider use. Accepted result metadata records the preset label. Sambo composition handles jacket-only sources, but does not create a new catalog category.

Validation: PHP 7.4 lint and tests/studio-category-presets.php; actual UI with mocked generation at desktop/mobile widths (category selected automatically, manual overrides, paid confirmation, source retention, explicit accept and manager visibility); existing real PHP/cURL local-provider transport checks. No paid image generation or live product modification during tests. Actual output still needs owner review.
