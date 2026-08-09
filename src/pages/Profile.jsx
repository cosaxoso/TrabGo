import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

function Profile() {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [hometownCity, setHometownCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setHometownCity(profile.hometown_city || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        hometown_city: hometownCity.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    refreshProfile?.();
    setTimeout(() => setSuccess(false), 2000);
  }

  if (!user) return <p className="p-6">You need to sign in to view your profile.</p>;

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your profile</h1>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName || "Unnamed"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hometownCity">Hometown city</Label>
          <Input
            id="hometownCity"
            value={hometownCity}
            onChange={(e) => setHometownCity(e.target.value)}
            placeholder="e.g. Lhasa"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Saved.</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </Button>
    </div>
  );
}

export default Profile;