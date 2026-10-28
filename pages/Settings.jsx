import React, { useState } from 'react';
import { Settings, Lock, Bell, Eye, LogOut, User, Mail, Phone } from 'lucide-react';
import Navigation from '../components/Navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [editingField, setEditingField] = useState(null);

  const tabs = [
    { id: 'account', label: 'Account Settings', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'visibility', label: 'Profile Visibility', icon: Eye },
  ];

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Personal Information
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Full Name', value: 'Maria Santos', icon: User },
            { label: 'Email Address', value: 'maria.santos@email.com', icon: Mail },
            { label: 'Phone Number', value: '+63 917 123 4567', icon: Phone },
            { label: 'Barangay', value: 'Barangay Polo', icon: null },
          ].map((field, idx) => (
            <div key={idx} className="flex items-center justify-between pb-4 border-b border-border last:border-b-0">
              <div className="flex items-center gap-3">
                {field.icon && <field.icon className="w-5 h-5 text-primary" />}
                <div>
                  <p className="text-sm text-muted-foreground">{field.label}</p>
                  <p className="font-semibold text-foreground">{field.value}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingField(field.label)}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Profile Photo
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
            MS
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Current profile photo
            </p>
            <div className="flex gap-2">
              <Button size="sm">Change Photo</Button>
              <Button size="sm" variant="outline">Remove</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPrivacySecurity = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Password & Security
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Password</p>
            <p className="text-foreground font-semibold mb-3">
              Last changed 3 months ago
            </p>
            <Button>Change Password</Button>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Two-Factor Authentication</p>
            <p className="text-foreground font-semibold mb-3">
              Status: Not Enabled
            </p>
            <Button variant="outline">Enable 2FA</Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Active Sessions
        </h3>
        <div className="space-y-3">
          {[
            { device: 'Chrome on Windows', location: 'San Miguel, Bulacan', current: true },
            { device: 'Safari on iPhone', location: 'San Miguel, Bulacan', current: false },
          ].map((session, idx) => (
            <div key={idx} className="flex items-center justify-between pb-3 border-b border-border last:border-b-0">
              <div>
                <p className="font-semibold text-foreground">{session.device}</p>
                <p className="text-sm text-muted-foreground">{session.location}</p>
              </div>
              <div className="flex items-center gap-2">
                {session.current && (
                  <Badge variant="default">Current</Badge>
                )}
                {!session.current && (
                  <Button size="sm" variant="outline">
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Email Notifications
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Job Postings', description: 'New job matching your interests', enabled: true },
            { label: 'Assistance Requests', description: 'Community requests for help', enabled: true },
            { label: 'Messages', description: 'New messages from community members', enabled: true },
            { label: 'Weekly Digest', description: 'Summary of community activity', enabled: false },
            { label: 'Marketing Emails', description: 'Updates and promotional content', enabled: false },
          ].map((notif, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-semibold text-foreground">{notif.label}</p>
                <p className="text-sm text-muted-foreground">
                  {notif.description}
                </p>
              </div>
              <input
                type="checkbox"
                checked={notif.enabled}
                onChange={() => {}}
                className="w-5 h-5 rounded border-border cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Push Notifications
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Emergency Alerts', description: 'Real-time emergency notifications', enabled: true },
            { label: 'Job Alerts', description: 'New relevant job opportunities', enabled: true },
            { label: 'Messages', description: 'Message notifications', enabled: true },
          ].map((notif, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-semibold text-foreground">{notif.label}</p>
                <p className="text-sm text-muted-foreground">
                  {notif.description}
                </p>
              </div>
              <input
                type="checkbox"
                checked={notif.enabled}
                onChange={() => {}}
                className="w-5 h-5 rounded border-border cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderVisibility = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Profile Visibility
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Choose who can see your profile and activities
            </p>
            {[
              { label: 'Public', description: 'Visible to all community members' },
              { label: 'Friends Only', description: 'Visible to connections' },
              { label: 'Private', description: 'Only visible to you' },
            ].map((option, idx) => (
              <div key={idx} className="flex items-center p-3 border border-border rounded-lg mb-2">
                <input
                  type="radio"
                  name="visibility"
                  defaultChecked={idx === 0}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-semibold text-foreground">{option.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Data Sharing
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Share activity with connections', enabled: true },
            { label: 'Allow profile search indexing', enabled: true },
            { label: 'Show online status', enabled: true },
          ].map((option, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <p className="text-foreground font-semibold">{option.label}</p>
              <input
                type="checkbox"
                checked={option.enabled}
                onChange={() => {}}
                className="w-5 h-5 rounded border-border cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-border">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {activeTab === 'account' && renderAccountSettings()}
          {activeTab === 'privacy' && renderPrivacySecurity()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'visibility' && renderVisibility()}
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive bg-destructive/5">
          <h3 className="text-lg font-semibold text-destructive mb-4">
            Danger Zone
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Sign out from all devices
              </p>
              <Button variant="outline" className="w-full justify-start">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out Everywhere
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Delete your account and all associated data
              </p>
              <Button className="w-full bg-destructive hover:bg-red-600 justify-start">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
