import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart } from "lucide-react";
import AuthModal from "@/components/AuthModal";

function CollectionDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [collection, setCollection] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [myLikes, setMyLikes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [entry_title, setEntryTitle] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCollection();
    loadSubmissions();
  }, [id]);

  async function loadCollection() {
    const { data, error } = await supabase.from("song").select("*").eq("id", id).single();
    if (error) console.error(error);
    else setCollection(data);
  }

  async function loadSubmissions() {
    setLoading(true);

    const { data: subs, error } = await supabase
      .from("entry_likes")
      .select("*")
      .eq("song_id", id)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }

    const submitterIds = [...new Set(subs.map((s) => s.submitted_by).filter(Boolean))];
    const { data: profiles } = submitterIds.length
      ? await supabase.from("profiles").select("id, display_name, hometown_city").in("id", submitterIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    let likedSet = new Set();
    if (user) {
      const { data: likes } = await supabase.from("likes").select("submission_id").eq("liker_id", user.id);
      likedSet = new Set((likes || []).map((l) => l.submission_id));
    }

    setSubmissions(subs.map((s) => ({ ...s, submitter: profileMap[s.submitted_by] })));
    setMyLikes(likedSet);
    setLoading(false);
  }

  function extractYoutubeId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  async function handleSubmitVideo(e) {
    e.preventDefault();
    if (!user) { setAuthOpen(true); return; }
    setError("");

    if (!title.trim()) { setError("Title is required."); return; }

    const youtubeId = extractYoutubeId(newUrl);
    if (!youtubeId) { setError("Couldn't find a valid YouTube link in there."); return; }

    const { error } = await supabase.from("dance_entries").insert({
      song_id: id,
      youtube_id: youtubeId,
      youtube_url: newUrl,
      title: title.trim(),
      title_tibetan: null,
      artist: null,
      region: null,
      occasion: null,
      difficulty: difficulty || null,
      tags: tags.trim() ? tags.split(",").map((t) => t.trim()) : null,
      notes: notes.trim() || null,
      submitted_by: user.id,
    });
    if (error) { setError(error.message); return; }

    setNewUrl(""); setTitle(""); setDifficulty(""); setTags(""); setNotes("");
    setFormOpen(false);
    loadSubmissions();
  }

  async function toggleLike(submissionId, alreadyLiked) {
    if (!user) { setAuthOpen(true); return; }

    if (alreadyLiked) {
      await supabase.from("likes").delete().eq("submission_id", submissionId).eq("liker_id", user.id);
    } else {
      const { error } = await supabase.from("likes").insert({ submission_id: submissionId, liker_id: user.id });
      if (error) { console.error(error); return; }
    }
    loadSubmissions();
  }

  if (loading || !collection) return <p className="p-6">Loading…</p>;

  const topCount = submissions.length ? submissions[0].like_count : -1;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {collection.song_title_tibetan && (
        <p className="text-sm text-muted-foreground">{collection.song_title_tibetan}</p>
      )}
      <h1 className="text-3xl font-bold">{collection.song_title}</h1>
      <p className="text-muted-foreground mb-6">{collection.artist_name || "Unknown artist"}</p>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogTrigger asChild>
          <Button className="mb-8">Submit a dance</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a dance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitVideo} className="space-y-3">
            <Input placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} required />

            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />
            <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Input placeholder="Paste your dance's YouTube link…" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full">Submit dance</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {submissions.map((s) => {
          const isLeader = s.like_count === topCount && topCount > 0;
          const hasLiked = myLikes.has(s.submission_id);
          return (
            <div
              key={s.submission_id}
              className={`flex items-center gap-4 border rounded-lg p-3 ${isLeader ? "border-primary" : ""}`}
            >
              <div className="relative w-40 aspect-video rounded overflow-hidden shrink-0">
                {isLeader && (
                  <Badge className="absolute top-1 left-1 z-10">Most liked</Badge>
                )}
                <a href={s.youtube_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`https://img.youtube.com/vi/${s.youtube_id}/mqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </a>
              </div>
              <div className="flex-1 text-sm text-muted-foreground space-y-1">
                <p className="text-foreground font-medium">{s.entry_title}</p>
                <span>
                  {s.submitter?.display_name || "Someone"}
                  {s.submitter?.hometown_city && ` · ${s.submitter.hometown_city}`}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {s.difficulty && (
                    <Badge variant="secondary" className="font-normal">
                      {s.difficulty}
                    </Badge>
                  )}
                  {s.tags && s.tags.length > 0 && s.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {s.notes && (
                  <p className="text-xs italic pt-1">{s.notes}</p>
                )}
              </div>
              <Button
                variant={hasLiked ? "default" : "outline"}
                onClick={() => toggleLike(s.submission_id, hasLiked)}
                className="gap-1"
              >
                <Heart className={hasLiked ? "fill-current" : ""} size={16} />
                {s.like_count}
              </Button>
            </div>
          );
        })}
      </div>

      {submissions.length === 0 && (
        <p className="text-muted-foreground mt-6">No dances submitted yet — be the first.</p>
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

export default CollectionDetail;