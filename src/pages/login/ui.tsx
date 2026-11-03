import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/entities/session";
import { login } from "@/features/auth";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, Input } from "@/shared/ui/input";

const schema = z.object({
  login: z.string().trim().min(1, "Username atau email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSession((s) => s.setSession);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: login, onSuccess: setSession });
  const from = (location.state as { from?: string } | null)?.from;
  const destination = from?.startsWith("/") ? from : "/dashboard";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading-1 text-ink">Login</h1>
        <p className="text-body-lg text-ink-secondary">Portal VAPT Management.</p>
      </header>
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={handleSubmit(async (values) => {
          try {
            await mutation.mutateAsync(values);
            navigate(destination, { replace: true });
          } catch {
            /* ditampilkan lewat mutation.error */
          }
        })}
      >
        {mutation.error ? (
          <Alert tone="error" title="Login gagal" compact>
            {mutation.error.message}
          </Alert>
        ) : null}
        <FieldGroup>
          <Field label="Username atau email" error={errors.login?.message}>
            {(f) => <Input autoComplete="username" disabled={mutation.isPending} {...f} {...register("login")} />}
          </Field>
          <Field label="Password" error={errors.password?.message}>
            {(f) => (
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-12"
                  disabled={mutation.isPending}
                  {...f}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={show}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-secondary focus-ring hover:text-ink"
                >
                  {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </div>
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" variant="solid" className="w-full" loading={mutation.isPending}>
          Masuk
        </Button>
      </form>
    </div>
  );
}
