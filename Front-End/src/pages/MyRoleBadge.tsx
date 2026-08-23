import { roleIdOf } from "./roleId";
import { RoleIcon } from "./Art";

/** Persistent "this is your role (right now)" chip — survives night swaps. */
export default function MyRoleBadge({ currentRole }: { currentRole?: string | null }) {
  if (!currentRole) return null;
  return (
    <div className="my-role-badge">
      <RoleIcon roleId={roleIdOf(currentRole)} size={26} />
      <span>
        دورك — <b>{currentRole}</b>
      </span>
    </div>
  );
}
