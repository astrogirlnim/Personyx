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

## Phase 2 – macOS Universal Build Re-scope ✅ COMPLETE

| Step | Action                                                                                     | Status  | Notes                                                                    |
| ---- | ------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------ |
| 2.1  | Change mac matrix entry to `platform: mac-arm64` and run `electron-builder --mac --arm64`  | ✅ DONE | Implemented with separate `mac-arm64` and `mac-x64` matrix entries       |
| 2.2  | Add separate job `mac-x64` and create `mac-universal` job to merge with `lipo` + `hdiutil` | ✅ DONE | Universal DMG created from merged binaries in separate workflow job      |
| 2.3  | **Fix dependency issues**: Add missing `dmg-license` module for DMG packaging              | ✅ DONE | Added `dmg-license@1.0.11` to devDependencies (commit 6941392)           |
| 2.4  | **Unified CI Approach**: Refactor `pr-validation.yml` to mirror main build matrix          | ✅ DONE | Split validation into Core + Platform jobs with representative subset    |
| 2.5  | **Native Module Symlink Fix**: Comprehensive cache cleanup and rebuild strategy            | ✅ DONE | Aggressive cleanup + `electron-builder install-app-deps --arch` approach |

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

1. ✅ **Phase 1**: Hot-fixes applied directly on `main` (Windows Unicode, UTF-8 console)
2. ✅ **Phase 2**: Implemented on branch `ci-refactor/phase-2-3` (macOS Universal Build Re-scope)
   - ✅ Matrix separation for mac-arm64 and mac-x64
   - ✅ Universal binary creation with lipo/hdiutil
   - ✅ Native module symlink conflict resolution
   - ✅ Unified CI approach (PR validation mirrors main build)
   - ✅ Dependency fixes (dmg-license added)
3. 🔄 **Phase 2 Testing**: Current status - testing dmg-license fix in CI
4. **Phase 3**: Package Job Simplification (next)
5. **Phase 4**: Workflow Hygiene & Performance (future)
6. **Phase 5**: Optional Enhancements (backlog)

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

---

## Current Status (January 2025)

**Phase 2 Implementation Complete**: The comprehensive macOS Universal Build Re-scope has been successfully implemented with the following achievements:

- **✅ Native Module Conflicts Resolved**: Fixed `better-sqlite3` and native module symlink conflicts through aggressive cache cleanup and architecture-specific builds
- **✅ Universal DMG Support**: Maintained universal DMG creation through separate architecture jobs merged with `lipo`/`hdiutil`
- **✅ Unified CI Pipeline**: Refactored PR validation to mirror main build, eliminating "works in PR, fails in main" scenarios
- **✅ Dependency Management**: Fixed missing `dmg-license` dependency required for DMG packaging

**Latest Fix**: Added `dmg-license@1.0.11` dependency (commit 6941392) to resolve electron-builder DMG packaging errors.

**Next Steps**: Phase 2 testing in CI to validate complete solution, then proceed to Phase 3 Package Job Simplification.

---

_Document generated by AI assistant – July 2025.  
Last updated: January 2025_
