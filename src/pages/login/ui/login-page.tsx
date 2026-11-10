import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/entities/session";
import { login } from "@/features/auth";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, Input } from "@/shared/ui/input";

const schema = z.object({
  login: z.string().trim().min(1, "Username atau email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginAlertClosing, setIsLoginAlertClosing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSession((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: setSession,
  });

  const from = (location.state as { from?: string } | null)?.from;
  const destination = from?.startsWith("/") ? from : "/dashboard";
  const hasLoginError = Boolean(mutation.error);
  const isLoginAlertVisible = hasLoginError && !isLoginAlertClosing;

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-raised sm:p-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-title-lg text-ink sm:text-heading-1">Login</h1>
          <p className="max-w-[36ch] text-body-lg text-ink-secondary">
            Platform terpadu manajemen VAPT dan remedi keamanan.
          </p>
        </header>

        <form
          noValidate
          className="flex flex-col"
          onSubmit={handleSubmit(async (values) => {
            setIsLoginAlertClosing(false);
            try {
              await mutation.mutateAsync(values);
              navigate(destination, { replace: true });
            } catch {
              // Error tetap ditampilkan secara inline dari state mutation.
            }
          })}
        >
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity,margin-bottom] duration-200 ease-out",
              isLoginAlertVisible
                ? "mb-6 grid-rows-[1fr] opacity-100"
                : "mb-0 grid-rows-[0fr] opacity-0",
            )}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === "grid-template-rows" &&
                isLoginAlertClosing
              ) {
                mutation.reset();
                setIsLoginAlertClosing(false);
              }
            }}
          >
            <div className="min-h-0 overflow-hidden">
              {hasLoginError ? (
                <Alert
                  tone="error"
                  title="Username atau password tidak valid"
                  compact
                  className="animate-form-feedback-in"
                  onDismiss={() => setIsLoginAlertClosing(true)}
                >
                  {mutation.error?.message}
                </Alert>
              ) : null}
            </div>
          </div>

          <FieldGroup className="mb-8 gap-6">
            <Field label="Email" error={errors.login?.message}>
              {(field) => (
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="myemail@example.com"
                  className="border-border bg-surface-subtle focus-ring-neutral hover:border-border-control focus-visible:border-border-control"
                  disabled={mutation.isPending}
                  {...field}
                  {...register("login")}
                />
              )}
            </Field>

            <Field label="Password" error={errors.password?.message}>
              {(field) => (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="border-border bg-surface-subtle pr-12 focus-ring-neutral hover:border-border-control focus-visible:border-border-control"
                    disabled={mutation.isPending}
                    {...field}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    aria-pressed={showPassword}
                    disabled={mutation.isPending}
                    className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center justify-center text-ink focus-ring-neutral transition-colors duration-150 ease-out hover:text-ink-secondary disabled:cursor-not-allowed disabled:text-ink-disabled"
                  >
                    {showPassword ? (
                      <EyeOff
                        className="size-5 animate-control-icon-swap"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    ) : (
                      <Eye
                        className="size-5 animate-control-icon-swap"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    )}
                  </button>
                </div>
              )}
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            variant="solid"
            className="w-full transition-[color,background-color,border-color,box-shadow,transform] active:scale-[0.99]"
            loading={mutation.isPending}
          >
            Masuk
          </Button>
        </form>

        <div className="flex items-start gap-3 border-t border-border pt-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-brand-tint text-brand">
            <ShieldCheck className="size-4.5" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-button text-ink">Akses akun perusahaan</p>
            <p className="text-body-sm text-ink-muted">
              Belum punya akun?{" "}
              <a
                href="#"
                className="rounded-xs font-medium text-brand focus-ring transition-colors duration-150 ease-out hover:text-brand-hover hover:underline"
              >
                Hubungi admin
              </a>{" "}
              untuk informasi lebih lanjut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
