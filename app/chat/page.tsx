'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Search } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const chats = [
    { id: 1, name: 'Maria Santos', lastMessage: 'Great, thanks for the help!', timestamp: '2 min', avatar: 'MS', unread: 2 },
    { id: 2, name: 'Juan Dela Cruz', lastMessage: 'When can you start?', timestamp: '15 min', avatar: 'JC', unread: 0 },
    { id: 3, name: 'Rosa Garcia', lastMessage: 'I\'ll confirm by tomorrow', timestamp: '1 hour', avatar: 'RG', unread: 0 },
  ];

  const messages = [
    { id: 1, sender: 'You', text: 'Hi, are you still available?', timestamp: '10:30 AM' },
    { id: 2, sender: 'Maria Santos', text: 'Yes, I am! When do you need the service?', timestamp: '10:32 AM' },
    { id: 3, sender: 'You', text: 'This Saturday would be perfect', timestamp: '10:35 AM' },
    { id: 4, sender: 'Maria Santos', text: 'Great, thanks for the help!', timestamp: '10:37 AM' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border p-4 h-16 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              className={`w-full p-4 border-b border-border transition-colors flex items-center gap-3 hover:bg-secondary ${
                selectedChat === chat.id ? 'bg-secondary' : ''
              }`}
            >
              <Avatar name={chat.avatar} />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{chat.name}</p>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{chat.timestamp}</p>
                {chat.unread > 0 && (
                  <div className="mt-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {chat.unread}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-card border-b border-border p-4 h-16 flex items-center gap-3">
              <Avatar name={chats.find(c => c.id === selectedChat)?.avatar || ''} />
              <h2 className="text-lg font-bold text-foreground">{chats.find(c => c.id === selectedChat)?.name}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'} rounded-lg p-3`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'You' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-card border-t border-border p-4 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
              />
              <Button variant="primary" size="sm" onClick={() => setMessage('')}>
                <Send size={18} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
