# Liquindo Android wrapper

This repository can build an Android APK with Capacitor. The wrapper opens the live Liquindo website at:

https://liquindirect.github.io/liquindo/

## Build an APK

1. Open the repository's **Actions** tab on GitHub.
2. Select **Build Liquindo Android APK**.
3. Select **Run workflow** on the `main` branch.
4. Wait for the workflow to finish successfully.
5. Open the completed workflow run and download the `liquindo-android-debug-apk` artifact.
6. Extract the downloaded ZIP file to get `app-debug.apk`, then transfer it to your Android device and install it.

The workflow also runs automatically when the wrapper configuration, build script, icon source, dependencies, or workflow itself changes.

## Important details

- Android package ID: `com.liquindo.app`. Decide whether to keep this ID before publishing; changing it later means Android treats it as a different app.
- This workflow produces a **debug APK** for testing and sideloading. A Play Store release requires a properly signed release build and a protected signing key.
- The app loads the live website, so an internet connection is required to access Liquindo. Website changes published to GitHub Pages appear in the app without rebuilding the APK.
- Capacitor is configured to show a bundled retry page if the remote site fails to load. This is an error screen, not offline access to account pages or wiki content; test it with Airplane mode and a temporary site outage.
- The live `server.url` approach prioritizes immediate website updates but depends on network availability. A production release should consider bundling a tested local site and adopting a supported live-update strategy instead.
- The wrapper does not change the existing GitHub Pages website, Supabase project, account system, member directory, or wiki.
- The first APK has not been tested on a physical Android device yet. Check login, CAPTCHA, password recovery, file uploads, navigation/back button, and Flag Maker before relying on it.
- The fallback page is included as a local asset, but because the wrapper is configured to load the live website, offline fallback behavior must be tested separately.
