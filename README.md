# Bottle Track

Premium RO / packaged-water business management app. Expo SDK 58 · React Native 0.88 · TypeScript (strict) · Redux Toolkit + redux-persist · Reanimated 4 · React Navigation 7 · React Hook Form + Zod · Lottie · react-native-svg.

## Run

```bash
npm install
npx expo start            # then press i (iOS) or a (Android)
npx expo run:ios          # or run:android — native dev build
npx tsc --noEmit          # type-check
npx tsx scripts/test-workflows.ts   # 42 business-rule assertions against the domain engine
```

Demo login: `owner@aquapure.in` / `demo1234` (or tap "Use demo account"). The app ships with ~60 days of realistic seeded data; **More → Settings → Appearance & data** can restore it or start empty.

## Android release builds

Run from the project root (no need to `cd android`):

| Command | Output |
| --- | --- |
| `npm run apk` | `android/app/build/outputs/apk/release/app-release.apk` |
| `npm run bundle` | `android/app/build/outputs/bundle/release/app-release.aab` |
| `npm run android` | **debug** build installed on a device/emulator (dev client, needs Metro) |

If `android/` doesn't exist (it's generated and gitignored), the scripts run `expo prebuild` first. Requires JDK 17 and the Android SDK (`ANDROID_HOME`).

**Debug vs release.** Debug (`npm run android`) uses the debug keystore and loads JS from Metro. Release (`apk` / `bundle`) embeds a Hermes JS bundle, enables R8 minification (`android.enableMinifyInReleaseBuilds` in `gradle.properties`) and is signed with your release key.

**Application ID / version.** `com.bottletrack.app`; `version` and `android.versionCode` in `app.json`. Bump `versionCode` for every Play Store upload.

**Signing.** Configured by the `plugins/withAndroidReleaseSigning.js` config plugin (re-applied on every prebuild; never hand-edit `android/`). No secrets live in source. Create a keystore once:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ~/bottletrack-release.jks \
  -alias bottletrack -keyalg RSA -keysize 2048 -validity 10000
```

Then provide these four values via **environment variables**, **`android/keystore.properties`** (untracked), or `~/.gradle/gradle.properties`:

```properties
BOTTLETRACK_STORE_FILE=/Users/you/bottletrack-release.jks
BOTTLETRACK_STORE_PASSWORD=...
BOTTLETRACK_KEY_ALIAS=bottletrack
BOTTLETRACK_KEY_PASSWORD=...
```

If any are missing the build still succeeds but is signed with the **debug** key (a warning is printed) — fine for local testing, **not** for Play Store. Back up your keystore; losing it means you can't update the app.

## Architecture

```
src/
  components/   common · cards · charts · forms · navigation   (design system)
  modules/      auth dashboard customers products orders inventory subscriptions
                delivery payments expenses reports notifications settings
                  └ screens/ components/ services/ (pure domain logic)
  services/     engine.ts (operation dispatcher) · seed.ts · authService.ts · export.ts
  store/        db / settings / auth slices, persisted to AsyncStorage
  theme/ types/ utils/ hooks/ navigation/ constants/
```

**Single source of truth.** All business data lives in one `db` slice. Every write is an `Op` (`services/engine.ts`) executed by `useExec()`:

1. dry-run on a copy → if the business rule fails, nothing changes and the error is shown;
2. otherwise the reducer replays the same op. IDs are counter-based so both runs agree.

Derived numbers (balances, bottle balances, revenue, dashboard, reports) are **computed from ledgers**, never stored twice.

### Data-integrity rules (all covered by `scripts/test-workflows.ts`)

- Stock moves only through `applyStockMove`: atomic, writes an inventory ledger row, idempotent by `refKey`, blocks negative stock unless enabled in settings.
- Delivery happens exactly once (`order:<id>:delivered` key); dispatch / return / delivery / empties each have their own keys.
- Failed / cancelled orders return loaded stock and create no revenue.
- Financial entries are separate kinds: product, delivery, tax, deposit, discount, payment, deposit refund. Revenue = product + delivery − discount (deposits & tax excluded).
- Deposit is finalised at delivery from empties collected; refunds only for bottles actually returned.
- Subscriptions generate at most one order per (subscription, date); pause/resume/renew are safe to repeat.
- Form submissions carry a request id, so double-taps can't duplicate payments, orders or stock entries.

### Ready for a backend

`authService.ts` is the async API boundary (replace with real calls). The `Op` list in `engine.ts` maps 1:1 to REST/GraphQL mutations; `applyOp` can become the optimistic-update layer.

## Checklist

| Module | Status |
|---|---|
| A Splash · onboarding · login · register · forgot password | ✅ |
| B Dashboard (date filter, count-up, charts, alerts, quick actions) | ✅ |
| C Customers (search/filter/sort, multi-address, ledger tabs) | ✅ |
| D Products (custom sizes, image, deposit, margin) | ✅ |
| E Orders (create, timeline, assign, deliver, fail, cancel, invoice PDF) | ✅ |
| F Inventory (per-product, 7 entry types, ledger) | ✅ |
| G Subscriptions (5 frequencies, pause/resume/cancel/renew, generator) | ✅ |
| H Delivery staff + Delivery Mode | ✅ |
| I Payments (partial/advance, deposit refund, receipt PDF) | ✅ |
| J Expenses | ✅ |
| K Reports (12 reports, date filters, PDF + CSV/Excel export) | ✅ |
| L Notifications | ✅ |
| M Settings | ✅ |

## Known limitations

- App icon / splash image are Expo defaults (no brand artwork generated).
- "Excel export" is CSV (opens in Excel/Sheets); true `.xlsx` would need an extra dependency.
- Auth is a local mock; passwords are stored unhashed on-device by design of the mock.
- Notifications are in-app only (no push).
