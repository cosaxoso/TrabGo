import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AuthModal from "@/components/AuthModal";

const REGION_OPTIONS = ["Ngari", "Ü-Tsang", "Kham", "Amdo", "Diaspora", "Chol-sum (all regions)"];

function Collections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("entries");

  const [createOpen, setCreateOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songTitleTibetan, setSongTitleTibetan] = useState("");
  const [artistName, setArtistName] = useState("");
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [similarMatches, setSimilarMatches] = useState(null); // null = no warning showing

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    const { data: songs, error: songsError } = await supabase.from("song").select("*");
    if (songsError) { console.error(songsError); setLoading(false); return; }

    const { data: entries, error: entriesError } = await supabase
      .from("entry_likes")
      .select("song_id, youtube_id, like_count, created_at");
    if (entriesError) { console.error(entriesError); setLoading(false); return; }

    const bySong = {};
    for (const e of entries) {
      if (!bySong[e.song_id]) bySong[e.song_id] = { count: 0, top: e };
      bySong[e.song_id].count += 1;
      const current = bySong[e.song_id].top;
      const isBetter =
        e.like_count > current.like_count ||
        (e.like_count === current.like_count && e.created_at < current.created_at);
      if (isBetter) bySong[e.song_id].top = e;
    }

    setCollections(songs.map((c) => ({
      ...c,
      entryCount: bySong[c.id]?.count || 0,
      topEntry: bySong[c.id]?.top || null,
    })));
    setLoading(false);
  }

  function openCreate() {
    if (!user) { setAuthOpen(true); return; }
    setCreateOpen(true);
  }

  function resetCreateForm() {
    setSongTitle("");
    setSongTitleTibetan("");
    setArtistName("");
    setSelectedRegions([]);
    setError("");
    setSimilarMatches(null);
  }

  function toggleRegion(region) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setError("");

    const { data: matches, error: checkError } = await supabase.rpc("check_similar_songs", {
      new_title: songTitle.trim(),
    });
    if (checkError) { setError(checkError.message); return; }

    if (matches && matches.length > 0) {
      setSimilarMatches(matches); // show the warning dialog instead of creating yet
      return;
    }

    await actuallyCreate();
  }

  async function actuallyCreate() {
    setSubmitting(true);
    const { error } = await supabase.from("song").insert({
      song_title: songTitle.trim(),
      song_title_tibetan: songTitleTibetan.trim() || null,
      artist_name: artistName.trim() || null,
      region: selectedRegions.length ? selectedRegions : null,
      created_by: user.id,
    });

    if (error) {
      setError(error.message.includes("duplicate")
        ? "A collection for that exact song title already exists."
        : error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSimilarMatches(null);
    setCreateOpen(false);
    resetCreateForm();
    loadCollections();
  }

  const filtered = collections
    .filter((c) => `${c.song_title} ${c.artist_name || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "alphabetical" ? a.song_title.localeCompare(b.song_title) : b.entryCount - a.entryCount
    );

  if (loading) return <p className="p-6">Loading collections…</p>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-3xl font-bold">Collections</h1>
        <Button onClick={openCreate}>Start a collection</Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <Input placeholder="Search collections…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="flex gap-1 ml-auto">
          <Button variant={sortBy === "entries" ? "default" : "outline"} size="sm" onClick={() => setSortBy("entries")}>Most videos</Button>
          <Button variant={sortBy === "alphabetical" ? "default" : "outline"} size="sm" onClick={() => setSortBy("alphabetical")}>A–Z</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Link key={c.id} to={`/collections/${c.id}`}>
            <Card className="h-full hover:border-primary transition-colors overflow-hidden">
              {c.topEntry && (
                <img src={`https://img.youtube.com/vi/${c.topEntry.youtube_id}/hqdefault.jpg`} alt="" className="w-full aspect-video object-cover" />
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold">{c.song_title}</h3>
                {c.song_title_tibetan && <p className="text-sm text-muted-foreground mb-1">{c.song_title_tibetan}</p>}
                <p className="text-sm text-muted-foreground mb-2">{"By: " + (c.artist_name || "Unknown artist")}</p>
                <div className="flex gap-1 flex-wrap mb-2">
                  {(c.region || []).map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                </div>
                <Badge variant="secondary">{c.entryCount} {c.entryCount === 1 ? "video" : "videos"}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground mt-6">No collections yet — be the first to start one.</p>}

      {/* Create collection form */}
      <Dialog open={createOpen} onOpenChange={(next) => { setCreateOpen(next); if (!next) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Start a collection</DialogTitle></DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="song-title">Song title *</Label>
              <Input id="song-title" required value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="e.g. Jampa Choesang" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="song-title-tibetan">Tibetan title</Label>
              <Input id="song-title-tibetan" value={songTitleTibetan} onChange={(e) => setSongTitleTibetan(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="artist-name">Original artist</Label>
              <Input id="artist-name" required value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g. TC" />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <div className="flex gap-2 flex-wrap">
                {REGION_OPTIONS.map((r) => (
                  <Badge
                    key={r}
                    variant={selectedRegions.includes(r) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRegion(r)}
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create collection"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate/similar title warning */}
      <Dialog open={!!similarMatches} onOpenChange={(next) => { if (!next) setSimilarMatches(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Similar collection{similarMatches?.length === 1 ? "" : "s"} found</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This looks close to an existing song — double check it's not the same one before creating a duplicate:
          </p>
          <ul className="text-sm space-y-1 my-2">
            {similarMatches?.map((m) => <li key={m.id} className="font-medium">{m.song_title}</li>)}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSimilarMatches(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={actuallyCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create anyway"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

export default Collections;