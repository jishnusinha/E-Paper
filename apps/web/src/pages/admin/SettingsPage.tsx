import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPage() {
  const { admin } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Account and environment details for this admin console.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Admin profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {admin?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {admin?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {admin?.role}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Configure MongoDB, Cloudinary, and admin seed credentials in
            `apps/api/.env`.
          </p>
          <p>
            PDF rendering uses `pdfjs-dist` with `@napi-rs/canvas` on the server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
