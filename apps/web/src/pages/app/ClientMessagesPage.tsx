import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearToken, getToken } from '../../lib/api';

type Message = {
  id: string;
  message: string;
  created_at: string;
  sender_user_id?: string;
  sender_role?: string;
  sender_name?: string;
};

export function ClientMessagesPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      clearToken();
      navigate('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'CLIENT' && payload.role !== 'ADMIN') {
        clearToken();
        navigate('/login');
        return;
      }
    } catch {
      clearToken();
      navigate('/login');
      return;
    }
    apiFetch<{ messages: Message[] }>('/api/client/messages')
      .then((data) => setMessages(data.messages))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unable to load messages';
        if (msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('Invalid token') || msg.includes('jwt')) {
          clearToken();
          navigate('/login');
          return;
        }
        setError(msg);
      });
  }, [navigate]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      const result = await apiFetch<{ message: Message }>('/api/client/messages', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages((current) => [...current, result.message]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
    }
  };

  return (
    <div className="client-portal">
      <main className="portal-main">
        <div className="portal-content">
          <button className="text-button" onClick={() => navigate('/client')}>← Back to dashboard</button>
          <section className="panel client-chat">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CLIENT SUPPORT & COMMUNICATIONS</p>
                <h2>Official Communications</h2>
                <p>Preserved correspondence thread with GSTBro Management & Support Team.</p>
              </div>
            </div>
            {error && <div className="team-error">{error}</div>}
            <div className="chat-history" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((item) => {
                const isAdmin = item.sender_role === 'ADMIN';
                const isTeam = item.sender_role === 'TEAM';
                const isClient = item.sender_role === 'CLIENT';

                return (
                  <div
                    className="chat-message"
                    key={item.id}
                    style={{
                      borderLeft: isAdmin
                        ? '4px solid #4f46e5'
                        : isTeam
                        ? '4px solid #0284c7'
                        : '4px solid #94a3b8',
                      background: isAdmin ? 'rgba(79, 70, 229, 0.04)' : undefined,
                      padding: '12px 16px',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {isAdmin ? (
                        <span
                          style={{
                            background: '#312e81',
                            color: '#e0e7ff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          🛡️ GSTBro Admin (Management)
                        </span>
                      ) : isTeam ? (
                        <span
                          style={{
                            background: '#0369a1',
                            color: '#e0f2fe',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          👤 Assigned Team Specialist
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          You (Client)
                        </span>
                      )}
                      <small style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.message}</p>
                  </div>
                );
              })}
              {!messages.length && <div className="empty-state">No messages yet.</div>}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message to GSTBro..." rows={4} />
            <button className="primary-button" onClick={send} disabled={!text.trim()}>Send message</button>
          </section>
        </div>
      </main>
    </div>
  );
}
