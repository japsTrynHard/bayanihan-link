'use client';

import React, { useState } from 'react';
import { Plus, MapPin, Clock, Users, Search, AlertTriangle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Avatar from '@/components/Avatar';
import { BARANGAYS } from '@/constants/barangays';

const mockPosts = [
  {
    id: 1,
    type: 'job',
    title: 'Construction Helper Needed',
    description: 'Looking for experienced construction helpers for residential building project.',
    postedBy: 'Juan Dela Cruz',
    barangay: 'polo',
    timestamp: '2 hours ago',
    category: 'Construction',
    salary: '₱400/day',
    comments: 12,
    interests: 8,
    avatar: 'JDC'
  },
  {
    id: 2,
    type: 'assistance',
    title: 'Help Moving to New House',
    description: 'Need some helping hands to move furniture and boxes. Willing to provide meals.',
    postedBy: 'Maria Santos',
    barangay: 'ampid',
    timestamp: '1 hour ago',
    category: 'Moving',
    comments: 5,
    interests: 3,
    avatar: 'MS'
  },
  {
    id: 3,
    type: 'job',
    title: 'Catering Staff for Event',
    description: 'Hiring catering staff for a wedding celebration next weekend.',
    postedBy: 'Roberto Garcia',
    barangay: 'urban',
    timestamp: '3 hours ago',
    category: 'Events',
    salary: '₱500/day',
    comments: 8,
    interests: 15,
    avatar: 'RG'
  },
];

const postCategories = [
  { id: 'all', label: 'All Posts' },
  { id: 'job', label: 'Jobs' },
  { id: 'assistance', label: 'Assistance' },
  { id: 'emergency', label: 'Emergency' },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = mockPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.type === selectedCategory;
    const matchesBarangay = selectedBarangay === 'all' || post.barangay === selectedBarangay;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesBarangay && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-sm">BL</span>
            </div>
            <span className="font-bold text-foreground hidden sm:inline text-base">BAYANIHAN</span>
          </Link>

          <div className="hidden md:flex gap-8">
            <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
            <Link href="/find-help" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Find Help</Link>
            <Link href="/emergency" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Emergency</Link>
            <Link href="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Messages</Link>
          </div>

          <div className="flex gap-2 ml-auto">
            <Link href="/login" className="hidden sm:block">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Sign Up</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-12 bg-gradient-to-br from-primary/8 to-accent/8 rounded-xl p-8 sm:p-12 border border-border/50">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Welcome to BAYANIHAN LINK
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Connect with your community in San Miguel, Bulacan. Find job opportunities, request assistance, share resources, and support fellow community members.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          <Link href="/post-job" className="block">
            <Button variant="primary" size="lg" className="w-full">
              <Plus className="w-5 h-5" />
              Post a Job
            </Button>
          </Link>
          <Link href="/emergency" className="block">
            <Button variant="danger" size="lg" className="w-full">
              <AlertTriangle className="w-5 h-5" />
              Report Emergency
            </Button>
          </Link>
          <Link href="/find-help" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              <MessageSquare className="w-5 h-5" />
              Find Help
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <div className="space-y-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search posts by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Post Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {postCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary text-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barangay Filter */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Location
                </label>
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
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
        </Card>

        {/* Posts Feed */}
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Community Feed
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>

          {filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map(post => (
                <Card key={post.id} elevated className="cursor-pointer hover:border-primary/30 transition-all group">
                  <div className="flex items-start gap-4 sm:gap-5">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar initials={post.avatar} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Posted by <span className="font-medium text-foreground">{post.postedBy}</span>
                          </p>
                        </div>
                        {post.salary && (
                          <Badge variant="success" size="lg" className="flex-shrink-0 font-semibold">
                            {post.salary}
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-foreground mb-4 line-clamp-2 sm:line-clamp-none">
                        {post.description}
                      </p>

                      {/* Meta Info - Tags and Location */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant={post.type === 'job' ? 'job' : 'help'} size="sm">
                          {post.type === 'job' ? 'Job' : 'Help'}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {post.category}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{BARANGAYS.find(b => b.id === post.barangay)?.name}</span>
                        </div>
                      </div>

                      {/* Footer - Stats and Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex gap-4">
                          <button className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors group/stat">
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">{post.interests} interested</span>
                            <span className="sm:hidden">{post.interests}</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors group/stat">
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">{post.comments} comments</span>
                            <span className="sm:hidden">{post.comments}</span>
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">{post.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 sm:py-16">
              <div className="text-center">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium mb-2">
                  No posts match your search
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
