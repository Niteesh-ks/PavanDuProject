# UNFOLD — Cross-College Event Discovery & Experience Platform

> **"Discover beyond your campus."**  
> An experimental, cinematic, and premium cross-collegiate event discovery and management platform built for university students, faculty organizers, and campus administrators across Bengaluru.

---

## 1. Brand Identity & Design System

### Visual Identity
- **Forest Green** (`#294C38`): Brand foundations, primary surfaces, navigation.
- **Warm Ivory** (`#F4F0E6`): Light theme background, editorial warmth.
- **Acid Yellow** (`#E2FF54`): Signature highlight, primary action buttons, glow accents.
- **Ink Black** (`#151B17`): High-contrast typography, dark theme background.
- **Sage** (`#B8D8A5`): Supporting secondary accents and badge fills.
- **Amber** (`#E6A94A`): Occasional contextual highlights and warning badges.

*Strictly avoids violet, purple, or generic blue SaaS templates. Employs strong editorial layout principles, generous intentional whitespace, and tactile physical borders.*

### Typography
- **Primary Typeface**: [Manrope](https://fonts.google.com/specimen/Manrope) (Variable 300 to 800) for high-impact editorial headlines and structured metadata.
- **Monospace Accent**: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for ticket codes, GPS coordinates, timestamps, and order identifiers.

### Theming
- **Light Theme**: Warm Ivory (`#F4F0E6`) canvas, Forest Green navigation & typography, Acid Yellow action buttons (`#E2FF54`), and Dark Ink text.
- **Dark Theme**: Ink Black (`#151B17`) canvas, Deep Forest surfaces (`#1E2E25`), Warm Ivory text, and Acid Yellow highlights.
- Independent, persisted theme toggle stored in `localStorage`.

---

## 2. Signature Login Experience (`ChromaticReveal.jsx`)

When a user signs in through authentication:
1. The authenticated dashboard initially renders in monochrome.
2. A tiny luminous point appears at the exact centre (`50% horizontal`, `50% vertical`).
3. The point expands simultaneously in every direction.
4. Multiple organic liquid-like layers emerge from the central origin.
5. **Acid yellow (`#E2FF54`), forest green (`#294C38`), and subtle sage (`#B8D8A5`)** liquid tones spread outward to all four edges and corners simultaneously.
6. The colourful authenticated dashboard is revealed.
7. Duration: ~2.2 seconds. Respects `prefers-reduced-motion`. Includes a dedicated replay button in the navigation header.

---

## 3. Experience Architecture

```text
meethub/
├── src/
│   ├── components/
│   │   ├── AnnouncementModal.jsx     # Rate-limited organizer email broadcaster
│   │   ├── ChromaticReveal.jsx       # Centre-origin liquid ink colour explosion (2.2s)
│   │   ├── DigitalTicket.jsx         # Perforated editorial QR ticket pass
│   │   ├── EventCard.jsx             # Editorial card with capacity meter & bookmarking
│   │   ├── Footer.jsx                # System footer and campus nodes indicator
│   │   ├── Logo.jsx                  # Original geometric unfolding SVG logo & wordmark
│   │   ├── MapRadar.jsx              # Leaflet map with custom forest/acid markers
│   │   ├── Navbar.jsx                # Responsive header with theme & role controls
│   │   ├── PaymentModal.jsx          # Razorpay modal & status machine
│   │   ├── ProtectedRoute.jsx        # Auth route guard
│   │   ├── QRScannerModal.jsx        # Camera-based on-site entry scanner & fallback
│   │   └── RoleRoute.jsx             # Role-based privilege gate (STUDENT/ORGANIZER/ADMIN)
│   ├── contexts/
│   │   ├── AuthContext.jsx           # Supabase auth & persistent session state
│   │   ├── NotificationContext.jsx   # In-app notifications center
│   │   └── ThemeContext.jsx          # Light (Warm Ivory) & Dark (Ink Black) controls
│   ├── lib/
│   │   └── supabase.js               # Supabase client & seed fixtures
│   ├── pages/
│   │   ├── AdminDashboard.jsx        # Moderation, Event Raider & email audit
│   │   ├── AuthPage.jsx              # Sign-In, Sign-Up & Password Reset
│   │   ├── CampusRadarPage.jsx       # Proximity map & distance filter
│   │   ├── DiscoverPage.jsx          # Search, category & pricing filters
│   │   ├── EventDetailPage.jsx       # Full event breakdown & ticketing
│   │   ├── LandingPage.jsx           # Editorial landing experience
│   │   ├── MomentsPage.jsx           # Campus photo community feed
│   │   ├── OrganizerDashboard.jsx    # Guided multi-step fest creation & check-in
│   │   └── StudentDashboard.jsx      # My Experiences, passes, bookmarks & history
│   ├── styles/
│   │   ├── components.css            # Buttons, modals, badges, cards, tickets
│   │   ├── index.css                 # Base resets, typography & scrollbars
│   │   └── variables.css             # UNFOLD colour tokens & theme variables
│   ├── utils/
│   │   ├── distance.js               # Haversine distance & Bengaluru hubs
│   │   └── recommendations.js        # Rule-based scoring engine
│   ├── App.jsx                       # Route registry & providers
│   └── main.jsx                      # Entrypoint
├── server/
│   ├── routes/
│   │   ├── email.js                  # Broadcast announcements & audit logs
│   │   ├── payments.js               # Razorpay order generation & verification
│   │   ├── scraper.js                # Event Raider crawler endpoints
│   │   └── tickets.js                # Atomic QR ticket check-in route
│   ├── services/
│   │   ├── emailService.js           # Nodemailer batched sender
│   │   ├── eventRaider.js            # Cheerio & Axios collegiate parser
│   │   ├── razorpay.js               # Razorpay SDK & HMAC validator
│   │   └── ticketService.js          # Cryptographic opaque tokens & QR payloads
│   └── index.js                      # Express server entrypoint
├── supabase/
│   ├── migrations/
│   │   ├── 20260101000001_initial_schema.sql  # 17 tables, RLS policies & triggers
│   │   ├── 20261111000001_secure_roles_and_event_approval.sql  # Role protection & shared event review
│   │   ├── 20261111000002_event_bookmarks_rls.sql  # Owner-scoped bookmark grants and policies
│   │   ├── 20261111000003_public_event_read_permissions.sql  # Public SELECT grants for RLS-filtered event feed
│   │   ├── 20261111000004_backend_and_notification_grants.sql # Backend and notification table grants
│   │   ├── 20261111000005_bengaluru_college_directory.sql # Additional Bengaluru college records
│   │   └── 20261111000006_rls_read_scopes_and_public_events.sql # Public event and profile read scopes
│   └── seed.sql                      # Bengaluru colleges, categories & crawler seeds
├── tests/
│   ├── distance.test.js              # Haversine & radius tests
│   ├── payments.test.js              # Order generation & signature verification
│   ├── recommendations.test.js       # Rule scoring & bonus tests
│   ├── scraper.test.js               # Dedup key & crawler tests
│   ├── server.test.js                # Express route integration tests
│   └── tickets.test.js               # QR token format & duplicate check-in tests
├── .env.example
├── package.json
└── vite.config.js
```

---

## 4. Running UNFOLD

### Option A: Run Frontend & Backend Concurrently
```bash
npm.cmd run dev:all
# Or in standard cmd / bash:
npm run dev:all
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Option B: Separate Commands
```bash
# Terminal 1 - Express Server
node server/index.js

# Terminal 2 - Vite Dev Server
npx.cmd vite
```

### Option C: Run Tests & Build
```bash
# Automated Test Suite
npm.cmd test

# Production Build
npm.cmd run build
```

### Supabase setup for secure roles and event approvals
Apply the migrations in `supabase/migrations/` in filename order after the initial schema and before using persistent event, Moments, bookmark, registration, ticket, notification, or crawler workflows. These migrations add owner-scoped bookmark access, public event read grants and RLS scopes, required server-only table privileges, and an additive Bengaluru college directory. Public event queries expose only `approved` and `published` records; RLS remains enabled. For an existing linked project, use the authorized Supabase migration workflow or apply each reviewed migration through the Supabase SQL Editor. Do not disable RLS or expose the service-role key in frontend code. The crawler review queue persists in `scraped_events`; configured source records and selectors come from `scraped_event_sources`.

The role selector only requests a portal. A trusted administrator must assign `ORGANIZER` or `ADMIN` in the protected `profiles.role` record through the authorized administrative process; public registration creates student accounts. Organizer submissions and Admin review use the same `events` row and event ID.

---

## 5. Experience Modules

### 1. Student Experience (`/discover`, `/radar`, `/moments`, `/dashboard`)
- **Discover**: Full editorial catalog with search, category pills, college filters, and free vs paid filter.
- **Campus Radar**: GPS geolocation and manual Bengaluru landmark fallback (Koramangala, Indiranagar, Electronic City, Whitefield, etc.). Haversine distance in km with adjustable radius slider (default 10 km). College coordinates are sourced from OpenStreetMap; see the [OpenStreetMap copyright and attribution page](https://www.openstreetmap.org/copyright).
- **Moments**: Photography-first community feed showcasing authentic student captures with like interactions and image uploads.
- **My Experiences (Dashboard)**: Instant access to active digital QR passes, saved bookmarks, recommendations, and Razorpay receipts.

### 2. Organizer Hub (`/organizer`)
- **Overview & Performance**: Real metrics on registrations, seat capacity fill, and hosted fests.
- **Guided Multi-Step Event Creation**:
  - Step 1: Event Essentials (Title, description, college, category).
  - Step 2: Schedule & Venue (Start/end dates, start/end times, venue gate, campus address).
  - Step 3: Ticketing & Media (Capacity, Free/Paid INR toggle, artwork upload).
- **On-Site QR Camera Scanner**: Hardware camera scanner with real-time green (approved), orange (already used duplicate entry block), and red (invalid) verification.
- **Broadcast Announcements**: Rate-limited batched emails to registered participants with confirmation preview.

### 3. Administration Desk (`/admin`)
- **Event Moderation**: Review and approve organizer submissions (organizers cannot self-approve).
- **Event Raider Review Queue**: Automated crawler ingests events from supported Bengaluru college portals (IISc, RVCE, PESU, BMSCE) into a pending moderation queue.
- **User & Role Governance**: Manage permissions across `STUDENT`, `ORGANIZER`, and `ADMIN`.
- **Delivery Audit**: Real-time logs of all dispatched notifications.
