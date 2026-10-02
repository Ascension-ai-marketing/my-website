# Findings

Research, discoveries, and constraints. Newest first.

## 2026-10-02: Starting environment

- Project root is `~/Desktop/claude/Projects/My websiite/`. The parent `~/Desktop/claude/` holds other unrelated projects, each with its own CLAUDE.md.
- The project root is a local git repository (initialized 2026-10-02, branch `main`). Its remote `origin` is the private GitHub repository https://github.com/Ascension-ai-marketing/my-website.
- Pushing over SSH fails on this machine: the local key `~/.ssh/id_ed25519` is not accepted by GitHub (`Permission denied (publickey)`). The remote uses HTTPS instead, with a repo-local credential helper that reuses the GitHub CLI sign-in.
- Connectors already attached to this Claude session that may matter for Phase L, depending on the Blueprint: Gmail, Google Calendar, Google Drive, Notion, Supabase, Vercel, Wix, Figma, Canva, QuickBooks, Shopify, Firecrawl. None have been tested for this project.
