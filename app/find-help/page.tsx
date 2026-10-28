'use client';

import Link from 'next/link';
import { ArrowLeft, MessageSquare, MapPin } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Avatar from '@/components/Avatar';

export default function FindHelpPage() {
  const requests = [
    {
      id: 1,
      title: 'Help Moving to New House',
      description: 'Need some helping hands to move furniture and boxes',
      author: { name: 'Maria Santos', avatar: 'MS' },
      location: 'Ampid',
      category: 'Moving',
      timestamp: '1 hour ago',
      responses: 3,
    },
    {
      id: 2,
      title: 'Tutor Needed for Math',
      description: 'Looking for a math tutor for high school student',
      author: { name: 'John Reyes', avatar: 'JR' },
      location: 'Poblacion',
      category: 'Education',
      timestamp: '3 hours ago',
      responses: 5,
    },
    {
      id: 3,
      title: 'Medical Supplies Donation',
      description: 'Community center needs medical supplies for outreach',
      author: { name: 'Rosa Garcia', avatar: 'RG' },
      location: 'San Vicente',
      category: 'Community',
      timestamp: '1 day ago',
      responses: 8,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Find Help</h1>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Request Help Button */}
        <div className="mb-8">
          <Button variant="primary" size="lg" className="w-full">
            Request Help
          </Button>
        </div>

        {/* Help Requests */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Help Requests</h2>
          
          {requests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <Avatar name={request.author.avatar} />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">{request.author.name}</p>
                    </div>
                    <Badge variant="secondary">{request.category}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{request.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={16} /> {request.location}
                      </span>
                      <span>{request.timestamp}</span>
                    </div>
                    <span className="text-primary font-medium">{request.responses} responses</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="primary" size="sm">
                      <MessageSquare size={16} /> Respond
                    </Button>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
