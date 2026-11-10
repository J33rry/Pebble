"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Loader2, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { mediaApi } from "@/lib/api/media";
import { usersApi } from "@/lib/api/users";

export function ProfileForm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  const resetForm = () => {
    setDisplayName(user?.displayName || "");
    setBio(user?.bio || "");
    setAvatarUrl(user?.avatarUrl || "");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the form from the loaded profile
    if (user) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isDirty =
    displayName !== (user?.displayName || "") ||
    bio !== (user?.bio || "") ||
    avatarUrl !== (user?.avatarUrl || "");

  const updateProfileMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) => usersApi.updateMe(data),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      toast("Profile updated successfully!", "success");
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to update profile", "error");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const media = await mediaApi.upload(file, () => {});
      setAvatarUrl(media.storageId);
      toast("Avatar uploaded! Remember to save changes.", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to upload avatar", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const online = isOnline(user?.id);
  const fieldClass =
    "w-full rounded-xl border border-border-strong bg-surface py-2.5 pl-4 pr-11 text-[16px] text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

  return (
    <form
      onSubmit={handleProfileSubmit}
      className="grid gap-8 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row lg:border-r lg:border-border-strong lg:pr-8">
        <div className="relative shrink-0">
          <Avatar src={avatarUrl} name={displayName || user?.username} size="2xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent shadow-[var(--shadow-md)] hover:scale-105 transition-transform disabled:opacity-60"
            title="Change photo"
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Pencil className="h-5 w-5" />}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarSelect}
            accept="image/*"
            className="hidden"
          />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h2 className="text-[30px] font-semibold leading-tight text-fg tracking-tight truncate">
            {user?.displayName || user?.username}
          </h2>
          <p className="text-lg text-muted truncate">@{user?.username}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-[16px] text-muted">
            <span className={clsx("h-3 w-3 rounded-full", online ? "bg-success" : "bg-faint")} />
            {online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-[15px] font-semibold text-fg">
            Display name
          </label>
          <div className="relative">
            <input
              id="displayName"
              ref={nameRef}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className={fieldClass}
            />
            <Pencil
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 cursor-text text-accent"
              onClick={() => nameRef.current?.focus()}
            />
          </div>
        </div>
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-[15px] font-semibold text-fg">
            Bio
          </label>
          <div className="relative">
            <textarea
              id="bio"
              ref={bioRef}
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about yourself"
              className={clsx(fieldClass, "resize-none leading-snug")}
            />
            <Pencil
              className="absolute right-4 top-4 h-4 w-4 cursor-text text-accent"
              onClick={() => bioRef.current?.focus()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={resetForm}
            disabled={!isDirty || updateProfileMutation.isPending}
            className="rounded-xl bg-surface-3 px-6 py-2.5 text-[16px] font-medium text-accent hover:bg-surface-3/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || updateProfileMutation.isPending || isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-[16px] font-medium text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
