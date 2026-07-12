"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useSongs } from "@/hooks/use-songs";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: songs, isLoading, isError } = useSongs();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Panel</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Hola, {user?.full_name?.split(" ")[0] ?? "de nuevo"}
        </h1>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Tus canciones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando canciones...</p>}
          {isError && <p className="text-sm text-red-400">No se pudieron cargar las canciones.</p>}
          {songs && songs.length === 0 && (
            <p className="text-sm text-white/50">
              Todavía no tienes canciones. Empieza subiendo tu primera pista.
            </p>
          )}
          {songs && songs.length > 0 && (
            <ul className="divide-y divide-white/10">
              {songs.map((song) => (
                <li key={song.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{song.title}</p>
                    <p className="text-xs text-white/50">{song.artist}</p>
                  </div>
                  {song.bpm && (
                    <span className="font-mono text-xs text-white/40">{song.bpm} BPM</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
