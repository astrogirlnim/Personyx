# Phase 3 · Feature 5 – Settings & Management

## Sub-feature 5.2 – Validate & Encrypt Keys via TokenVault (Phase 3.5.2)

---

### ✅ Verification of Existing Implementation

- [x] **`src/main/security/tokenVault.ts`** already provides AES-256-GCM encryption, OS keychain master-key storage, and CRUD helpers (`storeToken`, `getToken`, `removeToken`, `listTokenServices`).
- [x] **`src/main/services/SettingsService.ts`** leverages `storeToken()` when the user saves a _local_ OpenAI key via `configureAIService()`. Legacy key migration logic is present.
- [x] **`src/renderer/components/AIServiceSettingsModal.tsx`** captures user input, basic format validation (`sk-` prefix), and triggers `configureAIService()`.
- [x] **`src/renderer/hooks/useSettings.ts`** exposes `testAPIKey()` and state helpers that surface validation results to the UI.

Despite this foundation, **only the OpenAI key path is wired end-to-end**. Notion, Slack, Linear, and future provider keys are still stored in-memory or plaintext. Missing-key feedback is limited to the modal.

---

### 🔍 Inventory – Relevant Files & Core Symbols

| Path                                                 | Key Exports / Symbols                                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/security/tokenVault.ts`                    | `ApiService`, `storeToken()`, `getToken()`, `removeToken()`, `listTokenServices()`, `testTokenVault()`                                             |
| `src/main/services/SettingsService.ts`               | `SettingsService` class · methods: `initialize()`, `configureAIService()`, `testAPIKey()`, `removeAPIKey()`, `getAIServiceConfig()`, `getStatus()` |
| `src/renderer/components/AIServiceSettingsModal.tsx` | `validateApiKey()`, local state: `selectedProvider`, `localApiKey`, `handleTestConnection()`, `handleSave()`                                       |
| `src/renderer/hooks/useSettings.ts`                  | `useSettings()` hook – actions: `configureAIService()`, `testAPIKey()`, `loadSettings()`, `updateSettings()`, `logSettingsActivity()`              |
| `src/shared/constants.ts`                            | `SECURITY` tokens – `TOKEN_ENCRYPTION_KEY_LENGTH`, `AES_IV_LENGTH`, `KEYCHAIN_SERVICE_NAME`                                                        |
| `drizzle schema` (`src/main/db/schema.ts`)           | `apiTokens` table (`id`, `service`, `tokenEncrypted`, `iv`, `authTag`, `createdAt`)                                                                |
| **Firebase**                                         | `functions/src/index.ts` exposes cloud embedding endpoints; authentication via Firebase Auth custom tokens                                         |

> **Variables referenced inside implementation:**  
> `DEFAULT_SETTINGS`, `AppSettings.aiService.provider`, `AIServiceProvider ('local' | 'cloud')`, `AIServiceConfig.localApiKey`, `SettingsState.lastTestResult`, `SECURITY.AES_IV_LENGTH`, etc.

---

### 🗺️ Comprehensive Implementation Plan

Each bullet is a **checklist item**. Sub-bullets become indented checklist steps.

#### Phase 3 · Interface Layer

##### Feature 5 – Settings & Management

###### Sub-feature 5.2 – Validate & Encrypt Keys via TokenVault

1. [ ] **Expand TokenVault Service**
   - [ ] Add enum values to `ApiService` for `notion`, `slack`, `linear`, `firebase-cloud`.
   - [ ] Export a generic `validateToken(service, token)` utility to centralise format rules.
   - [ ] Implement `isTokenStored(service)` helper returning boolean for missing-key checks.
2. [ ] **Augment Database Schema**
   - [ ] Add `createdAt` & `updatedAt` defaults to `apiTokens` table (if absent) via migration `0003_api_tokens_timestamp.sql`.
   - [ ] Write forward + rollback SQL migrations; update `meta/_journal.json`.
3. [ ] **SettingsService Enhancements**
   - [ ] Introduce `configureThirdPartyToken(service, token)` method:
     - [ ] Validate via `validateToken()`; raise descriptive error on failure.
     - [ ] Persist via `storeToken()`; update settings cache with boolean flags (`hasNotionKey`, etc.).
   - [ ] Add `getTokenStatus()` returning `{ service, exists, lastUpdated }[]` for UI.
4. [ ] **IPC Channel Extensions**
   - [ ] Define IPC events:
     - [ ] `'settings:set-token'` → main `SettingsService.configureThirdPartyToken`.
     - [ ] `'settings:token-status'` → returns `getTokenStatus()` result.
   - [ ] Update `preload.ts` to expose typed `setToken()` & `getTokenStatus()` APIs.
5. [ ] **Settings Modal UI Upgrade**
   - [ ] Add **"Third-Party Keys"** accordion with tabs for OpenAI, Notion, Slack, Linear.
   - [ ] For each tab: input field, "Show/Hide", "Test Connection", status pill (✅ Stored | ⚠️ Missing).
   - [ ] Disable "Save" until local validation passes.
   - [ ] Surfaced errors displayed inline + global error toast (reuse `GlobalErrorToast`).
6. [ ] **useSettings Hook Updates**
   - [ ] Add `setThirdPartyToken(service, token)` and `refreshTokenStatus()` wrappers.
   - [ ] Maintain `tokenStatus` state for real-time UI badges.
   - [ ] Log activity "Third-party token updated" with provider metadata.
7. [ ] **Global Warning Surface**
   - [ ] Expose `isProviderReady()` for Notion/Slack/Linear pathways (currently only AI provider).
   - [ ] Show a persistent banner in the Tray header when a required token is missing (uses `GlobalErrorToast` style but non-dismissable).
   - [ ] Link banner action directly to _Settings → Third-Party Keys_ section.
8. [ ] **Testing & Validation**
   - [ ] **Unit – TokenVault**: encrypt-decrypt round trip per service; invalid key rejects.
   - [ ] **Unit – SettingsService**: `configureThirdPartyToken()` happy / sad paths.
   - [ ] **Integration – IPC ↔ Renderer**: modal input → vault storage → `tokenStatus` refresh.
   - [ ] **E2E – Manual Script**: `pnpm ts-node scripts/setup-api-key.js --service notion --key ...` then launch app; banner must disappear.
9. [ ] **Firebase Cloud Provider Nuances**
   - [ ] Confirm **no token** is persisted for `firebase-cloud`; rely on Firebase Auth custom tokens already implemented.
   - [ ] Update `PersonyxCloudService` docs to clarify token-less design.
10. [ ] **SQL Seed & CLI Utilities**

- [ ] Extend `scripts/setup-api-key.js` to support multi-service arguments and invoke IPC where available.
- [ ] Document new usage in `docs/DEVELOPMENT.md`.

---

### 📈 Milestone Acceptance Criteria

- [ ] All third-party services listed in `ApiService` have encrypted tokens stored in `apiTokens` table with timestamps.
- [ ] The **Settings modal** clearly shows stored status and validates key formats before persisting.
- [ ] Missing key banner appears on launch and disappears once the corresponding key is stored & valid.
- [ ] Unit, integration, and end-to-end tests pass (`pnpm vitest`).
- [ ] CI pipeline remains green across all platforms (macOS x64/arm64, Win, Linux).
- [ ] Documentation updated with setup instructions for each service.

---

> **Time Estimate:** 5 dev-hours (excluding CI run time).
> **Risks:** Legacy token migration edge cases, differing key formats (Slack vs Linear), UI clutter. Mitigation: centralised `validateToken()` & iterative UI feedback.

> **Variables referenced inside implementation:**  
> `DEFAULT_SETTINGS`, `AppSettings.aiService.provider`, `AIServiceProvider ('local' | 'cloud')`, `AIServiceConfig.localApiKey`, `SettingsState.lastTestResult`, `SECURITY.AES_IV_LENGTH`, etc.
