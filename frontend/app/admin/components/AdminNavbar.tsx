"use client";

import { AppShell } from "../../components/shared/AppShell";
import type { AdminView } from "../types";

type Props = {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
};

export function AdminNavbar({ currentView, onViewChange }: Props) {
  return (
    <AppShell role="admin" activeItem={currentView} onItemChange={onViewChange} />
  );
}
