import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import styles from './Chat.module.css';

export default function Chat({ token, currentUserId, currentUserRole, contactId, contactName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [contactId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!contactId) return;
    try {
      const { data } = await API.get(`/messages/conversation/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      if (err.response?.status !== 403) {
        setError('Failed to load messages');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await API.post('/messages', 
        { receiverId: contactId, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!contactId) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          Select a contact to start messaging
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{contactName}</h3>
        <p className={styles.role}>{currentUserRole === 'doctor' ? 'Patient' : 'Doctor'}</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.messagesContainer}>
        {loading ? (
          <div className={styles.loading}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className={styles.noMessages}>
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.sender_id === currentUserId ? styles.sent : styles.received}`}
              >
                <div className={styles.bubble}>
                  <p className={styles.content}>{msg.content}</p>
                  <span className={styles.time}>
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className={styles.inputForm}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className={styles.sendBtn}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
