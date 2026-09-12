import { useState } from "react";
import { Bot } from "lucide-react";

export function BotAvatar({ username, className = "", imageClassName = "" }: { username: string; className?: string; imageClassName?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#72a8ff]/25 bg-[#3f8cff]/10 text-[#a6c8ff] ${className}`}>
      <Bot className="h-5 w-5" />
      {!imageFailed && <img src={`https://t.me/i/userpic/320/${encodeURIComponent(username)}.jpg`} alt="" onError={() => setImageFailed(true)} className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`} />}
    </span>
  );
}

export default BotAvatar;
