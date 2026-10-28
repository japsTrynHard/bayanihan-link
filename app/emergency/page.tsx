'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge from '@/components/Badge';

export default function EmergencyPage() {
  const emergencies = [
    {
      id: 1,
      title: 'House Fire - Purok 1',
      location: 'San Vicente',
      severity: 'critical',
      timestamp: '10 minutes ago',
      contact: 'Juan Santos - 09123456789',
    },
    {
      id: 2,
      title: 'Medical Emergency - Barangay Hall',
      location: 'Poblacion',
      severity: 'high',
      timestamp: '45 minutes ago',
      contact: 'Maria Reyes - 09198765432',
    },
    {
      id: 3,
      title: 'Lost Child - Market Area',
      location: 'Kayquilao',
      severity: 'high',
      timestamp: '2 hours ago',
      contact: 'Rosa Garcia - 09112233445',
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
          <h1 className="text-xl font-bold text-foreground">Emergency Alerts</h1>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Report Emergency Button */}
        <div className="mb-8">
          <Button variant="danger" size="lg" className="w-full">
            <AlertTriangle size={20} /> Report Emergency Now
          </Button>
        </div>

        {/* Active Emergencies */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Active Emergencies</h2>
          
          {emergencies.map(emergency => (
            <Card key={emergency.id} className="border-l-4 border-l-destructive">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{emergency.title}</h3>
                  <p className="text-sm text-muted-foreground">{emergency.location}</p>
                </div>
                <Badge variant="danger">
                  {emergency.severity === 'critical' ? 'CRITICAL' : 'HIGH'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <strong>Contact:</strong> {emergency.contact}
                </p>
                <p className="text-muted-foreground">
                  <strong>Reported:</strong> {emergency.timestamp}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="primary" size="sm">Call</Button>
                <Button variant="outline" size="sm">Message</Button>
                <Button variant="outline" size="sm">Share</Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
