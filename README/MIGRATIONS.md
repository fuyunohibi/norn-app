# Supabase migrations (NORN mobile)

Migration SQL files: `mobile/supabase/migrations/` (applied in filename order).

Filenames must use a **single numeric prefix** so the CLI records a unique version per file. The pattern is `YYYYMMDDHHmmss_description.sql` (14 digits, then `_`, then the name). Names like `20250910_000001_…` are invalid: the CLI parses the version as only `20250910`, so every migration on that date collides in `supabase_migrations.schema_migrations`.

Install the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) if you do not have it.

From the **`mobile`** directory (where `supabase/config.toml` lives), run:

```bash
cd mobile

supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Replace `YOUR_PROJECT_REF` with the **Reference ID** from Supabase (**Project Settings → General**).  
`link` is only needed once per machine; `db push` applies pending migrations.

---

## `db push` fails: `policy "…" already exists`

The remote database **already has** tables and policies (e.g. from an earlier SQL Editor setup), but **migration history** on the server is empty. Then the CLI tries to run `20250910000000_initial_schema.sql` again and hits duplicate policies.

**Quick fix (one new migration only):** Supabase **SQL Editor** → open the file you need under `migrations/` (e.g. `20260404161000_fix_get_my_profile_column_types.sql`) → paste → **Run**.

**Fix history so `db push` works later:** from `mobile/`, try marking local migrations as already applied (interactive “repair all” when you pass no versions):

```bash
cd mobile
supabase migration repair --status applied --linked
```

If the CLI asks to repair the whole history to match local files, confirm **yes**. Details: [supabase migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair).

If repair still errors, keep using the **SQL Editor** for new files until migration filenames use the CLI’s usual `YYYYMMDDHHmmss_description.sql` pattern (single timestamp prefix per file).

---

## `db push` fails: `Remote migration versions not found in local migrations directory`

The linked database has migration history rows whose **version strings do not match any local filename** (common after renaming files from `20250910_000000_…` to `20250910000000_…`). The CLI refuses to push until that orphan remote entry is removed.

From **`mobile/`**, mark the stale version as reverted (deletes that row from `supabase_migrations.schema_migrations`). Use the version the CLI prints in its hint (often `20250910`):

```bash
cd mobile
npx supabase migration repair 20250910 --status reverted --linked
```

Repeat for any other versions the error names (for example `20251109` if it appears). Then:

```bash
npx supabase db push
```

**Alternative:** same effect in **SQL Editor**:  
`DELETE FROM supabase_migrations.schema_migrations WHERE version = '20250910';`  
(use the exact `version` values your remote has).

---

## `db push` fails: `duplicate key … schema_migrations_pkey` / `version)=(20250910)`

That means two **local** migration files shared the same parsed version (old naming `20250910_000000_…`, `20250910_000001_…`). This repo now uses unique 14-digit prefixes, so new clones should not hit this.

If you still have a **single** stale remote row `20250910` after fixing filenames, use the **Remote migration versions not found** repair steps above instead of pushing twice with conflicting names.

---

For more context, see `README/DATABASE_SETUP.md` and [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
