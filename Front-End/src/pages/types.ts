import type { UpdateGamePayload } from "@werewolf/shared";

export type EmitFn = (event: string, payload: Record<string, unknown>) => void;

export interface PageProps {
  snapshot: UpdateGamePayload;
  emit: EmitFn;
}

export const ROLE_TEAM_LABEL: Record<string, string> = {
  villain: "فريق الوحوش",
  village: "أهل القرية",
  neutral: "محايد",
};
