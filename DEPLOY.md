# Deployment checklist (Vercel)

Use this for the internal pilot deploy after Word Desktop QA passes on `test_comment_track.docx`.

## Pre-deploy

- [ ] `pnpm test` — all tests pass (including `test_comment_track.docx`)
- [ ] `pnpm build` — production build succeeds
- [ ] Manual QA on real fixture per [QA.md](./QA.md)
- [ ] Review audit JSON/HTML output with a colleague

## GitHub + Vercel auto-deploy

1. Push the repo to GitHub (public: `github.com/thepranky/firm-author` or your org).
2. In [Vercel project settings](https://vercel.com/theprankys-projects/firm-author/settings/git), connect the GitHub repository.
3. Each push to `main` triggers a production deploy automatically.

Manual deploy from local:

```bash
npx vercel deploy --prod --yes
```

## Post-deploy smoke test

- [ ] Open the deployed URL
- [ ] Upload `test_comment_track.docx`
- [ ] Anonymise selected authors
- [ ] Download cleaned `.docx` and audit files
- [ ] Open cleaned document in Word Desktop — Review pane shows replacement author

## Optional: custom domain

- Add an internal subdomain (e.g. `author.yourfirm.com`) in Vercel project settings.
- Restrict access via Vercel password protection or firm SSO if required.

## Privacy note for users

Add to internal comms when sharing the link:

> Documents are processed entirely in your browser. Nothing is uploaded to our servers.

## Rollback

Vercel keeps deployment history — promote a previous deployment from the dashboard if a release regresses.
