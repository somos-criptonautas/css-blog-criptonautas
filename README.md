# ghost-headline-theme-nautas

The Ghost theme behind [criptonautas.co](https://criptonautas.co). It started as a fork of
Ghost's [Headline](https://github.com/TryGhost/Themes/tree/main/packages/headline) and has
diverged enough that it is now maintained as its own theme rather than a skin on top of it.

> [!WARNING]
> **Work in progress.** The project ran as an experiment for a long time and is only now
> entering a maintained stage. Expect this file, the templates and the CSS to keep moving
> until a version is tagged as final. Nothing here is a stable API — fork it and adapt it,
> but pin a commit if you depend on it.

Upstream Headline was built for local news: many topics, dense grids, lots of content
surfaces. This fork keeps its skeleton and its shared asset pipeline, and rebuilds the
reading experience around a single long-form Spanish-language publication — bigger type,
fewer boxes, more whitespace.

## What differs from upstream Headline

**Reading experience**
- Larger base type and a wider content column; the root font-size is set to `71%` and
  everything is expressed in `rem` on top of that.
- Table of contents in a sticky sidebar on post templates, built with `tocbot`. Its width
  is a single knob, `--toc-width` in `assets/css/vars.css`.
- Light/dark theme that follows the OS by default and remembers an explicit choice
  (`assets/js/theme.js`). See the CSP note below for why it is a file and not inline.
- The mobile navigation breakpoint is moved from the shared theme's `767px` to `991px`, so
  the burger menu covers tablets. This is done at build time by a small PostCSS plugin in
  `gulpfile.js` scoped to the shared theme's nav CSS only — a global rewrite would collapse
  this theme's own `768–991px` blocks into a query that never matches.

**Templates**

Several post and page layouts beyond upstream, selectable per post in Ghost admin:

| Template | Purpose |
| --- | --- |
| `custom-full-feature-image.hbs` | Full-bleed cover with the title over the image |
| `custom-wide-feature-image.hbs` | Wide image below the header |
| `custom-post-plain.hbs` | No feature image |
| `custom-post-no-suggested.hbs` | Post without the related-posts footer |
| `custom-signin` / `custom-signup` / `custom-account` | Membership pages |
| `custom-authors` / `custom-tags` | Archive listings |

**Integrations** — comments via a self-hosted [Discourse](https://comunidad.criptonautas.co)
embed, search via self-hosted Typesense, payments via a BTCPay Ghost paywall plugin,
analytics via self-hosted Plausible, plus webmentions and `flying-pages` prefetching.

**Ghost Portal is disabled** (`{{ghost_head exclude="portal"}}`). Membership flows are
handled by the custom pages above and by BTCPay instead.

## Development

Requires **Node 22+** (pinned in `.nvmrc`; `cssnano` uses `Set.prototype.difference`, which
lands in 22) and **pnpm**.

```bash
pnpm install
pnpm dev     # build + watch
pnpm test    # gscan theme validation
pnpm zip     # package for manual upload
```

Edit source CSS in `assets/css/`, JS in `assets/js/`, and the `.hbs` templates. Anything in
`assets/built/` is generated — but it **is** committed, because that is what ships to Ghost.
Always commit a rebuild alongside source changes.

`assets/js/*.js` is concatenated into `built/main.min.js`, with two deliberate exceptions:
`theme.js` is excluded (it loads on its own in `<head>` before first paint, and bundling it
would register the theme toggle twice), and file order is controlled by
`ordered-read-streams` so vendor libraries land before the code that calls them.

### Two things that will bite you

**Do not let Prettier format `.hbs` files.** It rewrites helper arguments inside HTML
attributes — `{{social_url type="twitter"}}` becomes `{{social_url type=" twitter"}}`, and
`{{{block "body_class"}}}` becomes `{{{block " body_class"}}}`. Ghost uses those values
verbatim, so the result is silently broken output, not an error. `.prettierignore` excludes
`*.hbs` for this reason; keep it that way.

**Inline `<script>` blocks are blocked by the site's CSP.** The `script-src` policy carries
sha256 hashes, and per the CSP spec a hash makes the browser ignore `'unsafe-inline'`. Only
inline scripts whose exact hash is allowlisted will run, so editing one silently disables it.
Put new JS in a file under `assets/` — the policy already allows that path.

## Deployment

Pushing to `main` runs `.github/workflows/deploy-theme.yml`, which uploads the theme to Ghost
over the Admin API.

Two details are load-bearing:

- **`theme-name` must match the active theme's id in Ghost.** Ghost keys a theme on the
  uploaded zip's filename, and only re-activates it when that id matches the active one.
  A mismatch installs a second, inactive theme — the run goes green and the site never
  changes.
- **`/ghost/` must not sit behind a forward-auth proxy for the Admin API path.** If it does,
  the upload is redirected to a login page, the action reads the 2xx as success, and nothing
  reaches Ghost. A preflight step fails the build loudly when it detects this instead of
  letting it pass silently.

## Credits

Based on [Headline](https://github.com/TryGhost/Themes/tree/main/packages/headline) by the
Ghost Foundation. Theme translations come from `@tryghost/theme-translations`.

## Copyright & License

Copyright (c) 2013-2026 Ghost Foundation — released under the [MIT license](LICENSE).
