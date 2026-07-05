'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
  CheckCircle,
  Trash2,
  Link as LinkIcon,
  Clock,
} from 'lucide-react';

type Provider = 'linkedin' | 'facebook' | 'instagram';

interface Channel {
  id: string;
  provider: Provider;
  name: string;
  accountId: string;
  isActive: boolean;
}

interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  channels: Provider[];
  publishAt: number;
  status: 'queued' | 'publishing' | 'published' | 'failed';
  results?: Record<string, { ok: boolean; postUrl?: string; error?: string }>;
  createdAt: number;
}

const PROVIDERS: Array<{ id: Provider; label: string; description: string }> = [
  { id: 'linkedin', label: 'LinkedIn', description: 'Post to your personal LinkedIn feed' },
  { id: 'facebook', label: 'Facebook', description: 'Post to your Facebook feed' },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Requires one-time capture-session login via the Playwright helper',
  },
];

export default function SocialSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="theme-page">
          <Navbar />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="theme-panel rounded-[24px] h-[420px] animate-pulse" />
          </main>
        </div>
      }
    >
      <SocialSettingsContent />
    </Suspense>
  );
}

function SocialSettingsContent() {
  const searchParams = useSearchParams();
  const flashConnected = searchParams.get('connected');
  const flashError = searchParams.get('error');

  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    refreshChannels();
    refreshPosts();
  }, []);

  const refreshChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/social/channels');
      const data = await res.json();
      setChannels(data.channels || []);
    } finally {
      setLoadingChannels(false);
    }
  };

  const refreshPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/social/schedule');
      const data = await res.json();
      setPosts((data.posts || []).sort((a: ScheduledPost, b: ScheduledPost) => a.publishAt - b.publishAt));
    } finally {
      setLoadingPosts(false);
    }
  };

  const disconnect = async (provider: Provider) => {
    await fetch('/api/social/channels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    refreshChannels();
  };

  const cancelPost = async (id: string) => {
    await fetch(`/api/social/scheduled/${id}`, { method: 'DELETE' });
    refreshPosts();
  };

  const connectedMap = new Map(channels.map((c) => [c.provider, c]));

  return (
    <div className="theme-page">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:text-orange-400"
          style={{ color: '#9ca3af' }}
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold" style={{ color: '#f9fafb' }}>
            Social Publishing
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
            Connect your accounts once. Share stock analysis and schedule posts directly from the app.
          </p>
        </div>

        {flashConnected && (
          <div className="mb-6 rounded-lg border border-green-800/30 bg-green-900/10 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-sm text-green-300">
              Connected <span className="capitalize font-semibold">{flashConnected}</span>.
            </p>
          </div>
        )}
        {flashError && (
          <div className="mb-6 rounded-lg border border-red-800/30 bg-red-900/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <p className="text-sm text-red-300">Connection failed: {flashError}</p>
          </div>
        )}

        {/* Connect Accounts */}
        <div className="theme-panel rounded-[24px] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f9fafb' }}>
            Connect Accounts
          </h2>
          {loadingChannels ? (
            <div className="flex justify-center py-8">
              <Loader className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3">
              {PROVIDERS.map((p) => {
                const connected = connectedMap.get(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    style={{
                      borderColor: connected ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)',
                      backgroundColor: connected ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#f9fafb' }}>
                        {p.label}
                        {connected && (
                          <span className="ml-2 text-xs text-green-400">· {connected.name}</span>
                        )}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                        {p.description}
                      </p>
                    </div>
                    {connected ? (
                      <button
                        onClick={() => disconnect(p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-800/50 text-red-400 text-xs hover:bg-red-900/20"
                      >
                        <Trash2 size={12} />
                        Disconnect
                      </button>
                    ) : p.id === 'instagram' ? (
                      <span className="text-xs" style={{ color: '#9ca3af' }}>
                        Use capture-session CLI
                      </span>
                    ) : (
                      <a
                        href={`/api/auth/${p.id}/start`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange-500 text-white text-xs hover:bg-orange-600"
                      >
                        <LinkIcon size={12} />
                        Connect
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scheduled & Recent Posts */}
        <div className="theme-panel rounded-[24px] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#f9fafb' }}>
              Posts
            </h2>
            <button
              onClick={refreshPosts}
              className="text-xs px-2 py-1 rounded border border-white/10 text-gray-300 hover:bg-white/5"
            >
              Refresh
            </button>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <Loader className="w-5 h-5 text-orange-500 animate-spin" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2" style={{ color: '#d1d5db' }}>
                        {post.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: '#6b7280' }}>
                        <Clock size={12} />
                        <span>{new Date(post.publishAt).toLocaleString('en-IN')}</span>
                        <span>·</span>
                        <span className="capitalize">{post.channels.join(', ')}</span>
                      </div>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded whitespace-nowrap capitalize"
                      style={{
                        color:
                          post.status === 'published'
                            ? '#22c55e'
                            : post.status === 'failed'
                              ? '#ef4444'
                              : '#facc15',
                        backgroundColor:
                          post.status === 'published'
                            ? 'rgba(34,197,94,0.15)'
                            : post.status === 'failed'
                              ? 'rgba(239,68,68,0.15)'
                              : 'rgba(250,204,21,0.15)',
                      }}
                    >
                      {post.status}
                    </span>
                  </div>
                  {post.status === 'queued' && (
                    <button
                      onClick={() => cancelPost(post.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: '#9ca3af' }}>
              No posts yet. Share a stock analysis to schedule your first post.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
