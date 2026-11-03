import { useSession } from "@/entities/session";
import { configureHttpAuth } from "@/shared/api";

configureHttpAuth({
  getToken: () => useSession.getState().token,
  onUnauthorized: () => useSession.getState().clear(),
});
