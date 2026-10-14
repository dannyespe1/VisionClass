"use client";

import { AppShell } from "../components/shared/AppShell";
import type { StudentTabId } from "../components/shared/nav-config";

type Props = {
  activeTab: StudentTabId;
  onTabChange: (tab: StudentTabId) => void;
};

export function StudentNavbar({ activeTab, onTabChange }: Props) {
  return (
    <AppShell role="student" activeItem={activeTab} onItemChange={onTabChange} />
  );
}
