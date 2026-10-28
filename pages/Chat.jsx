import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';

export const Chat = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);

    // Mock conversations
    const mockConversations = [
      {
        id: 1,
        name: 'Juan Santos',
        lastMessage: 'Are you still interested in the construction job?',
        lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
        unread: true,
      },
      {
        id: 2,
        name: 'Maria Garcia',
        lastMessage: 'Thank you for responding to my request',
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unread: false,
      },
      {
        id: 3,
        name: 'Carlos Reyes',
        lastMessage: 'I will contact you soon with updates',
        lastMessageTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
        unread: false,
      },
    ];
    setConversations(mockConversations);
  }, [navigate]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // Mock messages
    const mockMessages = [
      {
        id: 1,
        sender: conversation.name,
        text: 'Hi, I saw your job posting. Are you still looking?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 2,
        sender: user.name,
        text: 'Yes, we are still hiring! Can you tell me more about your experience?',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        id: 3,
        sender: conversation.name,
        text: 'Are you still interested in the construction job?',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
    ];
    setMessages(mockMessages);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const message = {
      id: messages.length + 1,
      sender: user.name,
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages([...messages, message]);
    setNewMessage('');
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">BL</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-foreground">Messages</span>
          </button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Feed
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <Card className="flex flex-col">
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <h2 className="font-bold text-foreground mb-4">Messages</h2>
              <div className="space-y-2">
                {conversations.map(conversation => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{conversation.name}</p>
                        <p className={`text-sm truncate ${
                          selectedConversation?.id === conversation.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {conversation.lastMessage}
                        </p>
                      </div>
                      {conversation.unread && (
                        <div className="w-2 h-2 bg-destructive rounded-full ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          {selectedConversation ? (
            <Card className="lg:col-span-2 flex flex-col">
              {/* Chat Header */}
              <div className="border-b border-border p-4">
                <h3 className="font-bold text-foreground text-lg">
                  {selectedConversation.name}
                </h3>
              </div>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === user.name ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.sender === user.name
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      {message.sender !== user.name && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.sender}
                        </p>
                      )}
                      <p className="break-words">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === user.name
                          ? 'text-primary-foreground/60'
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    Send
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
