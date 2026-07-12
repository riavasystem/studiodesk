"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const login = useLogin();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isPending = register.isPending || login.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      { email, password, full_name: fullName },
      {
        onSuccess: () => {
          login.mutate(
            { email, password },
            {
              onSuccess: () => router.push("/dashboard"),
              onError: () => router.push("/login"),
            },
          );
        },
        onError: (error) => {
          const message =
            error instanceof ApiError && error.status === 409
              ? "Ya existe una cuenta con este email"
              : "No se pudo crear la cuenta. Intenta de nuevo.";
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
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Empieza a organizar tus canciones multipista.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-2" disabled={isPending}>
              {isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-orange-400 hover:underline">
              Ingresa
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
