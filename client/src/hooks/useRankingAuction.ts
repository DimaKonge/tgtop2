import { useState } from "react";
import type { Slot } from "@/lib/tgTop-domain";

/**
 * Состояние аукциона рейтинга (ставки, перебивание, видимость, метод оплаты).
 * Только группировка useState — бизнес-логика не меняется.
 */
export function useRankingAuction() {
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [rankSlotLinkId, setRankSlotLinkId] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [listingRankingBid, setListingRankingBid] = useState("0.1");
  const [outbidOpen, setOutbidOpen] = useState(false);
  const [outbidGroupId, setOutbidGroupId] = useState<number | null>(null);
  const [outbidBidInput, setOutbidBidInput] = useState("0.1");
  const [outbidVisibility, setOutbidVisibility] = useState<"public" | "anonymous">("anonymous");
  const [detailVisibility, setDetailVisibility] = useState<"public" | "anonymous">("anonymous");
  const [paymentMethod, setPaymentMethod] = useState<"gram" | "stars">("gram");
  const [detailBoardScope, setDetailBoardScope] = useState<{ category: "Все" | "Каналы" | "Чаты"; country: string; subcategory: string; city: string; displayPosition?: number } | null>(null);
  const [detailBidInput, setDetailBidInput] = useState("");

  return {
    targetSlot, setTargetSlot,
    rankSlotLinkId, setRankSlotLinkId,
    amount, setAmount,
    listingRankingBid, setListingRankingBid,
    outbidOpen, setOutbidOpen,
    outbidGroupId, setOutbidGroupId,
    outbidBidInput, setOutbidBidInput,
    outbidVisibility, setOutbidVisibility,
    detailVisibility, setDetailVisibility,
    paymentMethod, setPaymentMethod,
    detailBoardScope, setDetailBoardScope,
    detailBidInput, setDetailBidInput,
  };
}
