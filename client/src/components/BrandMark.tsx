import { TgTopPyramidIcon } from "@/components/TgTopPyramidIcon";

export function BrandMark() {
  return (
    <span
      aria-label="TG TOP"
      className="brand-mark grid h-8 w-8 place-items-center rounded-[9px] border border-[#f5b84b]/35 bg-[#111720] text-[#f5b84b] shadow-[0_0_14px_rgba(245,184,75,0.16)]"
      style={{ color: "#f5b84b" }}
    >
      <TgTopPyramidIcon className="h-[18px] w-[25px]" />
    </span>
  );
}

export default BrandMark;
