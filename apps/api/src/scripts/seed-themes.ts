import {
  CLASSIC_SIDEBAR_THEME,
  MODERN_BOTTOM_THEME,
} from "@epaper/shared";
import { connectDb } from "../config/db.js";
import { Theme } from "../models/Theme.js";

const THEMES = [
  {
    key: "classic-sidebar",
    name: "Classic Sidebar Reader",
    description: "Vertical page thumbnails beside the newspaper",
    configuration: CLASSIC_SIDEBAR_THEME,
  },
  {
    key: "modern-bottom",
    name: "Modern Bottom Pagination",
    description: "Horizontal page strip below the newspaper",
    configuration: MODERN_BOTTOM_THEME,
  },
];

export async function seedThemesIfNeeded() {
  for (const theme of THEMES) {
    await Theme.findOneAndUpdate(
      { key: theme.key },
      {
        $set: {
          name: theme.name,
          description: theme.description,
          configuration: theme.configuration,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
  }
}

async function main() {
  await connectDb();
  await seedThemesIfNeeded();
  console.log("[seed] themes ready");
  process.exit(0);
}

const isDirectRun = process.argv[1]?.includes("seed-themes");
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
