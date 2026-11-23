import React, { useEffect, useState } from 'react';
import { Camera, Heart, Send, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMoment } from '../lib/moments';
import { formatIndiaDate } from '../lib/dateTime';

export function MomentsPage() {
  const { user } = useAuth();
  const [moments, setMoments] = useState([]);
  const [myMoments, setMyMoments] = useState([]);
  const [events, setEvents] = useState([]);
  const [feedError, setFeedError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const loadMoments = async () => {
    if (!isSupabaseConfigured) {
      setMoments([]);
      setMyMoments([]);
      setEvents([]);
      setFeedError('Moments require a configured Supabase connection.');
      return;
    }

    try {
      const [{ data: momentRows, error: momentError }, { data: eventRows, error: eventError }] = await Promise.all([
        supabase
          .from('moments')
          .select('*, events(title)')
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('id,title')
          .in('status', ['approved', 'published'])
          .order('start_date', { ascending: true }),
      ]);
      if (momentError) throw momentError;
      if (eventError) throw eventError;

      const userIds = [...new Set((momentRows || []).map((moment) => moment.user_id).filter(Boolean))];
      const momentIds = (momentRows || []).map((moment) => moment.id);
      const [{ data: profilesData, error: profilesError }, { data: likesData, error: likesError }] = await Promise.all([
        userIds.length
          ? supabase.from('moment_profiles').select('id,full_name,college_name,avatar_url').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        momentIds.length
          ? supabase.from('moment_likes').select('moment_id,user_id').in('moment_id', momentIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (profilesError) throw profilesError;
      if (likesError) throw likesError;

      const profileMap = Object.fromEntries((profilesData || []).map((entry) => [entry.id, entry]));
      const likesMap = Object.fromEntries(momentIds.map((id) => [id, []]));
      (likesData || []).forEach((like) => likesMap[like.moment_id]?.push(like.user_id));
      const normalized = (momentRows || []).map((moment) => normalizeMoment({
        ...moment,
        profile: profileMap[moment.user_id],
        moment_likes: likesMap[moment.id] || [],
      }, user?.id));

      setMoments(normalized);
      setMyMoments(normalized.filter((item) => item.userId === user?.id));
      setEvents(eventRows || []);
      setSelectedEventId((current) => current || eventRows?.[0]?.id || '');
      setFeedError('');
    } catch (error) {
      setFeedError(`Unable to load moments: ${error.message}`);
    }
  };

  useEffect(() => {
    loadMoments();
  }, [user?.id]);

  const handleLikeToggle = async (momentId) => {
    const currentMoment = moments.find((moment) => moment.id === momentId);
    if (!currentMoment) return;

    const nextLikedState = !currentMoment.isLiked;

    if (isSupabaseConfigured && user?.id) {
      try {
        if (nextLikedState) {
          const { error } = await supabase.from('moment_likes').insert([{ moment_id: momentId, user_id: user.id }]);
          if (error && error.code !== '23505') throw error;
        } else {
          const { error } = await supabase.from('moment_likes').delete().eq('moment_id', momentId).eq('user_id', user.id);
          if (error) throw error;
        }

        await loadMoments();
        return;
      } catch (error) {
        setFeedError(`Unable to update like: ${error.message}`);
        return;
      }
    }
    setFeedError('Sign in with a configured Supabase account to like moments.');
  };

  const handleDeleteMoment = async (momentId) => {
    if (!user?.id) return;

    if (!isSupabaseConfigured) {
      setFeedError('Moment deletion requires a configured Supabase connection.');
      return;
    }
    const moment = moments.find((item) => item.id === momentId && item.userId === user.id);
    if (!moment) return;
    const { error } = await supabase.from('moments').delete().eq('id', momentId).eq('user_id', user.id);
    if (error) {
      setFeedError(`Unable to delete moment: ${error.message}`);
      return;
    }
    if (moment.storagePath) {
      const { error: storageError } = await supabase.storage.from('moments').remove([moment.storagePath]);
      if (storageError) setFeedError(`Moment deleted, but its stored image could not be removed: ${storageError.message}`);
    }
    await loadMoments();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSelectedFile(null);
      setImageUrl('');
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result);
      setUploadError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitMoment = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setUploadError('Please sign in to publish a moment.');
      return;
    }

    if (!caption.trim()) {
      setUploadError('Please write an event caption.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Choose an image to upload.');
      return;
    }
    if (!isSupabaseConfigured) {
      setUploadError('Moment uploads require a configured Supabase connection.');
      return;
    }

    let uploadedStoragePath = '';
    try {
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}-${safeName}`;
      uploadedStoragePath = storagePath;
      const { error: storageError } = await supabase.storage.from('moments').upload(storagePath, selectedFile, { upsert: false });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from('moments').getPublicUrl(storagePath);
      const { error } = await supabase.from('moments').insert({
        user_id: user.id,
        event_id: selectedEventId || null,
        caption: caption.trim(),
        image_urls: [publicUrl],
        storage_path: storagePath,
        status: 'published',
      });
      if (error) throw error;

      setShowUploadModal(false);
      setCaption('');
      setImageUrl('');
      setSelectedFile(null);
      setUploadError('');
      setFeedError('');
      await loadMoments();
    } catch (error) {
      if (uploadedStoragePath) {
        const { error: cleanupError } = await supabase.storage.from('moments').remove([uploadedStoragePath]);
        if (cleanupError) {
          setFeedError(`Upload failed and its temporary image could not be removed: ${cleanupError.message}`);
        }
      }
      setUploadError(error.message || 'Unable to publish this moment right now.');
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="metadata-text" style={{ color: 'var(--color-forest-green)' }}>
              Campus Community Photographic Feed
            </span>
          </div>
          <h1 className="page-title">Moments</h1>
          <p className="section-subtitle">
            Authentic photographs and live memories captured by students across university fests and competitions.
          </p>
        </div>

        <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={16} />
          <span>Contribute Moment</span>
        </button>
      </div>

      {myMoments.length > 0 && (
        <div style={{ marginBottom: '2.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ fontSize: '1.2rem' }}>My Moments</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {myMoments.map((moment) => (
              <div key={moment.id} className="card" style={{ padding: '0.75rem', position: 'relative' }}>
                {moment.imageUrls[0] && <img src={moment.imageUrls[0]} alt={moment.caption} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px' }} />}
                <div style={{ marginTop: '0.75rem', fontWeight: 700 }}>{moment.caption}</div>
                <button onClick={() => handleDeleteMoment(moment.id)} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', width: '100%' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedError && (
        <div className="card" role="alert" style={{ marginBottom: '1.5rem', color: '#B91C1C' }}>
          {feedError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
        {moments.map((item) => (
          <div key={item.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--color-forest-green)', color: 'var(--color-warm-ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                  {item.userName?.[0] || 'S'}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{item.userName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.userCollege}</div>
                </div>
              </div>
              <span className="badge" style={{ fontSize: '0.7rem' }}>{item.eventTitle}</span>
            </div>

            {item.imageUrls[0] && (
              <div style={{ width: '100%', height: '300px', backgroundColor: '#151B17', overflow: 'hidden' }}>
                <img src={item.imageUrls[0]} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button onClick={() => handleLikeToggle(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: item.isLiked ? 'var(--color-forest-green)' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.875rem', background: item.isLiked ? 'rgba(226, 255, 84, 0.25)' : 'var(--bg-subtle)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                  <Heart size={16} fill={item.isLiked ? 'var(--color-acid-yellow)' : 'none'} style={{ color: item.isLiked ? 'var(--color-ink-black)' : 'inherit' }} />
                  <span>{item.likesCount}</span>
                </button>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.caption}</p>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                {formatIndiaDate(item.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>Contribute an Event Memory</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div style={{ padding: '0.75rem', background: 'rgba(220,38,38,0.1)', color: '#DC2626', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleSubmitMoment}>
              <div className="form-group">
                <label className="form-label">Link to Event</label>
                <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="form-select">
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Photograph</label>
                <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" />
                <span className="form-hint">Accepted formats: JPG, PNG up to 5MB. Stored in the moments bucket.</span>
              </div>

              {imageUrl && (
                <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Caption & Highlights</label>
                <textarea rows={3} placeholder="Tell students about the festival energy, stage performances, or winning project..." value={caption} onChange={(e) => setCaption(e.target.value)} className="form-textarea" required />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Send size={14} />
                  <span>Publish to Wall</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
