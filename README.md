# Recomp Log

A recomp tracker you install as a home-screen app: meals against macro targets, Push / Pull / Legs / Upper / Lower sessions with progression hints, lift charts, weigh-ins and private progress photos.

It's a plain static web app (no build step). Data lives in your own Supabase project. The app works offline and syncs when you're back on signal.

## Files

| Path | What it is |
|---|---|
| `index.html`, `app.css`, `app.js` | The app |
| `config.js` | Your Supabase Project URL and anon key (optional; the app can ask on first launch) |
| `sw.js` | Service worker: offline support and fast start-up |
| `manifest.webmanifest`, `icons/` | Home-screen name and icon |
| `vendor/supabase.js` | Supabase client, v2.117.2 |
| `supabase/schema.sql` | Database table, security rules and the private photo bucket |

## One-time setup

1. **Supabase**
   - Create a project in the Sydney region.
   - Open **SQL Editor → New query**, paste `supabase/schema.sql`, and press **Run**.
   - Go to **Authentication → Users → Add user → Create new user**. Use your email and a password, and tick **Auto confirm**.
   - In the Authentication settings, turn off **Allow new users to sign up**.
2. **Config.** Put your Project URL and anon key into `config.js`. Skip this and the app asks for them on first launch instead.
3. **GitHub Pages**
   - Push this folder to a GitHub repo.
   - Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, set the branch to `main` and the folder to `/ (root)`.
   - The app goes live at `https://<your-username>.github.io/<repo-name>/`.
4. **iPhone**
   - Open that link in Safari, tap **Share → Add to Home Screen**, and open **Recomp** from your Home Screen.
   - Sign in.
   - To bring in old data, use Settings (gear icon) → **Restore from backup**.

## Updating the app

When you change any file, also change `VERSION` in `sw.js` (e.g. `recomp-v2`). Phones pick up the new version the next time the app is opened, then reopened.

## Backups

Settings (gear icon) → **Export backup** saves a JSON file of everything except the photo files themselves. **Restore from backup** merges a backup back in.
