# Manual QA checklist (Word Desktop)

Run after `pnpm dev`, upload a fixture from `packages/core/__tests__/fixtures/word-desktop/`, anonymise all authors, and verify:

- [ ] Cleaned `.docx` opens in Word Desktop without repair prompts
- [ ] **Review pane / comment balloons show replacement author** (e.g. "Law Firm LLP")
- [ ] Comment initials show replacement initials (e.g. "LFL") where applicable
- [ ] Tracked changes still visible; body text unchanged
- [ ] Modern comment replies still threaded (extension parts untouched)
- [ ] Integrity checks pass in audit report (JSON/HTML)
- [ ] Unclassified `w:author` hits (if any) listed in audit, not silently counted

## Primary fixture (recommended)

| File | Purpose |
|------|---------|
| **`test_comment_track.docx`** | Real Word Desktop document — **local only** (gitignored; add on your machine) |

Automated tests in `testCommentTrack.test.ts` run when this file is present locally.

Synthetic fixtures in the same folder are used in CI.

## Additional fixtures

| File | Purpose |
|------|---------|
| `multi-author-tracked.docx` | Synthetic — multi-author tracked changes |
| `multi-author-comments.docx` | Synthetic — comments by multiple authors |
| `modern-comments-replies.docx` | Synthetic — modern comment extension parts |
| `header-footer-footnote.docx` | Synthetic — header/footnote revisions |
| `word-resaved.docx` | Synthetic — re-save regression |

Add more real Word-created documents to `word-desktop/` as you find edge cases.

## Sign-off

Before internal pilot deploy, complete this checklist on **`test_comment_track.docx`** and note the date + tester in your team channel. See [DEPLOY.md](./DEPLOY.md) for Vercel steps.
