# CI/CD Pipeline Refactor Plan (July 2025)

## Purpose

Provide a phased roadmap for stabilising **`main-build.yml`** across macOS, Windows and Linux, eliminating native-module failures, and applying modern GitHub Actions best practices.

---

## Phase 0 – Objectives & Success Metrics

- **Goal:** 100 % successful runs on all three matrix targets; build time ≤ 25 min; deterministic artefacts.
- **Success indicators:**
  - No `UnicodeEncodeError` or native module rebuild errors.
  - ✅ artefacts uploaded for mac-arm64, linux-x64, win-x64.
  - Pass/fail parity with `pr-validation.yml`.

---

## Phase 1 – Immediate Hot-Fixes (same day)

| Step | Action                                                                                       | Justification                                      |
| ---- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1.1  | Remove `✅` emoji print from Windows setuptools check **or** export `PYTHONIOENCODING=utf-8` | Prevents `UnicodeEncodeError` on Windows runners.  |
| 1.2  | Add `chcp 65001` to first Windows step                                                       | Forces UTF-8 console, future-proofs other scripts. |

---

## Phase 2 – macOS Universal Build Re-scope (1–2 days)

| Step | Action                                                                                                                     | Justification                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2.1  | Change mac matrix entry to `platform: mac-arm64` and run `electron-builder --mac --arm64`                                  | `better-sqlite3` lacks universal prebuilds; compiling twice causes node-gyp conflicts. |
| 2.2  | (Optional) Add separate job `mac-x64` if Intel support is mandatory, then merge with `electron-builder --universal` helper | Keeps fat binary option while isolating per-arch native rebuilds.                      |

---

## Phase 3 – Package Job Simplification (2–3 days)

| Step | Action                                                                                                           | Justification                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 3.1  | Replace custom `npm run rebuild-for-electron` + environment exports with `npx electron-builder install-app-deps` | Official tooling manages native modules; less brittle, one line. |
| 3.2  | Switch order: `pnpm install --prod --frozen-lockfile` **after** downloading `dist/`                              | Keeps devDeps out of installer, smaller footprint.               |
| 3.3  | Re-use artefact from `validate` job; remove redundant source checkout in packaging job                           | Build-once/package-many ensures identical binaries.              |

---

## Phase 4 – Workflow Hygiene & Performance (1 week)

| Step | Action                                                                                       | Justification                                    |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 4.1  | Extract common `setup-node-pnpm` composite action (caches pnpm store + Node)                 | DRY; single maintenance point.                   |
| 4.2  | Enable `actions/cache` for `~/.cache/electron` and `~/.cache/electron-builder`               | Saves 3-5 min per run.                           |
| 4.3  | Add `concurrency:` key to cancel stale runs on same branch                                   | Saves CI minutes, avoids artefact clobbering.    |
| 4.4  | Add `fail-fast: true` on matrix and let release summary still run with `if: always()`        | Quicker feedback on first failure.               |
| 4.5  | Pin versions: `electron-builder@24.13.3`, `@electron/rebuild@3.6.0`, `better-sqlite3@12.2.0` | Deterministic builds until upgrades are planned. |

---

## Phase 5 – Optional Enhancements (backlog)

1. GitHub Release draft + auto-upload installers.
2. macOS notarisation & Windows code-signing (requires certificates).
3. Docker-based build-kit for fully hermetic builds.
4. Matrix expansion: linux-arm64.

---

## Implementation Sequence

1. Apply Phase 1 hot-fixes directly on `main`.
2. Create branch `ci-refactor/phase-2-3` – implement Phases 2 & 3; open PR.
3. Iterate until green.
4. Phase 4 changes follow in smaller PRs to ease review.
5. Close backlog tickets as capacity allows.

---

## Risks & Mitigations

- **Risk:** Dropping universal dmg removes native x64 binary.  
  **Mitigation:** Provide Rosetta guidance or build separate dmg in later phase.
- **Risk:** `install-app-deps` may not handle future native modules.  
  **Mitigation:** keep `rebuild-for-electron` script as manual fallback.

---

## Contributors

- CI Lead – _you_
- Reviewers – Security, Release Engineering, Platform Owners

---

_Document generated by AI assistant – July 2025._
