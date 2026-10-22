# McCabe Plumbing & Water Treatment — Website Redesign (Concept)

A modern, animated concept redesign for McCabe Plumbing & Water Treatment, a
family-owned plumbing company serving the Arizona East Valley.

**This is a static, front-end-only demo.** There is no backend yet.

## Structure

```
index.html        Main marketing site
css/styles.css    Design system + all styles
js/main.js        Animations & interactions
admin/            Demo admin dashboard (see note below)
vercel.json       Static hosting config (clean URLs + security headers)
```

## Admin portal (`/admin`)

A **mock** dashboard for demonstration. It has no real authentication — any
email and password will sign in — and every number, chart, and lead shown is
placeholder data generated in the browser. There is no database, no tracking,
and no real analytics behind it. It exists purely to preview what a client
dashboard could look like.

## Run locally

```bash
python3 -m http.server 4178
# then open http://127.0.0.1:4178/
```

## Deploy

Static site — deploys to Vercel with no build step. `/admin` resolves to
`admin/index.html` automatically.
