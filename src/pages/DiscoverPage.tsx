import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Compass,
  Flag,
  Heart,
  MessageCircle,
  Plus,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { ReportModal } from '../components/ReportModal';
import { apiFetch, formatDateShort, formatKes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { DiscoverPost, Property } from '../types';

interface DiscoverComment {
  id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
}

export default function DiscoverPage() {
  const { user, notify } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create Post Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [approvedProps, setApprovedProps] = useState<Property[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Comments Drawer
  const [activeCommentsPost, setActiveCommentsPost] = useState<DiscoverPost | null>(null);
  const [comments, setComments] = useState<DiscoverComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Report Modal
  const [reportTarget, setReportTarget] = useState<DiscoverPost | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = savedOnly ? '?savedOnly=true' : '';
      const data = await apiFetch<{ posts: DiscoverPost[] }>(`/api/social/discover${qs}`);
      setPosts(data.posts);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load Discover feed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [savedOnly, notify]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (createOpen) {
      apiFetch<{ properties: Property[] }>('/api/properties?limit=30')
        .then((res) => setApprovedProps(res.properties))
        .catch(() => {});
    }
  }, [createOpen]);

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      notify('Sign in to like Discover posts.', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await apiFetch<{ liked: boolean }>(`/api/social/discover/${postId}/like`, {
        method: 'POST',
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: res.liked,
                likes_count: res.liked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
              }
            : p
        )
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  const handleToggleSave = async (postId: string) => {
    if (!user) {
      notify('Sign in to save Discover posts.', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/social/discover/${postId}/save`, {
        method: 'POST',
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved_by_me: res.saved } : p)));
      notify(res.saved ? 'Saved post.' : 'Removed from saved posts.', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  const handleShare = async (post: DiscoverPost) => {
    const shareUrl = `${window.location.origin}/discover#${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify('Link copied to clipboard.', 'success');
    } catch {
      notify(`Share URL: ${shareUrl}`, 'info');
    }
  };

  const openComments = async (post: DiscoverPost) => {
    setActiveCommentsPost(post);
    setLoadingComments(true);
    try {
      const res = await apiFetch<{ comments: DiscoverComment[] }>(`/api/social/discover/${post.id}/comments`);
      setComments(res.comments);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentsPost) return;
    if (!user) {
      notify('Sign in to post a comment.', 'info');
      navigate('/login');
      return;
    }
    try {
      await apiFetch(`/api/social/discover/${activeCommentsPost.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: newComment }),
      });
      setNewComment('');
      const res = await apiFetch<{ comments: DiscoverComment[] }>(
        `/api/social/discover/${activeCommentsPost.id}/comments`
      );
      setComments(res.comments);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activeCommentsPost.id ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to post comment.', 'error');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) {
      notify('Please select an image or portrait video file.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const form = new FormData();
      form.append('caption', caption);
      if (locationTag) form.append('locationTag', locationTag);
      if (propertyId) form.append('propertyId', propertyId);
      form.append('media', mediaFile);

      await apiFetch('/api/social/discover', { method: 'POST', body: form });
      notify('Your Discover tour has been published.', 'success');
      setCreateOpen(false);
      setCaption('');
      setLocationTag('');
      setPropertyId('');
      setMediaFile(null);
      loadPosts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#296a46] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Visual Housing Discovery</span>
            </p>
            <h1 className="text-3xl font-extrabold text-[#002517] tracking-tight mt-1">Discover</h1>
            <p className="text-sm text-[#414844] mt-1">
              Explore portrait video walkthroughs and real apartment photos shared by students and hosts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-[#c1c8c2]">
                <button
                  type="button"
                  onClick={() => setSavedOnly(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    !savedOnly ? 'bg-[#002517] text-[#effdf1]' : 'text-[#414844] hover:text-[#002517]'
                  }`}
                >
                  All Posts
                </button>
                <button
                  type="button"
                  onClick={() => setSavedOnly(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    savedOnly ? 'bg-[#002517] text-[#effdf1]' : 'text-[#414844] hover:text-[#002517]'
                  }`}
                >
                  Saved
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  notify('Please sign in to share a Discover post.', 'info');
                  navigate('/login');
                  return;
                }
                setCreateOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Share Tour</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[#414844]">
          Supported uploads: JPEG, PNG, WEBP images (up to 5 MB) and browser-playable MP4, WEBM, or MOV portrait videos (up to 25 MB).
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[460px] rounded-2xl bg-white border border-[#c1c8c2]/60 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#c1c8c2] p-12 text-center space-y-2">
            <h2 className="text-lg font-bold text-[#002517]">No Discover posts yet</h2>
            <p className="text-sm text-[#414844]">
              {savedOnly ? 'You have not saved any Discover posts yet.' : 'Share the first room tour or neighbourhood spotlight.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                id={post.id}
                className="bg-white rounded-2xl border border-[#c1c8c2] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[3/4] bg-[#002517] relative overflow-hidden">
                    {post.media_type === 'video' ? (
                      <video
                        src={post.media_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={post.media_url}
                        alt={post.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#414844]">
                      <span className="font-semibold text-[#002517]">
                        {post.author_name} · <span className="capitalize text-[#296a46]">{post.author_role}</span>
                      </span>
                      <span>{post.is_demo ? 'Sample Post' : formatDateShort(post.created_at)}</span>
                    </div>

                    {post.location_tag && (
                      <p className="text-xs font-medium text-[#296a46]">{post.location_tag}</p>
                    )}

                    <p className="text-sm text-[#121e17] leading-relaxed">{post.caption}</p>

                    {post.property_id && post.property_title && (
                      <Link
                        to={`/properties/${post.property_id}`}
                        className="block p-3 rounded-xl bg-[#effdf1] border border-[#c1c8c2]/70 hover:border-[#296a46] transition-colors"
                      >
                        <p className="text-xs font-bold text-[#002517] truncate">{post.property_title}</p>
                        <p className="text-xs text-[#414844] tabular-nums">
                          {post.property_town} · {post.property_rent ? `${formatKes(post.property_rent)}/mo` : ''}
                        </p>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-[#c1c8c2]/60 flex items-center justify-between gap-2 text-xs font-semibold text-[#414844]">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`inline-flex items-center gap-1 transition-colors ${
                        post.liked_by_me ? 'text-red-600' : 'hover:text-[#002517]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
                      <span className="tabular-nums">{post.likes_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openComments(post)}
                      className="inline-flex items-center gap-1 hover:text-[#002517]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="tabular-nums">{post.comments_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      aria-label="Share post"
                      className="hover:text-[#002517]"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSave(post.id)}
                      aria-label="Save post"
                      className={post.saved_by_me ? 'text-[#296a46]' : 'hover:text-[#002517]'}
                    >
                      <Bookmark className={`w-4 h-4 ${post.saved_by_me ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportTarget(post)}
                      aria-label="Report post"
                      className="hover:text-red-700"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Create Discover Post Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#002517]">Share a Discover Post</h2>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close">
                <X className="w-5 h-5 text-[#414844]" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">
                  Photo or Portrait Video (MP4, WEBM, MOV, JPG, PNG, WEBP)
                </label>
                <label className="flex items-center justify-center gap-2 border border-dashed border-[#c1c8c2] rounded-xl p-5 cursor-pointer hover:bg-[#effdf1]/60 text-sm font-medium text-[#002517]">
                  <Upload className="w-4 h-4 text-[#296a46]" />
                  <span>{mediaFile ? mediaFile.name : 'Choose media file'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Caption</label>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the room, lighting, water supply, or commute..."
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Location Tag</label>
                  <input
                    type="text"
                    value={locationTag}
                    onChange={(e) => setLocationTag(e.target.value)}
                    placeholder="e.g. Juja · Gate C"
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#414844] mb-1">Link Property (Optional)</label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                  >
                    <option value="">None</option>
                    {approvedProps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.town})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-5 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold disabled:opacity-50"
                >
                  {publishing ? 'Uploading...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments Drawer */}
      {activeCommentsPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#c1c8c2]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#002517]">Comments</h2>
                <p className="text-xs text-[#414844] truncate max-w-xs">{activeCommentsPost.caption}</p>
              </div>
              <button type="button" onClick={() => setActiveCommentsPost(null)}>
                <X className="w-5 h-5 text-[#414844]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-1">
              {loadingComments ? (
                <p className="text-sm text-[#414844]">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-[#414844]">No comments yet. Start the conversation.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#effdf1]/70 border border-[#c1c8c2]/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#002517]">{c.author_name}</span>
                      <span className="text-[#414844]">{formatDateShort(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-[#121e17]">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-[#c1c8c2]/60">
              <input
                type="text"
                required
                minLength={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      <ReportModal
        open={Boolean(reportTarget)}
        targetType="discover_post"
        targetId={reportTarget?.id || ''}
        targetLabel={reportTarget?.caption.slice(0, 60) || ''}
        onClose={() => setReportTarget(null)}
      />
    </PublicLayout>
  );
}
