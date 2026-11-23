# Refyne iPhone app

The App Store version of Refyne. It wraps the web app (the files in the repo root) with
[Capacitor](https://capacitorjs.com), so the same code runs on refynefit.net and in the iPhone app.

## Build it on your Mac

You need Xcode (free from the Mac App Store) and Node.js.

```bash
git clone https://github.com/a-sowry/recomp-log.git   # first time only; later just: git pull
cd recomp-log/native
npm install          # first time, or after the native packages change
npm run sync         # copies the latest web app into the iPhone project
npm run open         # opens the project in Xcode
```

In Xcode:

1. Click **App** in the left sidebar, then **Signing & Capabilities**, and pick your Apple Developer team.
2. To try it on your phone: plug in your iPhone, choose it at the top, and press ▶ (Run).
3. To send it to TestFlight or the App Store: choose **Any iOS Device (arm64)**, then **Product → Archive**,
   then **Distribute App → App Store Connect**.

Every time the web app changes, run `npm run sync` again before building, and raise the build number
in Xcode (App → General → Build) before each upload.

## What's different in the app

- No "add to home screen" help, no service worker.
- Rest-timer notifications use iPhone local notifications instead of web push (work offline).
- Sign-up and password-reset emails link to refynefit.net, then people come back to the app to sign in.
