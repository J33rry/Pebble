"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronRight, Lock, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api/auth";

function SettingsRow({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const body = (
    <>
      <span
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-danger/10 text-danger" : "bg-surface-2 text-accent",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block text-[17px] font-semibold", danger ? "text-danger" : "text-fg")}>
          {title}
        </span>
        <span className="block text-[15px] text-muted">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </>
  );
  const className =
    "flex w-full items-center gap-4 rounded-2xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-sm)] hover:ring-1 hover:ring-border-strong transition-shadow";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function PrivacySection() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user!.email),
    onSuccess: () => toast(`Password reset link sent to ${user?.email}`, "success"),
    onError: (error: Error) => toast(error.message || "Couldn't send the reset link", "error"),
  });

  return (
    <section className="grid gap-6 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex gap-4 lg:border-r lg:border-border-strong lg:pr-6">
        <ShieldCheck className="h-7 w-7 shrink-0 text-accent" />
        <div>
          <h2 className="text-[24px] font-semibold text-fg tracking-tight">Privacy &amp; security</h2>
          <p className="text-muted">Manage your account, privacy, and security preferences.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <SettingsRow
          icon={Lock}
          title="Account security"
          description={
            resetPasswordMutation.isSuccess
              ? `Check ${user?.email} for a link to set a new password.`
              : `Email yourself a link to change your password.`
          }
          onClick={() => !resetPasswordMutation.isPending && resetPasswordMutation.mutate()}
        />
        <SettingsRow
          icon={LogOut}
          title="Log out"
          description="Sign out of Pebble on this device."
          onClick={() => logout()}
          danger
        />
      </div>
    </section>
  );
}
