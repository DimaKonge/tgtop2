import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Crown, Flame, Compass, Calendar, Folder, User, Sparkles, Wallet, ArrowUpRight, Search, PlusCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"ranking" | "explore" | "my_tags" | "deals" | "nft" | "dashboard">("ranking");
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
  const [rentalPrice, setRentalPrice] = useState("5 TON/day");

  const utils = trpc.useUtils();
  const { data: slots = [], isLoading: slotsLoading } = trpc.tgTop.getSlots.useQuery({ category: selectedCategory, country: selectedCountry });
  const { data: groups = [] } = trpc.tgTop.getGroups.useQuery({ category: selectedCategory, country: selectedCountry });
  const { data: nfts = [] } = trpc.tgTop.getNfts.useQuery();
  const { data: deals = [] } = trpc.tgTop.myDeals.useQuery();

  const placeBidMutation = trpc.tgTop.placeBid.useMutation({
    onSuccess: () => {
      toast.success("Ставка успешно перебита! Вы заняли место лидера.");
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
      toast.success("Юзернейм/канал успешно выставлен на продажу и аренду!");
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

  const kingSlot = slots.find(s => s.slotNumber === 1) || {
    id: 1, slotNumber: 1, title: "Свободное место", subtitle: "Ждет листинга", currentBid: "0 TON", bidAmount: 0, leaderUsername: "-"
  };

  const premierSlots = slots.filter(s => s.slotNumber >= 4 && s.slotNumber <= 7);

  const handlePlaceBid = (slot: any) => {
    if (!isAuthenticated) {
      toast.error("Пожалуйста, войдите в систему через Telegram / Web3");
      return;
    }
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

  const handleConnectWallet = () => {
    toast.success("Web3 Wallet Connected via TonConnect!");
  };

  const handleAddBotLink = (type: 'channel' | 'group') => {
    const botUsername = 'GiftsLabBot';
    const url = type === 'channel'
      ? `https://t.me/${botUsername}?startchannel=admin`
      : `https://t.me/${botUsername}?startgroup=admin`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col pb-24 select-none">
      {/* Top Header */}
      <header className="px-4 py-3 flex justify-between items-center border-b border-[#1e293b] bg-[#0f172a]/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold border border-sky-500/40">
            W
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-200">Web3 Owner</div>
            <div className="text-[10px] text-sky-400 font-mono">@{user?.name || user?.openId?.slice(0, 6) || "dimij"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs bg-[#1e293b] border-[#334155] text-sky-300 hover:bg-[#334155]" onClick={() => toast.info("Scanning QR code...")}>
            <ScanIcon className="w-3.5 h-3.5 mr-1" /> Scan
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#38bdf8] text-slate-900 font-bold hover:bg-[#0ea5e9]" onClick={handleConnectWallet}>
            <Wallet className="w-3.5 h-3.5 mr-1" /> Connect
          </Button>
        </div>
      </header>

      {/* Directory & Storage Tabs */}
      <div className="px-4 pt-3">
        <div className="bg-[#1e293b] p-1 rounded-2xl flex gap-1 border border-[#334155]">
          <button 
            onClick={() => setDirectoryMode("storage")} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${directoryMode === "storage" ? "bg-[#38bdf8] text-slate-900 shadow-md" : "text-gray-400 hover:text-white"}`}
          >
            My Storage
          </button>
          <button 
            onClick={() => setDirectoryMode("public")} 
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${directoryMode === "public" ? "bg-[#38bdf8] text-slate-900 shadow-md" : "text-gray-400 hover:text-white"}`}
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
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat ? "bg-sky-500 text-slate-900 border-sky-400" : "bg-[#1e293b] text-gray-300 border-[#334155]"}`}
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
                  className={`px-3 py-1 rounded-lg border ${selectedCountry === country ? "bg-slate-700 text-sky-400 border-sky-500/50 font-bold" : "bg-[#1e293b]/60 text-gray-400 border-[#334155]"}`}
                >
                  🌐 {country}
                </button>
              ))}
            </div>

            {/* LIVE KING PEDESTAL (Царь горы) */}
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-amber-500/60 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-3 right-3 flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" /> Current Bid
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl border border-amber-500/40 shadow-inner">
                  C
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">👑 RANK #1 • KING PEDESTAL</div>
                  <div className="text-lg font-black text-white">{kingSlot.title}</div>
                  <div className="text-xs text-gray-400">{kingSlot.subtitle} • Лидер: @{kingSlot.leaderUsername}</div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#0f172a]/60 p-3 rounded-2xl border border-[#334155] mb-4">
                <span className="text-xs text-gray-400">Ставка лидера:</span>
                <span className="text-sm font-black text-amber-400">{kingSlot.currentBid}</span>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg">
                    ⚡ ПЕРЕБИТЬ СТАВКУ И ЗАНЯТЬ ТОП-1
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1e293b] text-white border-[#334155]">
                  <DialogHeader>
                    <DialogTitle>Перебить ставку на Царь Горы (Ранг #1)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <p className="text-xs text-gray-300">Текущая ставка: <span className="text-amber-400 font-bold">{kingSlot.currentBid}</span></p>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Ваша ставка (TON):</label>
                      <Input 
                        type="number" 
                        placeholder="Введите сумму TON..." 
                        value={bidAmountInput}
                        onChange={(e) => setBidAmountInput(e.target.value)}
                        className="bg-[#0f172a] border-[#334155] text-white"
                      />
                    </div>
                    <Button 
                      onClick={() => handlePlaceBid(kingSlot)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                    >
                      Подтвердить ставку
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* TOP 4 PREMIER LOTS (Премиум ряд) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">TOP 4 PREMIER LOTS (ПРЕМИУМ РЯД)</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {premierSlots.map((slot) => (
                  <div key={slot.id} className="bg-[#1e293b]/70 border border-[#334155] rounded-2xl p-4 flex flex-col justify-between relative hover:border-sky-500/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">#{slot.slotNumber}</span>
                      <span className="text-xs">🥈</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-0.5 truncate">{slot.title}</div>
                      <div className="text-[11px] text-gray-400 mb-3">{slot.currentBid}</div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 text-[11px] bg-[#0f172a] border-[#334155] text-sky-400 hover:bg-sky-500 hover:text-slate-900">
                          Перебить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1e293b] text-white border-[#334155]">
                        <DialogHeader>
                          <DialogTitle>Перебить ставку (Слот #{slot.slotNumber})</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <p className="text-xs text-gray-300">Текущая ставка: <span className="text-sky-400 font-bold">{slot.currentBid}</span></p>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Ваша ставка (TON):</label>
                            <Input 
                              type="number" 
                              placeholder="Введите сумму TON..." 
                              value={bidAmountInput}
                              onChange={(e) => setBidAmountInput(e.target.value)}
                              className="bg-[#0f172a] border-[#334155] text-white"
                            />
                          </div>
                          <Button 
                            onClick={() => handlePlaceBid(slot)}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold"
                          >
                            Подтвердить ставку
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Bot Admin Action */}
            <div className="bg-[#1e293b]/40 border border-[#334155] rounded-2xl p-4 text-center">
              <h4 className="text-xs font-bold text-gray-200 mb-2">Добавить свой чат или канал в TG TOP</h4>
              <p className="text-[11px] text-gray-400 mb-3">Назначьте бота @GiftsLabBot администратором, и он автоматически добавит вас в каталог.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleAddBotLink('channel')} className="bg-[#1e293b] border border-[#334155] text-xs font-bold hover:bg-[#334155]">
                  📢 Канал
                </Button>
                <Button onClick={() => handleAddBotLink('group')} className="bg-[#1e293b] border border-[#334155] text-xs font-bold hover:bg-[#334155]">
                  💬 Группа
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "explore" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase text-gray-300 mb-2">Каталог площадок</h2>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                Пока нет добавленных групп. Добавьте бота в администраторы!
              </div>
            ) : (
              groups.map(g => (
                <div key={g.id} className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">{g.title}</div>
                    <div className="text-xs text-sky-400">@{g.username} • 👥 {g.membersCount} уч.</div>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/20">{g.category}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "nft" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black uppercase text-gray-300">NFT Usernames & Rentals</h2>
                <p className="text-[11px] text-gray-400">Маркетплейс юзернеймов (MarketApp Аренда & Продажа)</p>
              </div>
              <Dialog open={nftModalOpen} onOpenChange={setNftModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs">
                    + Выставить
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1e293b] text-white border-[#334155]">
                  <DialogHeader>
                    <DialogTitle>Выставить юзернейм / канал</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input 
                      placeholder="Username (@crypto)..." 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-[#0f172a] border-[#334155]"
                    />
                    <Input 
                      placeholder="Цена продажи (например, 100 TON)" 
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="bg-[#0f172a] border-[#334155]"
                    />
                    <Input 
                      placeholder="Цена аренды за сутки (например, 2 TON/day)" 
                      value={rentalPrice}
                      onChange={(e) => setRentalPrice(e.target.value)}
                      className="bg-[#0f172a] border-[#334155]"
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
                      className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold"
                    >
                      Опубликовать в MarketApp
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {nfts.length === 0 ? (
              <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-8 text-center text-gray-400 text-xs">
                Нет активных NFT юзернеймов. Выставьте свой первый актив!
              </div>
            ) : (
              nfts.map(nft => (
                <div key={nft.id} className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold text-white">@{nft.username}</div>
                    <div className="text-xs text-gray-400">💰 Покупка: <span className="text-sky-400">{nft.price}</span></div>
                    <div className="text-xs text-gray-400">⏳ Аренда: <span className="text-amber-400">{nft.rentalPricePerDay}</span></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" className="h-7 text-xs bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold" onClick={() => toast.success(`Покупка юзернейма @${nft.username} в обработке`)}>
                      Купить
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-[#334155] text-amber-400 hover:bg-[#334155]" onClick={() => rentNftMutation.mutate({ nftId: nft.id, rentalDays: 30 })}>
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
            <h2 className="text-sm font-black uppercase text-gray-300 mb-2">Мои Сделки и Аренда (Escrow)</h2>
            {deals.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                У вас нет активных сделок.
              </div>
            ) : (
              deals.map(d => (
                <div key={d.id} className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 flex justify-between items-center">
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
            <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-2xl mx-auto mb-3 border border-sky-500/40">
                {user?.name?.[0] || "U"}
              </div>
              <h2 className="text-base font-black text-white">{user?.name || "Web3 Owner"}</h2>
              <p className="text-xs text-sky-400 font-mono mb-4">@{user?.name || "dimij"}</p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-[#0f172a] p-3 rounded-2xl border border-[#334155]">
                  <div className="text-[10px] text-gray-400">Мои слоты в топе</div>
                  <div className="text-lg font-black text-sky-400">0</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-2xl border border-[#334155]">
                  <div className="text-[10px] text-gray-400">Активные сделки</div>
                  <div className="text-lg font-black text-amber-400">0</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <footer className="bg-[#0f172a] border-t border-[#1e293b] fixed bottom-0 left-0 right-0 p-3 grid grid-cols-5 text-center text-[10px] text-gray-400 z-50">
        <button onClick={() => setActiveTab("ranking")} className={`flex flex-col items-center gap-0.5 ${activeTab === "ranking" ? "text-sky-400 font-bold" : "hover:text-white"}`}>
          <Crown className="w-4 h-4" /> Топ
        </button>
        <button onClick={() => setActiveTab("explore")} className={`flex flex-col items-center gap-0.5 ${activeTab === "explore" ? "text-sky-400 font-bold" : "hover:text-white"}`}>
          <Compass className="w-4 h-4" /> Каталог
        </button>
        <button onClick={() => setActiveTab("nft")} className={`flex flex-col items-center gap-0.5 ${activeTab === "nft" ? "text-sky-400 font-bold" : "hover:text-white"}`}>
          <Sparkles className="w-4 h-4" /> NFT
        </button>
        <button onClick={() => setActiveTab("deals")} className={`flex flex-col items-center gap-0.5 ${activeTab === "deals" ? "text-sky-400 font-bold" : "hover:text-white"}`}>
          <Calendar className="w-4 h-4" /> Сделки
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center gap-0.5 ${activeTab === "dashboard" ? "text-sky-400 font-bold" : "hover:text-white"}`}>
          <User className="w-4 h-4" /> Профиль
        </button>
      </footer>
    </div>
  );
}

function ScanIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}
