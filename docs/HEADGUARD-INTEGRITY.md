# Headguard portraits: simple prompt

The category and on-model modes send original product images with the owner-approved prompt in HEADGUARD-PROMPT.txt to one image edit request. There are no preliminary inspection or automated comparison API calls, and no fit-reference upload. Results are stored separately and require explicit owner acceptance. Never label them automatically verified.

The approved preview was generated with the built-in image tool, not the production API. Production retains its configured gpt-image-1.5 medium 1024x1536 image-edit path; identical output is not guaranteed across generators.

No automatic retry or publication. Existing owner, CSRF, idempotency and storage controls remain. White background and other categories retain their behavior. Earlier modeled headguard candidates remain preview/discard only; existing accepted photos are not changed.

Verification: PHP/JS syntax, domain mode/acceptance tests, real PHP/cURL against a local mock (one image-edit request, zero Responses requests), desktop/mobile UI using a local mock. No live paid API validation performed for this release.
