import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resetPassword, signIn, signOut, signUp, useAuthStore } from "@/sync/auth";
import { reportError } from "@/lib/logger";
import { isCloudAvailable } from "./availability";

type Mode = "signin" | "signup" | "reset";

/** E-mail / password sign-in, sign-up and "forgot password" for the cloud mode. */
export function CloudAccountPanel({ onSignedOut }: { onSignedOut?: () => void } = {}) {
  const { t } = useTranslation();
  const { userId, email: currentEmail } = useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isCloudAvailable()) return <p className="text-sm text-muted-foreground">{t("cloud.notConfigured")}</p>;

  if (userId) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <UserCheck className="size-5 text-success" aria-hidden />
        <span className="flex-1">{t("cloud.signedInAs", { email: currentEmail ?? userId })}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await signOut();
            onSignedOut?.();
          }}
        >
          <LogOut /> {t("cloud.signOut")}
        </Button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        toast.success(t("cloud.signedIn"));
      } else if (mode === "signup") {
        const { needsConfirmation } = await signUp(email.trim(), password);
        setMessage(needsConfirmation ? t("cloud.confirmEmail") : t("cloud.signedIn"));
      } else {
        await resetPassword(email.trim());
        setMessage(t("cloud.resetSent"));
      }
    } catch (e) {
      toast.error(t("cloud.authFailed"), { description: reportError("auth", `${mode} failed`, e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="w-full">
          <TabsTrigger value="signin" className="flex-1">{t("cloud.signIn")}</TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">{t("cloud.signUp")}</TabsTrigger>
          <TabsTrigger value="reset" className="flex-1">{t("cloud.forgot")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-1.5">
        <Label htmlFor="cloud-email">{t("cloud.email")}</Label>
        <Input id="cloud-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {mode !== "reset" && (
        <div className="space-y-1.5">
          <Label htmlFor="cloud-password">{t("cloud.password")}</Label>
          <Input id="cloud-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
      )}
      {message && <p className="rounded-md border bg-muted/40 p-3 text-sm">{message}</p>}
      <Button type="submit" disabled={busy || !email.trim() || (mode !== "reset" && password.length < 6)}>
        {mode === "signin" ? t("cloud.signIn") : mode === "signup" ? t("cloud.signUp") : t("cloud.sendReset")}
      </Button>
    </form>
  );
}
