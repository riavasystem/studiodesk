"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/use-categories";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCategory.mutate(name, {
      onSuccess: () => {
        setOpen(false);
        setName("");
      },
      onError: () => toast.error("No se pudo crear la categoría"),
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-400 uppercase">Categorías</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Categorías</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Nueva categoría</Button>} />
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nueva categoría</DialogTitle>
              </DialogHeader>
              <Input
                className="mt-4"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Todas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-white/50">Cargando...</p>}
          {categories?.length === 0 && <p className="text-sm text-white/50">No hay categorías todavía.</p>}
          <ul className="divide-y divide-white/10">
            {categories?.map((category) => (
              <li key={category.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-white">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    deleteCategory.mutate(category.id, {
                      onError: () => toast.error("No se pudo eliminar"),
                    })
                  }
                >
                  <Trash2 className="size-4 text-white/40" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
