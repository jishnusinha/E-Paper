import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "text-sm font-medium transition-colors",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
  );

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="font-serif text-xl font-semibold tracking-tight">
          E-Paper Studio
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/epaper" className={navLinkClass}>
            Today&apos;s Paper
          </NavLink>
          <NavLink to="/archive" className={navLinkClass}>
            Archive
          </NavLink>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/admin/login">Admin</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
