# Liquindo Android wrapper

This repository builds an Android APK with Capacitor. The APK opens a dedicated app-style home screen at:

https://liquindirect.github.io/liquindo/app.html

From there, choose **App mode** destinations or switch to **Website mode** to use the existing Liquindo website. The switch is stored in the APK WebView's own storage; it does not change the standalone website/PWA interface. Both modes use the same hosted pages and Supabase-backed accounts, so no separate account system is created.

## Build an APK

1. Open the repository's **Actions** tab on GitHub.
2. Select **Build Liquindo Android APK**.
3. Select **Run workflow** on the `main` branch.
4. Wait for the workflow to finish successfully.
5. Download the artifact from the completed run:
   - `liquindo-android-release-apk` when persistent signing secrets are configured (recommended).
   - `liquindo-android-debug-apk` when they are not configured (testing only).
6. Extract the ZIP and install the APK on your Android device.

The workflow also runs automatically when the wrapper configuration, build script, icon source, dependencies, documentation, or workflow changes. Each run sets an increasing Android version code.

## Set up signing so future APKs can update the installed app

Android only accepts an in-place APK update when the package ID matches, the new version code is higher, and the APK is signed with the same signing key. GitHub-hosted runners are temporary, so relying on their generated debug key is not reliable.

**One-time setup required:** create a dedicated release keystore and save its values as repository Actions secrets. Keep the keystore and passwords private; never commit them to the repository.

1. On a computer with Java's `keytool` installed, run this command to create a keystore. Choose a strong password when prompted and keep it safe:

   ```sh
   keytool -genkeypair -v -keystore liquindo-release.jks -alias liquindo -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Encode the keystore as one Base64 string:
   - Linux: `base64 -w 0 liquindo-release.jks`
   - macOS: `base64 < liquindo-release.jks | tr -d '\\n'`

   Copy the complete output. Treat it as a secret.

3. In GitHub, open **liquindirect/liquindo → Settings → Secrets and variables → Actions → New repository secret**. Add these four secrets:

   | Secret name | Value |
   | --- | --- |
   | `LIQUINDO_ANDROID_KEYSTORE_BASE64` | The complete Base64 output from step 2 |
   | `LIQUINDO_ANDROID_KEYSTORE_PASSWORD` | The keystore password from step 1 |
   | `LIQUINDO_ANDROID_KEY_ALIAS` | `liquindo` |
   | `LIQUINDO_ANDROID_KEY_PASSWORD` | The key password; use the same password if prompted/selected that way |

4. Run the workflow again. It should produce the `liquindo-android-release-apk` artifact. Keep the original `liquindo-release.jks` and passwords backed up securely. If you lose the key, future APKs signed with a replacement key cannot update installations signed with this one.

If the four secrets are absent, the workflow intentionally falls back to a debug APK and shows a warning. Debug builds are for testing and do **not** guarantee that a later build can update an earlier one.

### What about the APK already installed?

The earlier debug APK was built before a persistent signing key was configured. Its signing certificate may differ from the new release key. Android cannot change an installed app's signing identity during an update. If Android rejects the first release APK as incompatible, back up anything important and uninstall the old app once, then install the first persistently signed release APK. After that transition, keep using the same keystore for every update. Uninstalling can remove local app data; the Liquindo website and its Supabase data are hosted remotely and are not deleted by uninstalling the wrapper.

- Android package ID: `com.liquindo.app`. Do not change it if you want updates to install over the existing app.
- The workflow's release signing key is separate from the GitHub repository and should never be committed.
- A Play Store release has additional requirements beyond creating a signed APK.

## Other notes

- The APK starts on the app-style home screen, while its feature pages and website mode load from the live GitHub Pages site. An internet connection is required to access Liquindo. Website changes published to GitHub Pages appear in the app without rebuilding the APK; changes to the native wrapper still require a new APK build.
- Capacitor is configured to show a bundled retry page if the remote site fails to load. This is an error screen, not offline access to account pages or wiki content; test it with Airplane mode and a temporary site outage.
- The live `server.url` approach prioritizes immediate website updates but depends on network availability. A production release should consider bundling a tested local site and adopting a supported live-update strategy instead.
- The wrapper does not change the existing GitHub Pages website, Supabase project, account system, member directory, or wiki.
- The app home includes a GitHub Releases checker and an About panel. The checker reports the latest published signed APK release and opens its release page; Android still requires manual confirmation to install. It does not silently install updates or reliably compare the installed APK's version against the release.
- The app displays a connection warning when the device reports no network. This does not provide offline access to remote account, member, wiki, or editor pages.
- The app icon and generated splash assets use the navy-and-gold Liquindo visual style. Capacitor's Android back handling remains in place; test it on a physical device, especially from nested pages and after opening external links.
- The About panel explains that the website's existing authentication system manages sessions. Do not clear WebView storage on app launch; session persistence still needs to be verified with real sign-in, app close/reopen, and sign-out tests.
- Test login, CAPTCHA, password recovery, file uploads, navigation/back button, and Flag Maker on a physical Android device before relying on the app.

## Publishing an APK update

After the four persistent signing secrets above are configured, updates can be published from GitHub Actions:

1. Open **Actions → Build Liquindo Android APK → Run workflow**.
2. Select the `main` branch.
3. Set **Publish a signed APK as a Liquindo update release** to **true**.
4. Run the workflow and wait for it to finish.
5. The workflow creates a GitHub Release named `Liquindo Android vN` with the signed APK attached.

Leave the publish option set to **false** for routine test builds. A release is only published when all four signing secrets are present; a debug APK is never published as an update release.

**Current limitation:** this prepares the reliable release/download side of an updater, but the current APK loads the live website remotely and does not yet contain a native APK installer/version-check bridge. Android must still confirm APK installation, and an in-app “Update available” button is a separate implementation step. Do not treat a GitHub Actions build artifact as a published update; artifacts expire.

