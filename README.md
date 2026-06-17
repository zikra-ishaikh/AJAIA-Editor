# Ajaia Editor ✦

A premium, glassmorphic markdown and text document editor built on Next.js 16, TipTap, and Supabase.

---

## ✨ Core Highlights

- **Interactive WYSIWYG Editing**: Powered by TipTap, supporting standard Markdown shortcuts (Headings, Code Blocks, Ordered/Unordered Lists, Blockquotes) styled with custom Tailwind prose elements.
- **Instant Cloud Autosave & Sync**: Secure, debounced real-time state syncing with Supabase PostgreSQL, notifying you immediately when changes are stored.
- **Granular Email Sharing**: Securely share documents with other registered users via their email addresses. Access permissions are strictly protected on the database level.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase project (Auth & PostgreSQL database enabled)

### Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ajaia-editor.git
   cd ajaia-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory (or use the existing one) and configure your Supabase project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Initialize Database Schema**
   Run the following script in your **Supabase Dashboard SQL Editor** to bootstrap the required tables and security rules:
   ```sql
    -- Create documents table
    create table if not exists public.documents (
      id uuid default gen_random_uuid() primary key,
      title text not null default 'Untitled Document',
      content jsonb not null default '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb,
      user_id uuid default auth.uid() references auth.users(id) on delete cascade,
      created_at timestamp with time zone default now() not null,
      updated_at timestamp with time zone default now() not null
    );

    -- Create document_shares table (includes permission and owner_id to prevent RLS recursion)
    create table if not exists public.document_shares (
      id uuid default gen_random_uuid() primary key,
      document_id uuid references public.documents(id) on delete cascade not null,
      shared_with_email text not null,
      permission text not null default 'editor' check (permission in ('viewer', 'editor')),
      owner_id uuid default auth.uid() references auth.users(id) on delete cascade not null,
      created_at timestamp with time zone default now() not null,
      unique (document_id, shared_with_email)
    );

    -- Enable RLS
    alter table public.documents enable row level security;
    alter table public.document_shares enable row level security;

    -- Policies for documents
    create policy "Users can create their own documents"
      on public.documents for insert
      with check (auth.uid() = user_id);

    create policy "Users can view own or shared documents"
      on public.documents for select
      using (
        auth.uid() = user_id 
        or 
        exists (
          select 1 from public.document_shares
          where document_shares.document_id = documents.id
          and lower(document_shares.shared_with_email) = lower(auth.jwt() ->> 'email')
        )
      );

    create policy "Users can update own or editor documents"
      on public.documents for update
      using (
        auth.uid() = user_id
        or 
        exists (
          select 1 from public.document_shares
          where document_shares.document_id = documents.id
          and lower(document_shares.shared_with_email) = lower(auth.jwt() ->> 'email')
          and document_shares.permission = 'editor'
        )
      );

    create policy "Users can delete own documents"
      on public.documents for delete
      using (auth.uid() = user_id);

    -- Policies for document_shares (Recursion-free)
    create policy "Owners or shared users can view document shares"
      on public.document_shares for select
      using (
        auth.uid() = owner_id
        or 
        lower(shared_with_email) = lower(auth.jwt() ->> 'email')
      );

    create policy "Owners can insert document shares"
      on public.document_shares for insert
      with check (
        auth.uid() = owner_id
        and exists (
          select 1 from public.documents
          where documents.id = document_shares.document_id
          and documents.user_id = auth.uid()
        )
      );

    create policy "Owners can delete document shares"
      on public.document_shares for delete
      using (auth.uid() = owner_id);
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Live Deployment
- **Deployment URL**: [Live Demo on Vercel](https://ajaia-editor.vercel.app)

---

## 🏗️ Architecture Note
- **Supabase**: Chosen for speed and security. It handles user authentication out-of-the-box and leverages Row-Level Security (RLS) directly on PostgreSQL. This allows us to make secure, authenticated database operations client-side without spinning up a complex custom API layer.
- **TipTap**: Selected for its headless design and modular extensibility. Because it does not come with pre-designed UI elements, we were able to build a custom toolbar and format the editor layout cleanly to match our dark glassmorphic styling preferences.

---

## 🤖 AI Workflow Note
> *I used Antigravity to structure the database RLS policies for email-based sharing. When compiling for Next.js 16, we encountered a TypeScript error where the `@tiptap/react` API type-checks setContent second parameter as an options object `{ emitUpdate: false }` rather than a boolean. We resolved this via type-safe refactoring before running build checks.*
