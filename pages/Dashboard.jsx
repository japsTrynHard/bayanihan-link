import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Badge } from '../components/Badge';
import { POST_TYPE_LABELS, POST_TYPES } from '../constants/barangays';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);

    // Mock posts data
    const mockPosts = [
      {
        id: 1,
        type: POST_TYPES.JOB,
        title: 'Construction Worker Needed',
        author: 'Juan Santos',
        barangay: 'San Isidro',
        description: 'Looking for experienced construction worker for residential project.',
        postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 12,
        comments: 3,
      },
      {
        id: 2,
        type: POST_TYPES.ASSISTANCE,
        title: 'Medical Assistance Request',
        author: 'Maria Garcia',
        barangay: 'San Antonio',
        description: 'Seeking financial assistance for medical treatment expenses.',
        postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        likes: 8,
        comments: 5,
      },
      {
        id: 3,
        type: POST_TYPES.EMERGENCY,
        title: 'Lost Dog - Please Share',
        author: 'Carlos Reyes',
        barangay: 'Bagong Bayan',
        description: 'Lost brown labrador near Bagong Bayan market. Any information appreciated.',
        postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        likes: 15,
        comments: 8,
      },
      {
        id: 4,
        type: POST_TYPES.JOB,
        title: 'Domestic Helper Wanted',
        author: 'Rosa Cruz',
        barangay: 'San Fernando',
        description: 'Looking for experienced domestic help. Full-time position available.',
        postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        likes: 5,
        comments: 2,
      },
      {
        id: 5,
        type: POST_TYPES.LOST_FOUND,
        title: 'Found Wallet',
        author: 'Miguel Lopez',
        barangay: 'Platero',
        description: 'Found wallet in the market area. Contact me to claim.',
        postedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        likes: 3,
        comments: 1,
      },
    ];
    setPosts(mockPosts);
  }, [navigate]);

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => post.type === filter);

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case POST_TYPES.JOB:
        return 'info';
      case POST_TYPES.ASSISTANCE:
        return 'secondary';
      case POST_TYPES.EMERGENCY:
        return 'danger';
      case POST_TYPES.LOST_FOUND:
        return 'warning';
      default:
        return 'default';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">BL</span>
              </div>
              <span className="hidden sm:inline font-bold text-lg text-foreground">BAYANIHAN LINK</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className="text-sm font-medium text-primary border-b-2 border-primary">
                Feed
              </Link>
              <Link to="/find-help" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Find Help
              </Link>
              <Link to="/post-job" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Post Job
              </Link>
              <Link to="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Messages
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold hover:bg-blue-600 transition-colors"
                title={user.name}
              >
                {user.name?.charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={() => {
                  sessionStorage.removeItem('user');
                  navigate('/');
                }}
                className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground">
            {user.barangay && `Based in ${user.barangay}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Button 
            className="w-full"
            onClick={() => navigate('/post-job')}
          >
            Post a Job Opportunity
          </Button>
          <Button 
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/find-help')}
          >
            Request Assistance
          </Button>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setFilter(POST_TYPES.JOB)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === POST_TYPES.JOB
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setFilter(POST_TYPES.ASSISTANCE)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === POST_TYPES.ASSISTANCE
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Assistance
          </button>
          <button
            onClick={() => setFilter(POST_TYPES.EMERGENCY)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === POST_TYPES.EMERGENCY
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Emergency
          </button>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <Card 
                key={post.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={getTypeColor(post.type)}>
                      {POST_TYPE_LABELS[post.type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(post.postedAt)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {post.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="space-x-4">
                      <span>By {post.author}</span>
                      <span>•</span>
                      <span>{post.barangay}</span>
                    </div>
                    <div className="flex gap-4">
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  No posts found. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
