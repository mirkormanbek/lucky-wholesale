# Source-driven headguard fitting v5

The model/category mode is restored in this implementation. White background remains available.
This does not certify fit or guarantee source fidelity.

## Changes
- Inventory describes source-evidenced parts, contour connections, permitted motion, openings and expected anatomical occlusion. No universal helmet-type template or compulsory reference.
- Continuous crosspieces cannot be assumed to be chin pads or split into cheeks. A real protector may obscure nose or mouth.
- gpt-4.1 performs structured inspection and independent comparison; the comparator receives original images and candidate, never the earlier inventory.
- Each comparison criterion has source evidence, candidate evidence and match/mismatch/uncertain verdict. All criteria must match, even if overall passed says true.
- One image generation per request. No automatic retries.
- Rejected/unverified candidates are retained for visual inspection but cannot be accepted. Originals stay unchanged until explicit acceptance.
- Pre-v5 modeled candidates remain inspect/discard only; no silent reinterpretation of their old reviews.

## Validation
PHP validation and local mock transport exercise control flow and acceptance gates, not image quality.
A real visual control on the owner's original is required before treating this implementation as visually validated.
