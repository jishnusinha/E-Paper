import { api, getData } from "./api";
import type { AdminUser } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    getData<AdminUser>(api.post("/auth/login", { email, password })),
  logout: () => getData<{ ok: boolean }>(api.post("/auth/logout")),
  me: () => getData<AdminUser>(api.get("/auth/me")),
};
