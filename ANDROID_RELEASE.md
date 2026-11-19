# SOP & Proof Hub — Android release

## Current app behavior

The current production source is a **device-local incident documentation app**. Reports and attached images are stored in IndexedDB on the device. There is no active app sign-in, team cloud sync, colleague sharing of saved records, Supabase upload, or automatic migration to Supabase. Sharing the app link does not share report data.

OCR and direct PDF export load their JavaScript libraries and OCR language data from public CDNs, so those features need an internet connection on first use and may be unavailable when the network or CDN is blocked. Manual Order ID entry and the browser print-to-PDF path are alternatives where available.

## What the Android workflow creates

- A debug APK for installing and testing on Android phones.
- A signed Android App Bundle (AAB) only when all four upload-signing secrets are configured in GitHub Actions.

## Build and test a debug APK

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **Build SOP & Proof Hub for Android**.
4. Select **Run workflow** and confirm.
5. Wait for the workflow to finish successfully.
6. Open the completed run and download **sop-proof-hub-debug-apk** from Artifacts.
7. Transfer the APK to an Android phone and install it for testing. Android may ask you to allow installation from that source.

The workflow runs a JavaScript syntax/static source check, prepares the web assets, verifies that the app and privacy policy are copied into the Android web directory, then builds the debug APK. A successful build does not prove that OCR, file selection, local storage, PDF export, or sharing work correctly on every phone.

A push to the main branch that changes the app, Android build configuration, package metadata, privacy policy, or build scripts starts the workflow.

## Signed Play Store AAB

Google Play requires a release-signed AAB. Create an upload key and keep its keystore and passwords private. Do not commit the keystore or passwords to this repository.

Add these four repository Actions secrets under **Settings → Secrets and variables → Actions**:

- ANDROID_KEYSTORE_BASE64: the upload keystore file encoded as Base64.
- ANDROID_KEYSTORE_PASSWORD: the keystore password.
- ANDROID_KEY_ALIAS: the key alias.
- ANDROID_KEY_PASSWORD: the key password.

After adding the secrets, run the workflow again. It will attempt to publish an artifact named **sop-proof-hub-play-store-aab**. Keep a secure backup of the upload key. Never share it in chat or commit it to GitHub.

## App identity

- App name: SOP & Proof Hub
- Android application ID: com.sopproofhub.app
- Initial version in the release guide: 1.0.0 (version code 1)

Choose and confirm the final application ID before the first Play Store release. Google Play treats it as the permanent identity of the app.

## Privacy policy

The in-app policy is in privacy.html. If GitHub Pages is enabled for this repository and serves the main branch, the expected public URL is:

https://maddulaq.github.io/evidence-log/privacy.html

Verify that this exact URL opens publicly over HTTPS before entering it in Play Console. The policy describes local-only storage, CDN dependencies, backups, and user-initiated sharing. Update it before release if the app later adds accounts, cloud sync, analytics, or other data collection.

## Required pre-release checks

1. Install the APK on at least one physical Android phone and verify fresh install, launch, navigation, language switching, dark mode, and orientation/resizing.
2. Create a test report with a valid screenshot, a valid OD + 18-digit Order ID, actual store/hub name, incident date/time, and one or two supporting images.
3. Test OCR with clear, blurred, cropped, and low-resolution screenshots, plus screenshots containing unrelated 18-digit numbers. Confirm that uncertain results are not silently accepted and that manual correction works.
4. Save, search, refresh/reopen, delete, and export sample reports. Confirm that search remains applied after saving or deleting.
5. Generate a PDF with a long description and all three images. Check every page for clipped text or images.
6. Export a JSON backup and confirm it contains only the expected test data. Store the backup securely; it contains image data and is not encrypted by the app.
7. Test sharing and printing on the target Android version. Confirm the privacy policy link opens inside the app.
8. Verify the GitHub Actions debug APK and signed AAB artifacts. Install the release-signed build on a test device before Play Console submission.
9. Complete Play Console Data safety, app access, content rating, target audience, screenshots, icon, feature graphic, and any required testing declarations accurately.

Do not use real customer-sensitive screenshots for public testing. Use synthetic or appropriately redacted test evidence. Do not advertise cloud storage or team access until those features have actually been implemented and tested.
