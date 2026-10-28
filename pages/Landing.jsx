import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';

export const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '💼',
      title: 'Find Jobs',
      description: 'Browse job opportunities from local businesses and community members in San Miguel.',
    },
    {
      icon: '🤝',
      title: 'Request Help',
      description: 'Post assistance requests and get support from your community neighbors.',
    },
    {
      icon: '🚨',
      title: 'Emergency Alerts',
      description: 'Stay informed about emergency situations and community alerts.',
    },
    {
      icon: '🔍',
      title: 'Lost & Found',
      description: 'Help recover lost items or report found belongings in your community.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">BL</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-foreground">BAYANIHAN LINK</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/register')}>
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Connect with Your Community
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            BAYANIHAN LINK is a platform that helps San Miguel, Bulacan residents find jobs, request assistance, and support one another.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/register')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent>
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center bg-primary rounded-lg p-12 text-primary-foreground">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Join BAYANIHAN LINK?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Create an account and start connecting with your community today.
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate('/register')}
            className="text-primary"
          >
            Create Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">About</h3>
              <p className="text-sm text-muted-foreground">
                BAYANIHAN LINK connects the San Miguel, Bulacan community.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Home</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4">Contact</h3>
              <p className="text-sm text-muted-foreground">
                San Miguel, Bulacan<br/>
                Email: info@bayanihanlink.ph
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 BAYANIHAN LINK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
