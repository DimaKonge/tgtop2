import { useState } from "react";
import type { Group, WalletNftFilter, WorkspaceSection } from "@/lib/tgTop-domain";

/**
 * Состояние раздела «Мои сообщества»: выбор, режим выделения, модерация,
 * секция рабочего пространства и фильтр NFT кошелька.
 * Только группировка useState — бизнес-логика не меняется.
 */
export function useMyGroups() {
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>("communities");
  const [walletNftFilter, setWalletNftFilter] = useState<WalletNftFilter>("all");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [myGroupsSelectionMode, setMyGroupsSelectionMode] = useState(false);
  const [pendingGroupDeletion, setPendingGroupDeletion] = useState<Group | null>(null);
  const [pendingModerationGroup, setPendingModerationGroup] = useState<{ id: number; title: string } | null>(null);

  return {
    workspaceSection, setWorkspaceSection,
    walletNftFilter, setWalletNftFilter,
    selectedGroupId, setSelectedGroupId,
    selectedGroupIds, setSelectedGroupIds,
    myGroupsSelectionMode, setMyGroupsSelectionMode,
    pendingGroupDeletion, setPendingGroupDeletion,
    pendingModerationGroup, setPendingModerationGroup,
  };
}
