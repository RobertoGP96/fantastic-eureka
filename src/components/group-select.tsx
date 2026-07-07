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
      <SelectTrigger className="h-9 rounded-[10px] border border-line bg-white px-3 text-[12.5px] text-ink">
        <SelectValue />
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
