"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ImageIcon, Video, Images, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type InstagramPost = {
  id: string;
  caption?: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp: string;
};

interface InstagramPostSelectorProps {
  credentialId: string | undefined;
  selectedPostId?: string;
  onPostSelect: (post: InstagramPost | null) => void;
  disabled?: boolean;
}

export function InstagramPostSelector({
  credentialId,
  selectedPostId,
  onPostSelect,
  disabled = false,
}: InstagramPostSelectorProps) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  // Fetch posts when dialog opens
  const fetchPosts = async () => {
    if (!credentialId) {
      setError("Please select an Instagram account first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/integrations/meta-instagram/posts?credentialId=${credentialId}&limit=25`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);

      // If we have a selected post ID, find it in the posts
      if (selectedPostId) {
        const found = data.posts?.find((p: InstagramPost) => p.id === selectedPostId);
        if (found) {
          setSelectedPost(found);
        }
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && credentialId) {
      fetchPosts();
    }
  }, [open, credentialId]);

  // When selectedPostId changes externally, update local state
  useEffect(() => {
    if (selectedPostId && posts.length > 0) {
      const found = posts.find((p) => p.id === selectedPostId);
      setSelectedPost(found || null);
    } else if (!selectedPostId) {
      setSelectedPost(null);
    }
  }, [selectedPostId, posts]);

  const handlePostClick = (post: InstagramPost) => {
    setSelectedPost(post);
  };

  const handleConfirm = () => {
    onPostSelect(selectedPost);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedPost(null);
    onPostSelect(null);
    setOpen(false);
  };

  const getMediaIcon = (mediaType: InstagramPost["mediaType"]) => {
    switch (mediaType) {
      case "VIDEO":
        return <Video className="h-4 w-4" />;
      case "CAROUSEL_ALBUM":
        return <Images className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const truncateCaption = (caption?: string, maxLength = 50) => {
    if (!caption) return "No caption";
    return caption.length > maxLength
      ? `${caption.slice(0, maxLength)}...`
      : caption;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          disabled={disabled || !credentialId}
        >
          {selectedPost ? (
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedPost.thumbnailUrl || selectedPost.mediaUrl ? (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                  <Image
                    src={selectedPost.thumbnailUrl || selectedPost.mediaUrl || ""}
                    alt="Selected post"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                  {getMediaIcon(selectedPost.mediaType)}
                </div>
              )}
              <span className="truncate text-sm">
                {truncateCaption(selectedPost.caption, 30)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Select a post to monitor...</span>
            </div>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Instagram Post</DialogTitle>
          <DialogDescription>
            Choose a post to monitor for comments. Only comments on this post will
            trigger the workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchPosts}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {selectedPost && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <X className="mr-2 h-4 w-4" />
              Clear selection
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="text-muted-foreground">
                <p className="mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchPosts}>
                  Try again
                </Button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <p>No posts found on this Instagram account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => handlePostClick(post)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary",
                    selectedPost?.id === post.id
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-transparent"
                  )}
                >
                  {post.thumbnailUrl || post.mediaUrl ? (
                    <Image
                      src={post.thumbnailUrl || post.mediaUrl || ""}
                      alt={post.caption || "Instagram post"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      {getMediaIcon(post.mediaType)}
                    </div>
                  )}

                  {/* Overlay with info */}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="p-2 text-left text-xs text-white">
                      <p className="line-clamp-2">{truncateCaption(post.caption, 40)}</p>
                      <p className="mt-1 text-white/70">{formatDate(post.timestamp)}</p>
                    </div>
                  </div>

                  {/* Media type indicator */}
                  <div className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white">
                    {getMediaIcon(post.mediaType)}
                  </div>

                  {/* Selection indicator */}
                  {selectedPost?.id === post.id && (
                    <div className="absolute left-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedPost}>
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
