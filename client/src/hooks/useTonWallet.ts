import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useIsConnectionRestored, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { trpc } from "@/lib/trpc";
import { getRussianLanguage, type Page } from "@/lib/tgTop-domain";
import { formatFinancialGram } from "@/lib/ton-format";

type MinimalUser = { openId?: string | null } | null | undefined;

/**
 * Инкапсулирует всё состояние и логику TON-кошелька: подключение/отключение,
 * пополнения (deposits) и выводы (withdrawals) GRAM, включая связанные
 * запросы, мутации и фоновые сверки.
 *
 * Бизнес-логика перенесена без изменений — только изоляция состояния из Home.tsx.
 */
export function useTonWallet({
  page,
  user,
  isAuthenticated,
  utils,
}: {
  page: Page;
  user: MinimalUser;
  isAuthenticated: boolean;
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [tonConnectUi] = useTonConnectUI();
  const walletAddress = useTonAddress();
  const walletConnectionRestored = useIsConnectionRestored();
  const [safeWalletAddress, setSafeWalletAddress] = useState<string | null>(null);
  const [tonDepositOpen, setTonDepositOpen] = useState(false);
  const [tonDepositAmount, setTonDepositAmount] = useState("1");
  const [activeTonDepositId, setActiveTonDepositId] = useState<number | null>(null);
  const [tonWithdrawalOpen, setTonWithdrawalOpen] = useState(false);
  const [tonWithdrawalAmount, setTonWithdrawalAmount] = useState("0.1");
  const [tonWithdrawalAddress, setTonWithdrawalAddress] = useState("");
  const [tonWithdrawalFlow, setTonWithdrawalFlow] = useState<"form" | "processing">("form");
  const [activeTonWithdrawalId, setActiveTonWithdrawalId] = useState<number | null>(null);
  const [financialHistoryOpen, setFinancialHistoryOpen] = useState(false);
  const tonWithdrawalSubmitInFlight = useRef(false);

  useEffect(() => {
    if (!walletConnectionRestored) return;
    const ownerKey = "tgtop:ton-wallet-owner";
    const pendingOwnerKey = "tgtop:ton-wallet-pending-owner";
    if (!isAuthenticated || !user?.openId) {
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      return;
    }
    const storedOwner = window.localStorage.getItem(ownerKey);
    const pendingOwner = window.localStorage.getItem(pendingOwnerKey);
    if (walletAddress && storedOwner !== user.openId && pendingOwner !== user.openId) {
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      void tonConnectUi.disconnect().catch(() => undefined);
      window.localStorage.removeItem(ownerKey);
      window.localStorage.removeItem(pendingOwnerKey);
      toast.error(getRussianLanguage() === "en" ? "The previous wallet session was disconnected for your safety." : "Предыдущая сессия кошелька отключена для безопасности.");
      return;
    }
    if (walletAddress && (storedOwner === user.openId || pendingOwner === user.openId)) {
      window.localStorage.setItem(ownerKey, user.openId);
      window.localStorage.removeItem(pendingOwnerKey);
      setSafeWalletAddress(walletAddress);
      return;
    }
    setSafeWalletAddress(null);
    setTonWithdrawalAddress("");
  }, [isAuthenticated, tonConnectUi, user?.openId, walletAddress, walletConnectionRestored]);

  const openTonWalletForCurrentUser = () => {
    if (user?.openId) window.localStorage.setItem("tgtop:ton-wallet-pending-owner", user.openId);
    tonConnectUi.openModal();
  };
  const disconnectTonWallet = async () => {
    try {
      await tonConnectUi.disconnect();
      window.localStorage.removeItem("tgtop:ton-wallet-owner");
      window.localStorage.removeItem("tgtop:ton-wallet-pending-owner");
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      toast.success(getRussianLanguage() === "en" ? "Wallet disconnected" : "Кошелёк отключён");
    } catch {
      toast.error(getRussianLanguage() === "en" ? "Could not disconnect wallet" : "Не удалось отключить кошелёк");
    }
  };

  const tonWithdrawalDefaultRecipient = safeWalletAddress ?? "";
  useEffect(() => {
    setTonWithdrawalAddress(safeWalletAddress ?? "");
  }, [safeWalletAddress]);

  const tonDepositsQuery = trpc.tgTop.getTonDeposits.useQuery(undefined, {
    enabled: isAuthenticated && page === "profile",
    refetchInterval: activeTonDepositId ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const tonWithdrawalsQuery = trpc.tgTop.getTonWithdrawals.useQuery(undefined, {
    enabled: isAuthenticated && page === "profile",
    refetchInterval: activeTonWithdrawalId ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const tonDeposits = (tonDepositsQuery.data ?? []) as Array<{
    id: number;
    requestedAmountNano: string;
    creditedAmountTon: string | null;
    reference: string;
    status: "created" | "submitted" | "confirmed" | "expired" | "rejected";
    failureReason: string | null;
    expiresAt: Date;
    confirmedAt: Date | null;
    createdAt: Date;
  }>;
  const tonWithdrawals = (tonWithdrawalsQuery.data ?? []) as Array<{
    id: number; grossAmountNano: string; feeReserveNano: string; actualFeeNano: string | null; netAmountNano: string;
    destinationWalletAddress: string; reference: string; status: "queued" | "manual_review" | "broadcast_pending" | "sent" | "confirmed" | "failed_refunded" | "cancelled";
    riskReasons: string | null; transactionHash: string | null; transactionLt: string | null; failureReason: string | null; createdAt: Date; confirmedAt: Date | null;
  }>;

  const createTonDepositMutation = trpc.tgTop.createTonDeposit.useMutation({
    onError: error => toast.error(error.message.includes("Failed query") ? "Не удалось подготовить пополнение. Попробуйте ещё раз через минуту." : error.message),
  });
  const markTonDepositSubmittedMutation = trpc.tgTop.markTonDepositSubmitted.useMutation({
    onError: error => toast.error(error.message),
  });
  const verifyTonDepositMutation = trpc.tgTop.verifyTonDeposit.useMutation({
    onSuccess: result => {
      void utils.tgTop.getTonDeposits.invalidate();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getAccountActivity.invalidate();
      if (result.newlyConfirmed) {
        toast.success(`Зачислено ${formatFinancialGram(result.amountTon)} GRAM`);
        setActiveTonDepositId(null);
        setTonDepositOpen(false);
      }
      if (result.status === "rejected") {
        toast.error("Платёж вернулся в кошелёк. Средства не зачислены.");
        setActiveTonDepositId(null);
      }
    },
    onError: error => toast.error(error.message),
  });
  const quoteTonWithdrawalMutation = trpc.tgTop.quoteTonWithdrawal.useMutation({
    onError: error => toast.error(error.message),
  });
  const createTonWithdrawalMutation = trpc.tgTop.createTonWithdrawal.useMutation({
    onSuccess: () => {
      void utils.tgTop.getTonWithdrawals.invalidate();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getAccountActivity.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reconcileTonWithdrawalMutation = trpc.tgTop.reconcileTonWithdrawal.useMutation({
    onSuccess: result => {
      void utils.tgTop.getTonWithdrawals.invalidate();
      void utils.tgTop.getAccount.invalidate();
      if (result.status === "confirmed") {
        toast.success("Средства успешно отправлены на ваш кошелёк");
        setActiveTonWithdrawalId(null);
        setTonWithdrawalOpen(false);
        setTonWithdrawalFlow("form");
      }
      if (result.status === "cancelled") {
        setTonWithdrawalFlow("form");
        setActiveTonWithdrawalId(null);
        toast.error("Вывод отменён. Средства возвращены на основной баланс.");
      }
    },
    // Сверка работает в фоне и повторяется автоматически; временная ошибка сети не должна спамить toast.
    onError: () => undefined,
  });
  useEffect(() => {
    if (!activeTonWithdrawalId) return;
    const active = tonWithdrawals.find(item => item.id === activeTonWithdrawalId);
    if (!active || (active.status !== "broadcast_pending" && active.status !== "sent")) return;
    const reconcile = () => {
      if (!reconcileTonWithdrawalMutation.isPending) {
        reconcileTonWithdrawalMutation.mutate({ withdrawalId: activeTonWithdrawalId });
      }
    };
    reconcile();
    const timer = window.setInterval(reconcile, 4_000);
    return () => window.clearInterval(timer);
  }, [activeTonWithdrawalId, reconcileTonWithdrawalMutation, tonWithdrawals]);
  useEffect(() => {
    if (!activeTonWithdrawalId) return;
    const active = tonWithdrawals.find(item => item.id === activeTonWithdrawalId);
    if (!active || active.status !== "cancelled") return;
    setActiveTonWithdrawalId(null);
    setTonWithdrawalFlow("form");
    setTonWithdrawalOpen(false);
    toast.error("Вывод отменён до отправки. GRAM остались на основном балансе.");
  }, [activeTonWithdrawalId, tonWithdrawals]);
  const startTonDeposit = async () => {
    if (!walletConnectionRestored) return;
    if (!safeWalletAddress) {
      openTonWalletForCurrentUser();
      return;
    }
    const deposit = await createTonDepositMutation.mutateAsync({ amountTon: tonDepositAmount, senderWalletAddress: safeWalletAddress });
    setActiveTonDepositId(deposit.id);
    try {
      await tonConnectUi.sendTransaction({
        validUntil: deposit.validUntil,
        network: "-239",
        messages: [{ address: deposit.recipientWalletAddress, amount: deposit.amountNano, payload: deposit.payload }],
      });
      await markTonDepositSubmittedMutation.mutateAsync({ depositId: deposit.id });
      toast.success("Перевод отправлен. Проверяем поступление в сети GRAM.");
      void verifyTonDepositMutation.mutateAsync({ depositId: deposit.id });
    } catch (error) {
      toast.error(error instanceof Error && error.message.includes("USER_REJECTS") ? "Подтверждение в кошельке отменено" : "Перевод не подтверждён. Средства не зачислены.");
    }
  };
  const prepareTonWithdrawal = async () => {
    if (tonWithdrawalSubmitInFlight.current || quoteTonWithdrawalMutation.isPending || createTonWithdrawalMutation.isPending) return;
    tonWithdrawalSubmitInFlight.current = true;
    try {
      const quote = await quoteTonWithdrawalMutation.mutateAsync({ amountTon: tonWithdrawalAmount, destinationWalletAddress: tonWithdrawalAddress });
      const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now()}${Math.random().toString(36).slice(2, 18)}`;
      const withdrawal = await createTonWithdrawalMutation.mutateAsync({
        amountTon: tonWithdrawalAmount,
        destinationWalletAddress: quote.destinationWalletAddress,
        idempotencyKey,
      });
      setActiveTonWithdrawalId(withdrawal.id);
      setTonWithdrawalFlow("processing");
    } finally {
      tonWithdrawalSubmitInFlight.current = false;
    }
  };

  return {
    walletConnectionRestored,
    safeWalletAddress, setSafeWalletAddress,
    tonDepositOpen, setTonDepositOpen,
    tonDepositAmount, setTonDepositAmount,
    activeTonDepositId, setActiveTonDepositId,
    tonWithdrawalOpen, setTonWithdrawalOpen,
    tonWithdrawalAmount, setTonWithdrawalAmount,
    tonWithdrawalAddress, setTonWithdrawalAddress,
    tonWithdrawalFlow, setTonWithdrawalFlow,
    activeTonWithdrawalId, setActiveTonWithdrawalId,
    financialHistoryOpen, setFinancialHistoryOpen,
    tonWithdrawalSubmitInFlight,
    tonWithdrawalDefaultRecipient,
    tonDepositsQuery,
    tonWithdrawalsQuery,
    tonDeposits,
    tonWithdrawals,
    createTonDepositMutation,
    markTonDepositSubmittedMutation,
    verifyTonDepositMutation,
    quoteTonWithdrawalMutation,
    createTonWithdrawalMutation,
    reconcileTonWithdrawalMutation,
    openTonWalletForCurrentUser,
    disconnectTonWallet,
    startTonDeposit,
    prepareTonWithdrawal,
  };
}
