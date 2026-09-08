import { useState } from "react";
import type { Audience, GlobalDirection, TopSection } from "@/lib/tgTop-domain";

/**
 * Состояние фильтров и поиска раздела «Топ».
 * Только группировка useState — бизнес-логика не меняется.
 */
export function useTopFilters() {
  const [category, setCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [globalDirection, setGlobalDirection] = useState<GlobalDirection>("Все");
  const [topSection, setTopSection] = useState<TopSection>("communities");
  const [subcategory, setSubcategory] = useState("Все");
  const [country, setCountry] = useState("Все");
  const [city, setCity] = useState("Все");
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [topSearchOpen, setTopSearchOpen] = useState(false);

  return {
    category, setCategory,
    globalDirection, setGlobalDirection,
    topSection, setTopSection,
    subcategory, setSubcategory,
    country, setCountry,
    city, setCity,
    audience, setAudience,
    filtersOpen, setFiltersOpen,
    topSearchQuery, setTopSearchQuery,
    topSearchOpen, setTopSearchOpen,
  };
}
