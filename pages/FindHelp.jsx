import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Badge } from '../components/Badge';
import { ASSISTANCE_TYPES } from '../constants/barangays';

export const FindHelp = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assistanceRequests, setAssistanceRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    urgency: 'normal',
    phone: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);

    // Mock assistance requests
    const mockRequests = [
      {
        id: 1,
        title: 'Tuition Assistance Needed',
        type: 'Educational Assistance',
        author: 'Ana Lopez',
        barangay: 'San Marcos',
        description: 'Help needed for school tuition fees for two children.',
        urgency: 'normal',
        postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        responses: 5,
      },
      {
        id: 2,
        title: 'Food Assistance - Family in Need',
        type: 'Food Assistance',
        author: 'Rita Santos',
        barangay: 'Banalo',
        description: 'Family struggling with food shortage due to loss of employment.',
        urgency: 'high',
        postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        responses: 12,
      },
      {
        id: 3,
        title: 'Livelihood Skills Training',
        type: 'Livelihood Programs',
        author: 'Pedro Cruz',
        barangay: 'Santa Cruz',
        description: 'Seeking training or guidance in small business startup.',
        urgency: 'normal',
        postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        responses: 3,
      },
      {
        id: 4,
        title: 'Medical Support Request',
        type: 'Medical Support',
        author: 'Rosa Reyes',
        barangay: 'San Antonio',
        description: 'Need help with medical bills for elderly parent.',
        urgency: 'high',
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        responses: 8,
      },
    ];
    setAssistanceRequests(mockRequests);
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.type) newErrors.type = 'Please select assistance type';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.phone.trim()) newErrors.phone = 'Contact phone is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newRequest = {
      id: assistanceRequests.length + 1,
      ...formData,
      author: user.name,
      barangay: user.barangay,
      postedAt: new Date(),
      responses: 0,
    };
    setAssistanceRequests([newRequest, ...assistanceRequests]);
    setFormData({
      title: '',
      type: '',
      description: '',
      urgency: 'normal',
      phone: '',
    });
    setShowForm(false);
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'high':
        return 'danger';
      case 'normal':
        return 'secondary';
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

  const filteredRequests = filter === 'all'
    ? assistanceRequests
    : assistanceRequests.filter(req => req.type === filter);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
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
          <Button
            onClick={() => setShowForm(!showForm)}
          >
            Post Help Request
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Modal */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Post a Help Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="What do you need help with?"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                  placeholder="e.g., Medical Assistance, Food Help"
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Type of Assistance
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    {ASSISTANCE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-destructive">{errors.type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Please describe what assistance you need..."
                    rows="4"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Urgency Level
                    </label>
                    <select
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <Input
                    label="Contact Phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Post Request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            All Requests
          </button>
          {ASSISTANCE_TYPES.slice(0, 4).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border hover:bg-secondary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map(request => (
              <Card key={request.id} className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <Badge variant={getUrgencyBadge(request.urgency)}>
                        {request.urgency === 'high' ? 'High Priority' : 'Normal'}
                      </Badge>
                      <Badge>{request.type}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(request.postedAt)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {request.title}
                  </h3>

                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {request.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="space-x-4">
                      <span>By {request.author}</span>
                      <span>•</span>
                      <span>{request.barangay}</span>
                    </div>
                    <span>💬 {request.responses}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  No help requests found.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
