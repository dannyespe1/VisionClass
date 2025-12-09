"use client";

import { useRouter } from "next/navigation";
import { HomePage } from "@/app/components/HomePage";

export default function Page() {
  const router = useRouter();
  return <HomePage onNavigateToLogin={() => router.push("/login")} />;
}
