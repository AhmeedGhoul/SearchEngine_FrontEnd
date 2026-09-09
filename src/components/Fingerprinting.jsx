import { useState, useEffect } from 'react';
import apiService from '../services/api';
import './Fingerprinting.css';

const Fingerprinting = () => {
  const [videos, setVideos] = useState([]);
  const [loadingVideo, setLoadingVideo] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const result = await apiService.listCandidateVideos();
      setVideos(result.videos || []);
    } catch (err) {
      setError('Failed to load videos');
    }
  };

  const handleFingerprintVideo = async (filename) => {
    setLoadingVideo(prev => ({ ...prev, [filename]: 'fingerprinting' }));
    setError('');
    setSuccess('');
    setSearchResults(prev => ({ ...prev, [filename]: null }));

    try {
      const result = await apiService.fingerprintSingleVideo(filename);
      
      if (result.success) {
        setSuccess(result.message);
        setSearchResults(prev => ({ ...prev, [filename]: result }));
      } else {
        setError(result.message || 'Processing incomplete');
      }
      
      setLoadingVideo(prev => ({ ...prev, [filename]: null }));
    } catch (err) {
      setError(err.message || 'Failed to fingerprint video. Make sure REST server is running!');
      setLoadingVideo(prev => ({ ...prev, [filename]: null }));
    }
  };

  return (
    <div className="fingerprinting-container">
      <div className="fp-header">
        <h2>Video Fingerprinting</h2>
        <p>Each video gets its own project and is compared against ALL database videos</p>
      </div>

      {error && (
        <div className="fp-notification error">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="fp-notification success">
          {success}
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <h3>No videos found</h3>
          <p>Go to the Search tab and download some videos first</p>
        </div>
      ) : (
        <div className="video-list">
          {videos.map(video => {
            const result = searchResults[video.filename];
            
            return (
              <div key={video.filename} className="video-item">
                <div className="video-info">
                  <div className="video-name">{video.filename}</div>
                  <div className="video-meta">
                    {(video.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <div className="video-actions">
                  <button
                    onClick={() => handleFingerprintVideo(video.filename)}
                    disabled={loadingVideo[video.filename]}
                    className="btn btn-primary"
                  >
                    {loadingVideo[video.filename] === 'fingerprinting' 
                      ? 'Processing...' 
                      : 'Fingerprint & Search'}
                  </button>
                </div>

                {result && result.matchedVideos && (
                  <div className="match-results">
                    <div className="match-summary">
                      <h3>
                        {result.matchedVideos.length === 0 ? (
                          'No Matches Found'
                        ) : (
                          `Matched with ${result.matchedVideos.length} database video(s)`
                        )}
                      </h3>
                    </div>

                    {result.matchedVideos.length > 0 && (
                      <div className="matched-videos-simple">
                        {result.matchedVideos.map((match, idx) => {
                          const filename = match.filename || match.videoFilename || 'Unknown Video';
                          const count = match.matchCount || match.totalMatches || 0;
                          
                          return (
                            <div key={idx} className="matched-video-simple">
                              <div className="video-icon-large">🎬</div>
                              <div className="match-info">
                                <div className="video-filename">{filename}</div>
                                <div className="match-count">{count} matching segments</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Fingerprinting;