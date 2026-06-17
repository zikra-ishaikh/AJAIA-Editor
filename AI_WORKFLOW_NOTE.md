# AI-Native Workflow Note

This note details the role of AI coding tools in the development of **Ajaia Editor**.

---

## 1. AI Tools Utilized
- **Antigravity (Gemini 3.5 Flash)**: Served as the pair programmer for setting up code structures, creating components, and configuring the database schema.

---

## 2. Where AI Speedup Was Material
- **Boilerplate and Routing**: AI generated the Next.js page structure, routing layout, and standard Tailwind UI layout configurations in seconds.
- **Markdown Parsing Logic**: Generating the state-machine parser that converts markdown syntax into TipTap block JSON objects was completed instantly by AI.
- **Jest Unit Test Suite**: Writing edge-case assertions for the parser was automated by AI, allowing immediate verification of parser behaviors.

---

## 3. What Was Changed or Rejected
- **TipTap API Call Type Error**: Next.js 16/TypeScript flagged an error on TipTap's `setContent` second parameter when passed as a raw boolean `setContent(content, false)`. We manually refactored this to match the correct TypeScript options interface of `{ emitUpdate: false }`.
- **RLS Infinite Recursion Loop**: The initial database policies for document viewing checked `document_shares` which in turn checked `documents` SELECT permissions. This created a circular infinite loop in PostgreSQL. We rejected this by adding an `owner_id` column to `document_shares`, enabling circular-query-free RLS checks.
- **Console Error Boundary Overlays**: Next.js development server intercepts all standard `console.error` logs and pops up a full-screen red error overlay. To prevent this from ruining the UX on expected network warnings (e.g. before the database tables are migrated), we replaced these with console warnings (`console.warn`) and integrated database setup warnings directly in the sidebar UI.

---

## 4. Verification and Reliability Methods
- **Automated Tests**: Configured **Jest** and **ts-jest** to run unit assertions on [`tests/markdownParser.test.ts`](file:///c:/Users/Shaibaaz/ajaia-editor/tests/markdownParser.test.ts) to verify parser correctness.
- **Production Compilation**: Proactively ran `npm run build` locally to ensure the Next.js Turbopack compiler, ESLint rules, and TypeScript compilation build without warnings or errors.
- **Manual Role Auditing**: Tested authentication flows using two separate browsers (Chrome and Edge) to verify that a user shared as a Viewer was strictly blocked from editing by both the UI and PostgreSQL RLS constraints.
