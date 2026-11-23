import React, { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles, Flame, X, Compass } from 'lucide-react';
import { EventCard } from '../components/EventCard';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateEventRecommendations } from '../utils/recommendations';
import { useAuth } from '../contexts/AuthContext';
import { toUiEvent } from '../lib/events';
import { getBookmarkErrorMessage } from '../lib/bookmarkErrors';

export function DiscoverPage() {
  const { profile, user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [bookmarkError, setBookmarkError] = useState('');

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setFeedError('Discover requires a configured Supabase connection.');
      setLoadingEvents(false);
      return () => { active = false; };
    }

    fetch('/api/events/public')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
        return body.events || [];
      })
      .then((rows) => {
        if (active) {
          setEvents(rows.map(toUiEvent));
          setFeedError('');
        }
      })
      .catch((error) => {
        if (active) setFeedError(`Unable to load published events: ${error.message}`);
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setBookmarkedIds([]);
      setBookmarkError('');
      return;
    }
    setBookmarkedIds([]);
    setBookmarkError('');

    async function loadSavedBookmarks() {
      const { data, error } = await supabase
        .from('event_bookmarks')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) {
        setBookmarkError(getBookmarkErrorMessage(error, 'load'));
        return;
      }
      setBookmarkedIds((data || []).map((bookmark) => bookmark.event_id));
      setBookmarkError('');
    }

    loadSavedBookmarks();
  }, [user?.id]);

  const handleBookmarkToggle = async (eventId, isSaved) => {
    if (!user?.id || !isSupabaseConfigured) {
      setBookmarkError('Sign in with a configured Supabase account to save events.');
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('event_bookmarks')
          .insert([{ event_id: eventId }]);

        if (error && error.code !== '23505') throw error;
        setBookmarkedIds((current) => [...new Set([...current, eventId])]);
      } else {
        const { error } = await supabase
          .from('event_bookmarks')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;
        setBookmarkedIds((current) => current.filter((id) => id !== eventId));
      }
      setBookmarkError('');
    } catch (error) {
      setBookmarkError(getBookmarkErrorMessage(error, 'update'));
      throw error;
    }
  };

  // Smart Rule-based recommendations
  const recommendedEvents = useMemo(() => {
    return calculateEventRecommendations({
      events,
      userInterests: profile?.interests || ['Hackathons & AI', 'Cultural Fests'],
      userCollegeId: null,
      bookmarkedCategoryIds: [],
    });
  }, [events, profile]);

  // Trending events
  const trendingEvents = useMemo(() => {
    return [...events].sort((a, b) => (b.registrationsCount || 0) - (a.registrationsCount || 0));
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    let sourceList = events;
    if (activeTab === 'featured') {
      sourceList = events.filter((e) => e.isFeatured);
    } else if (activeTab === 'trending') {
      sourceList = trendingEvents;
    } else if (activeTab === 'recommended') {
      sourceList = recommendedEvents;
    }

    return sourceList.filter((event) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (event.title || '').toLowerCase().includes(q);
        const matchCollege = (event.collegeName || '').toLowerCase().includes(q);
        const matchDesc = (event.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCollege && !matchDesc) return false;
      }

      if (selectedCategory !== 'ALL' && event.categoryName !== selectedCategory) {
        return false;
      }

      if (selectedCollege !== 'ALL' && event.collegeName !== selectedCollege) {
        return false;
      }

      if (priceFilter === 'FREE' && event.isPaid) return false;
      if (priceFilter === 'PAID' && !event.isPaid) return false;

      return true;
    });
  }, [activeTab, searchQuery, selectedCategory, selectedCollege, priceFilter, trendingEvents, recommendedEvents, events]);

  const categoryNames = [...new Set(events.map((event) => event.categoryName).filter(Boolean))];
  const collegeNames = [...new Set(events.map((event) => event.collegeName).filter(Boolean))];

  return (
    <div className="main-content">
      {/* Editorial Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>
            Bengaluru Inter-Collegiate Index
          </span>
        </div>
        <h1 className="page-title">Discover Experiences</h1>
        <p className="section-subtitle">
          Find hackathons, robotics arenas, paper symposiums, and cultural festivals happening beyond your university walls.
        </p>
      </div>

      {/* Discovery Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '1.75rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          All Experiences ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('featured')}
          className={`filter-tab-btn ${activeTab === 'featured' ? 'active' : ''}`}
        >
          ★ Featured Curations
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`filter-tab-btn ${activeTab === 'trending' ? 'active' : ''}`}
        >
          <Flame size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--color-amber)' }} />
          Trending by Registrations
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`filter-tab-btn ${activeTab === 'recommended' ? 'active' : ''}`}
        >
          <Sparkles size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--color-forest-green)' }} />
          Recommended for You
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.35rem',
          marginBottom: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search fest, stack, university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
          >
            <option value="ALL">All Event Disciplines</option>
            {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {/* College Filter */}
        <div>
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="form-select"
          >
            <option value="ALL">All Collegiate Campuses</option>
            {collegeNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {/* Pricing */}
        <div>
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="form-select"
          >
            <option value="ALL">All Entry Passes (Free & Paid)</option>
            <option value="FREE">Free Passes Only</option>
            <option value="PAID">Paid Delegate Passes</option>
          </select>
        </div>
      </div>

      {bookmarkError && (
        <div role="alert" style={{ color: '#B91C1C', marginBottom: '1rem' }}>{bookmarkError}</div>
      )}
      {feedError && (
        <div className="card" role="alert" style={{ marginBottom: '1.5rem', color: '#B91C1C' }}>{feedError}</div>
      )}

      {/* Events Grid */}
      {loadingEvents ? (
        <div className="card" role="status" style={{ textAlign: 'center', padding: '3rem' }}>Loading published events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4.5rem 1.5rem' }}>
          <Compass size={36} style={{ color: 'var(--color-forest-green)', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>No matching experiences found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Try expanding your category or searching for another university campus.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedCollege('ALL');
              setPriceFilter('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '1.25rem' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isBookmarked={bookmarkedIds.includes(event.id)}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
