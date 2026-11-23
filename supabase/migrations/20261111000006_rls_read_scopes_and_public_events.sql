GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.events, public.colleges, public.categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.event_bookmarks TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.moments TO authenticated;
GRANT SELECT ON TABLE public.moments, public.moment_likes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.moment_likes TO authenticated;
GRANT SELECT ON TABLE public.event_tickets, public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.event_registrations TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.events TO authenticated;

REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, email, role, college_id, college_name, interests, avatar_url, updated_at)
    ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published and approved events visible to all" ON public.events;
CREATE POLICY "Published and approved events visible to all"
    ON public.events FOR SELECT
    USING (
        status IN ('approved', 'published')
        OR organizer_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Organizers can submit own events" ON public.events;
CREATE POLICY "Organizers can submit own events"
    ON public.events FOR INSERT
    WITH CHECK (
        organizer_id = auth.uid()
        AND status = 'pending_approval'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND review_note IS NULL
        AND registrations_count = 0
        AND is_featured = FALSE
        AND public.current_user_role() = 'ORGANIZER'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.college_id IS NOT NULL
              AND profiles.college_id = events.college_id
        )
    );

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile and admins can read all" ON public.profiles;
CREATE POLICY "Users can read own profile and admins can read all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE OR REPLACE VIEW public.moment_profiles AS
    SELECT id, full_name, college_name, avatar_url
    FROM public.profiles;

GRANT SELECT ON public.moment_profiles TO anon, authenticated;
