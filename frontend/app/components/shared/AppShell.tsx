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
    <header className="w-full sticky top-0 z-30 backdrop-blur-md bg-card/80 border-b border-border shadow-sm">
      <div className="relative max-w-6xl mx-auto px-4 lg:px-2 py-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg border border-border"
            onClick={() => setOpen((value) => !value)}
            aria-label={config.mobileMenuLabel}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-28 sm:w-40 rounded-lg bg-card p-1 flex items-center justify-center">
              <Image
                src="/brand/atendynex-logo.svg"
                alt="AtenDynex"
                width={160}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <span className="hidden text-sm font-semibold text-foreground sm:inline">{config.roleLabel}</span>
          </div>
        </div>

        <nav
          className={`${
            open ? "flex" : "hidden"
          } absolute left-4 right-4 top-full z-40 flex-col items-stretch gap-2 rounded-2xl bg-muted px-2 py-2 shadow-lg md:static md:flex md:flex-row md:items-center md:bg-transparent md:px-0 md:py-0 md:shadow-none`}
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
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
