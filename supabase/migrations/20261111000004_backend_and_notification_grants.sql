GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON TABLE
    public.profiles,
    public.events,
    public.colleges,
    public.categories,
    public.event_registrations,
    public.payments,
    public.event_tickets,
    public.scraped_event_sources,
    public.scraped_events
TO service_role;

GRANT INSERT, UPDATE ON TABLE public.event_registrations TO service_role;
GRANT INSERT ON TABLE public.payments TO service_role;
GRANT INSERT, UPDATE ON TABLE public.scraped_events TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;
