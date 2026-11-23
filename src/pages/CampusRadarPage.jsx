import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, Navigation, MapPin, Sliders, ArrowUpRight, AlertCircle, Compass } from 'lucide-react';
import { MapRadar } from '../components/MapRadar';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateHaversineDistance, filterEventsByRadius, BENGALURU_HUBS } from '../utils/distance';
import { toUiEvent } from '../lib/events';

export function CampusRadarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [eventsError, setEventsError] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setEventsError('Campus Radar requires a configured Supabase connection.');
      setLoadingEvents(false);
      return () => { active = false; };
    }
    Promise.all([
      fetch('/api/events/public').then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
        return body.events || [];
      }),
      supabase.from('colleges').select('id,name,code,city,address,latitude,longitude').order('name'),
    ])
      .then(([eventRows, collegeResult]) => {
        if (collegeResult.error) throw collegeResult.error;
        if (active) {
          setEvents(eventRows.map(toUiEvent));
          setColleges(collegeResult.data || []);
        }
      })
      .catch((error) => { if (active) setEventsError(`Unable to load Campus Radar data: ${error.message}`); })
      .finally(() => { if (active) setLoadingEvents(false); });
    return () => { active = false; };
  }, []);

  const [userCoords, setUserCoords] = useState({ lat: 12.9742535, lon: 77.5921906 });
  const [locationName, setLocationName] = useState('Bengaluru City Centre');
  const [locationSource, setLocationSource] = useState('Campus Anchor');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Filters
  const [radiusKm, setRadiusKm] = useState(10); // default 10 km as specified
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Request browser geolocation
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please select a Bengaluru hub below.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setUserCoords(coords);
        setLocationName('Live GPS Coordinate');
        setLocationSource('Live GPS');
        setGpsLoading(false);
      },
      (error) => {
        console.warn('[Geolocation Notice]', error.message);
        setGpsError('GPS permission was denied or timed out. Pick your nearest Bengaluru hub from the list.');
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Manual hub selection
  const handleHubSelect = (hubName) => {
    const hub = BENGALURU_HUBS.find((h) => h.name === hubName);
    if (hub) {
      setUserCoords({ lat: hub.lat, lon: hub.lon });
      setLocationName(hub.name);
      setLocationSource('Selected Hub');
      setGpsError(null);
    }
  };

  // Filter nearby events using Haversine calculation
  const nearbyEvents = useMemo(() => {
    let eventsWithDistance = filterEventsByRadius(events, userCoords.lat, userCoords.lon, radiusKm);

    if (selectedCategory !== 'ALL') {
      eventsWithDistance = eventsWithDistance.filter((e) => e.categoryName === selectedCategory);
    }

    return eventsWithDistance;
  }, [events, userCoords, radiusKm, selectedCategory]);
  const categories = [...new Set(events.map((event) => event.categoryName).filter(Boolean))];

  return (
    <div className="main-content">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>
              Location-Based Discovery
            </span>
          </div>
          <h1 className="page-title">Campus Radar</h1>
          <p className="section-subtitle">
            Scan your surroundings to locate upcoming fests, competitions, and symposiums within kilometres of your campus.
          </p>
        </div>

        {/* GPS Button */}
        <button
          onClick={requestGeolocation}
          disabled={gpsLoading}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Navigation size={15} style={{ color: 'var(--color-forest-green)' }} />
          <span>{gpsLoading ? 'Detecting Location...' : 'Use My GPS Location'}</span>
        </button>
      </div>

      {gpsError && (
        <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(230,169,74,0.15)', color: '#B4781E', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{gpsError}</span>
        </div>
      )}
      {eventsError && (
        <div role="alert" className="card" style={{ marginBottom: '1.5rem', color: '#B91C1C' }}>{eventsError}</div>
      )}
      {loadingEvents && <div role="status" className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>Loading published events...</div>}

      {/* Radar Filter Toolbar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.35rem',
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.35rem',
          alignItems: 'center',
        }}
      >
        {/* Anchor Selector */}
        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={13} style={{ color: 'var(--color-forest-green)' }} />
            <span>Campus Anchor ({locationSource})</span>
          </label>
          <select
            value={locationName}
            onChange={(e) => handleHubSelect(e.target.value)}
            className="form-select"
          >
            <option value={locationName}>{locationName}</option>
            {BENGALURU_HUBS.map((hub) => (
              <option key={hub.name} value={hub.name}>{hub.name}</option>
            ))}
          </select>
        </div>

        {/* Radius Filter Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label className="form-label">Discovery Radius</label>
            <strong style={{ fontSize: '0.9rem', color: 'var(--color-forest-green)' }}>{radiusKm} km</strong>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-forest-green)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>2 km</span>
            <span>10 km (Default)</span>
            <span>30 km</span>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="form-label">Category Filter</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
          >
            <option value="ALL">All Categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </div>

      {/* Map + Nearby List Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.35fr) minmax(290px, 1fr)',
          gap: '1.75rem',
        }}
        className="radar-grid"
      >
        {/* Left Map */}
        <div style={{ minHeight: '520px', position: 'relative' }}>
          <MapRadar
            userLocation={userCoords}
            radiusKm={radiusKm}
            events={nearbyEvents}
            colleges={colleges}
            onSelectEvent={(evt) => navigate(`/events/${evt.id}`)}
          />
        </div>

        {/* Right Event Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Nearby Events In Range</span>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>{nearbyEvents.length} within {radiusKm}km</span>
          </div>

          {nearbyEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Radar size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>No Events In Current Range</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Expand the discovery radius slider or choose another Bengaluru campus hub.
              </p>
              <button onClick={() => setRadiusKm(20)} className="btn btn-secondary btn-sm" style={{ marginTop: '1.25rem' }}>
                Expand Radius to 20 km
              </button>
            </div>
          ) : (
            nearbyEvents.map((evt) => (
              <div
                key={evt.id}
                className="card card-clickable"
                onClick={() => navigate(`/events/${evt.id}`)}
                style={{ padding: '1.15rem', borderLeft: '4px solid var(--color-forest-green)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span className="metadata-text" style={{ fontSize: '0.7rem' }}>
                    {evt.collegeCode || evt.collegeName}
                  </span>
                  <span className="badge paid" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                    {evt.distanceKm != null ? `${evt.distanceKm} km away` : 'Nearby'}
                  </span>
                </div>

                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, margin: '0.25rem 0 0.4rem', lineHeight: 1.3 }}>
                  {evt.title}
                </h4>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                  {evt.venue}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.55rem', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{evt.startDate}</span>
                  <span style={{ fontWeight: 800, color: evt.isPaid ? 'var(--color-forest-green)' : 'var(--color-forest-green)' }}>
                    {evt.isPaid ? `₹${evt.feeInr}` : 'FREE PASS'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .radar-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
