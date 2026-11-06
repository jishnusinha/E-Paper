import type { NewspaperPage } from "@/types";
import type { ThemeConfiguration } from "@epaper/shared";
import { SidebarTheme } from "./themes/SidebarTheme";
import { BottomTheme } from "./themes/BottomTheme";

interface Props {
  theme: ThemeConfiguration;
  pages: NewspaperPage[];
  activePageId: string;
  onPageChange: (pageId: string) => void;
  children: React.ReactNode;
}

export function ThemeRenderer({
  theme,
  pages,
  activePageId,
  onPageChange,
  children,
}: Props) {
  if (theme.layout === "bottom") {
    return (
      <BottomTheme
        pages={pages}
        activePageId={activePageId}
        onPageChange={onPageChange}
        backgroundColor={theme.viewer.backgroundColor}
      >
        {children}
      </BottomTheme>
    );
  }

  return (
    <SidebarTheme
      pages={pages}
      activePageId={activePageId}
      onPageChange={onPageChange}
      backgroundColor={theme.viewer.backgroundColor}
    >
      {children}
    </SidebarTheme>
  );
}
