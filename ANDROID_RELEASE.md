# SOP & Proof Hub — Android release

## What this build creates

- A debug APK for installing and testing on Android phones.
- A signed Android App Bundle (AAB) for Google Play, but only after the app's upload-signing secrets have been configured in GitHub.

The Android app uses the existing web application and Supabase backend. The existing Supabase authentication, row-level security, private evidence bucket, report/PDF features, and OCR remain the source application functionality.

## Build a test APK

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **Build SOP & Proof Hub for Android**.
4. Tap **Run workflow** and confirm.
5. Open the completed run and download **sop-proof-hub-debug-apk** from Artifacts.
6. Transfer the APK to your Android phone and install it for testing. Android may ask you to allow installation from that source.

A push to the main branch that changes the app or Android build files also starts a build.

## Signed Play Store AAB

Google Play requires a release-signed AAB. Create an upload key and keep its keystore and passwords private. Do not commit the keystore or passwords to this repository.

Add these four repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: the upload keystore file encoded as Base64.
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `ANDROID_KEY_ALIAS`: the key alias.
- `ANDROID_KEY_PASSWORD`: the key password.

After adding the secrets, run the workflow again. It will publish a second artifact named **sop-proof-hub-play-store-aab**. Keep a secure backup of the upload key. Do not share it in chat.

## App identity

- App name: SOP & Proof Hub
- Android application ID: `com.sopproofhub.app`
- Initial version: 1.0.0 (version code 1)

Choose the final application ID before the first Play Store release. Google Play treats it as the permanent identity of the app.

## Before submitting to Google Play

The APK/AAB build is not the same as Play Store approval. Before production submission:

1. Test sign-in, sign-out, session expiry, report creation/editing, evidence upload and retrieval, OCR/manual correction, PDF generation, multi-report export, sharing, and admin/colleague access on real Android devices.
2. Confirm the app's privacy policy and support contact. Publish the privacy policy at a public HTTPS URL and link it in the app and Play Console.
3. Complete Google Play's Data safety form accurately for Supabase account data, incident descriptions, screenshots/evidence, and any other collected data.
4. Complete app access instructions for reviewers if sign-in is required.
5. Add the store icon, screenshots, feature graphic, description, content rating, and target audience declarations.
6. Complete any required closed testing and Play Console declarations before production release.

Do not upload real incident evidence to a public test listing. Use test accounts and sample records during QA.
