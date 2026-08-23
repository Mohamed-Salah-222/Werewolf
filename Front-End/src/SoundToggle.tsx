import { useEffect, useState } from "react";
import { sfx } from "./sfx";

export default function SoundToggle() {
  const [muted, setMuted] = useState(sfx.muted);
  useEffect(() => {
    const sync = () => setMuted(sfx.muted);
    window.addEventListener("werewolf:sfx-muted", sync);
    return () => window.removeEventListener("werewolf:sfx-muted", sync);
  }, []);

  return (
    <button
      className="sound-toggle"
      onClick={() => sfx.toggle()}
      aria-label={muted ? "تشغيل الأصوات" : "كتم الأصوات"}
      title={muted ? "تشغيل الأصوات" : "كتم الأصوات"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
