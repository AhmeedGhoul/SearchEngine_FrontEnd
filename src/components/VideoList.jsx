import { useState } from 'react';
import './VideoList.css';

const VideoList = ({ videos, onDownload }) => {
  const [selected, setSelected] = useState(new Set());

  const toggle = (video) => {
    const next = new Set(selected);
    const key = video.platform_video_id;
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(videos.map(v => v.platform_video_id)));
    }
  };

  const handleDownload = () => {
    const selectedVideos = videos.filter(v => selected.has(v.platform_video_id));
    onDownload(selectedVideos);
    setSelected(new Set());
  };

  const formatDuration = (s) => {
    if (!s) return null;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const formatViews = (v) => {
    if (!v) return null;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v;
  };

  if (!videos.length) return null;

  return (
    <div className="video-list-container">
      <div className="video-list-header">
        <div className="video-count">
          <h2>{videos.length} Videos Found</h2>
          {selected.size > 0 && <span className="selected-badge">{selected.size} selected</span>}
        </div>
        <div className="list-actions">
          <button onClick={toggleAll} className="btn btn-secondary">
            {selected.size === videos.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-primary"
            disabled={selected.size === 0}
          >
            Download ({selected.size})
          </button>
        </div>
      </div>

      <div className="video-grid">
        {videos.map((video) => (
          <div
            key={video.platform_video_id}
            className={`video-card ${selected.has(video.platform_video_id) ? 'selected' : ''}`}
          >
            <div className="video-checkbox">
              <input
                type="checkbox"
                checked={selected.has(video.platform_video_id)}
                onChange={() => toggle(video)}
              />
            </div>

            <div className="video-thumbnail">
              {video.thumbnail_url
                ? <img src={video.thumbnail_url} alt={video.title} />
                : <div className="thumbnail-placeholder">▶</div>
              }
              {formatDuration(video.duration_seconds) && (
                <span className="duration-badge">{formatDuration(video.duration_seconds)}</span>
              )}
            </div>

            <div className="video-info">
              <h3 className="video-title" title={video.title}>{video.title}</h3>
              <div className="channel-name">{video.channel_name}</div>
              <div className="video-meta">
                {formatViews(video.view_count) && <span>{formatViews(video.view_count)} views</span>}
                <span>{new Date(video.published_at).toLocaleDateString()}</span>
              </div>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn-link">
                Watch on YouTube →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoList;
