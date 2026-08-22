import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";
import { findCard, backCardImage } from "../characters";
import "./RoleReveal.css";

// ===== TYPES =====

interface RoleInfo {
  roleName: string;
  roleTeam: string;
  roleDescription: string;
}

// ===== HELPER =====

function getCardImage(roleName: string): string {
  return findCard(roleName)?.image || "";
}

// ===== COMPONENT =====

function RoleReveal() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerId = useGameStore((s) => s.playerId) || "";
  const storeRoleName = useGameStore((s) => s.roleName);
  const storeRoleTeam = useGameStore((s) => s.roleTeam);
  const storeRoleDescription = useGameStore((s) => s.roleDescription);
  const hasConfirmedRoleStore = useGameStore((s) => s.hasConfirmedRole);
  const roleRevealEndsAt = useGameStore((s) => s.roleRevealEndsAt);
  const storePlayers = useGameStore((s) => s.players);
  const setHasConfirmedRole = useGameStore((s) => s.setHasConfirmedRole);

  const [flipped, setFlipped] = useState(() => !!storeRoleName);
  const [confirmed, setConfirmed] = useState(hasConfirmedRoleStore);
  const [role] = useState<RoleInfo | null>(() => {
    return storeRoleName
      ? {
        roleName: storeRoleName,
        roleTeam: storeRoleTeam || "",
        roleDescription: storeRoleDescription || "",
      }
      : null;
  });

  const [playerStatuses, setPlayerStatuses] = useState<Array<{ id: string; name: string; confirmed: boolean }>>([]);
  const [showSlackers, setShowSlackers] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Refs to avoid stale closures and unnecessary effect re-runs
  const roleNameRef = useRef(role?.roleName ?? null);

  // Keep roleNameRef in sync
  useEffect(() => {
    roleNameRef.current = role?.roleName ?? null;
  }, [role]);

  useEffect(() => {
    if (storePlayers.length > 0) {
      setPlayerStatuses(
        storePlayers.map((p) => ({
          id: p.id,
          name: p.name,
          confirmed: p.hasConfirmedRole,
        })),
      );
    }
  }, [storePlayers]);

  // Countdown timer
  useEffect(() => {
    if (!roleRevealEndsAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((roleRevealEndsAt - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roleRevealEndsAt]);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setHasConfirmedRole(true);
    setPlayerStatuses((prev) => prev.map((p) => (p.id === playerId ? { ...p, confirmed: true } : p)));
    gameActions.confirmRoleReveal({ gameCode: gameCode!, playerId });
  }, [gameCode, playerId, setHasConfirmedRole]);

  // Derived counts
  const readyCount = playerStatuses.filter((p) => p.confirmed).length;
  const totalCount = playerStatuses.length;
  const notReady = playerStatuses.filter((p) => !p.confirmed);
  const allReady = totalCount > 0 && readyCount === totalCount;

  // ===== LOADING STATE =====
  if (!role) {
    return (
      <div className="rr-page">
        <div className="rr-vignette" />
        <div className="rr-loading">
          <h1 className="rr-loading-title">بتقسم الأدوار</h1>
          <p className="rr-loading-text">الأقدار بتتوزع…</p>
        </div>
      </div>
    );
  }

  const cardImage = getCardImage(role.roleName);

  // ===== MAIN RENDER =====
  return (
    <div className="rr-page">
      <div className="rr-vignette" />

      <div className="rr-content">
        {/* Status bar */}
        <div className="rr-status-bar">
          <div className={`rr-status-line ${allReady ? "rr-status-line--all-ready" : ""}`}>
            <span className="rr-status-label">اللاعبين</span>
            <span className="rr-status-count">
              <span className="rr-status-ready">{readyCount}</span>
              <span className="rr-status-separator">/</span>
              <span className="rr-status-total">{totalCount}</span>
            </span>
          </div>
          {notReady.length > 0 && (
            <button className="rr-info-btn rr-info-btn--slackers" onClick={() => setShowSlackers(true)} aria-label="مين لسه مش جاهز">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          )}
          <button className="rr-info-btn rr-info-btn--hint" onClick={() => setShowPhaseInfo(true)} aria-label="معلومات المرحلة">
            !
          </button>
        </div>

        {!flipped && <p className="rr-sub-text">دوس تكشف دورك</p>}
        {flipped && !confirmed && <p className="rr-sub-text">دوس على الكارت تاني تخفيه</p>}
        {flipped && confirmed && (
          <p className="rr-waiting-text">مستني باقي اللاعبين ({countdown} ثانية)</p>
        )}

        {/* Card with flip */}
        <div className="rr-card-container rr-card-container--clickable" onClick={handleFlip}>
          <div className={`rr-card-inner ${flipped ? "rr-card-inner--flipped" : ""}`}>
            {/* Front: card back */}
            <div className="rr-card-face rr-card-face--front">
              <img src={backCardImage} alt="ضهر الكارت" className="rr-card-img" />
            </div>
            {/* Back: role card image */}
            <div className="rr-card-face rr-card-face--back">
              <img src={cardImage} alt={role.roleName} className="rr-card-img" />
            </div>
          </div>
        </div>

        {/* Confirm button */}
        {flipped && !confirmed && (
          <button className="rr-confirm-btn" onClick={handleConfirm}>
            أنا جاهز
          </button>
        )}

        {/* Leave button */}
        <button
          className="rr-leave-btn"
          onClick={() => {
            gameActions.leaveGame({ gameCode: gameCode!, playerId });
            useGameStore.getState().reset();
            navigate("/");
          }}
        >
          خروج
        </button>
      </div>

      {/* Slackers modal */}
      {showSlackers && (
        <div className="rr-modal-overlay" onClick={() => setShowSlackers(false)}>
          <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-modal-header">
              <span className="rr-modal-icon">💀</span>
              <h2 className="rr-modal-title">مخه واقف</h2>
              <p className="rr-modal-subtitle">لسه بيحمل آخر خلية مخ في دماغه</p>
            </div>
            <div className="rr-modal-list">
              {notReady.map((p) => (
                <div key={p.id} className="rr-modal-player">
                  <span className="rr-modal-dot" />
                  <span className="rr-modal-name">{p.name}</span>
                </div>
              ))}
            </div>
            <button className="rr-modal-close" onClick={() => setShowSlackers(false)}>
              تمام
            </button>
          </div>
        </div>
      )}

      {/* Phase info modal */}
      {showPhaseInfo && (
        <div className="rr-modal-overlay" onClick={() => setShowPhaseInfo(false)}>
          <div className="rr-phase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-phase-header">
              <h2 className="rr-phase-title">كشف الأدوار</h2>
              <button className="rr-phase-close" onClick={() => setShowPhaseInfo(false)}>
                ✕
              </button>
            </div>
            <div className="rr-phase-body">
              <p className="rr-phase-flavor">كل واحد بيكتشف دوره في السر. افتكر كويس إنت مين، هتحتاج دورك.</p>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title">اكشف دورك</span>
                  <p className="rr-phase-item-desc">دوس على ضهر الكارت يقلب ويوريك الدور اللي جالك. ده هويتك للجولة دي.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title">اخبي كارتك</span>
                  <p className="rr-phase-item-desc">دوس على الكارت تاني يرجع ضهر. مفيدة لو حد جانبك بيبص في شاشتك.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title">أكد إنك جاهز</span>
                  <p className="rr-phase-item-desc">لما تحفظ دورك دوس «أنا جاهز». مرحلة الليل بتبدأ لما الكل يؤكد.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title">عداد اللاعبين</span>
                  <p className="rr-phase-item-desc">الشريط اللي فوق بيقول مين أكد. الزرار الأحمر بيوريك لسه مين مش جاهز.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title">خليها سر</span>
                  <p className="rr-phase-item-desc">متقولش لحد على دورك، لسه. الكدب والتمثيل والتهنيج ليها وقتها في النقاش.</p>
                </div>
              </div>
            </div>
            <div className="rr-phase-footer">
              <button className="rr-phase-dismiss" onClick={() => setShowPhaseInfo(false)}>
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleReveal;
