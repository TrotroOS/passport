"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { WorkflowTask, WorkflowTaskStatus } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { maskClientError } from "@/lib/security/mask-client-error";
import { formatDate } from "@/lib/utils";
import {
  completedWorkflowTasks,
  visibleWorkflowTasks,
} from "@/lib/shipments/workflow-task-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WorkflowTasksPanelProps {
  tasks: WorkflowTask[];
  canEditTasks?: boolean;
}

function priorityVariant(priority: string) {
  switch (priority) {
    case "urgent":
      return "destructive" as const;
    case "high":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function TaskItem({
  task,
  canEditTasks,
}: {
  task: WorkflowTask;
  canEditTasks: boolean;
}) {
  const t = useTranslations("tasks");
  const localizedStatus = useLocalizedStatus();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus(status: WorkflowTaskStatus) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/workflow-tasks/${task.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        toast.error(maskClientError(data.error, t("updateFailed")));
        return;
      }
      toast.success(t("markedAs", { status: localizedStatus(status).toLowerCase() }));
      router.refresh();
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setIsUpdating(false);
    }
  }

  const nextAction: WorkflowTaskStatus =
    task.status === "in_progress" ? "done" : "in_progress";

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{task.title}</span>
            <Badge variant={priorityVariant(task.priority)}>
              {localizedStatus(task.priority)}
            </Badge>
            {task.status === "blocked" ? (
              <Badge variant="outline">{localizedStatus(task.status)}</Badge>
            ) : null}
          </div>
          {task.due_date ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("due", { date: formatDate(task.due_date) })}
            </p>
          ) : null}
        </div>
        {canEditTasks ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(nextAction)}
          >
            {task.status === "in_progress" ? t("done") : t("start")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function WorkflowTasksPanel({
  tasks,
  canEditTasks = true,
}: WorkflowTasksPanelProps) {
  const t = useTranslations("tasks");
  const visible = visibleWorkflowTasks(tasks);
  const completed = completedWorkflowTasks(tasks);

  if (visible.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        <CardDescription>
          {t("description")} — {t("activeCount", { count: visible.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {visible.map((task) => (
            <TaskItem key={task.id} task={task} canEditTasks={canEditTasks} />
          ))}
        </ul>
        {completed.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("completedHidden", { count: completed.length })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
