import { SqlJsAdapter } from "../db/sqljsAdapter";
import { runMigrations } from "../db/migrations";
import { Repositories } from "../repositories";
import { configureDataContext } from "../context";

/** Fresh in-memory database with all migrations applied. */
export async function createTestRepos(): Promise<Repositories> {
  configureDataContext({ userId: "local", cloudEnabled: false });
  const db = await SqlJsAdapter.create();
  await runMigrations(db);
  return new Repositories(db);
}
