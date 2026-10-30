# ActuallyFreeTools

Free, unlimited file tools (PDF, images, video, audio, spreadsheets, business documents) that run entirely in the browser. Files are never uploaded.

## Folders

| Path | What it is |
|---|---|
| `src/` | The app source. Edit these files. |
| `actuallyfreetools.html` | The whole app as one file, for local use. Rebuilt from `src/`. |
| `site/` | The public website, one page per tool. Rebuilt from `src/` and `dev/seo-content.js`. **Upload this folder.** |
| `dev/seo-content.js` | Titles, descriptions, answers, steps and FAQs for every page. |
| `dev/build.js` | Builds `actuallyfreetools.html`. |
| `dev/build-site.js` | Builds `site/`. |
| `dev/runner.js`, `dev/tests.js` | End-to-end browser tests (headless Edge). |
| `dev/site-check.js` | Checks the built site: headings, presets, ad layout. |
| `dev/shots.js` | Screenshots of key screens with real files loaded (into `dev/shots/`). |
| `dev/make-logo.js` | Draws the 32×32 pixel logo into `src/logo/` (SVG + PNGs). |

## How the tools are organised

Most jobs happen in four **studios**: PDF, Image, Video and Audio. Task pages such as Merge PDF, Compress images and Video to GIF open a studio already set up for that job. They keep their own addresses, so each one can still rank in search on its own. Home-page drops open the right studio with the file already loaded.

## Build

```
node dev/build.js          # actuallyfreetools.html
node dev/build-site.js     # site/
```

## Before you publish: settings

Create `dev/site.config.json`:

```json
{
  "SITE_URL": "https://yourdomain.com",
  "BRAND": "ActuallyFreeTools",
  "TITLE_PREFIX": "Actually Free",
  "OWNER": "Your name or company",
  "CONTACT_EMAIL": "you@yourdomain.com",
  "SOURCE_URL": "https://github.com/you/your-repo",
  "CF_ANALYTICS_TOKEN": "",
  "ADSENSE_CLIENT": "",
  "AD_SLOT_RAIL": "",
  "AD_SLOT_BOTTOM": ""
}
```

`CF_ANALYTICS_TOKEN` is the token from Cloudflare Web Analytics (free, no cookies); the privacy page describes it automatically. Leave the three ad fields empty until AdSense approves the site. Run `node dev/build-site.js` again after any change.

## Deploy (Netlify)

**Set `SITE_URL` first.** Every page's canonical address comes from it, and pages that point at `example.com` will be ignored by Google.

**From GitHub (recommended):** Netlify → Add new site → Import an existing project → GitHub → pick this repo, then set:

- **Build command:** `node dev/build.js && node dev/build-site.js`
- **Publish directory:** `site`

No `npm install` is needed. From then on, every push to `main` redeploys the site.

**By hand:** run both build commands and drag the `site` folder onto the site's **Deploys** tab (or `netlify deploy --prod --dir=site`).

`site/` and `actuallyfreetools.html` are build output and are not committed. Netlify picks up the clean URLs (`/ocr/`), `404.html` and the `_headers` file without extra configuration.

## Get found (SEO and AI search)

1. **Google Search Console:** add the domain and submit `https://yourdomain.com/sitemap.xml`.
2. **Bing Webmaster Tools:** import from Search Console. ChatGPT search and Copilot use Bing's index.
3. `robots.txt` already allows all search and AI crawlers. `llms.txt` describes every tool for AI assistants.
4. List the site on AlternativeTo (as an alternative to iLovePDF, Smallpdf and remove.bg), Product Hunt and relevant subreddits. Answer real questions honestly; don't spam.
5. Search for your target tasks in ChatGPT, Perplexity and Google every month. Note who gets cited.

## Ads: side and bottom only

1. Apply at adsense.google.com once the site is live with its About, Privacy, Terms and Contact pages. They are already built.
2. In AdSense → Ads → By site → **turn Auto ads OFF**. Auto ads are what add pop-ups, full-screen "vignette" ads between pages, and sticky overlay bars.
3. Create two **display ad units**: one for the side rails, one for the bottom. Put the publisher id (`ca-pub-…`) and the two slot ids into `site.config.json` and rebuild. `ads.txt` is generated automatically.
4. In AdSense → Privacy & messaging, publish the **European regulations (GDPR) message**. It's legally required for EEA, UK and Swiss visitors.

Where ads appear:
- **Side rails:** only on screens at least 1260 px wide. They sit in the page's side columns, beside the tool and never over it, and stop before the footer.
- **Bottom slot:** under the page content.
- **Phones:** the bottom slot only.
- **Never:** ads on the About, Privacy, Terms or Contact pages, and never anywhere near the tool's buttons.

## Licence

ActuallyFreeTools is free software under the **GNU Affero General Public License v3.0** (see [LICENSE](LICENSE)). If you run a modified copy as a public website, you must offer your visitors its source code too. The live site links here from its footer and About page (`SOURCE_URL` in `dev/site.config.json`).

- **Background remover:** `@imgly/background-removal` is AGPL-3.0, which this project's own licence satisfies.
- **ffmpeg:** the core used by the video tools is **GPL** (it includes x264). It's loaded unmodified from a public CDN.
- Everything else (pdf.js, pdf-lib, Tesseract.js, SheetJS, JsBarcode, JSZip, Noto fonts, 7-Zip) is permissive or LGPL. The About page credits all of them.
