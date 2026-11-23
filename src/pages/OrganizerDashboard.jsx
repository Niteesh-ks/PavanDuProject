import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Plus,
  QrCode,
  Users,
  Send,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
  Tag,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { authenticatedApiRequest } from '../lib/api';
import { toUiEvent } from '../lib/events';
import { QRScannerModal } from '../components/QRScannerModal';
import { AnnouncementModal } from '../components/AnnouncementModal';

export function OrganizerDashboard() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState('events'); // 'overview' | 'events' | 'create' | 'attendees'
  const [organizerEvents, setOrganizerEvents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const submissionKeyRef = useRef(null);
  const [activeScannerEvent, setActiveScannerEvent] = useState(null);
  const [activeAnnouncementEvent, setActiveAnnouncementEvent] = useState(null);

  // Multi-step Creation State
  const [createStep, setCreateStep] = useState(1); // 1: Core Info, 2: Schedule & Venue, 3: Pricing & Media
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(250);
  const [isPaid, setIsPaid] = useState(false);
  const [feeInr, setFeeInr] = useState(199);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      authenticatedApiRequest('/api/events/mine'),
      supabase.from('colleges').select('id,name,code,city,address,latitude,longitude,website').order('name'),
      supabase.from('categories').select('id,name').order('name'),
    ]).then(([mine, collegesResult, categoriesResult]) => {
      if (!active) return;
      if (collegesResult.error) throw collegesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      setOrganizerEvents((mine.events || []).map(toUiEvent));
      const associatedCollege = (collegesResult.data || []).find((college) => college.id === profile?.college_id);
      setColleges(associatedCollege ? [associatedCollege] : []);
      setCategories(categoriesResult.data || []);
      setCollegeId(associatedCollege?.id || '');
      if (!associatedCollege) setFormError('Your Organizer profile is not linked to a valid college. Ask an administrator to verify the college association.');
      setCategoryId((current) => current || categoriesResult.data?.[0]?.id || '');
    }).catch((error) => {
      if (active) setFormError(`Unable to load organizer data: ${error.message}`);
    });
    return () => { active = false; };
  }, [profile?.college_id]);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImageUrl(reader.result);
        setCoverImageFile(file);
        setFormError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !description.trim() || !venue.trim() || !startDate) {
      setFormError('Please fill in all mandatory event fields.');
      return;
    }

    if (!collegeId || !categoryId) {
      setFormError('Select an available campus and event category.');
      return;
    }

    if (!submissionKeyRef.current) {
      submissionKeyRef.current = window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const { event } = await authenticatedApiRequest('/api/events', {
        method: 'POST',
        headers: { 'Idempotency-Key': submissionKeyRef.current },
        body: JSON.stringify({
          title,
          description,
          collegeId,
          categoryId,
          subcategory,
          startDate,
          endDate: endDate || startDate,
          startTime,
          endTime,
          venue,
          city: colleges.find((college) => college.id === collegeId)?.city || 'Bengaluru',
          address,
          latitude: colleges.find((college) => college.id === collegeId)?.latitude,
          longitude: colleges.find((college) => college.id === collegeId)?.longitude,
          coverImage: coverImageFile
            ? await uploadEventCover(coverImageFile, submissionKeyRef.current)
            : coverImageUrl,
          maxCapacity: Number(maxCapacity),
          isPaid,
          feeInr: isPaid ? Number(feeInr) : 0,
        }),
      });
      setOrganizerEvents((current) => [toUiEvent(event), ...current.filter((item) => item.id !== event.id)]);
      submissionKeyRef.current = null;
      setFormSuccess('Event submitted for administrator review. It will appear publicly only after approval.');
      setActiveTab('events');
      setCreateStep(1);
      setTitle('');
      setDescription('');
      setVenue('');
      setCoverImageUrl('');
      setCoverImageFile(null);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  async function uploadEventCover(file, submissionKey) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${submissionKey}-${safeName}`;
    const { error } = await supabase.storage.from('event-covers').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw new Error(`Unable to upload event cover: ${error.message}`);
    return supabase.storage.from('event-covers').getPublicUrl(path).data.publicUrl;
  }

  const totalRegistrations = organizerEvents.reduce((acc, e) => acc + (e.registrationsCount || 0), 0);
  const totalCapacity = organizerEvents.reduce((acc, e) => acc + (e.maxCapacity || 0), 0);

  return (
    <div className="main-content">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>
              Campus Host & Faculty Command
            </span>
          </div>
          <h1 className="page-title">Organizer Hub</h1>
          <p className="section-subtitle">
            Curate inter-collegiate festivals, track delegate rosters, dispatch broadcast updates, and scan digital passes at entrance gates.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('create');
            setCreateStep(1);
          }}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>Create / Submit Event</span>
        </button>
      </div>

      {formSuccess && (
        <div style={{ padding: '0.95rem 1.25rem', background: 'rgba(41,76,56,0.15)', color: 'var(--color-forest-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Overview Analytics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Hosted Events</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-forest-green)', margin: '0.25rem 0' }}>
            {organizerEvents.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Under university profile</span>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Total Attendees</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-ink-black)', margin: '0.25rem 0' }}>
            {totalRegistrations}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Delegates across campuses</span>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span className="metadata-text">Seat Capacity Fill</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-amber)', margin: '0.25rem 0' }}>
            {totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0}%
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Average venue utilization</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('events')}
          className={`filter-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
        >
          My Events ({organizerEvents.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('create');
            setCreateStep(1);
          }}
          className={`filter-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
        >
          + Guided Event Creation
        </button>
      </div>

      {/* Tab: Events List */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {organizerEvents.map((evt) => (
            <div key={evt.id} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <span className="metadata-text">{evt.collegeName}</span>
                    <span className={`badge ${evt.status === 'approved' ? 'status-approved' : evt.status === 'pending_approval' ? 'status-pending' : 'status-rejected'}`}>
                      {evt.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="badge">{evt.isPaid ? `₹${evt.feeInr}` : 'FREE PASS'}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>{evt.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <span>{evt.startDate} ({evt.startTime})</span>
                    <span>•</span>
                    <span>{evt.venue}</span>
                    <span>•</span>
                    <span>{evt.registrationsCount} / {evt.maxCapacity} Registered</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    onClick={() => setActiveScannerEvent(evt)}
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: 'var(--color-forest-green)', color: 'var(--color-forest-green)' }}
                  >
                    <QrCode size={15} />
                    <span>Launch QR Scanner</span>
                  </button>

                  <button
                    onClick={() => setActiveAnnouncementEvent(evt)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Send size={15} />
                    <span>Broadcast Update</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Multi-Step Guided Creation Experience */}
      {activeTab === 'create' && (
        <div className="card" style={{ maxWidth: '820px', padding: '2.5rem' }}>
          {/* Step Progress Indicators */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: createStep >= 1 ? 'var(--color-forest-green)' : 'var(--text-muted)', fontWeight: 700 }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: createStep >= 1 ? 'var(--color-acid-yellow)' : 'var(--bg-subtle)', color: '#151B17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
              <span>1. Overview</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: createStep >= 2 ? 'var(--color-forest-green)' : 'var(--text-muted)', fontWeight: 700 }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: createStep >= 2 ? 'var(--color-acid-yellow)' : 'var(--bg-subtle)', color: '#151B17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
              <span>2. Venue & Dates</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: createStep >= 3 ? 'var(--color-forest-green)' : 'var(--text-muted)', fontWeight: 700 }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: createStep >= 3 ? 'var(--color-acid-yellow)' : 'var(--bg-subtle)', color: '#151B17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
              <span>3. Pass & Media</span>
            </div>
          </div>

          {formError && (
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(220,38,38,0.1)', color: '#DC2626', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Step 1: Core Details */}
          {createStep === 1 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                Step 1: Event Essentials
              </h3>

              <div className="form-group">
                <label className="form-label">Event Headline *</label>
                <input
                  type="text"
                  placeholder="e.g. Pravega 2026: Quantum Intelligence Summit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Narrative Description *</label>
                <textarea
                  rows={4}
                  placeholder="Describe festival domains, rounds, judging criteria, and rewards..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Host University Campus *</label>
                  <select
                    value={collegeId}
                    className="form-select"
                    disabled
                    required
                  >
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                  {colleges[0]?.website && (
                    <p className="metadata-text">College website: <a href={colleges[0].website} target="_blank" rel="noreferrer">{colleges[0].website}</a></p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Discipline Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!title.trim() || !description.trim()) {
                      setFormError('Please complete title and description.');
                      return;
                    }
                    setFormError('');
                    setCreateStep(2);
                  }}
                  className="btn btn-primary"
                >
                  <span>Continue to Venue & Schedule</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule & Venue */}
          {createStep === 2 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                Step 2: Dates, Timings & Venue Gate
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue / Hall Specification *</label>
                <input
                  type="text"
                  placeholder="e.g. Satish Dhawan Auditorium & Main Quadrangle"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campus Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. CV Raman Rd, Bengaluru 560012"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setCreateStep(1)} className="btn btn-secondary">
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!startDate || !venue.trim()) {
                      setFormError('Please provide start date and venue.');
                      return;
                    }
                    setFormError('');
                    setCreateStep(3);
                  }}
                  className="btn btn-primary"
                >
                  <span>Continue to Ticketing & Media</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ticketing & Media */}
          {createStep === 3 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                Step 3: Registration Pass & Media
              </h3>

              <div className="form-group">
                <label className="form-label">Max Seat Capacity *</label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pass Ticketing Structure</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="isPaid"
                      checked={!isPaid}
                      onChange={() => setIsPaid(false)}
                    />
                    <span>Free Pass</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="isPaid"
                      checked={isPaid}
                      onChange={() => setIsPaid(true)}
                    />
                    <span>Paid Pass (Razorpay Test Gateway)</span>
                  </label>
                </div>

                {isPaid && (
                  <div style={{ marginTop: '0.85rem', maxWidth: '240px' }}>
                    <label className="form-label">Registration Fee (INR) *</label>
                    <input
                      type="number"
                      min="1"
                      value={feeInr}
                      onChange={(e) => setFeeInr(e.target.value)}
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Event Banner Artwork (Supabase Storage: event-covers)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="form-input"
                />
                {coverImageUrl && (
                  <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginTop: '0.85rem' }}>
                    <img src={coverImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button type="button" onClick={() => setCreateStep(2)} className="btn btn-secondary">
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={handleCreateEvent} disabled={submitting} className="btn btn-primary">
                    <Check size={16} />
                    <span>{submitting ? 'Submitting...' : 'Submit for Admin Approval'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      {activeScannerEvent && (
        <QRScannerModal
          eventId={activeScannerEvent.id}
          eventTitle={activeScannerEvent.title}
          onClose={() => setActiveScannerEvent(null)}
        />
      )}

      {/* Announcement Modal */}
      {activeAnnouncementEvent && (
        <AnnouncementModal
          event={activeAnnouncementEvent}
          onClose={() => setActiveAnnouncementEvent(null)}
        />
      )}
    </div>
  );
}
