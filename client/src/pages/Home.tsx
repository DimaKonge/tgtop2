import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Crown, Flame, Compass, Calendar, Folder, User, Sparkles, Wallet, Plus, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"ranking" | "explore" | "nft" | "deals" | "dashboard">("ranking");
  const [selectedCategory, setSelectedCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [selectedCountry, setSelectedCountry] = useState<string>("Global");
  const [directoryMode, setDirectoryMode] = useState<"storage" | "public">("storage");

  // Bidding dialog state
  const [biddingSlot, setBiddingSlot] = useState<any>(null);
  const [bidAmountInput, setBidAmountInput] = useState<string>("");

  // NFT / Username listing modal
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [salePrice, setSalePrice] = useState("100 TON");
  const [rentalPrice, setRentalPrice] = useState("2 TON/day");

  const [copiedRef, setCopiedRef] = useState(false);

  const utils = trpc.useUtils();
  const { data: slots = [] } = trpc.tgTop.getSlots.useQuery({ category: selectedCategory, country: selectedCountry });
  const { data: groups = [] } = trpc.tgTop.getGroups.useQuery({ category: selectedCategory, country: selectedCountry });
  const { data: nfts = [] } = trpc.tgTop.getNfts.useQuery();
  const { data: deals = [] } = trpc.tgTop.myDeals.useQuery();

  const placeBidMutation = trpc.tgTop.placeBid.useMutation({
    onSuccess: () => {
      toast.success("Ставка успешно принята! Вы в топе рейтинга.");
      utils.tgTop.getSlots.invalidate();
      setBiddingSlot(null);
      setBidAmountInput("");
    },
    onError: (err) => {
      toast.error("Ошибка ставки: " + err.message);
    }
  });

  const createNftMutation = trpc.tgTop.createNft.useMutation({
    onSuccess: () => {
      toast.success("Актив успешно выставлен на MarketApp!");
      utils.tgTop.getNfts.invalidate();
      setNftModalOpen(false);
      setNewUsername("");
    }
  });

  const rentNftMutation = trpc.tgTop.rentNft.useMutation({
    onSuccess: () => {
      toast.success("Аренда оформлена через MarketApp Escrow!");
      utils.tgTop.getNfts.invalidate();
    }
  });

  const defaultSlotProps = {
    category: selectedCategory,
    country: selectedCountry,
    leaderUserId: null,
    groupId: null,
    updatedAt: new Date(),
  };

  // Pyramid slots organization
  const kingSlot = slots.find(s => s.slotNumber === 1) || { id: 1, slotNumber: 1, title: "", subtitle: "Свободный слот", currentBid: "0 TON", bidAmount: 0, leaderUsername: "-", ...defaultSlotProps };
  const rank23Slots = slots.filter(s => s.slotNumber === 2 || s.slotNumber === 3);
  while (rank23Slots.length < 2) {
    rank23Slots.push({ id: 100 + rank23Slots.length, slotNumber: rank23Slots.length + 2, title: "", subtitle: "Свободный слот", currentBid: "0 TON", bidAmount: 0, leaderUsername: "-", ...defaultSlotProps });
  }

  const rank47Slots = slots.filter(s => s.slotNumber >= 4 && s.slotNumber <= 7);
  while (rank47Slots.length < 4) {
    rank47Slots.push({ id: 200 + rank47Slots.length, slotNumber: rank47Slots.length + 4, title: "", subtitle: "Свободный слот", currentBid: "0 TON", bidAmount: 0, leaderUsername: "-", ...defaultSlotProps });
  }

  const handlePlaceBid = (slot: any) => {
    const amount = parseInt(bidAmountInput);
    if (isNaN(amount) || amount <= slot.bidAmount) {
      toast.error(`Ставка должна быть больше текущей (${slot.currentBid})`);
      return;
    }
    placeBidMutation.mutate({
      slotId: slot.id,
      bidAmount: amount,
      currentBid: `${amount} TON`,
      leaderUsername: user?.name || user?.openId?.slice(0, 8) || "dimij",
    });
  };

  const handleAddBotLink = (type: 'channel' | 'group') => {
    const botUsername = 'GiftsLabBot';
    const url = type === 'channel'
      ? `https://t.me/${botUsername}?startchannel=admin`
      : `https://t.me/${botUsername}?startgroup=admin`;
    window.open(url, '_blank');
  };

  const referralLink = `https://t.me/GiftsLabBot?start=ref_${user?.openId || 'dimij'}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    toast.success("Реферальная ссылка скопирована!");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans flex flex-col pb-24 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0b0f19] to-[#07090e]">
      {/* Liquid Glass Header */}
      <header className="px-4 py-3 flex justify-between items-center border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/30 shadow-inner">
            ⚡
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">TG TOP</div>
            <div className="text-[10px] text-cyan-400 font-mono">@{user?.name || user?.openId?.slice(0, 6) || "dimij"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black shadow-cyan-500/20 shadow-md" onClick={() => toast.success("Web3 Wallet Connected!")}>
            <Wallet className="w-3.5 h-3.5 mr-1" /> Connect
          </Button>
        </div>
      </header>

      {/* Directory & Storage Tabs */}
      <div className="px-4 pt-3">
        <div className="bg-white/5 border border-white/10 p-1 rounded-2xl flex gap-1 backdrop-blur-md">
          <button 
            onClick={() => setDirectoryMode("storage")} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${directoryMode === "storage" ? "bg-cyan-400 text-slate-950 shadow-cyan-400/30 shadow-md" : "text-gray-400 hover:text-white"}`}
          >
            My Storage
          </button>
          <button 
            onClick={() => setDirectoryMode("public")} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${directoryMode === "public" ? "bg-cyan-400 text-slate-950 shadow-cyan-400/30 shadow-md" : "text-gray-400 hover:text-white"}`}
          >
            Public Directory
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-4 pt-4 flex-1">
        {activeTab === "ranking" && (
          <div className="space-y-4">
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(["Все", "Каналы", "Чаты"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-400/20 shadow" : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Geo / Country Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-[10px]">
              {["Global", "RU", "CIS", "US", "EU"].map(country => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`px-3 py-1 rounded-lg border ${selectedCountry === country ? "bg-indigo-500/20 text-cyan-400 border-cyan-500/50 font-bold" : "bg-white/5 text-gray-400 border-white/10"}`}
                >
                  🌐 {country}
                </button>
              ))}
            </div>

            {/* PYRAMID RANKING LAYOUT */}

            {/* LEVEL 1: RANK #1 KING PEDESTAL (Large Banner) */}
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-3 right-3 flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 shadow">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400" /> Rank #1
              </div>

              {kingSlot.title ? (
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-2xl border border-amber-500/40 shadow-inner">
                    {kingSlot.title[0]}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">👑 KING PEDESTAL</div>
                    <div className="text-base font-black text-white">{kingSlot.title}</div>
                    <div className="text-xs text-gray-400">Лидер: @{kingSlot.leaderUsername}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 mb-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="w-16 h-16 rounded-2xl bg-white/5 border border-dashed border-amber-500/50 flex items-center justify-center text-amber-400 hover:bg-amber-500/10 transition-all shadow-inner group">
                        <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 text-white border-white/10 backdrop-blur-2xl">
                      <DialogHeader>
                        <DialogTitle>Занять слот #1 (Царь Горы)</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Ваша ставка (TON):</label>
                          <Input 
                            type="number" 
                            placeholder="Сумма ставки..." 
                            value={bidAmountInput}
                            onChange={(e) => setBidAmountInput(e.target.value)}
                            className="bg-black/50 border-white/10 text-white"
                          />
                        </div>
                        <Button 
                          onClick={() => handlePlaceBid(kingSlot)}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black hover:opacity-90"
                        >
                          Сделать ставку и занять топ-1
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <span className="text-xs text-amber-400/80 font-semibold mt-2">Свободный слот #1 (Нажмите для ставки)</span>
                </div>
              )}

              <div className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/10 mb-3">
                <span className="text-xs text-gray-400">Текущая ставка:</span>
                <span className="text-sm font-black text-amber-400">{kingSlot.currentBid}</span>
              </div>

              {kingSlot.title && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-lg">
                      ⚡ ПЕРЕБИТЬ СТАВКУ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 text-white border-white/10">
                    <DialogHeader>
                      <DialogTitle>Перебить ставку на Ранг #1</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <p className="text-xs text-gray-300">Текущая ставка: <span className="text-amber-400 font-bold">{kingSlot.currentBid}</span></p>
                      <Input 
                        type="number" 
                        placeholder="Введите сумму TON..." 
                        value={bidAmountInput}
                        onChange={(e) => setBidAmountInput(e.target.value)}
                        className="bg-black/50 border-white/10 text-white"
                      />
                      <Button onClick={() => handlePlaceBid(kingSlot)} className="w-full bg-amber-500 text-slate-950 font-bold">
                        Подтвердить ставку
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* LEVEL 2: RANKS #2 - #3 (2 Cards) */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">🥈 Элитный ряд (#2 - #3)</div>
              <div className="grid grid-cols-2 gap-3">
                {rank23Slots.map((slot) => (
                  <div key={slot.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/40 transition-all shadow-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">#{slot.slotNumber}</span>
                      <span className="text-xs">🥈</span>
                    </div>

                    {slot.title ? (
                      <div>
                        <div className="text-sm font-bold text-white mb-0.5 truncate">{slot.title}</div>
                        <div className="text-[11px] text-gray-400 mb-3">{slot.currentBid}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 mb-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="w-10 h-10 rounded-xl bg-white/5 border border-dashed border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 transition-all">
                              <Plus className="w-5 h-5" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 text-white border-white/10">
                            <DialogHeader><DialogTitle>Занять слот #{slot.slotNumber}</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-2">
                              <Input type="number" placeholder="Ставка TON..." value={bidAmountInput} onChange={(e) => setBidAmountInput(e.target.value)} className="bg-black/50 border-white/10 text-white" />
                              <Button onClick={() => handlePlaceBid(slot)} className="w-full bg-cyan-400 text-slate-950 font-bold">Сделать ставку</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <span className="text-[10px] text-gray-500 mt-1">Свободно</span>
                      </div>
                    )}

                    {slot.title && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-7 text-[10px] bg-black/40 border-white/10 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950">
                            Перебить
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 text-white border-white/10">
                          <DialogHeader><DialogTitle>Перебить ставку (#{slot.slotNumber})</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-2">
                            <Input type="number" placeholder="Ставка TON..." value={bidAmountInput} onChange={(e) => setBidAmountInput(e.target.value)} className="bg-black/50 border-white/10 text-white" />
                            <Button onClick={() => handlePlaceBid(slot)} className="w-full bg-cyan-400 text-slate-950 font-bold">Подтвердить</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* LEVEL 3: RANKS #4 - #7 (4 Cards) */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Премиум ряд (#4 - #7)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {rank47Slots.map((slot) => (
                  <div key={slot.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between backdrop-blur-md hover:border-indigo-500/40 transition-all">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">#{slot.slotNumber}</span>
                    </div>

                    {slot.title ? (
                      <div>
                        <div className="text-xs font-bold text-white truncate">{slot.title}</div>
                        <div className="text-[10px] text-gray-400 mb-2">{slot.currentBid}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1 mb-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="w-8 h-8 rounded-lg bg-white/5 border border-dashed border-indigo-500/40 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-all">
                              <Plus className="w-4 h-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 text-white border-white/10">
                            <DialogHeader><DialogTitle>Занять слот #{slot.slotNumber}</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-2">
                              <Input type="number" placeholder="Ставка TON..." value={bidAmountInput} onChange={(e) => setBidAmountInput(e.target.value)} className="bg-black/50 border-white/10 text-white" />
                              <Button onClick={() => handlePlaceBid(slot)} className="w-full bg-indigo-500 text-white font-bold">Сделать ставку</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {slot.title && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-6 text-[10px] bg-black/40 border-white/10 text-indigo-300 hover:bg-indigo-500 hover:text-white">
                            Перебить
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 text-white border-white/10">
                          <DialogHeader><DialogTitle>Перебить ставку (#{slot.slotNumber})</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-2">
                            <Input type="number" placeholder="Ставка TON..." value={bidAmountInput} onChange={(e) => setBidAmountInput(e.target.value)} className="bg-black/50 border-white/10 text-white" />
                            <Button onClick={() => handlePlaceBid(slot)} className="w-full bg-indigo-500 text-white font-bold">Подтвердить</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Bot Admin Action */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md">
              <h4 className="text-xs font-bold text-gray-200 mb-1">Добавить свою группу или канал</h4>
              <p className="text-[11px] text-gray-400 mb-3">Назначьте бота @GiftsLabBot администратором, чтобы зачислить 0.1 GRAM и листить в каталог.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleAddBotLink('channel')} className="bg-black/40 border border-white/10 text-xs font-bold hover:bg-white/10 text-cyan-300">
                  📢 Канал
                </Button>
                <Button onClick={() => handleAddBotLink('group')} className="bg-black/40 border border-white/10 text-xs font-bold hover:bg-white/10 text-cyan-300">
                  💬 Чат
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "explore" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase text-gray-300 mb-2">Общий каталог площадок</h2>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs bg-white/5 border border-white/10 rounded-2xl">
                Пока нет добавленных групп. Добавьте бота в администраторы!
              </div>
            ) : (
              groups.map(g => (
                <div key={g.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-md">
                  <div>
                    <div className="text-sm font-bold text-white">{g.title}</div>
                    <div className="text-xs text-cyan-400">@{g.username} • 👥 {g.membersCount} уч.</div>
                  </div>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20">{g.category}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "nft" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black uppercase text-gray-300">NFT MarketApp Аренда</h2>
                <p className="text-[11px] text-gray-400">Сдача в аренду и продажа юзернеймов</p>
              </div>
              <Dialog open={nftModalOpen} onOpenChange={setNftModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold text-xs">
                    + Выставить
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 text-white border-white/10">
                  <DialogHeader>
                    <DialogTitle>Выставить актив в MarketApp</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input 
                      placeholder="Username (@crypto)..." 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                    <Input 
                      placeholder="Цена продажи (например, 100 TON)" 
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                    <Input 
                      placeholder="Аренда в сутки (например, 2 TON/day)" 
                      value={rentalPrice}
                      onChange={(e) => setRentalPrice(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                    <Button 
                      onClick={() => createNftMutation.mutate({
                        username: newUsername,
                        price: salePrice,
                        priceAmount: 100,
                        rentalPricePerDay: rentalPrice,
                        rentalAmountPerDay: 2,
                        minRentalDays: 7,
                        maxRentalDays: 90,
                        listingType: "both"
                      })}
                      className="w-full bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-500"
                    >
                      Опубликовать
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {nfts.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-xs backdrop-blur-md">
                Нет активных NFT. Выставьте первый актив на аренду!
              </div>
            ) : (
              nfts.map(nft => (
                <div key={nft.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-md">
                  <div>
                    <div className="text-sm font-bold text-white">@{nft.username}</div>
                    <div className="text-xs text-gray-400">💰 Покупка: <span className="text-cyan-400">{nft.price}</span></div>
                    <div className="text-xs text-gray-400">⏳ Аренда: <span className="text-amber-400">{nft.rentalPricePerDay}</span></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" className="h-7 text-xs bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold" onClick={() => toast.success(`Покупка юзернейма @${nft.username}`)}>
                      Купить
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 text-amber-400 hover:bg-white/10" onClick={() => rentNftMutation.mutate({ nftId: nft.id, rentalDays: 30 })}>
                      Аренда 30д
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "deals" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase text-gray-300 mb-2">Сделки и Escrow Аренда</h2>
            {deals.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs bg-white/5 border border-white/10 rounded-2xl">
                Активных сделок нет.
              </div>
            ) : (
              deals.map(d => (
                <div key={d.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-md">
                  <div>
                    <div className="text-xs font-bold text-white">Сделка #{d.id}</div>
                    <div className="text-[11px] text-gray-400">Сумма: {d.price}</div>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase font-bold">{d.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center backdrop-blur-xl shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400 flex items-center justify-center font-black text-2xl mx-auto mb-3 border border-cyan-500/30">
                {user?.name?.[0] || "U"}
              </div>
              <h2 className="text-base font-black text-white">{user?.name || "Web3 Owner"}</h2>
              <p className="text-xs text-cyan-400 font-mono mb-4">@{user?.name || "dimij"}</p>
              
              <div className="grid grid-cols-2 gap-3 text-left mb-4">
                <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-gray-400">Бонусный баланс (GRAM)</div>
                  <div className="text-lg font-black text-cyan-400">0.0 GRAM</div>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-gray-400">Реферальный доход (5%)</div>
                  <div className="text-lg font-black text-amber-400">0.0 TON</div>
                </div>
              </div>

              {/* Referral Link Widget */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-left">
                <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
                  <span>🤝 Реферальная программа (5%)</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-3">Приглашайте друзей и получайте 5% с каждой завершенной сделки реферала.</p>
                <div className="flex gap-2">
                  <Input readOnly value={referralLink} className="bg-black/60 border-white/10 text-xs text-gray-300 font-mono" />
                  <Button size="sm" onClick={copyReferral} className="bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold shrink-0">
                    {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <footer className="bg-[#07090e]/90 border-t border-white/10 fixed bottom-0 left-0 right-0 p-3 grid grid-cols-5 text-center text-[10px] text-gray-400 z-50 backdrop-blur-xl">
        <button onClick={() => setActiveTab("ranking")} className={`flex flex-col items-center gap-0.5 ${activeTab === "ranking" ? "text-cyan-400 font-bold" : "hover:text-white"}`}>
          <Crown className="w-4 h-4" /> Топ
        </button>
        <button onClick={() => setActiveTab("explore")} className={`flex flex-col items-center gap-0.5 ${activeTab === "explore" ? "text-cyan-400 font-bold" : "hover:text-white"}`}>
          <Compass className="w-4 h-4" /> Каталог
        </button>
        <button onClick={() => setActiveTab("nft")} className={`flex flex-col items-center gap-0.5 ${activeTab === "nft" ? "text-cyan-400 font-bold" : "hover:text-white"}`}>
          <Sparkles className="w-4 h-4" /> NFT
        </button>
        <button onClick={() => setActiveTab("deals")} className={`flex flex-col items-center gap-0.5 ${activeTab === "deals" ? "text-cyan-400 font-bold" : "hover:text-white"}`}>
          <Calendar className="w-4 h-4" /> Сделки
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center gap-0.5 ${activeTab === "dashboard" ? "text-cyan-400 font-bold" : "hover:text-white"}`}>
          <User className="w-4 h-4" /> Профиль
        </button>
      </footer>
    </div>
  );
}
