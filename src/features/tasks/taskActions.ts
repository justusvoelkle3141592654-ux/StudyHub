import { getRepos } from "@/data/db";
import type { Task } from "@/data/types";
import { nextOccurrence, parseRecurrence } from "./recurrence";

/**
 * Toggle a task between open and done. Completing a recurring task creates
 * the next occurrence with due date and reminder shifted accordingly.
 */
export async function toggleTaskDone(task: Task): Promise<void> {
  const repos = getRepos();
  if (task.status === "done") {
    await repos.tasks.update(task.id, { status: "open", completed_at: null });
    return;
  }
  await repos.tasks.update(task.id, { status: "done", completed_at: new Date().toISOString() });
  const rec = parseRecurrence(task.recurrence);
  if (rec && task.due_at) {
    const nextDue = nextOccurrence(new Date(task.due_at), rec);
    const shift = nextDue.getTime() - new Date(task.due_at).getTime();
    await repos.tasks.insert({
      title: task.title,
      description: task.description,
      subject_id: task.subject_id,
      due_at: nextDue.toISOString(),
      priority: task.priority,
      reminder_at: task.reminder_at ? new Date(new Date(task.reminder_at).getTime() + shift).toISOString() : null,
      recurrence: task.recurrence,
    });
  }
}
