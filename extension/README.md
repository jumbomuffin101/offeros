# OfferOS Job Capture Extension

Manifest V3 extension for user-initiated capture from Greenhouse, Lever, and Ashby. It reads only the active tab after the popup opens; it does not crawl, inspect history, or collect unrelated page HTML.

## Development

1. Run `npm test` and `npm run build` in this directory.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`.
3. Sign into OfferOS, open a supported job page, open the extension, and choose **Connect**.

Authentication uses `chrome.identity.launchWebAuthFlow` through `/extension-auth`. A short-lived Clerk `offeros-api` token is returned in the redirect fragment and held only in `chrome.storage.session`. No Clerk secret or long-lived credential is embedded in the extension.

The popup saves through `POST /api/v1/applications/capture`. Optional analysis and prep generation run as follow-up calls after the application is safely created. Local-storage mode is intentionally unsupported.

Limitations: adapters depend on visible page structure and JobPosting JSON-LD. Unsupported sites use no broad host permission; LinkedIn is not enabled. Users can correct detected company, role, and location before saving.
