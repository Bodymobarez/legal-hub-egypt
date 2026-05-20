/**
 * Remove duplicate FAQ rows (keeps lowest id per questionEn + category).
 * Run: DATABASE_URL='...' pnpm --filter @workspace/scripts exec tsx src/cleanup-duplicate-faqs.ts
 */
import { sql } from "drizzle-orm";
import { closeDb, db } from "@workspace/db";

async function main() {
  const result = await db.execute(sql`
    DELETE FROM faqs
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM faqs
      GROUP BY question_en, category
    )
  `);
  const removed =
    typeof result === "object" && result !== null && "rowCount" in result
      ? Number((result as { rowCount: number }).rowCount)
      : "unknown";
  console.log(`Removed duplicate FAQ rows: ${removed}`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
