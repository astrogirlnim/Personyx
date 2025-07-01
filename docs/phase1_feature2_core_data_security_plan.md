# Phase 1 – Feature 2: Core Data Structures & Security

_Last reviewed: 2025-07-01_

## 0 · Validation Snapshot

1. **Existing Code** ‣ _No database layer implemented yet_
   - `src/shared/constants.ts` contains placeholder DB constants but **no schema or connection logic**.
   - `src/main/main.ts` lists `// TODO: Initialize database (Phase 1.2)`.
   - No `drizzle`/`better-sqlite3`/`sqlcipher` imports found.
2. **Memory Bank** ‣ SystemPatterns confirms **SQLite + Drizzle + AES token vault** as accepted pattern.
3. **Checklist Alignment** ‣ `documentation/personyx_mvp_checklist.md` shows **Feature 2** entirely unchecked.

_Compliance ✓ – Proceed with implementation plan below._

---

## 1 · Goals

Implement a **local, encrypted data layer** that is:

- **Cross-platform**: Mac, Windows, Linux (Electron main process only)
- **Type-safe**: Drizzle ORM with generated types
- **Secure**: AES-256-GCM encryption for third-party API tokens (OpenAI, Notion, Slack, Linear)
- **Testable**: Full CRUD unit tests against **in-memory** SQLite

Scope corresponds exactly to checklist sub-items **2.1 → 2.4**.

---

## 2 · File & Module Architecture

```
src/
└── main/
    ├── db/
    │   ├── connection.ts       # Lazy singleton – opens `personyx.db` (SQLCipher-ready)
    │   ├── schema.ts           # Drizzle schema definitions
    │   ├── migrations/         # SQL migration files (drizzle-kit)
    │   └── repositories/       # PersonaRepo, EvidenceRepo, … (repository pattern)
    └── security/
        └── tokenVault.ts       # AES-256-GCM encrypt/decrypt + keytar key storage

src/shared/
└── types.ts                    # ✅ already contains Persona, Evidence, … – reused by schema

docs/
└── ERD_phase1_v1.png           # Generated ER-diagram (optional visual aid)
```

_Note: No duplicate files – confirmed via codebase search._

---

## 3 · Technology Choices

| Concern     | Library / Tool                                            | Rationale                                                                       |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| SQLite      | **better-sqlite3**                                        | Synchronous, pre-built binaries for Electron, great for small desktop DBs       |
| ORM         | **drizzle-orm** + **drizzle-kit**                         | Fully-typed schema & migrations, zero-magic SQL generation                      |
| Encryption  | **SQLCipher** _optional_, **AES-256-GCM** for token vault | SQLCipher considered for full-DB encryption later; vault handled separately now |
| Key Storage | **keytar**                                                | Cross-platform OS credential store                                              |
| Testing     | **vitest** (existing dev dep)                             | Fast, ESM-ready unit tests                                                      |

---

## 4 · Detailed Implementation Steps

### 4.1 Add Dependencies

```bash
pnpm add better-sqlite3 drizzle-orm drizzle-kit keytar
pnpm add -D vitest @types/better-sqlite3 @types/keytar
```

Update `package.json` scripts:

```jsonc
"db:migrate": "drizzle-kit generate:sqlite && drizzle-kit push"
```

### 4.2 SQLite Connection (`connection.ts`)

1. Resolve `userData` path via `app.getPath('userData')`.
2. Lazy-create directory; open `personyx.db` with better-sqlite3.
3. Export Drizzle client: `export const db = drizzle(connection, { schema });`.
4. When `app.quit`, close connection.

### 4.3 Schema (`schema.ts`)

Drizzle table definitions derived from existing `src/shared/types.ts`:

- `personas`
- `evidence`
- `product_documents`
- `evidence_scores`
- `api_tokens` (service, token_encrypted, iv, created_at, updated_at)

### 4.4 Migrations

1. Run `pnpm db:migrate` to generate SQL in `src/main/db/migrations/`.
2. Migration auto-executes on first launch in `main.ts`.

### 4.5 Repository Layer

`repositories/PersonaRepo.ts`, etc. exposing CRUD with methods like:

```ts
class PersonaRepo {
  async create(data: NewPersona) {
    /* … */
  }
  async findById(id: string) {
    /* … */
  }
  async list() {
    /* … */
  }
}
```

These repositories will be used by IPC handlers later.

### 4.6 Token Vault (`tokenVault.ts`)

Algorithm:

1. **Master Key**: retrieve via `keytar.getPassword('Personyx', 'vault-key')` or generate 32-byte random & store.
2. **Encrypt**: `crypto.randomBytes(12)` for IV + `crypto.createCipheriv('aes-256-gcm', key, iv)`.
3. Store `{ service, cipherText, iv, authTag }` in `api_tokens` table.
4. **Decrypt**: reverse operation when token needed.

### 4.7 Unit Tests (`tests/db.test.ts`)

- Spin up **in-memory** better-sqlite3 (`new Database(':memory:')`).
- Run Drizzle migrations programmatically.
- CRUD tests for personas, evidence, product_documents, evidence_scores.
- Token vault encrypt/decrypt round-trip assertion.

### 4.8 Application Integration

- `src/main/main.ts` → call `initDatabase()` during app ready.
- Expose `getPersonas`, `saveToken`, etc. via IPC (later Phase 2).
- Ensure graceful shutdown via `app.on('before-quit')`.

---

## 5 · Cross-Platform & Security Considerations

1. **Binary Dependencies**: `better-sqlite3` provides pre-built binaries; Electron 28 requires rebuild – handled by `electron-builder install-app-deps`.
2. **SQLCipher**: Not enabled by default to avoid compilation friction; revisit in Phase 3 Security utilities.
3. **Token Vault**: Master key _never_ stored in plain text; OS keychain provides per-user encryption.
4. **No Firebase Backend Needed**: All storage is local; remote sync services (Notion, Slack, Linear) will use stored tokens but are **out of scope** for this feature.
5. **OpenAI Key**: User may store via token vault; no calls executed during this phase.

---

## 6 · Acceptance Criteria

- [ ] **Schema generated** in `personyx.db` with 5 tables.
- [ ] **Token vault** encrypts & decrypts sample data successfully.
- [ ] **CRUD tests** pass (`pnpm test`).
- [ ] **Cross-platform build** passes on Mac + Windows CI.
- [ ] No lint/type errors.

---

## 7 · Next Up

- Wire repository layer into IPC (`get-personas`, `import-prd`, etc.)
- Begin **Phase 2.1 Evidence Score Engine** leveraging new schema.

---

> "Encrypted, your evidence is; transparent, your logic must be." – Yoda 🌌
