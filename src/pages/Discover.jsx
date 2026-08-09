

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import AuthModal from "@/components/AuthModal";

const PAGE_SIZE = 12;

function Discover() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [myLikes, setMyLikes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    loadEntries(true);
  }, [sortBy]);

  async function loadEntries(reset) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const from = reset ? 0 : entries.length;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from("entry_likes").select("*");
    query = sortBy === "liked"
      ? query.order("like_count", { ascending: false })
      : query.order("created_at", { ascending: false });
    query = query.range(from, to);

    const { data: rows, error } = await query;
    if (error) { console.error(error); setLoading(false); setLoadingMore(false); return; }

    const submitterIds = [...new Set(rows.map((r) => r.submitted_by).filter(Boolean))];
    const { data: profiles } = submitterIds.length
      ? await supabase.from("profiles").select("id, display_name, hometown_city").in("id", submitterIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const merged = rows.map((r) => ({ ...r, submitter: profileMap[r.submitted_by] }));

    if (user && rows.length) {
      const { data: likes } = await supabase
        .from("likes")
        .select("submission_id")
        .eq("liker_id", user.id)
        .in("submission_id", rows.map((r) => r.submission_id));
      setMyLikes((prev) => new Set([...prev, ...(likes || []).map((l) => l.submission_id)]));
    }

    setEntries((prev) => (reset ? merged : [...prev, ...merged]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }

  async function toggleLike(submissionId, alreadyLiked) {
    if (!user) { setAuthOpen(true); return; }

    if (alreadyLiked) {
      await supabase.from("likes").delete().eq("submission_id", submissionId).eq("liker_id", user.id);
      setMyLikes((prev) => { const next = new Set(prev); next.delete(submissionId); return next; });
    } else {
      const { error } = await supabase.from("likes").insert({ submission_id: submissionId, liker_id: user.id });
      if (error) return;
      setMyLikes((prev) => new Set([...prev, submissionId]));
    }
    setEntries((prev) =>
      prev.map((e) =>
        e.submission_id === submissionId
          ? { ...e, like_count: e.like_count + (alreadyLiked ? -1 : 1) }
          : e
      )
    );
  }

  const filtered = entries.filter((s) => {
    const haystack = `${s.title} ${s.entry_title}${s.artist} ${s.region} ${s.occasion}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (loading) return <p className="p-6">Loading songs…</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Discover Gorshey</h1>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <Input
          placeholder="Search by song, artist, or region…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-1 ml-auto">
          <Button variant={sortBy === "newest" ? "default" : "outline"} size="sm" onClick={() => setSortBy("newest")}>
            Newest
          </Button>
          <Button variant={sortBy === "liked" ? "default" : "outline"} size="sm" onClick={() => setSortBy("liked")}>
            Most liked
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const hasLiked = myLikes.has(s.submission_id);
          return (
            <Card key={s.submission_id} className="overflow-hidden">
              <a href={s.youtube_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={`https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg`}
                  alt={s.entry_title}
                  className="w-full aspect-video object-cover"
                />
              </a>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold leading-snug mb-1">
                    {s.entry_title || "Untitled video"}
                </h3>

                <p className="text-sm text-muted-foreground mb-2">
                    {s.title}
                    {s.title_tibetan && ` · ${s.title_tibetan}`}
                </p>

                <p className="text-xs text-muted-foreground mb-2">
                    Posted by {s.submitter?.display_name || "Someone"}
                    {s.submitter?.hometown_city && ` · ${s.submitter.hometown_city}`}
                </p>

                <div className="flex gap-2 flex-wrap">
                    {(s.region || []).map((r) => (
                    <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                    {s.difficulty && <Badge variant="outline">{s.difficulty}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <Link to={`/collections/${s.song_id}`} className="text-xs underline text-muted-foreground">
                    View collection
                  </Link>
                  <Button
                    variant={hasLiked ? "default" : "outline"}
                    size="sm"
                    className="gap-1"
                    onClick={() => toggleLike(s.submission_id, hasLiked)}
                  >
                    <Heart className={hasLiked ? "fill-current" : ""} size={14} />
                    {s.like_count}
                  </Button>
                </div>                </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground mt-6">No songs match that search.</p>
      )}

      {hasMore && !search && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => loadEntries(false)} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

export default Discover;