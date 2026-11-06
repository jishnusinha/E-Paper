import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { LoginPage } from "@/pages/admin/LoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { EditionsPage } from "@/pages/admin/EditionsPage";
import { CreateEditionPage } from "@/pages/admin/CreateEditionPage";
import { EditorPage } from "@/pages/admin/EditorPage";
import { ThemesPage } from "@/pages/admin/ThemesPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { PreviewPage } from "@/pages/admin/PreviewPage";
import { EditionThemePage } from "@/pages/admin/EditionThemePage";
import { LandingPage } from "@/pages/public/LandingPage";
import { ArchivePage } from "@/pages/public/ArchivePage";
import { EpaperPage } from "@/pages/public/EpaperPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Route>

      <Route path="/epaper" element={<EpaperPage />} />
      <Route path="/epaper/:date" element={<EpaperPage />} />

      <Route path="/admin/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin/editions/:editionId/editor" element={<EditorPage />} />
        <Route path="/admin/editions/:editionId/preview" element={<PreviewPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="editions" element={<EditionsPage />} />
          <Route path="editions/new" element={<CreateEditionPage />} />
          <Route
            path="editions/:editionId/theme"
            element={<EditionThemePage />}
          />
          <Route path="themes" element={<ThemesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
