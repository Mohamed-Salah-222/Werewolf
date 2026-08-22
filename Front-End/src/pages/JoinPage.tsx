import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { connectAndJoin } from "../store/sockets";
import "./JoinPage.css";

// ===== COMPONENT =====

type PageStatus = "loading" | "error" | "started";

function JoinPage() {
  const { gameCode: urlCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();

  const code = urlCode?.toLowerCase() || "";
  const isValidCode = code.length === 6;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Connect socket, emit join, timeout on failure ────────────────────────
  useEffect(() => {
    if (!isValidCode) return;

    const savedName = sessionStorage.getItem("werewolf_playerName");
    const playerName = savedName && savedName.trim().length >= 2 ? savedName.trim() : "";
    const cancelJoin = connectAndJoin({ gameCode: code, playerName });

    const timeout = setTimeout(() => {
      const { gameCode: storeCode } = useGameStore.getState();
      if (storeCode !== code) {
        setStatus("error");
        setErrorMsg("مقدرش ينضم للعبة. يمكن مش موجودة أو بدأت خلاص.");
      }
    }, 10000);

    return () => {
      cancelJoin();
      clearTimeout(timeout);
    };
  }, [code, isValidCode]);

  // ===== RENDER =====

  if (!isValidCode) {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />
          <h2 className="join-title">اللينك مش صحيح</h2>
          <p className="join-subtitle">لينك اللعبة ده مش شغال.</p>
          <button className="join-home-btn" onClick={() => navigate("/")}>
            ارجع للبيت
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />
          <h2 className="join-title">بتبدأ اللعبة…</h2>
          <p className="join-subtitle">بنجهز تنكرك</p>
        </div>
      </div>
    );
  }

  if (status === "started") {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />
          <h2 className="join-title">اللعبة شغالة</h2>
          <p className="join-subtitle">اللعبة بدأت خلاص، مينفعش تنضم في النص.</p>
          <button className="join-home-btn" onClick={() => navigate("/")}>
            ارجع للبيت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-vignette" />
      <div className="join-card">
        <h2 className="join-title">معرفش ينضم</h2>
        <p className="join-subtitle">{errorMsg}</p>
        <button className="join-home-btn" onClick={() => navigate("/")}>
          ارجع للبيت
        </button>
      </div>
    </div>
  );
}

export default JoinPage;
