import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-serif text-base text-foreground">E-Paper Studio</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/epaper" className="hover:text-foreground">
            Today&apos;s Paper
          </Link>
          <Link to="/archive" className="hover:text-foreground">
            News Archive
          </Link>
          <Link to="/admin/login" className="hover:text-foreground">
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
