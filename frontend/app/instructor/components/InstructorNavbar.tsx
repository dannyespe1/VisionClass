"use client";

import { AppShell } from "../../components/shared/AppShell";
import type { InstructorTabId } from "../../components/shared/nav-config";

type Props = {
  activeTab: InstructorTabId;
  onTabChange: (tab: InstructorTabId) => void;
};

export function InstructorNavbar({ activeTab, onTabChange }: Props) {
  return (
    <AppShell role="instructor" activeItem={activeTab} onItemChange={onTabChange} />
  );
}
