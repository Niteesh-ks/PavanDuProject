-- Meet Hub - Complete PostgreSQL Schema & Row Level Security
-- Migration: 20260101000001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. COLLEGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    state TEXT NOT NULL DEFAULT 'Karnataka',
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    color TEXT DEFAULT '#7C3AED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. PROFILES TABLE (Extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ORGANIZER', 'ADMIN')),
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    college_name TEXT,
    interests TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cover_image TEXT,
    registration_deadline TIMESTAMPTZ NOT NULL,
    max_capacity INT NOT NULL DEFAULT 100 CHECK (max_capacity > 0),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee_inr >= 0),
    external_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published', 'cancelled', 'completed')),
    rejection_reason TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    registrations_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. EVENT CATEGORIES (Junction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_categories (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, category_id)
);

-- ============================================================================
-- 6. EVENT REGISTRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free', 'pending', 'paid', 'failed')),
    fee_paid NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, user_id)
);

-- ============================================================================
-- 7. EVENT BOOKMARKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, user_id)
);

-- ============================================================================
-- 8. EVENT IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. PAYMENTS (Razorpay integration records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    payment_id TEXT UNIQUE,
    registration_id UUID REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    razorpay_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. DIGITAL EVENT TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    secure_token TEXT UNIQUE NOT NULL,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    qr_payload TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'used')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. TICKET CHECKINS (Audit log of scans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.event_tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT now(),
    scan_result TEXT NOT NULL CHECK (scan_result IN ('approved', 'already_used', 'invalid')),
    device_info TEXT,
    notes TEXT
);

-- ============================================================================
-- 12. MOMENTS (Community Photo Feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    caption TEXT NOT NULL,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    likes_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'hidden')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 13. MOMENT LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (moment_id, user_id)
);

-- ============================================================================
-- 14. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 15. EMAIL DELIVERY LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'not_configured')),
    provider_response TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 16. EVENT ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 17. SCRAPED EVENT SOURCES & SCRAPED EVENTS (Event Raider)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scraped_event_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    base_url TEXT NOT NULL,
    events_url TEXT NOT NULL,
    selector_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped_at TIMESTAMPTZ,
    status TEXT DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scraped_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.scraped_event_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    college_name TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    venue TEXT,
    registration_url TEXT,
    original_source_url TEXT NOT NULL,
    raw_data JSONB DEFAULT '{}'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'imported')),
    imported_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_id, title, event_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_college_id ON public.events(college_id);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_geo ON public.events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_colleges_geo ON public.colleges(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.event_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_secure_token ON public.event_tickets(secure_token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_moments_event ON public.moments(event_id);
CREATE INDEX IF NOT EXISTS idx_scraped_events_status ON public.scraped_events(review_status);

-- ============================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Automatically handle user profile creation upon Supabase Auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        college_name,
        interests
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'STUDENT', -- default role is ALWAYS STUDENT
        NEW.raw_user_meta_data->>'college_name',
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests', '[]'::jsonb)))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to increment registrations_count on event
CREATE OR REPLACE FUNCTION public.update_event_registrations_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.events SET registrations_count = registrations_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE public.events SET registrations_count = registrations_count + 1 WHERE id = NEW.event_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE public.events SET registrations_count = GREATEST(0, registrations_count - 1) WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE public.events SET registrations_count = GREATEST(0, registrations_count - 1) WHERE id = OLD.event_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_registration_count_change ON public.event_registrations;
CREATE TRIGGER on_registration_count_change
    AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
    FOR EACH ROW EXECUTE FUNCTION public.update_event_registrations_count();

-- Trigger to update moment likes_count
CREATE OR REPLACE FUNCTION public.update_moment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.moments SET likes_count = likes_count + 1 WHERE id = NEW.moment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.moments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.moment_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_moment_like_change ON public.moment_likes;
CREATE TRIGGER on_moment_like_change
    AFTER INSERT OR DELETE ON public.moment_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_moment_likes_count();

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is organizer or admin
CREATE OR REPLACE FUNCTION public.is_organizer_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ORGANIZER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_events ENABLE ROW LEVEL SECURITY;

-- 2. Profiles policies
CREATE POLICY "Public profiles are readable by everyone"
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile (excluding role)"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile including roles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- 3. Colleges & Categories: Read by all, write by admin
CREATE POLICY "Colleges are readable by everyone"
    ON public.colleges FOR SELECT USING (true);

CREATE POLICY "Colleges manageable by admin"
    ON public.colleges FOR ALL USING (public.is_admin());

CREATE POLICY "Categories are readable by everyone"
    ON public.categories FOR SELECT USING (true);

CREATE POLICY "Categories manageable by admin"
    ON public.categories FOR ALL USING (public.is_admin());

-- 4. Events policies
-- Approved and published events are publicly visible
CREATE POLICY "Published and approved events visible to all"
    ON public.events FOR SELECT
    USING (status IN ('approved', 'published', 'completed') OR organizer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Organizers can create events"
    ON public.events FOR INSERT
    WITH CHECK (
        auth.uid() = organizer_id 
        AND public.is_organizer_or_admin()
        AND status IN ('draft', 'pending_approval')
    );

CREATE POLICY "Organizers can update own events"
    ON public.events FOR UPDATE
    USING (organizer_id = auth.uid() OR public.is_admin())
    WITH CHECK (
        (organizer_id = auth.uid() AND (status IN ('draft', 'pending_approval', 'cancelled') OR status = (SELECT status FROM public.events WHERE id = events.id)))
        OR public.is_admin()
    );

CREATE POLICY "Admins can manage any event"
    ON public.events FOR ALL USING (public.is_admin());

-- 5. Event Registrations
CREATE POLICY "Users can view own registrations"
    ON public.event_registrations FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin() OR EXISTS (
        SELECT 1 FROM public.events WHERE events.id = event_registrations.event_id AND events.organizer_id = auth.uid()
    ));

CREATE POLICY "Users can register themselves"
    ON public.event_registrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registration"
    ON public.event_registrations FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 6. Event Bookmarks
CREATE POLICY "Users can manage own bookmarks"
    ON public.event_bookmarks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Event Images
CREATE POLICY "Event images readable by all"
    ON public.event_images FOR SELECT USING (true);

CREATE POLICY "Organizers can manage own event images"
    ON public.event_images FOR ALL
    USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = event_images.event_id AND events.organizer_id = auth.uid()) OR public.is_admin());

-- 8. Payments
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin() OR EXISTS (
        SELECT 1 FROM public.events WHERE events.id = payments.event_id AND events.organizer_id = auth.uid()
    ));

-- Payments inserted and updated via secure backend service role, but allow insert for user's own flow
CREATE POLICY "Service and users can create payment orders"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 9. Digital Tickets
CREATE POLICY "Users can view own tickets"
    ON public.event_tickets FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin() OR EXISTS (
        SELECT 1 FROM public.events WHERE events.id = event_tickets.event_id AND events.organizer_id = auth.uid()
    ));

-- 10. Ticket Checkins
CREATE POLICY "Organizers and admins can view checkins"
    ON public.ticket_checkins FOR SELECT
    USING (public.is_organizer_or_admin());

CREATE POLICY "Organizers and admins can record checkins"
    ON public.ticket_checkins FOR INSERT
    WITH CHECK (public.is_organizer_or_admin());

-- 11. Moments
CREATE POLICY "Moments readable by all"
    ON public.moments FOR SELECT
    USING (status = 'published' OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create moments"
    ON public.moments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own moments"
    ON public.moments FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own moments"
    ON public.moments FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 12. Moment Likes
CREATE POLICY "Likes readable by all"
    ON public.moment_likes FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes"
    ON public.moment_likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 13. Notifications
CREATE POLICY "Users can view and update own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 14. Email delivery logs
CREATE POLICY "Admins can view email logs"
    ON public.email_delivery_logs FOR SELECT
    USING (public.is_admin());

-- 15. Announcements
CREATE POLICY "Announcements readable by event participants"
    ON public.event_announcements FOR SELECT
    USING (
        organizer_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.event_registrations 
            WHERE event_registrations.event_id = event_announcements.event_id 
              AND event_registrations.user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can create announcements for own events"
    ON public.event_announcements FOR INSERT
    WITH CHECK (
        organizer_id = auth.uid() 
        AND EXISTS (SELECT 1 FROM public.events WHERE events.id = event_announcements.event_id AND events.organizer_id = auth.uid())
    );

-- 16. Event Raider (Scraped sources & events)
CREATE POLICY "Admins can manage scraped event sources"
    ON public.scraped_event_sources FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admins can manage scraped events"
    ON public.scraped_events FOR ALL
    USING (public.is_admin());

-- ============================================================================
-- STORAGE BUCKETS SETUP (Supabase Storage)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('moments', 'moments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read
CREATE POLICY "Public read event covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can upload event covers"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'event-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Public read moments images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'moments');

CREATE POLICY "Authenticated users can upload moments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'moments' AND auth.role() = 'authenticated');

CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
