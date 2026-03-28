import { useState, useCallback } from "react";
import "./ShareButton.css";

interface ShareButtonProps {
  gameCode: string;
}

function ShareButton({ gameCode }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/join/${gameCode}`;
  const shareText = `Join my Werewolf game! Code: ${gameCode.toUpperCase()}`;

  const handleShare = useCallback(async () => {
    // Try native Web Share API first (mobile share sheet)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Werewolf Game",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, shareText]);

  return (
    <button className={`share-btn ${copied ? "share-btn--copied" : ""}`} onClick={handleShare}>
      {copied ? (
        <>
          <svg className="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          LINK COPIED!
        </>
      ) : (
        <>
          <svg className="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          INVITE FRIENDS
        </>
      )}
    </button>
  );
}

export default ShareButton;
