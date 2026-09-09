import { useState } from 'react';
import SearchForm from './components/SearchForm';
import VideoList from './components/VideoList';
import DownloadQueue from './components/DownloadQueue';
import Fingerprinting from './components/Fingerprinting';
import apiService from './services/api';
import './App.css';

function App() {
  const [videos, setVideos] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('search');

  const handleSearch = async (params) => {
    setSearching(true);
    setError(null);
    setSuccess(null);
    setVideos([]);
    try {
      const result = await apiService.searchVideos(params);
      setVideos(result.videos);
      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (selectedVideos) => {
    try {
      const result = await apiService.addToDownloadQueue(selectedVideos);
      setSuccess(result.message);
      setTimeout(() => setActiveTab('downloads'), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-brand">nablet</h1>
          <p className="sidebar-subtitle">Video DNA Monitor</p>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
            Search
          </div>
          <div className={`nav-item ${activeTab === 'fingerprint' ? 'active' : ''}`} onClick={() => setActiveTab('fingerprint')}>
            Fingerprint
          </div>
          <div className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`} onClick={() => setActiveTab('downloads')}>
            Downloads
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div className="container">
          <header className="app-header">
            <h1 className="page-title">
              {activeTab === 'search'
                ? 'Search'
                : activeTab === 'fingerprint'
                ? 'Fingerprinting'
                : 'Download Queue'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'search'
                ? 'Search YouTube videos or extract keywords from any video URL'
                : activeTab === 'fingerprint'
                ? 'Detect similar videos using fingerprinting'
                : 'Monitor your downloads'}
            </p>
          </header>

          {error && (
            <div className="notification error">
              {error}
              <button onClick={() => setError(null)} className="close-btn">×</button>
            </div>
          )}

          {success && (
            <div className="notification success">
              {success}
              <button onClick={() => setSuccess(null)} className="close-btn">×</button>
            </div>
          )}

          {activeTab === 'search' && (
            <>
              <SearchForm onSearch={handleSearch} loading={searching} />
              {videos.length > 0 && <VideoList videos={videos} onDownload={handleDownload} />}
              {!searching && videos.length === 0 && !error && (
                <div className="empty-state">
                  <h3>Start searching</h3>
                  <p>Use the form above to search YouTube videos</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'fingerprint' && <Fingerprinting />}
          {activeTab === 'downloads' && <DownloadQueue />}
        </div>
      </main>
    </div>
  );
}

export default App;