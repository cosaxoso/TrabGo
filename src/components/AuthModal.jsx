import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function AuthModal({ open, onOpenChange }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  function resetAllFields() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setCity("");
    setError("");
    setResetEmail("");
    setResetSent(false);
    setResetError("");
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    resetAllFields();
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setResetError("");
    setSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    setResetSent(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (mode === "signup") {
      if (!displayName.trim() || !city.trim()) {
        setError("Display name and hometown are both required.");
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setSubmitting(false); return; }
      if (data.user) {
        await supabase.from("profiles")
          .update({ display_name: displayName.trim(), hometown_city: city.trim() })
          .eq("id", data.user.id);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setSubmitting(false); return; }
    }

    setSubmitting(false);
    resetAllFields();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) { setMode("signin"); resetAllFields(); }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "forgot" ? "Reset your password" : "Join Trab Go"}</DialogTitle>
        </DialogHeader>

        {mode === "forgot" ? (
          resetSent ? (
            <p className="text-sm text-muted-foreground">
              Check your email for a password reset link.
            </p>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="resetEmail">Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="Your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              {resetError && <p className="text-sm text-destructive">{resetError}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 block mx-auto"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Tenzin D." />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="city">Hometown city</Label>
                    <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Toronto" />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 -mt-2"
                >
                  Forgot password?
                </button>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;