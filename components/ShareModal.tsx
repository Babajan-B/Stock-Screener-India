'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Share2, Loader, Check, AlertCircle } from 'lucide-react';

type Provider = 'linkedin' | 'facebook' | 'instagram';

interface Channel {
  id: string;
  provider: Provider;
  name: string;
  accountId: string;
  isActive: boolean;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  caption: string;
}

export default function ShareModal({ isOpen, onClose, caption }: ShareModalProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Set<Provider>>(new Set());
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, { ok: boolean; error?: string }> | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setResult(null);
    setSelected(new Set());
    setMode('now');
    setScheduleDate('');
    fetchChannels();
  }, [isOpen]);

  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/social/channels');
      const data = await res.json();
      setChannels((data.channels || []).filter((c: Channel) => c.isActive));
    } catch {
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const toggle = (p: Provider) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  };

  const submit = async () => {
    if (selected.size === 0) {
      setError('Select at least one channel.');
      return;
    }
    if (mode === 'schedule' && !scheduleDate) {
      setError('Pick a schedule date.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const url = mode === 'now' ? '/api/social/publish' : '/api/social/schedule';
      const body =
        mode === 'now'
          ? { content: caption, channels: Array.from(selected) }
          : {
              content: caption,
              channels: Array.from(selected),
              publishAt: new Date(scheduleDate).toISOString(),
            };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      if (mode === 'now') {
        setResult(data.results || {});
        if (data.ok) setTimeout(onClose, 1800);
      } else {
        setResult({ scheduled: { ok: true } });
        setTimeout(onClose, 1800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-white">Share to Social</h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Caption</label>
            <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 border border-gray-700 max-h-24 overflow-y-auto">
              {caption}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Channels</label>
            {loadingChannels ? (
              <div className="flex justify-center py-4">
                <Loader className="w-5 h-5 text-orange-500 animate-spin" />
              </div>
            ) : channels.length > 0 ? (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <label
                    key={ch.id}
                    className="flex items-center p-3 rounded border border-gray-700 hover:border-orange-500/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(ch.provider)}
                      onChange={() => toggle(ch.provider)}
                      className="w-4 h-4 rounded accent-orange-500"
                      disabled={submitting}
                    />
                    <span className="ml-3 text-sm text-gray-300">{ch.name}</span>
                    <span className="ml-auto text-xs text-gray-500 capitalize">{ch.provider}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 p-4 bg-gray-800 rounded">
                No channels connected.{' '}
                <Link href="/settings/social" className="text-orange-400 underline">
                  Connect one
                </Link>
                .
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">When</label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center p-3 rounded border border-gray-700 cursor-pointer hover:border-orange-500/50">
                <input
                  type="radio"
                  name="timing"
                  checked={mode === 'now'}
                  onChange={() => setMode('now')}
                  className="w-4 h-4 accent-orange-500"
                  disabled={submitting}
                />
                <span className="ml-2 text-sm text-gray-300">Post Now</span>
              </label>
              <label className="flex-1 flex items-center p-3 rounded border border-gray-700 cursor-pointer hover:border-orange-500/50">
                <input
                  type="radio"
                  name="timing"
                  checked={mode === 'schedule'}
                  onChange={() => setMode('schedule')}
                  className="w-4 h-4 accent-orange-500"
                  disabled={submitting}
                />
                <span className="ml-2 text-sm text-gray-300">Schedule</span>
              </label>
            </div>
          </div>

          {mode === 'schedule' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-orange-500"
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded p-3 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-900/20 border border-green-800 rounded p-3 text-sm text-green-400 space-y-1">
              {Object.entries(result).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span className="capitalize">{k}:</span>
                  <span>{v.ok ? 'posted' : v.error || 'failed'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800 sticky bottom-0 bg-gray-900">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded border border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || channels.length === 0}
            className="flex-1 px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {mode === 'now' ? 'Posting...' : 'Scheduling...'}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                {mode === 'now' ? 'Post Now' : 'Schedule'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
