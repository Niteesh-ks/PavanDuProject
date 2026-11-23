-- Secure role authorization and canonical organizer event review.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.events, public.colleges, public.categories, public.profiles TO anon, authenticated;
GRANT SELECT ON public.moments, public.moment_likes TO anon, authenticated;
GRANT INSERT, UPDATE ON public.events TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.event_bookmarks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.moments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.moment_likes TO authenticated;
GRANT SELECT, UPDATE ON public.event_registrations TO authenticated;
GRANT SELECT ON public.event_tickets, public.payments TO authenticated;
REVOKE UPDATE ON public.moments FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.event_registrations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments, public.event_tickets FROM anon, authenticated;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS submission_key TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE public.moments
    ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
    ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'pending_approval', 'changes_requested', 'approved', 'rejected', 'published', 'cancelled', 'completed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_organizer_submission_key
    ON public.events (organizer_id, submission_key)
    WHERE submission_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_approval_history_event
    ON public.event_approval_history (event_id, created_at DESC);

ALTER TABLE public.event_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile (excluding role)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile including roles" ON public.profiles;
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users can update own profile without changing role" ON public.profiles;
CREATE POLICY "Users can update own profile without changing role"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = public.current_user_role()
    );
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_untrusted_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only an authorized administrator can change profile roles'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_untrusted_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_untrusted_profile_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_untrusted_profile_role_change();

DROP POLICY IF EXISTS "Organizers can create events" ON public.events;
DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage any event" ON public.events;
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
    );
DROP POLICY IF EXISTS "Organizers can update own event content" ON public.events;
CREATE POLICY "Organizers can update own event content"
    ON public.events FOR UPDATE
    USING (
        organizer_id = auth.uid()
        AND public.current_user_role() = 'ORGANIZER'
    )
    WITH CHECK (
        organizer_id = auth.uid()
        AND public.current_user_role() = 'ORGANIZER'
    );
DROP POLICY IF EXISTS "Admins can review and manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can review events" ON public.events;
CREATE POLICY "Admins can review events"
    ON public.events FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Event approval history visible to participants" ON public.event_approval_history;
DROP POLICY IF EXISTS "Admins can record event decisions" ON public.event_approval_history;
DROP POLICY IF EXISTS "Event approval history visible to participants" ON public.event_approval_history;
CREATE POLICY "Event approval history visible to participants"
    ON public.event_approval_history FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (SELECT 1 FROM public.events WHERE events.id = event_approval_history.event_id AND events.organizer_id = auth.uid())
    );
DROP POLICY IF EXISTS "Admins can record event decisions" ON public.event_approval_history;
CREATE POLICY "Admins can record event decisions"
    ON public.event_approval_history FOR INSERT
    WITH CHECK (public.is_admin() AND reviewer_id = auth.uid());
GRANT SELECT, INSERT ON public.event_approval_history TO authenticated;

DROP POLICY IF EXISTS "Users can create moments" ON public.moments;
CREATE POLICY "Users can create moments"
    ON public.moments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'published'
        AND likes_count = 0
        AND cardinality(image_urls) > 0
        AND storage_path LIKE auth.uid()::TEXT || '/%'
    );

CREATE OR REPLACE FUNCTION public.prevent_organizer_event_review_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
        RAISE EXCEPTION 'Event ownership cannot be changed'
            USING ERRCODE = '42501';
    END IF;
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin()
       AND (
           NEW.registrations_count IS DISTINCT FROM OLD.registrations_count
           OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
       ) THEN
        RAISE EXCEPTION 'Only administrators can change event metrics or featured status'
            USING ERRCODE = '42501';
    END IF;
    IF auth.uid() IS NOT NULL
       AND (
           NEW.status IS DISTINCT FROM OLD.status
           OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
           OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
           OR NEW.review_note IS DISTINCT FROM OLD.review_note
       )
       AND (
           NOT public.is_admin()
           OR current_setting('app.event_review_rpc', true) IS DISTINCT FROM 'true'
       ) THEN
        RAISE EXCEPTION 'Only the event review operation can change review status'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_organizer_event_review_changes ON public.events;
CREATE TRIGGER prevent_organizer_event_review_changes
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_organizer_event_review_changes();

CREATE OR REPLACE FUNCTION public.review_event(p_event_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS public.events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    reviewed_event public.events;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator role required' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('approved', 'rejected', 'changes_requested') THEN
        RAISE EXCEPTION 'Invalid event review decision' USING ERRCODE = '22023';
    END IF;

    PERFORM set_config('app.event_review_rpc', 'true', true);
    UPDATE public.events
       SET status = p_status,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           review_note = p_note,
           updated_at = now()
     WHERE id = p_event_id
       AND status = 'pending_approval'
     RETURNING * INTO reviewed_event;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending event not found' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.event_approval_history (event_id, reviewer_id, decision, note)
    VALUES (reviewed_event.id, auth.uid(), p_status, p_note);

    RETURN reviewed_event;
END;
$$;

REVOKE ALL ON FUNCTION public.review_event(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_event(UUID, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Users can register themselves" ON public.event_registrations;
DROP POLICY IF EXISTS "Service and users can create payment orders" ON public.payments;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_created_order_per_registration
    ON public.payments (registration_id)
    WHERE status = 'created';

CREATE OR REPLACE FUNCTION public.prevent_registration_payment_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin()
       AND (
           NEW.user_id IS DISTINCT FROM OLD.user_id
           OR NEW.event_id IS DISTINCT FROM OLD.event_id
           OR NEW.registration_number IS DISTINCT FROM OLD.registration_number
           OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
           OR NEW.fee_paid IS DISTINCT FROM OLD.fee_paid
           OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled')
       ) THEN
        RAISE EXCEPTION 'Registration identity and payment state are managed by the trusted registration service'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_registration_payment_tampering ON public.event_registrations;
CREATE TRIGGER prevent_registration_payment_tampering
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_registration_payment_tampering();

CREATE OR REPLACE FUNCTION public.finalize_event_registration(
    p_user_id UUID,
    p_event_id UUID,
    p_order_id TEXT,
    p_payment_id TEXT,
    p_payment_signature TEXT,
    p_is_free BOOLEAN,
    p_ticket_code TEXT,
    p_secure_token TEXT,
    p_qr_payload TEXT
)
RETURNS public.event_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_row public.events;
    registration_row public.event_registrations;
    payment_row public.payments;
    ticket_row public.event_tickets;
    confirmed_count INTEGER;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'Trusted registration service required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO event_row
      FROM public.events
     WHERE id = p_event_id
       AND status IN ('approved', 'published')
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Published event not found' USING ERRCODE = 'P0002';
    END IF;

    IF p_is_free AND event_row.is_paid THEN
        RAISE EXCEPTION 'Paid event requires verified payment' USING ERRCODE = '22023';
    ELSIF NOT p_is_free AND NOT event_row.is_paid THEN
        RAISE EXCEPTION 'Free event must use free registration' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO registration_row
      FROM public.event_registrations
     WHERE event_id = p_event_id AND user_id = p_user_id
     FOR UPDATE;

    IF FOUND THEN
        SELECT * INTO ticket_row
          FROM public.event_tickets
         WHERE registration_id = registration_row.id;
        IF FOUND THEN
            RETURN ticket_row;
        END IF;
    ELSE
        INSERT INTO public.event_registrations (
            event_id, user_id, registration_number, status, payment_status, fee_paid
        ) VALUES (
            p_event_id, p_user_id, 'REG-' || p_ticket_code,
            CASE WHEN p_is_free THEN 'confirmed' ELSE 'pending' END,
            CASE WHEN p_is_free THEN 'free' ELSE 'pending' END,
            CASE WHEN p_is_free THEN 0 ELSE event_row.fee_inr END
        )
        RETURNING * INTO registration_row;
    END IF;

    IF NOT p_is_free THEN
        SELECT * INTO payment_row
          FROM public.payments
         WHERE order_id = p_order_id
           AND user_id = p_user_id
           AND event_id = p_event_id
           AND registration_id = registration_row.id
         FOR UPDATE;
        IF NOT FOUND OR payment_row.status <> 'created' OR payment_row.amount_inr <> event_row.fee_inr THEN
            RAISE EXCEPTION 'Valid payment order was not found' USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT COUNT(*) INTO confirmed_count
      FROM public.event_registrations
     WHERE event_id = p_event_id AND status = 'confirmed';
    IF confirmed_count > event_row.max_capacity
       OR (registration_row.status <> 'confirmed' AND confirmed_count >= event_row.max_capacity) THEN
        RAISE EXCEPTION 'Event capacity has been reached' USING ERRCODE = '23514';
    END IF;

    IF p_is_free THEN
        UPDATE public.event_registrations
           SET status = 'confirmed', payment_status = 'free', fee_paid = 0, updated_at = now()
         WHERE id = registration_row.id;
    ELSE
        UPDATE public.payments
           SET status = 'captured',
               payment_id = p_payment_id,
               razorpay_signature = p_payment_signature,
               updated_at = now()
         WHERE id = payment_row.id;
        UPDATE public.event_registrations
           SET status = 'confirmed', payment_status = 'paid', fee_paid = payment_row.amount_inr, updated_at = now()
         WHERE id = registration_row.id;
    END IF;

    INSERT INTO public.event_tickets (
        ticket_code, secure_token, registration_id, event_id, user_id, qr_payload, status
    ) VALUES (
        p_ticket_code, p_secure_token, registration_row.id, p_event_id, p_user_id, p_qr_payload, 'active'
    )
    RETURNING * INTO ticket_row;

    RETURN ticket_row;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_event_registration(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_event_registration(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.checkin_event_ticket(
    p_ticket_id UUID,
    p_scanner_id UUID,
    p_device_info TEXT
)
RETURNS public.event_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_ticket public.event_tickets;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'Trusted check-in service required' USING ERRCODE = '42501';
    END IF;

    UPDATE public.event_tickets
       SET is_used = TRUE,
           status = 'used',
           used_at = now(),
           checked_in_by = p_scanner_id
     WHERE id = p_ticket_id
       AND is_used = FALSE
       AND status = 'active'
     RETURNING * INTO updated_ticket;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket already used or inactive' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.ticket_checkins (
        ticket_id, event_id, scanned_by, scanned_at, scan_result, device_info
    ) VALUES (
        updated_ticket.id,
        updated_ticket.event_id,
        p_scanner_id,
        updated_ticket.used_at,
        'approved',
        p_device_info
    );

    RETURN updated_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.checkin_event_ticket(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_event_ticket(UUID, UUID, TEXT) TO service_role;

DROP POLICY IF EXISTS "Authenticated users can upload moments" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own moment images" ON storage.objects;
CREATE POLICY "Users can manage own moment images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
    WITH CHECK (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own event covers" ON storage.objects;
CREATE POLICY "Users can manage own event covers"
    ON storage.objects FOR ALL
    USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
    WITH CHECK (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

INSERT INTO storage.buckets (id, name, public)
VALUES ('moments', 'moments', true), ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
