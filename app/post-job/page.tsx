'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function PostJobPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Post a Job</h1>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Title</label>
              <input
                type="text"
                placeholder="e.g., Electrician, Tutor, Nanny"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <textarea
                placeholder="Describe the job, requirements, and responsibilities..."
                rows={6}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Salary Range</label>
              <input
                type="text"
                placeholder="e.g., ₱400-500/day"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                <option>Select a category</option>
                <option>Construction</option>
                <option>Services</option>
                <option>Education</option>
                <option>Healthcare</option>
                <option>Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="primary" size="lg">Post Job</Button>
              <Link href="/">
                <Button variant="outline" size="lg">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
