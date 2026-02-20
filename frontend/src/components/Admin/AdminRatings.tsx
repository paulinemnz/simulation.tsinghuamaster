import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminStyles.css';

interface QueueItem {
  participantId: string;
  mode: string | null;
  act1Needed: boolean;
  act4Needed: boolean;
}

const emptyRating = {
  vertical_coherence: 4,
  vertical_evidence: 4,
  vertical_tradeoffs: 4,
  vertical_accuracy: 4,
  vertical_impl: 4,
  horizontal_novelty: 4,
  horizontal_diff: 4,
  horizontal_synthesis: 4
};

const AdminRatings: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [actNumber, setActNumber] = useState<number>(1);
  const [rating, setRating] = useState<any>(emptyRating);
  const [message, setMessage] = useState<string | null>(null);

  const loadQueue = () => {
    api.get('/admin/ratings/queue').then(response => setQueue(response.data.data));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const submitRating = async () => {
    if (!selected) return;
    await api.post('/admin/ratings', {
      participant_id: selected.participantId,
      act_number: actNumber,
      ...rating
    });
    setMessage('Rating saved.');
    setRating(emptyRating);
    loadQueue();
  };

  return (
    <div className="admin-page">
      <h2>Ratings Queue</h2>
      {message && <div className="admin-card">{message}</div>}
      <div className="admin-grid">
        {queue.map(item => (
          <div key={item.participantId} className="admin-card">
            <h4>{item.participantId.slice(0, 8)}</h4>
            <p>Mode: {item.mode || '-'}</p>
            <p>Act1 needed: {item.act1Needed ? 'Yes' : 'No'}</p>
            <p>Act4 needed: {item.act4Needed ? 'Yes' : 'No'}</p>
            <button
              onClick={() => {
                setSelected(item);
                setActNumber(item.act1Needed ? 1 : 4);
              }}
            >
              Rate
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="admin-card">
          <h3>Rate Participant {selected.participantId.slice(0, 8)}</h3>
          <label>
            Act Number
            <select value={actNumber} onChange={event => setActNumber(Number(event.target.value))}>
              <option value={1}>Act 1</option>
              <option value={4}>Act 4</option>
            </select>
          </label>
          {Object.keys(emptyRating).map(key => (
            <label key={key}>
              {key.replace(/_/g, ' ')}
              <input
                type="number"
                min={1}
                max={7}
                value={rating[key]}
                onChange={event => setRating({ ...rating, [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <button onClick={submitRating}>Save Rating</button>
        </div>
      )}
    </div>
  );
};

export default AdminRatings;
