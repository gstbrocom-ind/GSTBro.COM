import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../lib/api';

interface ChatMessage {
  id: string;
  message: string;
  sender_user_id: string;
  sender_role?: string;
  sender_name?: string;
  created_at: string;
  read_at?: string | null;
}

interface TeamChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientGstin?: string | null;
}

export function TeamChatModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  clientGstin,
}: TeamChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!clientId) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/team/clients/${clientId}/messages`);
      setMessages(res.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  };

  useEffect(() => {
    if (!isOpen || !clientId) return;
    setLoading(true);
    setError(null);
    fetchMessages().finally(() => setLoading(false));

    // Poll for new messages while modal is open
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, [isOpen, clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content || !clientId || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await apiFetch<{ message: ChatMessage }>(`/api/team/clients/${clientId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: content }),
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setText('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {clientName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{clientName}</h3>
                {clientGstin && (
                  <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    {clientGstin}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {clientEmail || 'Assigned Client Support Channel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* Audit Notice */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-[11px] text-blue-800">
          <span className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Client Communication Desk (Audit Active)</span>
          </span>
          <span className="text-[10px] text-blue-600">Preserved for Compliance</span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 text-xs border-b border-red-100">
            {error}
          </div>
        )}

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {loading && (
            <div className="text-center py-8 text-xs text-slate-400">
              Loading conversation history...
            </div>
          )}

          {!loading && !messages.length && (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl block">💬</span>
              <p className="text-xs font-semibold text-slate-700">No messages exchanged yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Send a message to your assigned client to update them on filing status or request documents.
              </p>
            </div>
          )}

          {messages.map((m) => {
            const isClient = m.sender_user_id === clientId || m.sender_role === 'CLIENT';
            const isAdmin = m.sender_role === 'ADMIN';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold">
                    {isClient ? (
                      <span className="text-slate-600">{clientName}</span>
                    ) : isAdmin ? (
                      <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px]">
                        🛡️ GSTBro Admin
                      </span>
                    ) : (
                      <span className="text-blue-700">👤 {m.sender_name || 'Team Specialist'}</span>
                    )}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                    isClient
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      : isAdmin
                      ? 'bg-indigo-900 text-white rounded-tr-xs border border-indigo-700 shadow-sm'
                      : 'bg-blue-600 text-white rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Footer Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center">
          <input
            type="text"
            placeholder="Type your message to the client..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            {sending ? 'Sending...' : 'Send'} <span>➤</span>
          </button>
        </form>
      </div>
    </div>
  );
}
