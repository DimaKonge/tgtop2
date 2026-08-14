import { useEffect, useRef, useState } from "react";

export function TgTopLaunchScreen({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const isEnglish = typeof window !== "undefined" && localStorage.getItem("tg-top-language") === "en";
  const completed = useRef(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const complete = () => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  };

  useEffect(() => {
    if (!ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete();
      return;
    }
    const frame = window.requestAnimationFrame(() => setShowCompletion(true));
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  return (
    <main className="tg-launch" data-ready={showCompletion ? "true" : "false"} aria-label={isEnglish ? "TG TOP is loading" : "TG TOP загружается"} aria-live="polite">
      <div className="tg-launch-glow" />
      <div className="tg-launch-brand">
        <span className="tg-launch-mark">T</span>
        <span>TG TOP</span>
      </div>
      <div className="tg-launch-center">
        <div className="tg-launch-pyramid" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <span key={index} className={`tg-launch-cube cube-${index + 1}`} />)}
        </div>
        <p>{isEnglish ? "Opening marketplace" : "Открываем маркетплейс"}</p>
        <div className="tg-launch-progress"><span onAnimationEnd={complete} /></div>
      </div>
      <small>{isEnglish ? "Channels · Chats · NFT" : "Каналы · Чаты · NFT"}</small>
    </main>
  );
}
