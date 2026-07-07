"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createCategory,
  toggleCategory,
} from "@/app/actions/category-actions";
import { useUI } from "@/lib/ui-store";

export interface CategoryItem {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  usageCount: number;
}

export function CategoryManager({
  kind,
  categories,
}: {
  kind: string;
  categories: CategoryItem[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    setError(null);
    const result = await createCategory({ name, kind });
    setSaving(false);
    if (result.success) {
      showToast("Categoría creada");
      setName("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const toggle = async (id: string) => {
    const result = await toggleCategory(id);
    if (result.success) {
      showToast(result.data.active ? "Categoría activada" : "Categoría oculta");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          maxLength={40}
          required
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </form>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center justify-between rounded-[13px] border border-line bg-white px-3.5 py-2.5 ${
              category.active ? "" : "opacity-55"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold text-navy">
                {category.name}
              </span>
              {category.usageCount > 0 && (
                <Badge variant="neutral">{category.usageCount} mov.</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void toggle(category.id)}
            >
              {category.active ? "Ocultar" : "Activar"}
            </Button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="rounded-[13px] border border-line bg-white px-3.5 py-4 text-center text-[12.5px] text-muted">
            Sin categorías de este tipo.
          </div>
        )}
      </div>
    </div>
  );
}
