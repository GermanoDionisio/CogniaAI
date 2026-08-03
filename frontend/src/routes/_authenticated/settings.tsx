import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { ACCENTS, useTheme, type AccentColor } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Link2,
  Unlink,
  Sun,
  Moon,
  Sparkles,
  Github,
  Linkedin,
  Check,
  Palette,
  Waves,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Configurações — Cognia AI" }] }),
  component: SettingsPage,
});

type Identity = {
  id: string;
  provider: string;
  identity_id?: string;
  identity_data?: Record<string, unknown>;
};

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getProfile);
  const upd = useServerFn(updateProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => get() });

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setIdentities((data.user?.identities ?? []) as Identity[]);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setDisplayName(profile.display_name ?? "");
    setPhone(profile.phone ?? "");
    setEmail(userEmail ?? "");
  }, [profile, userEmail]);

  const saveProfile = useMutation({
    mutationFn: () =>
      upd({
        data: {
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: displayName || null,
          phone: phone || null,
        },
      }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function changeEmail() {
    if (!newEmail || newEmail === userEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return toast.error(error.message);
    toast.success("Confirme no seu novo e-mail", {
      description: "Enviamos um link de confirmação.",
    });
    setNewEmail("");
  }

  async function changePassword() {
    if (newPassword.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    setNewPassword("");
  }

  async function linkProvider(provider: "google" | "github" | "linkedin_oidc") {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/settings` },
      });
      if (error) throw error;
    } catch (e) {
      toast.error("Não foi possível vincular", {
        description: (e as Error).message + " (o provedor pode não estar ativo).",
      });
    }
  }

  async function unlinkProvider(identity: Identity) {
    if (identities.length <= 1) return toast.error("Você precisa de ao menos 1 método de login");
    // @ts-expect-error - types accept identity
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) return toast.error(error.message);
    toast.success("Conta desvinculada");
    const { data } = await supabase.auth.getUser();
    setIdentities((data.user?.identities ?? []) as Identity[]);
  }

  const has = (p: string) => identities.find((i) => i.provider === p);
  const hasEmail = !!userEmail && !userEmail.endsWith("@cognia.app");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-accent transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Configurações</h1>
        </div>

        {/* Informações pessoais */}
        <Section title="Informações pessoais" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome">
              <input
                className={input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Seu nome"
              />
            </Field>
            <Field label="Sobrenome">
              <input
                className={input}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Seu sobrenome"
              />
            </Field>
            <Field label="Nome de exibição" className="sm:col-span-2">
              <input
                className={input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como quer ser chamado"
              />
            </Field>
          </div>

          <Field label="Celular">
            {phone ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className={input + " pl-10"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => setPhone("")}>
                  Remover
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={input + " pl-10"}
                  placeholder="+55 11 99999-9999 — clique para adicionar"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}
          </Field>

          <div className="flex justify-end">
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              style={{ background: "var(--gradient-brand)", color: "white" }}
            >
              {saveProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </Section>

        {/* E-mail */}
        <Section title="E-mail" icon={Mail}>
          {hasEmail ? (
            <>
              <p className="text-sm text-muted-foreground">
                E-mail atual: <span className="text-foreground font-medium">{userEmail}</span>
              </p>
              <Field label="Alterar e-mail">
                <div className="flex gap-2">
                  <input
                    className={input}
                    type="email"
                    placeholder="novo@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button onClick={changeEmail} disabled={!newEmail}>
                    Alterar
                  </Button>
                </div>
              </Field>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Você ainda não vinculou um e-mail à sua conta.
              </p>
              <Field label="Adicionar e-mail">
                <div className="flex gap-2">
                  <input
                    className={input}
                    type="email"
                    placeholder="seu@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button
                    onClick={changeEmail}
                    disabled={!newEmail}
                    style={{ background: "var(--gradient-brand)", color: "white" }}
                  >
                    Adicionar
                  </Button>
                </div>
              </Field>
            </>
          )}
        </Section>

        {/* Senha */}
        <Section title="Segurança" icon={Lock}>
          <Field label="Nova senha">
            <div className="flex gap-2">
              <input
                className={input}
                type="password"
                placeholder="Ao menos 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={changePassword} disabled={!newPassword}>
                Atualizar
              </Button>
            </div>
          </Field>
        </Section>

        {/* Contas vinculadas */}
        <Section title="Contas vinculadas" icon={Link2}>
          <ProviderRow
            provider="google"
            label="Google"
            icon={<GoogleIcon />}
            linked={has("google")}
            onLink={() => linkProvider("google")}
            onUnlink={(i) => unlinkProvider(i)}
          />
          <ProviderRow
            provider="github"
            label="GitHub"
            icon={<Github className="w-5 h-5" />}
            linked={has("github")}
            onLink={() => linkProvider("github")}
            onUnlink={(i) => unlinkProvider(i)}
          />
          <ProviderRow
            provider="linkedin_oidc"
            label="LinkedIn"
            icon={<Linkedin className="w-5 h-5 text-[#0A66C2]" />}
            linked={has("linkedin_oidc")}
            onLink={() => linkProvider("linkedin_oidc")}
            onUnlink={(i) => unlinkProvider(i)}
          />
        </Section>

        {/* Aparência */}
        <AppearanceSection />

        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          Cognia AI · versão 1.0
        </p>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-xl bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ProviderRow({
  label,
  icon,
  linked,
  onLink,
  onUnlink,
}: {
  provider: string;
  label: string;
  icon: React.ReactNode;
  linked: Identity | undefined;
  onLink: () => void;
  onUnlink: (i: Identity) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            {linked ? (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <Check className="w-3 h-3" /> Vinculado
              </span>
            ) : (
              "Não vinculado"
            )}
          </div>
        </div>
      </div>
      {linked ? (
        <Button variant="outline" size="sm" onClick={() => onUnlink(linked)}>
          <Unlink className="w-3.5 h-3.5 mr-1.5" /> Remover
        </Button>
      ) : (
        <Button size="sm" onClick={onLink}>
          <Link2 className="w-3.5 h-3.5 mr-1.5" /> Vincular
        </Button>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { mode, accent, animatedBg, setMode, setAccent, setAnimatedBg } = useTheme();
  return (
    <section className="glass rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Palette className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold">Aparência</h2>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Tema</div>
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <button
            onClick={() => setMode("dark")}
            className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition ${mode === "dark" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
          >
            <Moon className="w-4 h-4" /> Escuro
          </button>
          <button
            onClick={() => setMode("light")}
            className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition ${mode === "light" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
          >
            <Sun className="w-4 h-4" /> Claro
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Cor de destaque</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(ACCENTS) as AccentColor[]).map((k) => {
            const a = ACCENTS[k];
            const active = accent === k;
            return (
              <button
                key={k}
                onClick={() => setAccent(k)}
                className={`group rounded-xl p-2 border transition ${active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"}`}
                title={a.label}
              >
                <div
                  className="h-10 w-full rounded-lg mb-1.5"
                  style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                />
                <div className="text-[11px] text-center truncate">{a.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Waves className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-medium">Fundo animado</div>
            <div className="text-xs text-muted-foreground">
              Aurora suave em movimento no fundo do app
            </div>
          </div>
        </div>
        <button
          onClick={() => setAnimatedBg(!animatedBg)}
          className={`relative w-11 h-6 rounded-full transition ${animatedBg ? "bg-primary" : "bg-muted"}`}
          aria-label="Alternar fundo animado"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${animatedBg ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      <div className="rounded-xl border border-border p-4 flex items-center gap-3 text-sm">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">
          Suas preferências são aplicadas em todos os dispositivos deste navegador.
        </span>
      </div>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
