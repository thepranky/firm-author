# Firm Author

Local-first DOCX author anonymisation for law firm Word documents. Upload a `.docx` in your browser, select internal authors to replace, and download a cleaned document plus an audit report — nothing is sent to a server.

**Live demo:** [firm-author.vercel.app](https://firm-author.vercel.app)

## Disclaimer

Firm Author is a document tooling utility, not legal advice. Always open the cleaned document in Word Desktop and verify the Review pane / comment balloons before sending externally. You remain responsible for checking that anonymisation meets your firm's requirements.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # core library tests
pnpm build        # production build
```

## What it does (MVP)

- Scans **visible** tracked-change authors (`w:author` on known revision elements) and comment authors across story parts
- Lets you select authors and replace them with a firm author (default: **Law Firm LLP** / **LFL**)
- Rewrites `w:initials` on comments where present
- Timestamp policy on `w:date`: preserve (default) or remove
- Exports cleaned `.docx` plus audit JSON/HTML
- Verifies body text, comment count, and tracked-change element count are unchanged

## What it does not do (MVP)

- Rewrite `docProps/core.xml` (creator / last modified by)
- Rewrite modern comment extension parts (`commentsExtended.xml`, etc.)
- Automatic internal/external author inference
- Word Online add-in support

Ancillary metadata in `docProps/core.xml` and modern comment extension parts is **detected and reported** in the audit but not modified.

## Word add-in

Desktop Word task pane add-in — scan and anonymise the open document without uploading to a server. Build output is served at `/addin/` on the deployed site. See [QA.md](./QA.md) for sideload steps.

## Word Desktop acceptance test

After anonymisation:

1. Open the cleaned `.docx` in Word Desktop (no repair prompts)
2. Confirm the **Review pane / comment balloons** show the replacement author
3. Confirm tracked changes and comments are still present

## Project structure

```
packages/core       — @firm-author/core library
packages/ui         — shared React UI (Word add-in)
packages/web        — Vite + React browser UI
packages/word-addin — Office task pane add-in (builds into web/public/addin)
```

## Privacy

All processing runs locally in the browser using JSZip and raw XML attribute replacement. Documents never leave your machine.

## Deployment

**Production:** [firm-author.vercel.app](https://firm-author.vercel.app) (Vercel static hosting)

```bash
pnpm build
# output: packages/web/dist
```

See [DEPLOY.md](./DEPLOY.md) for Vercel setup and connecting GitHub for auto-deploy.

## Manual QA checklist

- [ ] Cleaned `.docx` opens in Word Desktop without repair prompts
- [ ] Review pane / comment balloons show replacement author
- [ ] Comment initials show replacement initials
- [ ] Tracked changes visible; body text unchanged
- [ ] Integrity checks pass in audit report
- [ ] Unclassified `w:author` hits listed in audit when present

## Roadmap

- Optional core.xml scrub
- Modern comment extension metadata rewrite (after Word fixture validation)
- AppSource listing for Word add-in
