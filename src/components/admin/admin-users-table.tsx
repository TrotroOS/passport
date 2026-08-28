"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus } from "@/lib/utils";

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_platform_admin: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
  organizations?: { name: string; slug: string } | null;
}

interface AdminUsersTableProps {
  users: AdminUserRow[];
  currentUserId: string;
}

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const router = useRouter();

  async function toggleAdmin(userId: string, currentlyAdmin: boolean) {
    if (userId === currentUserId) {
      toast.error("You cannot change your own admin status");
      return;
    }

    const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(data.error?.message ?? "Failed to update admin status");
      return;
    }

    toast.success(currentlyAdmin ? "Admin access removed" : "User promoted to platform admin");
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Organization</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Platform admin</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Last sign-in</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-muted/30">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-card">
              <td className="px-4 py-3 text-foreground">{user.email}</td>
              <td className="px-4 py-3 text-foreground/90">{user.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-foreground/90">
                {user.organizations?.name ?? "—"}
              </td>
              <td className="px-4 py-3">{formatStatus(user.role)}</td>
              <td className="px-4 py-3">
                {user.is_platform_admin ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "—"}
              </td>
              <td className="px-4 py-3">
                {user.id !== currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-input text-xs"
                    onClick={() => toggleAdmin(user.id, user.is_platform_admin)}
                  >
                    {user.is_platform_admin ? "Demote" : "Promote"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
