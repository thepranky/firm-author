# Firm Author

Local-first DOCX author anonymisation for law firm Word documents. Use it in the browser or inside Word Desktop — documents never leave your machine.

**Live:** [firm-author.vercel.app](https://firm-author.vercel.app)



## Web app

1. Open [firm-author.vercel.app](https://firm-author.vercel.app)
2. Upload a `.docx` file
3. Select the internal authors to replace and set the replacement author
4. Download the anonymised document


## Word add-in

The add-in scans and anonymises the document you already have open in Word Desktop — no upload step.

1. Download the manifest: [firm-author.vercel.app/addin/manifest.xml](https://firm-author.vercel.app/addin/manifest.xml)
2. In Word Desktop, go to **Insert → Add-ins → My Add-ins**
3. Choose **Upload My Add-in** (Windows) or **Add from File** (Mac) and select the manifest
4. Open a `.docx`, then click **Anonymise authors** on the Home ribbon
5. Select authors, run anonymisation, then download or open the cleaned document in Word

Desktop Word only. Word Online is not supported yet.

## What it does

- Finds tracked-change and comment authors across the document
- Replaces selected authors with your firm author and initials
- Optional timestamp removal on revision dates
- Exports an audit report with integrity checks (body text, comment count, tracked-change count)

Some ancillary metadata (for example `docProps/core.xml` creator fields and modern comment extension parts) is detected and reported in the audit but not modified.

## Development

```bash
pnpm install
pnpm dev      # web app at http://localhost:5173
pnpm test     # core library tests
pnpm build    # production build (output: packages/web/dist)
```

```
packages/core       — @firm-author/core library
packages/ui         — shared React UI
packages/web        — browser app
packages/word-addin — Word task pane add-in (builds into web/public/addin)
```

## Privacy

All processing runs locally in the browser using JSZip and raw XML attribute replacement. Documents are not sent to a server.

## Disclaimer

Firm Author is a document tooling utility, not legal advice. Always open the cleaned document in Word Desktop and verify the Review pane and comment balloons before sending externally. You remain responsible for checking that anonymisation meets your firm's requirements.

## License

MIT — see [LICENSE](./LICENSE).
