# Issue 10-06 — Add .env.example Documentation

**Plan:** 10 — Codebase Cleanup
**Phase:** 1 (Stability)
**Labels:** `documentation`, `cleanup`, `plan-10`
**Depends on:** —
**Blocks:** —

---

## Problem

The project uses environment variables (Firebase config, Google AI API key) but there is no `.env.example` file. New developers have no idea what to put in `.env.local`.

## Goal

Create `.env.example` at the project root documenting all environment variables.

## Acceptance Criteria

- [ ] `.env.example` is created at the project root.
- [ ] It documents all environment variables currently read anywhere in `src/` or config files.
- [ ] Variables that are required for a feature to work are marked as required in a comment.
- [ ] Variables for unused/removed features (from 10-04) are NOT included.
- [ ] `.env.local` is confirmed to be in `.gitignore` (should be there by default in Next.js, but verify).
- [ ] `.env.example` itself is committed to git (it contains no secrets — only placeholder values).

## Implementation Notes

Search for `process.env.` to find all referenced variables:
```bash
grep -r "process\.env\." src/ --include="*.ts" --include="*.tsx"
```

Template:
```env
# ========== LightBird Environment Variables ==========
# Copy this file to .env.local and fill in real values.

# Google AI (for future AI features — optional)
GOOGLE_GENAI_API_KEY=

# Firebase (for future cloud sync — optional)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Files

| Action | Path |
|--------|------|
| Create | `.env.example` |
| Verify | `.gitignore` contains `.env.local` |
