# Submission Details

This file lists the deliverables and testing coordinates for the **Ajaia Editor** submission.

---

## 📦 What is Included

1. **Source Code**: Full React, Next.js 16, TipTap editor, and Supabase integration.
2. **`README.md`**: Guide for cloning, package installation, database setup script, and starting the local server.
3. **`ARCHITECTURE.md`**: Architectural breakdown of technology choices, autosave debounce, and database RLS decisions.
4. **`AI_WORKFLOW_NOTE.md`**: Outline of AI usage, code rejections, and test verifications.
5. **`tests/markdownParser.test.ts`**: Jest automated test suite verifying the markdown importer engine.
6. **`video_link.txt`**: A text file containing the URL link to your Loom/YouTube walkthrough video.

---

## 🌐 Live Product Coordinates
- **Deployment URL**: [https://ajaia-editor.vercel.app](https://ajaia-editor.vercel.app) *(Update with your Vercel deployment link)*
- **Test Accounts**:
  - **User A (Owner)**: `user-a@example.com` (Password: `password123`)
  - **User B (Shared)**: `user-b@example.com` (Password: `password123`)

---

## 🛠️ Project Status & Next Steps

### What is working:
- **Full-stack Document Lifecycle**: Creating, renaming, editing, autosaving, and deleting documents.
- **TipTap Rich Text Formatting**: Bold, italic, strikethrough, code highlights, headings, lists, quotes, and undo/redo.
- **Import Engine**: Instant file upload parsing plain text and markdown files into structured editor blocks.
- **Role-based sharing**: Sharing documents via user email addresses as either **Viewers** or **Editors** (enforced on both UI and Database level).

### What is incomplete:
- **Email notifications**: Actual email alerts are currently simulated.

### What we would build next (with an additional 2-4 hours):
1. **Live Collaboration Indicators**: Add cursor presence and indicators using Supabase Realtime Channels.
2. **Export capabilities**: Add an "Export" dropdown allowing users to download documents back into raw Markdown files or PDF.
3. **SMTP email services**: Connect Resend or SendGrid to send actual email notifications when a document is shared.
