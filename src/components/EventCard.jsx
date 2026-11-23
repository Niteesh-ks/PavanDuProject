import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, MapPin, Users, Bookmark, Sparkles, ArrowUpRight } from 'lucide-react';
import { formatIndiaDate, formatIndiaTime } from '../lib/dateTime';

export function EventCard({ event, onBookmarkToggle, isBookmarked = false }) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);

  useEffect(() => {
    setBookmarked(isBookmarked);
  }, [isBookmarked]);

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onBookmarkToggle) return;
    const nextState = !bookmarked;
    try {
      await onBookmarkToggle(event.id, nextState);
      setBookmarked(nextState);
    } catch {
      return;
    }
  };

  const percentFull = Math.min(
    100,
    Math.round(((event.registrationsCount || 0) / (event.maxCapacity || 100)) * 100)
  );

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 25 }}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1.5px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
      }}
      className="card card-clickable"
    >
      {/* Event Image & Top Tag Header */}
      <div style={{ position: 'relative', width: '100%', height: '185px', overflow: 'hidden' }}>
        <img
          src={event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop'}
          alt={event.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(21,27,23,0.88) 0%, rgba(21,27,23,0.15) 50%, rgba(21,27,23,0.4) 100%)' }} />

        {/* Top Badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              backgroundColor: 'var(--color-ink-black)',
              color: 'var(--color-warm-ivory)',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(244,240,230,0.2)',
            }}
          >
            {event.categoryName || 'Campus Event'}
          </span>

          <button
            onClick={handleBookmark}
            title={bookmarked ? 'Remove Bookmark' : 'Save Event'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(21,27,23,0.8)',
              color: bookmarked ? 'var(--color-acid-yellow)' : '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(244,240,230,0.2)',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={15} fill={bookmarked ? 'var(--color-acid-yellow)' : 'none'} />
          </button>
        </div>

        {/* Price & College Badge Overlay */}
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {event.isPaid ? (
              <span className="badge paid" style={{ fontWeight: 800 }}>
                ₹{event.feeInr}
              </span>
            ) : (
              <span className="badge free" style={{ fontWeight: 800 }}>
                FREE PASS
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#F4F0E6', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {event.collegeCode || event.collegeName}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Recommendation Reason Pill */}
        {event.recommendationReasons && event.recommendationReasons.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-forest-green)', marginBottom: '0.5rem', fontWeight: 700 }}>
            <Sparkles size={13} style={{ color: 'var(--color-amber)' }} />
            <span>{event.recommendationReasons[0].text}</span>
          </div>
        )}

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </h3>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.description}
        </p>

        {/* Metadata Details */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={14} style={{ color: 'var(--color-forest-green)' }} />
            <span>{formatIndiaDate(event.startDate)} • {formatIndiaTime(event.startTime) || 'All Day'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={14} style={{ color: 'var(--color-forest-green)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue || event.collegeName}</span>
          </div>
        </div>

        {/* Capacity Indicator */}
        <div style={{ marginTop: '1.15rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={12} />
              <span>{event.registrationsCount || 0} registered</span>
            </span>
            <span>{percentFull}% Reserved</span>
          </div>
          <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentFull}%`,
                height: '100%',
                backgroundColor: percentFull > 85 ? 'var(--color-amber)' : 'var(--color-forest-green)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Card CTA */}
        <div style={{ marginTop: '1.15rem' }}>
          <Link
            to={`/events/${event.id}`}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <span>View Details</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
