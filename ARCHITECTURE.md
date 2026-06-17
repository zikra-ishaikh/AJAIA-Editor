# Architecture Note

This document outlines the architectural decisions and technology choices made for the **Ajaia Editor** application.

---

## 1. Technology Stack Selection

### Frontend & Routing: Next.js 16 (App Router)
- **Why**: Next.js 16 provides robust client-side rendering (critical for interactive components like rich text editors) alongside React Server Components. The App Router handles routing dynamically and enables fast, client-side page transitions.

### WYSIWYG Editor: TipTap
- **Why**: TipTap is a headless wrapper around ProseMirror. Because it is headless, it does not enforce any styling or markup decisions, allowing us to build a custom toolbar and style the editor using Tailwind CSS. It outputs clean JSON structures, making document persistence and parsing straightforward.

### Styling: Tailwind CSS
- **Why**: Allows rapid styling of the glassmorphic design and custom editor prose. Custom styles were integrated in `app/globals.css` to handle TipTap elements (headings, bullet points, blockquotes, code blocks).

### Backend, Auth & Database: Supabase
- **Why**: Using Supabase allowed us to leverage PostgreSQL and Row-Level Security (RLS) directly from the client. It eliminated the need for a dedicated custom API layer, meaning we could fetch and synchronize documents securely directly from the React components.

---

## 2. Core Feature Implementations

### Document State & Debounced Autosave
- When the user edits document titles or body content, the changes update the local React state instantly for low latency. 
- A debouncer delay (1.2s) intercepts these state changes and pushes updates to the Supabase database. This limits API network calls while ensuring changes are preserved on refresh.

### Markdown Parsing Engine
- A custom parser (`lib/markdownParser.ts`) parses plain text and markdown strings (`.txt` and `.md`) into TipTap JSON nodes. It extracts structural components like list nesting, headings, blockquotes, and code blocks, making uploads instant and native.

### Role-Based Access Control (RLS)
- We implemented **Viewer** and **Editor** permission roles.
- Rather than running heavy queries that inspect document ownership transitively (which causes PostgreSQL RLS infinite loops), we added an `owner_id` column to the `document_shares` table. The access rules are resolved on the database level:
  - **SELECT**: Access is allowed if the user is the owner or their email matches a share record.
  - **UPDATE**: Updates are only allowed if the user is the owner or holds an `'editor'` role share.
  - **DELETE**: Restricted exclusively to the document owner.
- The frontend respects these rules by disabling editing controls and disabling the TipTap editor instance (`editable={false}`) when a Viewer role is detected.
