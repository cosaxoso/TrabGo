import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

function Nav() {
  const { user, profile } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-lg">
          Trab Go
        </Link>
        <NavLink to="/about" className={linkClass}>
          About Gorshey
        </NavLink>
        <NavLink to="/" end className={linkClass}>
          Discover
        </NavLink>
        <NavLink to="/collections" className={linkClass}>
          Collections
        </NavLink>
        <NavLink to="/leaderboard" className={linkClass}>
          Leaderboard
        </NavLink>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{profile?.display_name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium leading-none">{profile?.display_name}</p>
                {profile?.hometown_city && (
                  <p className="text-xs text-muted-foreground mt-1">{profile.hometown_city}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => supabase.auth.signOut()}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        )}
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </nav>
  );
}

export default Nav;