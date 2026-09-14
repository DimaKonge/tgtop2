import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";

export type ChannelGiftMedia = { mediaUrl: string | null; mediaKind: "video" | "tgs" | "image" | null; emoji: string };

export function ChannelGiftMediaPreview({ gift }: { gift: ChannelGiftMedia }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (gift.mediaKind !== "tgs" || !gift.mediaUrl || !containerRef.current) return;
    let cancelled = false;
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined;
    void (async () => {
      try {
        const response = await fetch(gift.mediaUrl!);
        if (!response.ok || typeof DecompressionStream === "undefined") throw new Error("Unsupported TGS animation");
        const compressed = await response.arrayBuffer();
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
        const animationData = await new Response(stream).json();
        if (!cancelled && containerRef.current) animation = lottie.loadAnimation({ container: containerRef.current, renderer: "svg", loop: true, autoplay: true, animationData });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; animation?.destroy(); };
  }, [gift.mediaKind, gift.mediaUrl]);

  if (gift.mediaKind === "video" && gift.mediaUrl && !failed) return <video src={gift.mediaUrl} autoPlay muted loop playsInline onError={() => setFailed(true)} className="h-full w-full object-contain" />;
  if (gift.mediaKind === "image" && gift.mediaUrl && !failed) return <img src={gift.mediaUrl} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" />;
  if (gift.mediaKind === "tgs" && gift.mediaUrl && !failed) return <div ref={containerRef} className="h-full w-full" />;
  return <span aria-label="Медиа подарка недоступно" className="grid h-full w-full place-items-center px-2 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">Медиа недоступно</span>;
}

export default ChannelGiftMediaPreview;
