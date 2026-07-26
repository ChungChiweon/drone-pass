create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'teacher',
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_packs (
  id uuid primary key default gen_random_uuid(),
  pack_id text unique not null,
  schema_version text not null,
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_pack_active (
  singleton_key text primary key check (singleton_key = 'ACTIVE'),
  pack_id text not null references public.knowledge_packs(pack_id),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_review_metadata (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.knowledge_packs(pack_id),
  fact_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (pack_id, fact_id)
);

create table if not exists public.knowledge_review_audit (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.knowledge_packs(pack_id),
  fact_id text not null,
  previous_status text,
  next_status text,
  action text not null,
  approval_mode text check (approval_mode is null or approval_mode in ('single', 'bulk', 'import', 'migration')),
  reviewed_by uuid references auth.users(id) on delete set null,
  legacy_reviewed_by text,
  memo text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_review_metadata_pack_idx
  on public.knowledge_review_metadata (pack_id);
create index if not exists knowledge_review_audit_pack_fact_created_idx
  on public.knowledge_review_audit (pack_id, fact_id, created_at);

-- Existing installations may have profiles without an auth-user provisioning trigger.
-- This trigger is deliberately defensive and never grants admin automatically.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'teacher')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_profile();

revoke all on function public.handle_new_profile() from public, anon, authenticated;

create or replace function public.is_knowledge_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where id = auth.uid() and role::text = 'admin'
    );
$$;

revoke all on function public.is_knowledge_admin() from public;
revoke all on function public.is_knowledge_admin() from anon;
grant execute on function public.is_knowledge_admin() to authenticated;

alter table public.knowledge_packs enable row level security;
alter table public.knowledge_pack_active enable row level security;
alter table public.knowledge_review_metadata enable row level security;
alter table public.knowledge_review_audit enable row level security;

create policy "knowledge_packs_admin_select" on public.knowledge_packs
  for select to authenticated using (public.is_knowledge_admin());
create policy "knowledge_packs_admin_insert" on public.knowledge_packs
  for insert to authenticated with check (public.is_knowledge_admin());
create policy "knowledge_packs_admin_update" on public.knowledge_packs
  for update to authenticated using (public.is_knowledge_admin())
  with check (public.is_knowledge_admin());

create policy "knowledge_pack_active_admin_select" on public.knowledge_pack_active
  for select to authenticated using (public.is_knowledge_admin());
create policy "knowledge_pack_active_admin_insert" on public.knowledge_pack_active
  for insert to authenticated with check (public.is_knowledge_admin());
create policy "knowledge_pack_active_admin_update" on public.knowledge_pack_active
  for update to authenticated using (public.is_knowledge_admin())
  with check (public.is_knowledge_admin());

create policy "knowledge_review_metadata_admin_select" on public.knowledge_review_metadata
  for select to authenticated using (public.is_knowledge_admin());
create policy "knowledge_review_metadata_admin_insert" on public.knowledge_review_metadata
  for insert to authenticated with check (public.is_knowledge_admin());
create policy "knowledge_review_metadata_admin_update" on public.knowledge_review_metadata
  for update to authenticated using (public.is_knowledge_admin())
  with check (public.is_knowledge_admin());

create policy "knowledge_review_audit_admin_select" on public.knowledge_review_audit
  for select to authenticated using (public.is_knowledge_admin());
create policy "knowledge_review_audit_admin_insert" on public.knowledge_review_audit
  for insert to authenticated with check (public.is_knowledge_admin());

create or replace function public.import_knowledge_pack_and_activate(
  p_pack_id text,
  p_schema_version text,
  p_payload jsonb,
  p_review_metadata jsonb default '{}'::jsonb,
  p_audit jsonb default '[]'::jsonb,
  p_overwrite boolean default false,
  p_approval_mode text default 'import'
)
returns public.knowledge_packs
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_pack public.knowledge_packs;
  v_entry record;
  v_audit jsonb;
  v_reviewed_by uuid;
begin
  if not public.is_knowledge_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_pack_id is null or p_pack_id = '' then raise exception 'PACK_ID_REQUIRED'; end if;
  if p_approval_mode not in ('import', 'migration') then raise exception 'INVALID_APPROVAL_MODE'; end if;
  if jsonb_typeof(p_payload -> 'atomicFacts') <> 'array' then raise exception 'INVALID_PACK_PAYLOAD'; end if;

  if exists (select 1 from public.knowledge_packs where pack_id = p_pack_id) and not p_overwrite then
    raise exception 'PACK_EXISTS';
  end if;

  insert into public.knowledge_packs (pack_id, schema_version, payload, created_by, updated_by)
  values (p_pack_id, p_schema_version, p_payload, auth.uid(), auth.uid())
  on conflict (pack_id) do update
    set schema_version = excluded.schema_version,
        payload = excluded.payload,
        updated_by = auth.uid(),
        updated_at = now()
  returning * into v_pack;

  insert into public.knowledge_pack_active (singleton_key, pack_id, updated_by)
  values ('ACTIVE', p_pack_id, auth.uid())
  on conflict (singleton_key) do update
    set pack_id = excluded.pack_id, updated_by = auth.uid(), updated_at = now();

  if jsonb_typeof(p_review_metadata) = 'object' then
    for v_entry in select * from jsonb_each(p_review_metadata)
    loop
      insert into public.knowledge_review_metadata (pack_id, fact_id, metadata, updated_by)
      values (p_pack_id, v_entry.key, v_entry.value, auth.uid())
      on conflict (pack_id, fact_id) do update
        set metadata = excluded.metadata, updated_by = auth.uid(), updated_at = now();
    end loop;
  end if;

  if jsonb_typeof(p_audit) = 'array' then
    for v_audit in select value from jsonb_array_elements(p_audit)
    loop
      begin
        v_reviewed_by := nullif(v_audit ->> 'reviewedBy', '')::uuid;
      exception when invalid_text_representation then
        v_reviewed_by := null;
      end;
      insert into public.knowledge_review_audit (
        pack_id, fact_id, previous_status, next_status, action, approval_mode,
        reviewed_by, legacy_reviewed_by, memo, created_at
      ) values (
        p_pack_id, v_audit ->> 'factId', v_audit ->> 'previousStatus',
        v_audit ->> 'nextStatus', v_audit ->> 'action', p_approval_mode,
        v_reviewed_by, v_audit ->> 'reviewedBy', coalesce(v_audit ->> 'memo', ''),
        coalesce((v_audit ->> 'timestamp')::timestamptz, now())
      );
    end loop;
  end if;

  return v_pack;
end;
$$;

create or replace function public.update_atomic_fact_review(
  p_pack_id text,
  p_fact_ids text[],
  p_action text,
  p_next_status text,
  p_approval_mode text,
  p_memo text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns public.knowledge_packs
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_pack public.knowledge_packs;
  v_fact jsonb;
  v_previous_status text;
  v_next_status text;
  v_fact_id text;
begin
  if not public.is_knowledge_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(array_length(p_fact_ids, 1), 0) = 0 then raise exception 'FACT_IDS_REQUIRED'; end if;
  if p_approval_mode not in ('single', 'bulk') then raise exception 'INVALID_APPROVAL_MODE'; end if;
  if p_approval_mode = 'single' and array_length(p_fact_ids, 1) <> 1 then raise exception 'SINGLE_REQUIRES_ONE_FACT'; end if;
  if p_action not in ('approve', 'hold', 'revert', 'unhold') then raise exception 'INVALID_ACTION'; end if;

  select * into v_pack from public.knowledge_packs where pack_id = p_pack_id for update;
  if not found then raise exception 'PACK_NOT_FOUND'; end if;

  foreach v_fact_id in array p_fact_ids loop
    select value into v_fact
    from jsonb_array_elements(v_pack.payload -> 'atomicFacts')
    where value ->> 'id' = v_fact_id;
    if v_fact is null then raise exception 'FACT_NOT_FOUND: %', v_fact_id; end if;
    v_previous_status := v_fact ->> 'status';
    v_next_status := coalesce(p_next_status, v_previous_status);
    if p_action = 'approve' and (v_previous_status <> 'draft' or v_next_status <> 'approved') then
      raise exception 'INVALID_APPROVE_TRANSITION: %', v_fact_id;
    end if;
    if p_action = 'revert' and (v_previous_status <> 'approved' or v_next_status <> 'draft') then
      raise exception 'INVALID_REVERT_TRANSITION: %', v_fact_id;
    end if;
    if p_action in ('hold', 'unhold') and v_next_status <> v_previous_status then
      raise exception 'HOLD_CANNOT_CHANGE_STATUS: %', v_fact_id;
    end if;
  end loop;

  if p_action in ('approve', 'revert') then
    update public.knowledge_packs
    set payload = jsonb_set(
          payload,
          '{atomicFacts}',
          (select jsonb_agg(
            case when value ->> 'id' = any(p_fact_ids)
              then jsonb_set(value, '{status}', to_jsonb(p_next_status), false)
              else value end
          ) from jsonb_array_elements(payload -> 'atomicFacts')),
          false
        ),
        updated_by = auth.uid(),
        updated_at = now()
    where pack_id = p_pack_id
    returning * into v_pack;
  end if;

  foreach v_fact_id in array p_fact_ids loop
    select value ->> 'status' into v_previous_status
    from jsonb_array_elements(v_pack.payload -> 'atomicFacts')
    where value ->> 'id' = v_fact_id;
    if p_action in ('approve', 'revert') then
      v_previous_status := case when p_action = 'approve' then 'draft' else 'approved' end;
      v_next_status := p_next_status;
    else
      v_next_status := v_previous_status;
    end if;

    insert into public.knowledge_review_metadata (pack_id, fact_id, metadata, updated_by)
    values (
      p_pack_id,
      v_fact_id,
      jsonb_set(
        jsonb_set(coalesce(p_metadata -> v_fact_id, '{}'::jsonb), '{reviewedBy}', to_jsonb(auth.uid()::text), true),
        '{reviewedAt}', to_jsonb(now()::text), true
      ),
      auth.uid()
    )
    on conflict (pack_id, fact_id) do update
      set metadata = knowledge_review_metadata.metadata || excluded.metadata,
          updated_by = auth.uid(), updated_at = now();

    insert into public.knowledge_review_audit (
      pack_id, fact_id, previous_status, next_status, action,
      approval_mode, reviewed_by, memo
    ) values (
      p_pack_id, v_fact_id, v_previous_status, v_next_status, p_action,
      p_approval_mode, auth.uid(), coalesce(p_memo, '')
    );
  end loop;

  return v_pack;
end;
$$;

create or replace function public.update_review_checklist(
  p_pack_id text,
  p_fact_id text,
  p_metadata_patch jsonb
)
returns public.knowledge_review_metadata
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_result public.knowledge_review_metadata;
begin
  if not public.is_knowledge_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (
    select 1 from public.knowledge_packs,
      jsonb_array_elements(payload -> 'atomicFacts') fact
    where pack_id = p_pack_id and fact ->> 'id' = p_fact_id
  ) then raise exception 'FACT_NOT_FOUND'; end if;

  insert into public.knowledge_review_metadata (pack_id, fact_id, metadata, updated_by)
  values (p_pack_id, p_fact_id, coalesce(p_metadata_patch, '{}'::jsonb), auth.uid())
  on conflict (pack_id, fact_id) do update
    set metadata = knowledge_review_metadata.metadata || excluded.metadata,
        updated_by = auth.uid(), updated_at = now()
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.import_knowledge_pack_and_activate(text, text, jsonb, jsonb, jsonb, boolean, text) from public, anon;
revoke all on function public.update_atomic_fact_review(text, text[], text, text, text, text, jsonb) from public, anon;
revoke all on function public.update_review_checklist(text, text, jsonb) from public, anon;
grant execute on function public.import_knowledge_pack_and_activate(text, text, jsonb, jsonb, jsonb, boolean, text) to authenticated;
grant execute on function public.update_atomic_fact_review(text, text[], text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_review_checklist(text, text, jsonb) to authenticated;
