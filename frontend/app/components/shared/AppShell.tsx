"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";

import { EditableProfileMenu } from "./EditableProfileMenu";
import { LogoutButton } from "./LogoutButton";
import {
  getNavConfig,
  type AppShellRole,
  type TabByRole,
} from "./nav-config";

export type AppShellProps<R extends AppShellRole> = {
  role: R;
  activeItem: TabByRole[R];
  onItemChange: (item: TabByRole[R]) => void;
};

export function AppShell<R extends AppShellRole>({
  role,
  activeItem,
  onItemChange,
}: AppShellProps<R>) {
  const [open, setOpen] = useState(false);
  const config = getNavConfig(role);
  const items = config.getItems();

  return (
    <header className="w-full sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 lg:px-2 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg border border-slate-200"
            onClick={() => setOpen((value) => !value)}
            aria-label={config.mobileMenuLabel}
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-40 rounded-lg bg-white p-1 flex items-center justify-center">
              <Image
                src="/brand/atendynex-logo.svg"
                alt="AtenDynex"
                width={160}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="h-8 w-px bg-slate-300" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">{config.roleLabel}</span>
          </div>
        </div>

        <nav
          className={`${
            open ? "flex" : "hidden"
          } md:flex items-center gap-2 bg-slate-50 md:bg-transparent px-2 md:px-0 py-2 md:py-0 rounded-2xl`}
        >
          {items.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onItemChange(item.id);
                  setOpen(false);
                }}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {config.profileMode === "editable" && (role === "student" || role === "instructor") ? (
          <EditableProfileMenu role={role} />
        ) : (
          <LogoutButton />
        )}
      </div>
    </header>
  );
}
