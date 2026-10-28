import React, { useState } from 'react';
import { AlertTriangle, MapPin, Phone, Clock, Home, Building2, Users } from 'lucide-react';
import Navigation from '../components/Navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { BARANGAYS } from '../constants/barangays';

const emergencyTypes = [
  { id: 'fire', label: 'Fire Emergency', icon: '🔥', color: 'destructive' },
  { id: 'medical', label: 'Medical Emergency', icon: '🚑', color: 'destructive' },
  { id: 'accident', label: 'Accident', icon: '⚠️', color: 'destructive' },
  { id: 'crime', label: 'Crime/Safety', icon: '🚨', color: 'destructive' },
  { id: 'disaster', label: 'Disaster', icon: '💨', color: 'destructive' },
  { id: 'missing', label: 'Missing Person', icon: '👤', color: 'destructive' },
];

const mockEmergencies = [
  {
    id: 1,
    type: 'fire',
    title: 'House Fire at Barangay Ampid',
    description: 'Fire outbreak at residential area. Immediate evacuation needed.',
    location: 'Barangay Ampid, San Miguel',
    barangay: 'ampid',
    timestamp: 'Now',
    responders: 12,
    status: 'Active',
    contactName: 'Maria Cruz',
    contactPhone: '+63 917 123 4567'
  },
  {
    id: 2,
    type: 'medical',
    title: 'Medical Assistance Needed - Elderly Care',
    description: 'Senior citizen needs medical transport to hospital.',
    location: 'Barangay Polo, San Miguel',
    barangay: 'polo',
    timestamp: '15 mins ago',
    responders: 5,
    status: 'In Progress',
    contactName: 'Juan Dela Cruz',
    contactPhone: '+63 918 234 5678'
  },
  {
    id: 3,
    type: 'accident',
    title: 'Vehicle Accident on Main Road',
    description: 'Multi-vehicle collision. Traffic congestion reported.',
    location: 'San Miguel-Bulacan Road',
    barangay: 'urban',
    timestamp: '1 hour ago',
    responders: 8,
    status: 'Active',
    contactName: 'Police Department',
    contactPhone: 'Emergency: 911'
  },
];

export default function EmergencyAssistance() {
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);

  const filteredEmergencies = selectedFilter === 'all'
    ? mockEmergencies
    : mockEmergencies.filter(e => e.type === selectedFilter);

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="emergency" />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              Emergency Assistance
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time emergency alerts and community response coordination
            </p>
          </div>
          <Button onClick={() => setShowReportModal(true)} className="bg-destructive hover:bg-red-600">
            Report Emergency
          </Button>
        </div>

        {/* Emergency Type Filter */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-4">Filter by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`p-3 rounded-lg border-2 transition ${
                selectedFilter === 'all'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:border-primary'
              }`}
            >
              <span className="text-sm font-medium">All</span>
            </button>
            {emergencyTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedFilter(type.id)}
                className={`p-3 rounded-lg border-2 transition ${
                  selectedFilter === type.id
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border text-foreground hover:border-destructive'
                }`}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Active Emergencies</h2>
          {filteredEmergencies.length > 0 ? (
            filteredEmergencies.map(emergency => (
              <Card
                key={emergency.id}
                className="border-l-4 border-destructive cursor-pointer hover:shadow-lg transition"
                onClick={() => setSelectedEmergency(emergency)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="destructive">
                        {emergency.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {emergency.status}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {emergency.title}
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      {emergency.description}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        {emergency.location}
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="w-4 h-4 text-primary" />
                        {emergency.timestamp}
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        {emergency.responders} responders
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="w-4 h-4 text-primary" />
                        {emergency.contactPhone}
                      </div>
                    </div>
                  </div>
                  <Button className="ml-4">View Details</Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="text-center py-8">
              <p className="text-muted-foreground">
                No emergencies reported for selected type
              </p>
            </Card>
          )}
        </div>
      </main>

      {/* Emergency Detail Modal */}
      {selectedEmergency && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Emergency Details
              </h2>
              <button
                onClick={() => setSelectedEmergency(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-semibold text-foreground">
                  {selectedEmergency.title}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground">
                  {selectedEmergency.description}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-semibold text-foreground">
                  {selectedEmergency.contactName}
                </p>
                <p className="text-foreground">
                  {selectedEmergency.contactPhone}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1">Respond Now</Button>
              <Button variant="outline" className="flex-1">
                Share Alert
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Report Emergency Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Report Emergency
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Emergency Type
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  {emergencyTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Location / Barangay
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  {BARANGAYS.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                  placeholder="Describe the emergency..."
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-destructive hover:bg-red-600">
                  Report Emergency
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
