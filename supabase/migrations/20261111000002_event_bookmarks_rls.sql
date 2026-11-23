ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.event_bookmarks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.event_bookmarks TO authenticated;
GRANT SELECT ON TABLE public.events, public.colleges, public.categories TO authenticated;

DO $$
DECLARE
    existing_policy RECORD;
BEGIN
    FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_bookmarks'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.event_bookmarks', existing_policy.policyname);
    END LOOP;
END;
$$;

CREATE POLICY "Users can read own event bookmarks"
    ON public.event_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event bookmarks"
    ON public.event_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event bookmarks"
    ON public.event_bookmarks FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE public.event_bookmarks
    ALTER COLUMN user_id SET DEFAULT auth.uid();
