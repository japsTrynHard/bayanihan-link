import React, { useState } from 'react';
import { Search, Filter, Plus, MapPin, Clock, Eye } from 'lucide-react';
import Navigation from '../components/Navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { BARANGAYS } from '../constants/barangays';

const mockListings = [
  {
    id: 1,
    type: 'lost',
    title: 'Lost: Golden Retriever',
    description: 'Missing since Sunday morning near Bayan Park. Answers to "Max".',
    location: 'Bayan Park, San Miguel',
    barangay: 'polo',
    date: 'March 14, 2026',
    postedBy: 'Maria Santos',
    image: '🐕',
    reward: '₱5,000',
    views: 234
  },
  {
    id: 2,
    type: 'found',
    title: 'Found: Silver Ring',
    description: 'Found near the public market. Has initials "JDC" inside.',
    location: 'Public Market, San Miguel',
    barangay: 'urban',
    date: 'March 16, 2026',
    postedBy: 'Juan Cruz',
    image: '💍',
    views: 89
  },
  {
    id: 3,
    type: 'lost',
    title: 'Lost: White Honda Motorcycle',
    description: 'Parked outside Puregold, got stolen around 2 PM. Plate# ABC-123.',
    location: 'Puregold Store, San Miguel',
    barangay: 'urban',
    date: 'March 15, 2026',
    postedBy: 'Robert Tan',
    image: '🏍️',
    reward: '₱10,000',
    views: 456
  },
  {
    id: 4,
    type: 'found',
    title: 'Found: School ID and Wallet',
    description: 'Found near Santos Elementary. Owner can claim at barangay office.',
    location: 'Santos Elementary School',
    barangay: 'ampid',
    date: 'March 16, 2026',
    postedBy: 'Barangay Staff',
    image: '📛',
    views: 123
  },
  {
    id: 5,
    type: 'lost',
    title: 'Lost: Blue Prescription Glasses',
    description: 'Lost reading glasses in blue case. Important for daily use.',
    location: 'San Miguel Health Center',
    barangay: 'ampid',
    date: 'March 16, 2026',
    postedBy: 'Elena Garcia',
    image: '👓',
    views: 67
  },
];

export default function LostAndFound() {
  const [listingType, setListingType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const filteredListings = mockListings.filter(listing => {
    const matchesType = listingType === 'all' || listing.type === listingType;
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBarangay = selectedBarangay === 'all' || listing.barangay === selectedBarangay;
    return matchesType && matchesSearch && matchesBarangay;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="lostfound" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lost & Found</h1>
            <p className="text-muted-foreground mt-2">
              Help the community find lost items and reunite with owners
            </p>
          </div>
          <Button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Post Listing
          </Button>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search lost or found items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Type
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'lost', label: 'Lost Items' },
                  { value: 'found', label: 'Found Items' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setListingType(option.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      listingType === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barangay Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Barangay
              </label>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Barangays</option>
                {BARANGAYS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.length > 0 ? (
            filteredListings.map(listing => (
              <Card
                key={listing.id}
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedListing(listing)}
              >
                {/* Image/Icon */}
                <div className="bg-secondary rounded-lg p-8 text-center mb-4">
                  <span className="text-6xl">{listing.image}</span>
                </div>

                {/* Badge */}
                <Badge variant={listing.type === 'lost' ? 'destructive' : 'default'} className="mb-2">
                  {listing.type === 'lost' ? 'LOST' : 'FOUND'}
                </Badge>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {listing.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {listing.description}
                </p>

                {/* Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    {listing.location}
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    {listing.date}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                  <span>By {listing.postedBy}</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {listing.views}
                  </div>
                </div>

                {listing.reward && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-center">
                    <p className="text-sm font-semibold text-yellow-800">
                      Reward: {listing.reward}
                    </p>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card className="text-center py-12">
                <p className="text-muted-foreground">
                  No listings found matching your criteria
                </p>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {selectedListing.title}
              </h2>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-secondary rounded-lg p-8 text-center">
                <span className="text-6xl">{selectedListing.image}</span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Description</p>
                <p className="text-foreground">{selectedListing.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Location</p>
                  <p className="text-foreground font-medium">{selectedListing.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Date</p>
                  <p className="text-foreground font-medium">{selectedListing.date}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Posted By</p>
                <p className="text-foreground font-medium">{selectedListing.postedBy}</p>
              </div>

              {selectedListing.reward && (
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">
                    Reward: {selectedListing.reward}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1">Contact Owner</Button>
              <Button variant="outline" className="flex-1">
                Share
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Post Lost/Found Item
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Type
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Lost Item</option>
                  <option>Found Item</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lost: Blue Bicycle"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                  placeholder="Provide details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Barangay
                </label>
                <select className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  {BARANGAYS.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Post Listing</Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPostModal(false)}
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
