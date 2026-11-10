"use client";

import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-bg select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <header>
          <h1 className="text-[40px] font-semibold leading-tight text-fg tracking-tight">Settings</h1>
          <p className="text-lg text-muted">Customize your Pebble experience</p>
        </header>

        <ProfileForm />
        <AppearanceSection />
        <PrivacySection />
      </div>
    </div>
  );
}
