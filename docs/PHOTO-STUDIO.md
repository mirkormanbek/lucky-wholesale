# Warehouse photo studio

Owner-only photo studio uses all 1–8 images from a single saved product as references for one output. Modes: white background, ghost mannequin, fictional adult model. Front/rear/side/three-quarter view and optional instructions are supported. Rear/side requires explicit confirmation that reference photos show the requested view.

Generation uses the existing private OpenAI key, gpt-image-1.5, high input fidelity, medium quality, 1024 square, n=1. The browser shows a planning estimate, not a price guarantee or spending cap. Every run requires confirmation; no automatic retries. A generated example from another tool does not guarantee identical API output. A consistent face across separate generations is not guaranteed.

Results persist privately in studioResults and are not added to the current gallery automatically. Owner can preview full size, replace the gallery, append (maximum eight), or discard. A replacement deletes unreferenced old photos only after state commit. Create all desired variants before replacing originals. Accepted changes to published products return to review; publication is a separate existing action. Managers cannot generate or accept studio variants. Pending results are included in trash cleanup and remain private.

The endpoint reserves a unique request ID under the state lock and shares the existing provider lock. Multipart image[] input is streamed through a private temporary file. No secrets or raw provider errors reach the client. Response usage totals, when supplied, are retained as metadata; these are not billing amounts. Saving other product fields preserves server-owned studio metadata. Revision conflicts reject stale decisions.

Deploy studio-domain.php before api.php, and studio-ui.js before warehouse.js. Existing FTP workflow includes these priority uploads. No infrastructure or credentials change.

Validation: PHP 7.4 syntax; domain tests for reservations, conflicts, decisions and shared-file cleanup; real PHP/cURL to local mock provider with two photo references, CSRF/owner checks, duplicate rejection, metadata preservation through save and explicit replacement; Playwright with actual frontend and mocked endpoints at desktop and mobile widths. No paid API generation or production writes were used in tests.
