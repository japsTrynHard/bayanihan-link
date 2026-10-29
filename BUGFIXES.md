# Verified bug fixes — 29 October 2026

The active application is the Vite/React app under `src/`. The older root `app/`, `pages/`, and component scaffolds are not part of this build.

## Changes

- Preserve Firebase `FieldValue`, `Timestamp`, and other SDK objects during payload cleanup. Server timestamps and notification array updates now reach Firestore correctly. Invalid historical timestamp objects fall back to the saved ISO date.
- Require Firebase authentication and the saved Firestore role for administrator access. Remove default-password login fallbacks and automatic role promotion. Ignore forged local admin sessions and stale cached roles.
- Keep login and registration forms mounted during submission so failures remain visible. Wait for the registration profile before restoring its session; clean up the new Auth account if profile creation fails. Prevent old profile, login, and registration requests from restoring a logged-out session. Revoke the local session when a live profile receives an unsupported role.
- Open a chat only after its real conversation ID is saved. Concurrent starts use a deterministic ID, and read/edit transactions preserve messages that arrived after the displayed snapshot. Stop overwriting server messages with stale cache arrays. Message send failures reach the form.
- Save post responses and summary counts in one transaction. Restrict responder writes to appending their own response, prevent duplicate submissions, and preserve existing responses during retries.
- Let residents subscribe to their own reports, including reports routed to another barangay. Use safe optional-field lookups in ownership/scope checks. Allow original reporters to add evidence without closing their own moderation case.
- Restrict profile changes, administrator jurisdiction changes, and incident actions in the database rules. Prevent self-created administrator profiles, added/deleted privilege fields, resident self-approval of appointments, and changes to chat membership.
- Fix announcement deletion rules to inspect the stored document. Allow community post browsing and legitimate cross-barangay jobs, lost/found cases, reports, and emergency submissions.
- Preserve emergency reporting during suspension. Save an emergency and its private coordinates atomically; only the incident barangay administrator may read the exact pin. Blank coordinates no longer become a fabricated zero pin.
- Keep failed emergency and appointment submissions out of the saved local cache. Show success only after persistence completes. Await appointment decisions before updating their UI.
- Reject elapsed appointment times using Asia/Manila time, impossible calendar dates, and services that would overlap lunch or extend beyond closing.
- Match accounts using IDs/email rather than display names. Newer remote moderation decisions replace stale local suspensions.
- Add static checks and regression tests; apply compatible dependency security updates through the npm lockfile.

## Validation

```sh
npm ci
npm run lint
npm test
npm run test:emulator
npm run build
```

The regression suite includes React context lifecycle/failure checks and real Firestore emulator tests. Emulator tests use only the `demo-bayanihan` project and require Java 21+. They do not modify production data. `npm run test:firestore` can also run against an already running local emulator when `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` is set.

Verified results: 22 unit/context tests and 14 Firestore integration tests pass; lint, production build, and whitespace checks pass. The build reports the existing bundle-size warning.

## Deployment and remaining limits

- Deploy both the application and `src/firebase/firestore.rules`. The updated response transaction requires the updated rules. For the intended Firebase project, use `firebase deploy --only firestore:rules --project <project-id>`.
- Administrator Auth accounts and matching `users/{uid}` profiles must already be provisioned through the Firebase console or a trusted server, with `role: "barangay_admin"` and the assigned barangay. Username aliases still resolve to their administrator email. Client-side default-password provisioning is no longer a login mechanism.
- No production deployment or live resident/admin account verification was performed. Cloudinary uploads, location providers, and delivery across separate physical browsers still need deployment smoke checks.
- Appointment capacity remains a client-side estimate: residents can read only their own appointments. A trusted booking service or reservation ledger is needed to enforce a barangay-wide capacity limit under concurrent bookings.
- Some administrative workflows still use optimistic writes and local caches. This change verifies the listed regressions; it does not establish that every workflow is free of defects.
- `npm audit` still reports upstream gRPC/Firebase and React Router advisories. The available automatic remediation proposes breaking dependency changes; those were not applied. The production build also retains its existing large-bundle warning.

Implementation references: [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Security Rules list operations](https://firebase.google.com/docs/reference/rules/rules.List).
