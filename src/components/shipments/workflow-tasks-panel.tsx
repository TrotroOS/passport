"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { WorkflowTask, WorkflowTaskStatus } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { formatDate } from "@/lib/utils";
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
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus(status: WorkflowTaskStatus) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/workflow-tasks/${task.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("updateFailed"));
        return;
      }
      toast.success(
        t("markedAs", { status: localizedStatus(status).toLowerCase() })
      );
      window.location.reload();
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setIsUpdating(false);
    }
  }

  const isActive =
    task.status === "open" || task.status === "in_progress" || task.status === "blocked";

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{task.title}</span>
            <Badge variant={priorityVariant(task.priority)}>
              {localizedStatus(task.priority)}
            </Badge>
            <Badge variant="outline">{localizedStatus(task.status)}</Badge>
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {task.description}
            </p>
          )}
          {task.due_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("due", { date: formatDate(task.due_date) })}
            </p>
          )}
        </div>
        {isActive && canEditTasks && (
          <div className="flex shrink-0 flex-wrap gap-1">
            {task.status !== "in_progress" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => updateStatus("in_progress")}
              >
                {t("start")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => updateStatus("done")}
            >
              {t("done")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isUpdating}
              onClick={() => updateStatus("blocked")}
            >
              {t("blocked")}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function WorkflowTasksPanel({
  tasks,
  canEditTasks = true,
}: WorkflowTasksPanelProps) {
  const t = useTranslations("tasks");
  const localizedStatus = useLocalizedStatus();
  const [showCompleted, setShowCompleted] = useState(false);

  const activeTasks = tasks.filter(
    (t) =>
      t.status === "open" ||
      t.status === "in_progress" ||
      t.status === "blocked"
  );
  const completedTasks = tasks.filter(
    (t) => t.status === "done" || t.status === "not_applicable"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        <CardDescription>
          {t("description")}
          {activeTasks.length > 0 && (
            <span className="ml-1 font-medium">
              — {t("activeCount", { count: activeTasks.length })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTasksYet")}</p>
        ) : (
          <>
            {activeTasks.length > 0 ? (
              <ul className="space-y-3">
                {activeTasks.map((task) => (
                  <TaskItem key={task.id} task={task} canEditTasks={canEditTasks} />
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {t("allCompleted")}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2 w-full justify-between"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {t("completedTasks", { count: completedTasks.length })}
                  {showCompleted ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                {showCompleted && (
                  <ul className="space-y-2">
                    {completedTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-md border border-dashed p-2 text-sm text-muted-foreground"
                      >
                        <span className="line-through">{task.title}</span>
                        <Badge variant="outline" className="ml-2">
                          {localizedStatus(task.status)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
