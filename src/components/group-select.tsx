"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignAccountGroup } from "@/app/actions/group-actions";
import { useUI } from "@/lib/ui-store";

const NONE = "__none__";

interface GroupOption {
  id: string;
  name: string;
}

export function GroupSelect({
  accountId,
  groups,
  currentGroupId,
}: {
  accountId: string;
  groups: GroupOption[];
  currentGroupId: string | null;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [saving, setSaving] = useState(false);

  const assign = async (value: string) => {
    setSaving(true);
    const result = await assignAccountGroup({
      accountId,
      groupId: value === NONE ? null : value,
    });
    setSaving(false);
    if (result.success) {
      showToast("Grupo actualizado");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  return (
    <Select
      value={currentGroupId ?? NONE}
      onValueChange={(value) => void assign(value)}
      disabled={saving}
    >
      {/* min-w-0 + truncate: un nombre de grupo largo no desborda la fila
          estrecha de los ajustes de la cuenta. */}
      <SelectTrigger
        variant="form"
        aria-label="Grupo"
        className="h-9 min-w-0"
      >
        <span className="truncate">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sin grupo</SelectItem>
        {groups.map((group) => (
          <SelectItem key={group.id} value={group.id}>
            {group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
