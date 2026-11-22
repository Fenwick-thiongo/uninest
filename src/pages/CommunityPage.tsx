import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Heart, MessageSquare, Plus, Search, X } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import { ReportModal } from '../components/ReportModal';
import { apiFetch, formatDateShort } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { CommunityCategory, CommunityPost } from '../types';

interface CommunityComment {
  id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
}

export default function CommunityPage() {
  const { user, notify } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [loading, setLoading] = useState(true);

  // Create Post Modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Expanded discussion replies
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [replyText, setReplyText] = useState('');

  const [reportTarget, setReportTarget] = useState<CommunityPost | null>(null);

  useEffect(() => {
    apiFetch<{ categories: CommunityCategory[] }>('/api/social/community/categories')
      .then((res) => {
        setCategories(res.categories);
        if (res.categories[0]) setNewCategoryId(res.categories[0].id);
      })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (searchQ.trim()) params.set('q', searchQ.trim());
      params.set('sort', sort);

      const res = await apiFetch<{ posts: CommunityPost[] }>(`/api/social/community/posts?${params.toString()}`);
      setPosts(res.posts);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load discussions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQ, sort, notify]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleLike = async (postId: string) => {
    if (!user) {
      notify('Please sign in to like discussions.', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await apiFetch<{ liked: boolean }>(`/api/social/community/posts/${postId}/like`, {
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
      notify(err instanceof Error ? err.message : 'Failed to update like.', 'error');
    }
  };

  const toggleReplies = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    try {
      const res = await apiFetch<{ comments: CommunityComment[] }>(
        `/api/social/community/posts/${postId}/comments`
      );
      setCommentsByPost((prev) => ({ ...prev, [postId]: res.comments }));
    } catch {
      // Ignore
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!user) {
      notify('Please sign in to reply.', 'info');
      navigate('/login');
      return;
    }
    try {
      await apiFetch(`/api/social/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: replyText }),
      });
      setReplyText('');
      const res = await apiFetch<{ comments: CommunityComment[] }>(
        `/api/social/community/posts/${postId}/comments`
      );
      setCommentsByPost((prev) => ({ ...prev, [postId]: res.comments }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to post reply.', 'error');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/social/community/posts', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: newCategoryId,
          title: newTitle,
          body: newBody,
        }),
      });
      notify('Discussion posted to the community.', 'success');
      setComposeOpen(false);
      setNewTitle('');
      setNewBody('');
      loadPosts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not publish discussion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#296a46]">Student Forum</p>
            <h1 className="text-3xl font-extrabold text-[#002517] tracking-tight mt-1">Community</h1>
            <p className="text-sm text-[#414844] mt-1">
              Find roommates, compare Kenyan campus estates, and share accommodation safety tips.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                notify('Sign in to start a discussion.', 'info');
                navigate('/login');
                return;
              }
              setComposeOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#002517] text-[#effdf1] text-sm font-bold hover:bg-[#123b2a] inline-flex items-center gap-2 whitespace-nowrap self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Start Discussion</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Categories Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-[#c1c8c2] p-4 space-y-2">
              <h2 className="text-xs font-bold text-[#414844] px-2 pb-1">Categories</h2>
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === 'all' ? 'bg-[#002517] text-[#effdf1]' : 'text-[#121e17] hover:bg-[#effdf1]'
                }`}
              >
                All Discussions
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat.slug
                      ? 'bg-[#002517] text-[#effdf1]'
                      : 'text-[#121e17] hover:bg-[#effdf1]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </aside>

          {/* Feed */}
          <div className="lg:col-span-9 space-y-5">
            <div className="bg-white rounded-2xl border border-[#c1c8c2] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#414844] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search discussions (e.g. Juja, roommate, deposit)..."
                  className="w-full rounded-lg border border-[#c1c8c2] pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-[#effdf1] rounded-lg border border-[#c1c8c2]/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setSort('newest')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                    sort === 'newest' ? 'bg-white text-[#002517] shadow-sm' : 'text-[#414844]'
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSort('popular')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                    sort === 'popular' ? 'bg-white text-[#002517] shadow-sm' : 'text-[#414844]'
                  }`}
                >
                  Most Liked
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-40 rounded-2xl bg-white border border-[#c1c8c2]/60 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#c1c8c2] p-10 text-center space-y-2">
                <h2 className="text-lg font-bold text-[#002517]">No discussions match your filter</h2>
                <p className="text-sm text-[#414844]">Try another category or start a new thread.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="bg-white rounded-2xl border border-[#c1c8c2] p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#414844]">
                      <span className="font-semibold text-[#296a46]">
                        {post.category_name} · {post.author_name} ({post.author_role})
                      </span>
                      <span>
                        {post.is_demo ? 'Sample Discussion · ' : ''}
                        {formatDateShort(post.created_at)}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-[#002517]">{post.title}</h2>
                    <p className="text-sm text-[#121e17] leading-relaxed whitespace-pre-line">{post.body}</p>

                    <div className="pt-3 border-t border-[#c1c8c2]/50 flex items-center justify-between text-xs font-semibold text-[#414844]">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 ${
                            post.liked_by_me ? 'text-red-600' : 'hover:text-[#002517]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
                          <span className="tabular-nums">{post.likes_count}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleReplies(post.id)}
                          className="inline-flex items-center gap-1.5 hover:text-[#002517]"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="tabular-nums">{post.comments_count} replies</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReportTarget(post)}
                        className="inline-flex items-center gap-1 hover:text-red-700"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    </div>

                    {expandedPostId === post.id && (
                      <div className="pt-4 mt-2 border-t border-[#c1c8c2]/60 space-y-3">
                        {(commentsByPost[post.id] || []).map((c) => (
                          <div key={c.id} className="p-3 rounded-xl bg-[#effdf1]/60 border border-[#c1c8c2]/50 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#002517]">
                                {c.author_name} · {c.author_role}
                              </span>
                              <span className="text-[#414844]">{formatDateShort(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-[#121e17]">{c.body}</p>
                          </div>
                        ))}

                        <form onSubmit={(e) => handleSubmitReply(e, post.id)} className="flex gap-2">
                          <input
                            type="text"
                            required
                            minLength={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a helpful reply..."
                            className="flex-1 rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold"
                          >
                            Reply
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Discussion Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-[#c1c8c2] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#002517]">New Community Discussion</h2>
              <button type="button" onClick={() => setComposeOpen(false)}>
                <X className="w-5 h-5 text-[#414844]" />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Title</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Best internet providers in Kahawa Wendani?"
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414844] mb-1">Details</label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Share context, location, or advice..."
                  className="w-full rounded-lg border border-[#c1c8c2] px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#c1c8c2] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-bold disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportModal
        open={Boolean(reportTarget)}
        targetType="community_post"
        targetId={reportTarget?.id || ''}
        targetLabel={reportTarget?.title || ''}
        onClose={() => setReportTarget(null)}
      />
    </PublicLayout>
  );
}
