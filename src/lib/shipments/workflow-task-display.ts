import type { WorkflowTask } from "@/types/database";

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_RANK: Record<string, number> = {
  blocked: 0,
  in_progress: 1,
  open: 2,
};

export function isActiveWorkflowTask(task: WorkflowTask): boolean {
  return task.status === "open" || task.status === "in_progress" || task.status === "blocked";
}

/**
 * Hide discrepancy-clone tasks: those are shown on discrepancy cards instead.
 */
export function visibleWorkflowTasks(tasks: WorkflowTask[]): WorkflowTask[] {
  return tasks
    .filter(isActiveWorkflowTask)
    .filter((task) => task.task_type !== "resolve_discrepancy")
    .slice()
    .sort((a, b) => {
      const status = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      if (status !== 0) return status;
      const priority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (priority !== 0) return priority;
      const dueA = a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY;
      const dueB = b.due_date ? Date.parse(b.due_date) : Number.POSITIVE_INFINITY;
      return dueA - dueB;
    });
}

export function completedWorkflowTasks(tasks: WorkflowTask[]): WorkflowTask[] {
  return tasks.filter((task) => task.status === "done" || task.status === "not_applicable");
}
