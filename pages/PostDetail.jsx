import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Badge } from '../components/Badge';
import { POST_TYPE_LABELS, POST_TYPES } from '../constants/barangays';

export const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);

    // Mock post data
    const mockPosts = [
      {
        id: 1,
        type: POST_TYPES.JOB,
        title: 'Construction Worker Needed',
        author: 'Juan Santos',
        barangay: 'San Isidro',
        description: 'Looking for experienced construction worker for residential project. Must have experience in residential construction, basic knowledge of materials, and physical ability to work at heights. We offer competitive wages and a clean working environment.',
        fullDescription: 'We are a local construction company in San Isidro looking for experienced construction workers. The project involves residential house renovation expected to last 2-3 months. Working hours are 7 AM to 5 PM, Monday to Saturday. We provide all necessary tools and equipment. Interested applicants should bring ID and proof of previous work experience.',
        postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 12,
        comments: 3,
        salary: '300-500 per day',
        duration: 'Contract (2-3 months)',
        contact: 'Juan Santos',
        contactPhone: '+63 9171234567',
      },
      {
        id: 2,
        type: POST_TYPES.ASSISTANCE,
        title: 'Medical Assistance Request',
        author: 'Maria Garcia',
        barangay: 'San Antonio',
        description: 'Seeking financial assistance for medical treatment expenses. Mother is undergoing surgery and our family is having difficulty covering the costs.',
        fullDescription: 'My mother needs urgent surgery for her health condition. The total cost is 50,000 pesos but our family can only afford 20,000. We are asking for help from our community to cover the remaining balance. Any amount, no matter how small, will be greatly appreciated. We will provide receipts and updates on her condition.',
        postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        likes: 8,
        comments: 5,
        contact: 'Maria Garcia',
        contactPhone: '+63 9171234568',
      },
      {
        id: 3,
        type: POST_TYPES.LOST_FOUND,
        title: 'Lost Dog - Please Share',
        author: 'Carlos Reyes',
        barangay: 'Bagong Bayan',
        description: 'Lost brown labrador near Bagong Bayan market. Any information appreciated.',
        fullDescription: 'My beloved pet dog, a brown labrador named Max, went missing on March 15 near Bagong Bayan market. He is about 5 years old, very friendly, and responds to his name. If you see him, please contact me immediately. There is a reward for anyone who helps find him.',
        postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        likes: 15,
        comments: 8,
        contact: 'Carlos Reyes',
        contactPhone: '+63 9171234569',
      },
    ];

    const foundPost = mockPosts.find(p => p.id === parseInt(id));
    if (foundPost) {
      setPost(foundPost);
      setComments([
        {
          id: 1,
          author: 'Juan Dela Cruz',
          text: 'Interested! Do you still need workers?',
          postedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        {
          id: 2,
          author: 'Rosa Santos',
          text: 'Great opportunity! I know someone who might be interested.',
          postedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      ]);
    }
  }, [id, navigate]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: comments.length + 1,
      author: user.name,
      text: commentText,
      postedAt: new Date(),
    };
    setComments([...comments, newComment]);
    setCommentText('');
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

  if (!user || !post) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">BL</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-foreground">BAYANIHAN LINK</span>
          </button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Feed
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Post Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <Badge variant={getTypeColor(post.type)}>
                  {POST_TYPE_LABELS[post.type]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatTime(post.postedAt)}
                </span>
              </div>
              
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                <span>Posted by {post.author}</span>
                <span>•</span>
                <span>📍 {post.barangay}</span>
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-lg text-foreground whitespace-pre-wrap">
                  {post.fullDescription}
                </p>
              </div>

              {post.salary && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Salary: </span>{post.salary}
                  </p>
                </div>
              )}

              {post.duration && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Duration: </span>{post.duration}
                  </p>
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Contact Information</h2>
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-foreground mb-2">
                  <span className="font-semibold">Contact Person: </span>{post.contact}
                </p>
                <p className="text-foreground">
                  <span className="font-semibold">Phone: </span>{post.contactPhone}
                </p>
              </div>
            </div>

            {/* Engagement Section */}
            <div className="border-t border-border mt-6 pt-6 flex gap-4">
              <button
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  liked
                    ? 'bg-red-100 text-destructive'
                    : 'bg-secondary text-foreground hover:bg-border'
                }`}
              >
                ❤️ {post.likes + (liked ? 1 : 0)}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-border transition-colors">
                💬 {comments.length}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle>Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows="2"
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                  <Button
                    type="submit"
                    className="self-end"
                    disabled={!commentText.trim()}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 pb-4 border-b border-border last:border-b-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {comment.author?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{comment.author}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(comment.postedAt)}
                        </span>
                      </div>
                      <p className="text-foreground mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
