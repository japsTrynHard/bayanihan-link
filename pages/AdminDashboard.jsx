import React, { useState } from 'react';
import { BarChart3, Users, FileText, AlertTriangle, TrendingUp, Settings, Eye } from 'lucide-react';
import Navigation from '../components/Navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

const stats = [
  { label: 'Total Users', value: '2,458', change: '+12% from last month', icon: Users },
  { label: 'Active Posts', value: '342', change: '+8% from last month', icon: FileText },
  { label: 'Emergency Alerts', value: '12', change: '2 this week', icon: AlertTriangle },
  { label: 'Community Growth', value: '+156', change: 'New members this month', icon: TrendingUp },
];

const recentUsers = [
  { id: 1, name: 'Maria Santos', barangay: 'Polo', joined: 'Mar 15, 2026', status: 'verified' },
  { id: 2, name: 'Juan Dela Cruz', barangay: 'Ampid', joined: 'Mar 14, 2026', status: 'verified' },
  { id: 3, name: 'Anna Garcia', barangay: 'Urban', joined: 'Mar 13, 2026', status: 'pending' },
  { id: 4, name: 'Robert Tan', barangay: 'Bayan', joined: 'Mar 12, 2026', status: 'verified' },
];

const recentPosts = [
  { id: 1, title: 'Construction Helper Needed', postedBy: 'Juan', barangay: 'Polo', date: 'Mar 16', status: 'approved' },
  { id: 2, title: 'Lost: Golden Retriever', postedBy: 'Maria', barangay: 'Ampid', date: 'Mar 15', status: 'approved' },
  { id: 3, title: 'Help Moving House', postedBy: 'Anna', barangay: 'Urban', date: 'Mar 14', status: 'pending' },
];

const pendingApprovals = [
  { id: 1, type: 'user', name: 'Michael Santos', barangay: 'Polo', date: 'Mar 16' },
  { id: 2, type: 'post', title: 'Catering Services Offered', postedBy: 'Elena', date: 'Mar 15' },
  { id: 3, type: 'post', title: 'Lost Motorcycle', postedBy: 'Robert', date: 'Mar 14' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage community members, posts, and emergencies
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'posts', label: 'Posts' },
              { id: 'approvals', label: 'Pending Approvals' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Recent Users
                </h3>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentUsers.slice(0, 3).map(user => (
                  <div key={user.id} className="flex items-center justify-between pb-3 border-b border-border last:border-b-0">
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.barangay}</p>
                    </div>
                    <Badge variant={user.status === 'verified' ? 'default' : 'outline'}>
                      {user.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Posts */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Recent Posts
                </h3>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between pb-3 border-b border-border last:border-b-0">
                    <div>
                      <p className="font-semibold text-foreground text-sm line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {post.postedBy} • {post.date}
                      </p>
                    </div>
                    <Badge variant={post.status === 'approved' ? 'default' : 'outline'}>
                      {post.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              All Users
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 font-semibold text-foreground">Name</th>
                    <th className="text-left py-3 font-semibold text-foreground">Barangay</th>
                    <th className="text-left py-3 font-semibold text-foreground">Joined</th>
                    <th className="text-left py-3 font-semibold text-foreground">Status</th>
                    <th className="text-left py-3 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(user => (
                    <tr key={user.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-3">{user.name}</td>
                      <td className="py-3">{user.barangay}</td>
                      <td className="py-3">{user.joined}</td>
                      <td className="py-3">
                        <Badge variant={user.status === 'verified' ? 'default' : 'outline'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline">Edit</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'posts' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              All Posts
            </h3>
            <div className="space-y-3">
              {recentPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{post.title}</p>
                    <p className="text-sm text-muted-foreground">
                      By {post.postedBy} • {post.barangay} • {post.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={post.status === 'approved' ? 'default' : 'outline'}>
                      {post.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'approvals' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Pending Approvals
            </h3>
            <div className="space-y-3">
              {pendingApprovals.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {item.type === 'user' ? `New User: ${item.name}` : `New Post: ${item.title}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.barangay && `${item.barangay} • `}
                      {item.postedBy && `By ${item.postedBy} • `}
                      {item.date}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
