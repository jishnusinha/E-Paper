import { api, getData } from "./api";
import type { ThemeInfo } from "@/types";

export const themesApi = {
  list: () => getData<ThemeInfo[]>(api.get("/admin/themes")),
  get: (id: string) => getData<ThemeInfo>(api.get(`/admin/themes/${id}`)),
};
