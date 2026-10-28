import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { BARANGAYS, JOB_CATEGORIES } from '../constants/barangays';

export const PostJob = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    barangay: '',
    salary: '',
    duration: '',
    requirements: '',
    contactName: '',
    contactPhone: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);
    setFormData(prev => ({
      ...prev,
      barangay: userData.barangay || '',
      contactName: userData.name || '',
    }));
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
    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.category) newErrors.category = 'Job category is required';
    if (!formData.description.trim()) newErrors.description = 'Job description is required';
    if (!formData.barangay) newErrors.barangay = 'Barangay is required';
    if (!formData.duration) newErrors.duration = 'Duration is required';
    if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Job posting created successfully!');
      navigate('/dashboard');
    }, 500);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Post a Job Opportunity</CardTitle>
            <p className="text-muted-foreground mt-2">
              Share a job opportunity with your community in San Miguel
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Job Details</h3>
                
                <Input
                  label="Job Title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                  placeholder="e.g., Construction Worker, Domestic Helper"
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Job Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {JOB_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-destructive">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Job Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the job responsibilities, requirements, and what you're looking for..."
                    rows="5"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Salary Range (Optional)"
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="e.g., 300-500 per day"
                  />
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Job Duration
                    </label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select duration</option>
                      <option value="one_time">One-time</option>
                      <option value="temporary">Temporary (1-3 months)</option>
                      <option value="contract">Contract (3-6 months)</option>
                      <option value="permanent">Permanent</option>
                    </select>
                    {errors.duration && (
                      <p className="mt-1 text-sm text-destructive">{errors.duration}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Location (Barangay)
                  </label>
                  <select
                    name="barangay"
                    value={formData.barangay}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select barangay</option>
                    {BARANGAYS.map(barangay => (
                      <option key={barangay} value={barangay}>{barangay}</option>
                    ))}
                  </select>
                  {errors.barangay && (
                    <p className="mt-1 text-sm text-destructive">{errors.barangay}</p>
                  )}
                </div>

                <Input
                  label="Requirements (Optional)"
                  type="text"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="e.g., Must have experience, High school graduate"
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
                
                <Input
                  label="Your Name"
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  error={errors.contactName}
                  disabled
                />

                <Input
                  label="Contact Phone Number"
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  error={errors.contactPhone}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Posting...' : 'Post Job'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
