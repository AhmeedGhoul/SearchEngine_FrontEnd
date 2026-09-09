import { useState, useEffect } from 'react';
import apiService from '../services/api';
import './DownloadQueue.css';

const DownloadQueue = () => {
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQueueStatus = async () => {
    try {
      const status = await apiService.getQueueStatus();
      setQueueStatus(status);
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'Pending',
      downloading: 'Downloading',
      completed: 'Completed',
      failed: 'Failed',
    };
    return badges[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status}`;
  };

  if (loading) {
    return (
      <div className="queue-container">
        <div className="loading">Loading queue status...</div>
      </div>
    );
  }

  if (!queueStatus) {
    return (
      <div className="queue-container">
        <div className="error">Failed to load queue status</div>
      </div>
    );
  }

  return (
    <div className="queue-container">
      <div className="queue-stats">
        <div className="stat-card">
          <div className="stat-label">In Queue</div>
          <div className="stat-value">{queueStatus.queue_size}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Downloading</div>
          <div className="stat-value">{queueStatus.downloading}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{queueStatus.completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{queueStatus.failed}</div>
        </div>
      </div>

      <div className="tasks-list">
        <h3>Download Tasks ({queueStatus.total_tasks})</h3>
        
        {queueStatus.tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No downloads yet</h3>
            <p>Search for videos and add them to the download queue</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {queueStatus.tasks.map((task) => (
              <div key={task.video_id} className={`task-card task-${task.status}`}>
                <div className="task-header">
                  <span className={getStatusClass(task.status)}>
                    {getStatusBadge(task.status)}
                  </span>
                  <span className="task-time">
                    {new Date(task.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <h4 className="task-title" title={task.title}>{task.title}</h4>
                
                {task.status === 'completed' && task.filename && (
                  <div className="task-filename">{task.filename}</div>
                )}
                
                {task.status === 'failed' && task.error && (
                  <div className="task-error">{task.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadQueue;