import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BARANGAYS } from '../constants/barangays';

export const BarangayDirectory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [barangayStats, setBarangayStats] = useState({});

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);
    setSelectedBarangay(userData.barangay || '');

    // Mock barangay statistics
    const stats = {};
    BARANGAYS.forEach(barangay => {
      stats[barangay] = {
        jobs: Math.floor(Math.random() * 20),
        helpRequests: Math.floor(Math.random() * 15),
        members: Math.floor(Math.random() * 500) + 50,
        officials: [
          { name: 'Juan Santos', position: 'Barangay Captain' },
          { name: 'Maria Garcia', position: 'Barangay Secretary' },
          { name: 'Carlos Reyes', position: 'Barangay Treasurer' },
        ],
        contact: `brgy.${barangay.toLowerCase().replace(/ /g, '')}@sanmiguelbulacan.gov.ph`,
        hotline: '(055) 123-4567',
      };
    });
    setBarangayStats(stats);
  }, [navigate]);

  const filteredBarangays = BARANGAYS.filter(barangay =>
    barangay.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <span className="hidden sm:inline font-bold text-lg text-foreground">Barangay Directory</span>
          </button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Feed
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Find Your Barangay</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Search barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Barangays Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBarangays.map(barangay => {
            const stats = barangayStats[barangay] || {};
            const isUserBarangay = barangay === user.barangay;

            return (
              <Card
                key={barangay}
                className={`flex flex-col ${
                  isUserBarangay ? 'border-primary bg-blue-50' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{barangay}</CardTitle>
                    {isUserBarangay && (
                      <Badge className="text-xs">Your Barangay</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats.jobs || 0}</p>
                      <p className="text-xs text-muted-foreground">Job Listings</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.helpRequests || 0}</p>
                      <p className="text-xs text-muted-foreground">Help Requests</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg col-span-2">
                      <p className="text-2xl font-bold text-purple-600">{stats.members || 0}</p>
                      <p className="text-xs text-muted-foreground">Community Members</p>
                    </div>
                  </div>

                  {/* Officials */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Officials</h4>
                    <div className="space-y-2">
                      {stats.officials?.map((official, idx) => (
                        <div key={idx} className="text-sm border-b border-border pb-2 last:border-b-0">
                          <p className="font-medium text-foreground">{official.name}</p>
                          <p className="text-xs text-muted-foreground">{official.position}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">CONTACT</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-foreground break-all">{stats.contact}</p>
                      <p className="text-foreground">{stats.hotline}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate('/dashboard')}
                    >
                      View Posts
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate('/find-help')}
                    >
                      Help Needed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBarangays.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                No barangays found matching your search
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
