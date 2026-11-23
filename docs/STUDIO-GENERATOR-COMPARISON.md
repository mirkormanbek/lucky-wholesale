# One controlled generator trial

Owner-only trial in the existing headguard portrait UI. The regular generation button and every other category retain gpt-image-1.5.

Trial request: comparisonTrial=true and comparisonConfirmed=true. The server, not the submitted model name, chooses gpt-image-2.6-sunburst. Exactly one original product source is required. The existing source-driven prompt, owner presentation instructions, medium quality, 1024x1536 size, opaque background and PNG format are unchanged. input_fidelity is omitted only for the trial because the newer model does not accept the legacy setting.

One trial reservation per product card is allowed. The normal request lock and request-id replay protection remain. A second trial, including a new request ID after provider refusal or an uncertain network outcome, is blocked before the external call. There is no automatic retry, second model fallback, analysis call or publication. A successful candidate stays separate and requires explicit acceptance.

Result metadata records imageModel, quality, comparisonTrial, promptSha256, and SHA-256 fingerprints of the actual selected source bytes, plus the provider's available aggregate usage. Older candidates do not have these fingerprints; historical inputs cannot be retrospectively proven from the image alone. For the first trial, select the original used for the earlier result and keep presentation instructions unchanged.

Pricing is token-based. The old generation estimate is not presented as the trial price. Current published Sunburst rates verified 2026-11-23: text input $5/M, image input $8/M, image output $30/M. The UI confirms one paid request without claiming a fixed bill or an enforced dollar ceiling.
Sources:
- https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/guides/image-prompting

Validation performed without paid requests: PHP 7.4 syntax; JS syntax; same source/prompt/render-settings domain checks; correct model-specific fields; one-trial atomic guards; real PHP/cURL -> local mock for success and provider refusal; no fallback or replay; source fingerprint; baseline transport regression; Playwright desktop/mobile UI.

The live visual trial remains pending. This release enables the comparison; it does not claim that Sunburst resolves fidelity or physical fit.
