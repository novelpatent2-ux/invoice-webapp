# Invoice Generator — Live Deployment Guide

This turns your invoice tool into a real website: one password-protected
link, with your data stored in a real database so it's the same on every
device you log in from.

You'll do two things: (1) create a free database, and (2) deploy this
code to a host that gives it a permanent URL. Both are free to start.

---

## Part 1 — Create your database (Supabase, free)

1. Go to **https://supabase.com** and click **Start your project**. Sign
   up (GitHub or email both work).
2. Click **New project**. Give it any name (e.g. "invoices"), set a
   database password (save it somewhere — you won't need it again after
   this step, but keep it safe), and pick any region close to you.
   Wait ~2 minutes for it to finish setting up.
3. Once it's ready, go to **Project Settings** (gear icon, bottom left)
   → **Database**.
4. Under **Connection string**, choose the **URI** tab. Copy the string
   shown — it looks like:
   `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-x-xxxx.pooler.supabase.com:5432/postgres`
5. Replace `[YOUR-PASSWORD]` in that string with the database password
   you set in step 2. Save this whole string somewhere — this is your
   `DATABASE_URL`.

That's your database done. You don't need to create any tables — the
app creates what it needs automatically the first time it starts.

---

## Part 2 — Deploy the app (Railway, free to start)

1. Install **Node.js** on your computer if you don't already have it:
   **https://nodejs.org** (download the "LTS" version, install with
   defaults).
2. Install the **Railway CLI**. Open a terminal (Command Prompt or
   PowerShell on Windows) and run:
   ```
   npm install -g @railway/cli
   ```
3. In that same terminal, go into this project's folder (wherever you
   unzipped it), for example:
   ```
   cd Downloads\invoice-webapp
   ```
4. Log in to Railway (this opens your browser to sign up/log in — free,
   no credit card needed to start):
   ```
   railway login
   ```
5. Create a new Railway project for this app:
   ```
   railway init
   ```
   Give it any name when asked.
6. Set your three environment variables (replace the example values —
   pick your own real password, and paste your real Supabase connection
   string):
   ```
   railway variables --set "APP_PASSWORD=your-chosen-password"
   railway variables --set "SESSION_SECRET=some-long-random-string-here"
   railway variables --set "DATABASE_URL=postgresql://your-full-connection-string"
   railway variables --set "NODE_ENV=production"
   ```
7. Deploy:
   ```
   railway up
   ```
8. Once it finishes, run:
   ```
   railway domain
   ```
   This generates your permanent public URL (something like
   `your-app-name.up.railway.app`). Open it in your browser.

You should land on a login page. Enter the password you set in step 6
— you're in, and your data will now be the same everywhere you log in
with that URL.

---

## Updating the app later

If you (or I, in a future chat) make changes to the code, redeploy with:
```
railway up
```
from inside the project folder. Takes under a minute.

---

## Using your own domain (invoice.novelpatent.com)

You can point your existing subdomain at this app instead of using the
`.up.railway.app` address. Two steps: tell Railway about the domain,
then tell one.com where to send traffic for it.

**Step A — Add the domain in Railway**
1. Go to your project at **https://railway.app**, open this service.
2. Go to **Settings → Networking → Custom Domain**.
3. Click **+ Custom Domain**, type `invoice.novelpatent.com`, and add it.
4. Railway will show you a **CNAME target** to use — something like
   `xxxxxxxx.up.railway.app`. Copy this value.

**Step B — Point the subdomain at it, in one.com**
1. Log in to your **one.com Control Panel**.
2. Click the **Advanced settings** tile, then **DNS settings**.
3. Go to **DNS records**.
4. Under **Create new record**, click **CNAME**.
5. Fill in:
   - **Hostname:** `invoice` (just the subdomain part, not the full
     domain)
   - **Value/Points to:** paste the CNAME target Railway gave you in
     Step A
   - Leave **TTL** blank (defaults to 1 hour)
6. Save/create the record.

DNS changes like this usually take effect within a few minutes to a
couple of hours (rarely up to 24). Once it's live, Railway will
automatically issue an SSL certificate for the domain — no extra step
needed. After that, **https://invoice.novelpatent.com** will take you
straight to your login page.

---

## Notes

- **Keep your `APP_PASSWORD` private.** Anyone with both the URL and
  the password can see your client and bank details.
- **Free tier limits:** both Supabase and Railway have generous free
  tiers for a single small app like this. If you ever outgrow them,
  each platform's dashboard shows simple upgrade options.
- **Backups:** your data lives in Supabase now. From the Supabase
  dashboard → Table Editor → `kv_store`, you can see your raw data any
  time, or use Supabase's built-in backup features for extra peace of
  mind.

