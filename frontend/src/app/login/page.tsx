"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => router.push("/dashboard"),
        onError: (error) => {
          const message =
            error instanceof ApiError && error.status === 401
              ? "Email o contraseña incorrectos"
              : "No se pudo iniciar sesión. Intenta de nuevo.";
          toast.error(message);
        },
      },
    );
  };

  return (
    <main className="flex min-h-[100svh] flex-1 items-center justify-center bg-background px-6">
      <Card className="w-full max-w-sm border-white/10">
        <CardHeader>
          <Link href="/" className="mb-2 font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">
            StudioDesk
          </Link>
          <CardTitle className="text-2xl">Ingresar</CardTitle>
          <CardDescription>Accede a tu panel de control multipista.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-2" disabled={login.isPending}>
              {login.isPending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-orange-400 hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
