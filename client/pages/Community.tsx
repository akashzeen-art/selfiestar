import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelfies } from "@/contexts/SelfieContext";
import { Input } from "@/components/ui/input";

export default function Community() {
  const { refreshPublic, likeSelfie, addComment } = useSelfies();
  const [posts, setPosts] = useState<
    {
      id: string;
      username: string;
      avatar: string;
      score: number;
      image: string;
      likes: number;
      comments: number;
      caption: string;
    }[]
  >([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [commentByPost, setCommentByPost] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshPublic()
      .then((selfies) => {
        setPosts(
          selfies.map((selfie) => ({
            id: selfie.id,
            username: selfie.id.slice(0, 8),
            avatar: selfie.id.slice(0, 2).toUpperCase(),
            score: selfie.score,
            image: selfie.image,
            likes: selfie.likes,
            comments: selfie.comments,
            caption: selfie.caption || "Check out my selfie!",
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load community"));
  }, []);

  const toggleLike = async (id: string) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(id)) {
      newLiked.delete(id);
    } else {
      newLiked.add(id);
      const likes = await likeSelfie(id);
      setPosts((current) => current.map((post) => (post.id === id ? { ...post, likes } : post)));
    }
    setLikedPosts(newLiked);
  };

  const allPosts = useMemo(() => posts, [posts]);

  return (
    <AppLayout
      title="Community"
      description="Share your selfies, connect with stars, and celebrate together"
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
            {error}
          </div>
        )}
        {/* Share Section */}
        <div className="p-6 rounded-xl border border-neon-purple/30 bg-card/50">
          <h3 className="text-lg font-bold mb-4">Share Your Selfie</h3>
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-sm">
              YOU
            </div>
            <div className="flex-1">
              <Link to="/dashboard">
                <input
                  type="text"
                  placeholder="Upload and share your selfie..."
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border/40 placeholder-muted-foreground text-sm focus:outline-none focus:border-neon-purple/60 cursor-pointer"
                  disabled
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        {allPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No public selfies yet</p>
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white">
                Upload Your First Selfie
              </Button>
            </Link>
          </div>
        ) : (
          allPosts.map((post) => (
            <div key={post.id} className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold text-sm">
                    {post.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{post.username}</div>
                    <div className="text-xs text-muted-foreground">Score: {post.score}/100</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/20 text-neon-purple text-sm font-medium">
                  {post.score}★
                </div>
              </div>

              {/* Image */}
              <div className="w-full aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                {isRenderableImageSrc(post.image) ? (
                  <img src={post.image} alt="Post" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">{post.image}</span>
                )}
              </div>

              {/* Caption */}
              <div className="px-4 py-3 border-b border-border/40">
                <p className="text-sm">{post.caption}</p>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex items-center justify-between text-sm text-muted-foreground border-b border-border/40">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments}
                  </span>
                </div>
              </div>

              {/* Interaction Buttons */}
              <div className="px-4 py-3 flex gap-2">
                <Button
                  onClick={() => toggleLike(post.id)}
                  variant="ghost"
                  size="sm"
                  className={`flex-1 text-sm gap-2 ${likedPosts.has(post.id) ? "text-neon-pink" : ""}`}
                >
                  <Heart
                    className="h-4 w-4"
                    fill={likedPosts.has(post.id) ? "currentColor" : "none"}
                  />
                  Like
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-sm gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Comment
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-sm gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={commentByPost[post.id] ?? ""}
                  onChange={(e) =>
                    setCommentByPost((current) => ({ ...current, [post.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const text = commentByPost[post.id]?.trim();
                    if (!text) return;
                    const comments = await addComment(post.id, text);
                    setPosts((current) =>
                      current.map((entry) => (entry.id === post.id ? { ...entry, comments } : entry)),
                    );
                    setCommentByPost((current) => ({ ...current, [post.id]: "" }));
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Load More */}
        {allPosts.length > 0 && (
          <div className="text-center">
            <Button variant="outline" className="border-neon-purple/40 hover:bg-neon-purple/10">
              Load More Posts
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function isRenderableImageSrc(value: string) {
  return (
    value.startsWith("data:image/") ||
    value.startsWith("/api/selfies/access/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  );
}
