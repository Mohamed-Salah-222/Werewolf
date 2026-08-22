import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";


import ActionComplete from "../components/roles/ActionComplete";
import WerewolfAction from "../components/roles/WerewolfAction";
import MinionAction from "../components/roles/MinionAction";
import CloneAction from "../components/roles/CloneAction";
import SeerAction from "../components/roles/SeerAction";
import MasonAction from "../components/roles/MasonAction";
import RobberAction from "../components/roles/RobberAction";
import TroublemakerAction from "../components/roles/TroublemakerAction";
import DrunkAction from "../components/roles/DrunkAction";
import InsomniacAction from "../components/roles/InsomniacAction";
import JokerAction from "../components/roles/JokerAction";
import WarlockAction from "../components/roles/WarlockAction";
import OracleAction from "../components/roles/OracleAction";
import NightRoleProgress from "../components/roles/NightRoleProgress";
// import VoiceChat from "../components/VoiceChat";
import "./NightPhase.css";

import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";
import { findCharacter } from "../characters";

/** Resolve any role identifier (English name, Arabic name, or id) to the stable component key */
function roleIdOf(name: string): string {
  return findCharacter(name)?.id ?? name.toLowerCase();
}

// ===== TYPES =====

interface CloneResult {
  clonedRole: string;
  clonedRoleTeam: string;
  needsSecondAction: boolean;
  autoResult: { message: string } | null;
  groundCards: Array<{ id: string; label: string }> | null;
  otherPlayers: Array<{ id: string; name: string }> | null;
  message: string;
}

function isCloneResult(result: unknown): result is CloneResult {
  return !!result && typeof result === "object" && typeof (result as { clonedRole?: unknown }).clonedRole === "string";
}

// ===== ROLE ACTION COMPONENT MAP =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROLE_COMPONENTS: Record<string, ComponentType<any>> = {
  werewolf: WerewolfAction,
  minion: MinionAction,
  clone: CloneAction,
  seer: SeerAction,
  mason: MasonAction,
  robber: RobberAction,
  troublemaker: TroublemakerAction,
  drunk: DrunkAction,
  insomniac: InsomniacAction,
  joker: JokerAction,
  warlock: WarlockAction,
  oracle: OracleAction,
};

// Roles that show their action component in the "done" state
const ROLES_WITH_PERSISTENT_ACTION = new Set(["werewolf", "minion", "seer", "mason", "robber", "troublemaker", "drunk", "joker", "clone", "insomniac", "warlock", "oracle"]);
// ===== HELPERS =====

// ===== COMPONENT =====

function NightPhase() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerId = useGameStore((s) => s.playerId) || "";
  const hasAlreadyActed = useGameStore((s) => s.hasPerformedAction);
  const roleQueue = useGameStore((s) => s.roleQueue);
  const storeGroundCards = useGameStore((s) => s.groundCards);
  const storePlayers = useGameStore((s) => s.players);
  const storeInitialActiveRole = useGameStore((s) => s.initialActiveRole);
  const currentActiveRoleStartedAt = useGameStore((s) => s.currentActiveRoleStartedAt);
  const storeLastActionResult = useGameStore((s) => s.lastActionResult);
  const myCurrentRole = useGameStore((s) => s.roleName) || "";
  const myNightRole = useGameStore((s) => s.originalRoleName) || myCurrentRole;

  const [showSplash, setShowSplash] = useState(!hasAlreadyActed);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(hasAlreadyActed ? storeLastActionResult : null);
  const [groundCards, setGroundCards] = useState<Array<{ id: string; label: string }>>(storeGroundCards || []);
  const [roleTimer, setRoleTimer] = useState<number>(0);

  // Phase info modal
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);

  // Clone two-phase state
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const awaitingCloneResultRef = useRef(false);

  // Queue-level tracking
  const [activeRole, setActiveRole] = useState<string>(storeInitialActiveRole || "");
  const [queueTimer, setQueueTimer] = useState<number>(0);

  // Splash screen timer
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // Sync active role from store
  useEffect(() => {
    if (storeInitialActiveRole) setActiveRole(storeInitialActiveRole);
  }, [storeInitialActiveRole]);

  // Derive isMyTurn from current state (no useState needed)
  const isMyTurn = !hasAlreadyActed &&
    roleIdOf(storeInitialActiveRole || "") === roleIdOf(myNightRole);

  // Sync ground cards from store
  useEffect(() => {
    if (storeGroundCards) setGroundCards(storeGroundCards);
  }, [storeGroundCards]);

  // Sync action result from store (for rejoin)
  useEffect(() => {
    if (hasAlreadyActed && storeLastActionResult) {
      setActionResult(storeLastActionResult);
    }
  }, [hasAlreadyActed, storeLastActionResult]);

  useEffect(() => {
    if (roleIdOf(myNightRole) !== "clone") return;
    if (!isCloneResult(storeLastActionResult)) return;

    setCloneResult(storeLastActionResult);
    setActionResult(storeLastActionResult);
    awaitingCloneResultRef.current = false;
  }, [myNightRole, storeLastActionResult]);

  // Per-role countdown timer from currentActiveRoleStartedAt
  useEffect(() => {
    if (!currentActiveRoleStartedAt || !storeInitialActiveRole) {
      setRoleTimer(0);
      setQueueTimer(0);
      return;
    }
    const seconds = roleQueue.find(r => r.roleName === storeInitialActiveRole)?.seconds ?? 10;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - currentActiveRoleStartedAt) / 1000);
      const remaining = Math.max(seconds - elapsed, 0);
      setRoleTimer(remaining);
      setQueueTimer(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentActiveRoleStartedAt, storeInitialActiveRole, roleQueue]);

  // ===== HANDLERS =====

  const handleAction = useCallback(
    (action: Record<string, unknown>) => {
      gameActions.performAction({ gameCode: gameCode!, playerId, action });
    },
    [gameCode, playerId],
  );

  const handleCloneFirstAction = useCallback(
    (action: Record<string, unknown>) => {
      awaitingCloneResultRef.current = true;
      gameActions.performAction({ gameCode: gameCode!, playerId, action });
    },
    [gameCode, playerId],
  );

  // ===== RENDER HELPERS =====

  const renderActionComponent = () => {
    const roleLower = roleIdOf(myNightRole);
    const Component = ROLE_COMPONENTS[roleLower];
    if (!Component) return null;

    const locked = !isMyTurn && !hasAlreadyActed;
    const baseProps = { onAction: handleAction, locked };

    switch (roleLower) {
      case "werewolf":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} actionResult={actionResult} />;
      case "minion":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} actionResult={actionResult} />;
      case "clone":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} onCloneFirstAction={handleCloneFirstAction} cloneResult={cloneResult} actionResult={actionResult} />;
      case "seer":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} actionResult={actionResult} />;
      case "mason":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} actionResult={actionResult} />;
      case "robber":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} actionResult={actionResult} />;
      case "troublemaker":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} actionResult={actionResult} />;
      case "drunk":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} actionResult={actionResult} />;
      case "joker":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} actionResult={actionResult} />;
      case "insomniac":
        return <Component {...baseProps} actionResult={actionResult} />;
      case "warlock":
        return <Component {...baseProps} playerId={playerId} players={storePlayers} groundCards={groundCards} actionResult={actionResult} />;
      case "oracle":
        return <Component {...baseProps} actionResult={actionResult} />;
      default:
        return <Component {...baseProps} />;
    }
  };

  const roleMaxSeconds = roleQueue.find(r => r.roleName === storeInitialActiveRole)?.seconds ?? 10;
  const timerFraction = roleMaxSeconds > 0 ? roleTimer / roleMaxSeconds : 0;
  const isUrgent = roleTimer <= 5;

  // Determine if this role uses a persistent action component (visual post-action state)
  const roleLower = roleIdOf(myNightRole);
  const hasPersistentAction = ROLES_WITH_PERSISTENT_ACTION.has(roleLower);

  const showActionComponent = !showSplash && (isMyTurn || hasAlreadyActed || hasPersistentAction);
  const showGenericResult = hasAlreadyActed && actionResult && !hasPersistentAction;

  // ===== RENDER =====

  return (
    <div className="np-page">
      <div className="np-vignette" />

      {/* ===== SPLASH SCREEN ===== */}
      {showSplash && (
        <div className="np-splash">
          <div className="np-splash-content">
            <span className="np-splash-text">الليل بدأ</span>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT (hidden during splash) ===== */}
      {!showSplash && (
        <>
          {/* Header — moon removed, divider kept */}
          <div className="np-header">
            <div className="np-header-inner">
              <h1 className="np-phase-title">مرحلة الليل</h1>
              <div className="np-header-divider" />
              <p className="np-role-label">{myNightRole ? findCharacter(myNightRole)?.name || myNightRole : "مجهول"}</p>
            </div>
            <button className="np-info-btn" onClick={() => setShowPhaseInfo(true)} aria-label="معلومات المرحلة">
              !
            </button>
          </div>

          {/* Timer bar — only when it's your turn */}
          {isMyTurn && roleTimer > 0 && (
            <div className="np-timer">
              <div className="np-timer-track">
                <div className={`np-timer-fill ${isUrgent ? "np-timer-fill--urgent" : "np-timer-fill--normal"}`} style={{ transform: `scaleX(${timerFraction})` }} />
              </div>
              <span className={`np-timer-text ${isUrgent ? "np-timer-text--urgent" : "np-timer-text--normal"}`}>{roleTimer}s</span>
            </div>
          )}

          {/* Content */}
          <div className="np-content">
            {showActionComponent ? (
              <div className="np-content-inner">
                <div className="np-action-enter">{renderActionComponent()}</div>
                {roleQueue.length > 0 && (
                  <div className="np-progress-below">
                    <NightRoleProgress roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myNightRole} />
                  </div>
                )}
              </div>
            ) : (
              <div className="np-waiting-layout">
                {showGenericResult && (
                  <div className="np-result-section">
                    <ActionComplete result={actionResult} />
                  </div>
                )}
                {roleQueue.length > 0 && <NightRoleProgress roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myNightRole} />}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== PHASE INFO MODAL ===== */}
      {showPhaseInfo && (
        <div className="np-phase-overlay" onClick={() => setShowPhaseInfo(false)}>
          <div className="np-phase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="np-phase-header">
              <h2 className="np-phase-title-modal">مرحلة الليل</h2>
              <button className="np-phase-close" onClick={() => setShowPhaseInfo(false)}>
                ✕
              </button>
            </div>
            <div className="np-phase-body">
              <p className="np-phase-flavor">القرية نامت. الأدوار بتصحى ورا بعض تعمل حركتها في السر.</p>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">حركتك</span>
                  <p className="np-phase-item-desc">لما ييجي دورك، اعمل القدرة بتاعة دورك. لكل دور وقت محدود قبل ما اللعبة تعمل الحركة مكانك أوتوماتيك.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">دايرة اللاعبين</span>
                  <p className="np-phase-item-desc">كروت باقي اللاعبين مفرودة حواليك على ضهرها. دوس عليها حسب قدرة دورك.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">مين بيشتغل دلوقتي</span>
                  <p className="np-phase-item-desc">الكارت المفتوح تحت بيقورلك مين دوره نشط دلوقتي. الأدوار بتتصاحب بترتيب ثابت من العفريت للجوكر.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">تفاصيل الدور</span>
                  <p className="np-phase-item-desc">دوس على كارت الدور النشط يفتحلك تفاصيل وقدرته.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">المؤقت</span>
                  <p className="np-phase-item-desc">لما ييجي دورك شريط الوقت بيظهر فوق. لو الوقت خلص، اللعبة تختارلك حاجة عشوائية صالحة.</p>
                </div>
              </div>
            </div>
            <div className="np-phase-footer">
              <button className="np-phase-dismiss" onClick={() => setShowPhaseInfo(false)}>
                فهمت
              </button>
            </div>
          </div>
        </div>
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
  );
}

export default NightPhase;
