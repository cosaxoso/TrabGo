import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/"), 1500);
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">Set a new password</h1>
      {done ? (
        <p className="text-sm text-green-600">Password updated. Redirecting…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      )}
    </div>
  );
}

export default ResetPassword;