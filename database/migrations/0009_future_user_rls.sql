-- Future authenticated personal workspace.
-- Task 001 does not implement accounts, uploads, or brokerage connectivity.
-- Tables are created so later work can enable RLS without redesigning keys.

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_profiles IS
    'Future auth subject. When Supabase Auth is introduced, id should match auth.users.id.';

CREATE TABLE saved_professionals (
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, person_id)
);

CREATE TABLE saved_firms (
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, firm_id)
);

CREATE TABLE saved_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    tool_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    byte_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comparison_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity_kind TEXT NOT NULL,
    entity_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE regulatory_watch_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    entity_kind TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, entity_kind, entity_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_watch_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies are placeholders. They become active once auth.uid() exists.
-- Least privilege: users read/write only their own rows.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'uid'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    ) THEN
        CREATE POLICY user_profiles_self ON user_profiles
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());
        CREATE POLICY saved_professionals_self ON saved_professionals
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY saved_firms_self ON saved_firms
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY saved_portfolios_self ON saved_portfolios
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY saved_scenarios_self ON saved_scenarios
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY uploaded_documents_self ON uploaded_documents
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY comparison_lists_self ON comparison_lists
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY regulatory_watch_self ON regulatory_watch_subscriptions
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END
$$;

INSERT INTO schema_migrations (filename)
VALUES ('0009_future_user_rls.sql')
ON CONFLICT (filename) DO NOTHING;
