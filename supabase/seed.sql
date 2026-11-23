-- Meet Hub - Seed Data
-- Seed: supabase/seed.sql

-- 1. Insert Colleges (Bengaluru premier institutions with exact coordinates)
INSERT INTO public.colleges (id, name, code, city, state, address, latitude, longitude, website)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'Indian Institute of Science', 'IISC', 'Bengaluru', 'Karnataka', 'CV Raman Rd, Bengaluru 560012', 13.0219, 77.5671, 'https://iisc.ac.in'),
    ('c2222222-2222-2222-2222-222222222222', 'RV College of Engineering', 'RVCE', 'Bengaluru', 'Karnataka', 'Mysore Rd, RV Vidyaniketan, Bengaluru 560059', 12.9237, 77.4987, 'https://rvce.edu.in'),
    ('c3333333-3333-3333-3333-333333333333', 'PES University', 'PESU', 'Bengaluru', 'Karnataka', '100 Feet Ring Rd, BSK III Stage, Bengaluru 560085', 12.9344, 77.5345, 'https://pes.edu'),
    ('c4444444-4444-4444-4444-444444444444', 'BMS College of Engineering', 'BMSCE', 'Bengaluru', 'Karnataka', 'Bull Temple Rd, Basavanagudi, Bengaluru 560019', 12.9416, 77.5658, 'https://bmsce.ac.in'),
    ('c5555555-5555-5555-5555-555555555555', 'Ramaiah Institute of Technology', 'MSRIT', 'Bengaluru', 'Karnataka', 'MSR Nagar, Mathikere, Bengaluru 560054', 13.0305, 77.5649, 'https://msrit.edu'),
    ('c6666666-6666-6666-6666-666666666666', 'Christ University', 'CHRIST', 'Bengaluru', 'Karnataka', 'Hosur Rd, Bhavani Nagar, Bengaluru 560029', 12.9343, 77.6060, 'https://christuniversity.in'),
    ('c7777777-7777-7777-7777-777777777777', 'IIIT Bangalore', 'IIITB', 'Bengaluru', 'Karnataka', '26/C, Electronic City Phase 1, Bengaluru 560100', 12.8407, 77.6638, 'https://iiitb.ac.in'),
    ('c8888888-8888-8888-8888-888888888888', 'St. Joseph''s University', 'SJU', 'Bengaluru', 'Karnataka', '36 Lalbagh Rd, Langford Town, Bengaluru 560027', 12.9610, 77.5985, 'https://sju.edu.in'),
    ('c9999999-9999-9999-9999-999999999999', 'Mount Carmel College', 'MCC', 'Bengaluru', 'Karnataka', '58 Palace Rd, Abshot Layout, Bengaluru 560052', 12.9915, 77.5878, 'https://mccblr.edu.in'),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dayananda Sagar College of Engineering', 'DSCE', 'Bengaluru', 'Karnataka', 'Shavige Malleshwara Hills, Kumaraswamy Layout, Bengaluru 560078', 12.9081, 77.5667, 'https://www.dsce.edu.in')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Categories
INSERT INTO public.categories (id, name, slug, icon, description, color)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Hackathons & AI', 'hackathons-ai', 'Code2', 'Competitive programming, generative AI sprints, and developer hackathons', '#8B5CF6'),
    ('b2222222-2222-2222-2222-222222222222', 'Cultural Fests', 'cultural-fests', 'Music', 'Music competitions, dance battles, theatrical plays, and college fests', '#EC4899'),
    ('b3333333-3333-3333-3333-333333333333', 'Robotics & Hardware', 'robotics-hardware', 'Cpu', 'Autonomous robotics battles, drone racing, and IoT build challenges', '#06B6D4'),
    ('b4444444-4444-4444-4444-444444444444', 'Entrepreneurship & E-Summit', 'e-summit', 'Briefcase', 'Startup pitching, venture capital panels, and student founder summits', '#F59E0B'),
    ('b5555555-5555-5555-5555-555555555555', 'Technical Workshops', 'workshops', 'Terminal', 'Hands-on system architecture, quantum computing, and cloud engineering', '#10B981'),
    ('b6666666-6666-6666-6666-666666666666', 'Sports & Esports', 'sports-esports', 'Trophy', 'Inter-collegiate athletics tournaments, basketball league, and Valorant tourneys', '#3B82F6'),
    ('b7777777-7777-7777-7777-777777777777', 'Design & Creative Arts', 'design-arts', 'Palette', 'UI/UX hackathons, photography salons, and generative visual exhibitions', '#F43F5E')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Scraped Event Sources (for Event Raider)
INSERT INTO public.scraped_event_sources (id, name, college_id, base_url, events_url, selector_config, is_active, status)
VALUES
    ('e1111111-1111-1111-1111-111111111111', 'IISc Pravega Portal', 'c1111111-1111-1111-1111-111111111111', 'https://pravega.org', 'https://pravega.org/events', '{"container": ".event-card", "title": "h3", "date": ".event-date", "venue": ".event-venue"}'::jsonb, true, 'idle'),
    ('e2222222-2222-2222-2222-222222222222', 'RVCE 8th Mile Hub', 'c2222222-2222-2222-2222-222222222222', 'https://8thmile.in', 'https://8thmile.in/events', '{"container": ".event-block", "title": ".event-title", "date": ".date-badge", "venue": ".location"}'::jsonb, true, 'idle'),
    ('e3333333-3333-3333-3333-333333333333', 'PESU Aatmatrisha Portal', 'c3333333-3333-3333-3333-333333333333', 'https://aatmatrisha.pes.edu', 'https://aatmatrisha.pes.edu/schedule', '{"container": ".fest-item", "title": ".item-name", "date": ".schedule-time", "venue": ".stage"}'::jsonb, true, 'idle'),
    ('e4444444-4444-4444-4444-444444444444', 'BMSCE Utsav Feed', 'c4444444-4444-4444-4444-444444444444', 'https://bmsutsav.in', 'https://bmsutsav.in/competitions', '{"container": ".comp-card", "title": ".comp-title", "date": ".comp-time", "venue": ".comp-hall"}'::jsonb, true, 'idle')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Initial Scraped Events (Awaiting Admin Review)
INSERT INTO public.scraped_events (id, source_id, title, college_name, description, event_date, venue, registration_url, original_source_url, review_status)
VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        'Quantum Neural Computation Symposium 2026',
        'Indian Institute of Science',
        'A gathering of researchers, students, and engineers exploring topological quantum computing, hybrid classical-quantum algorithms, and neural architecture optimization.',
        '2026-11-20',
        'Satish Dhawan Auditorium, IISc Campus',
        'https://pravega.org/quantum-2026',
        'https://pravega.org/events/quantum',
        'pending'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'e2222222-2222-2222-2222-222222222222',
        'Battle of Bands — 8th Mile Mega Stage',
        'RV College of Engineering',
        'The premier inter-college rock and fusion music showdown. 18 shortlisted collegiate bands from across South India compete for the championship trophy.',
        '2026-11-25',
        'Main Open Air Theatre, RVCE',
        'https://8thmile.in/bob',
        'https://8thmile.in/events/bob',
        'pending'
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'e3333333-3333-3333-3333-333333333333',
        'PESU Ventures: GenAI Pitch Arena',
        'PES University',
        'Pitch your student startup to Bangalore venture capitalists and angel investors. Prize pool of INR 5,00,000 in non-dilutive grant capital.',
        '2026-11-28',
        'MRD Auditorium, PESU Ring Road',
        'https://aatmatrisha.pes.edu/pitch',
        'https://aatmatrisha.pes.edu/events/pitch',
        'pending'
    )
ON CONFLICT (id) DO NOTHING;
