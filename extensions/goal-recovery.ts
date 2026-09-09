/**
 * /goal-recovery — read-only storage/recovery report + guarded repair.
 *
 * Reliability campaign 2026-08-09. The report scans these failure classes:
 *   - malformed goal files (active_goal_*.md that do not parse);
 *   - malformed ledger lines (counted by the ledger reader);
 *   - stale locks (.pi/goals/.locks/*.lock whose pid is dead or whose age
 *     exceeds the TTL — left behind by crashed sessions);
 *   - orphaned snapshot data (pool-snapshot goals with no matching file).
 *   - completed records still at active paths after failed/interrupted archival.
 *
 * Everything is read-only by default. Repair operations (stale-lock removal,
 * snapshot refresh and completed-record archival) require confirmation AND copy the affected
 * files into a timestamped backup directory first. Malformed goal files and
 * malformed ledger lines are reported but never rewritten automatically —
 * rewriting user-owned data is deliberately out of scope (and automatic
 * ledger rewriting is a documented non-goal of the reliability campaign).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { invalidateGoalLedgerCache, readGoalLedger, type GoalLedgerContext } from "./goal-ledger.ts";
import { acquireGoalLock, GOAL_LOCK_DIR } from "./storage/goal-lock.ts";
import { archiveGoalFile, parseGoalFile, refreshGoalPoolSnapshot, type GoalFileContext } from "./storage/goal-files.ts";

export const GOALS_DIR = ".pi/goals";
export const RECOVERY_BACKUP_DIR = ".pi/goals/.recovery-backup";

export interface MalformedGoalFileEntry {
	relPath: string;
	error: string;
}

export interface StaleLockEntry {
	fileName: string;
	content: string | null;
	pid: number;
	startedAt: string;
	ageMs: number;
}

export interface OrphanedSnapshotEntry {
	goalId: string;
	activePath: string;
}

export interface RecoveryReport {
	scannedAt: string;
	malformedGoalFiles: MalformedGoalFileEntry[];
	malformedLedgerLines: number;
	staleLocks: StaleLockEntry[];
	orphanedSnapshotGoals: OrphanedSnapshotEntry[];
	completedGoals: Array<{relPath: string; goalId: string; digest: string}>;
	healthy: boolean;
}

export interface RecoveryRepairResult {
	applied: string[];
	failures: string[];
	backupDir: string | null;
	confirmed: boolean;
}

const LOCK_STALE_TTL_MS = 30_000;

function safeLockName(goalId: string): string {
	return goalId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function pidAlive(pid: number): boolean {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		return (err as NodeJS.ErrnoException).code === "EPERM";
	}
}

function goalsDir(cwd: string): string {
	return path.join(cwd, GOALS_DIR);
}

function locksDir(cwd: string): string {
	return path.join(cwd, GOAL_LOCK_DIR);
}

/** Inspect active paths, including completed records excluded from the open pool. */
function scanGoalFiles(cwd: string): Pick<RecoveryReport, "malformedGoalFiles" | "completedGoals"> {
	const root = goalsDir(cwd);
	const out: MalformedGoalFileEntry[] = [];
	const completedGoals: RecoveryReport["completedGoals"] = [];
	let names: string[];
	try {
		names = fs.readdirSync(root);
	} catch {
		return {malformedGoalFiles: out, completedGoals};
	}
	for (const name of names) {
		if (!/^active_goal_.*\.md$/.test(name)) continue;
		const relPath = path.posix.join(GOALS_DIR, name);
		try {
			const file = path.join(root, name), goal = parseGoalFile(file, true);
			if (!goal) out.push({ relPath, error: "file does not parse as a goal record" });
			else if (goal.status === "complete") completedGoals.push({relPath, goalId: goal.id, digest: createHash("sha256").update(fs.readFileSync(file)).digest("hex")});
		} catch (error) {
			out.push({ relPath, error: "Unable to read goal file: " + String(error) });
		}
	}
	return {malformedGoalFiles: out, completedGoals};
}

/** Scan the lock dir for lock files whose pid is dead or whose age exceeds the TTL. */
function scanStaleLocks(cwd: string): StaleLockEntry[] {
	const dir = locksDir(cwd);
	const out: StaleLockEntry[] = [];
	let names: string[];
	try {
		names = fs.readdirSync(dir);
	} catch {
		return out;
	}
	const now = Date.now();
	for (const name of names) {
		if (!name.endsWith(".lock")) continue;
		let content: string | null = null;
		try {
			content = fs.readFileSync(path.join(dir, name), "utf8");
			const raw = JSON.parse(content) as { pid?: unknown; startedAt?: unknown };
			const pid = typeof raw.pid === "number" ? raw.pid : 0;
			const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : "";
			const startedMs = new Date(startedAt).getTime();
			const ageMs = Number.isFinite(startedMs) ? Math.max(0, now - startedMs) : now;
			if (!pidAlive(pid) || ageMs > LOCK_STALE_TTL_MS) {
				out.push({ fileName: name, content, pid, startedAt, ageMs });
			}
		} catch {
			// Unreadable lock body: report as stale (pid unknown).
			out.push({ fileName: name, content, pid: 0, startedAt: "", ageMs: now });
		}
	}
	return out;
}

/** Snapshot goals whose active file no longer exists in the goals dir. */
function scanOrphanedSnapshotGoals(cwd: string): OrphanedSnapshotEntry[] {
	const root = goalsDir(cwd);
	const out: OrphanedSnapshotEntry[] = [];
	let present: Set<string>;
	try {
		present = new Set(fs.readdirSync(root));
	} catch {
		return out;
	}
	try {
		const snapshotPath = path.join(cwd, ".pi", ".goals-pool-snapshot.json");
		const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as { goals?: Array<{ goalId?: unknown; activePath?: unknown }> };
		for (const goal of snapshot.goals ?? []) {
			const activePath = typeof goal.activePath === "string" ? goal.activePath : "";
			const base = path.posix.basename(activePath);
			if (base && !present.has(base)) {
				out.push({ goalId: typeof goal.goalId === "string" ? goal.goalId : base, activePath });
			}
		}
	} catch {
		// Missing/corrupt snapshot: no orphan data to report.
	}
	return out;
}

/** Read-only recovery report. Never mutates goal storage. */
export function runRecoveryReport(ctx: GoalFileContext): RecoveryReport {
	invalidateGoalLedgerCache();
	const ledger = readGoalLedger({ cwd: ctx.cwd } as GoalLedgerContext);
	const {malformedGoalFiles, completedGoals} = scanGoalFiles(ctx.cwd);
	const staleLocks = scanStaleLocks(ctx.cwd);
	const orphanedSnapshotGoals = scanOrphanedSnapshotGoals(ctx.cwd);
	return {
		scannedAt: new Date().toISOString(),
		malformedGoalFiles,
		malformedLedgerLines: ledger.malformed,
		staleLocks,
		orphanedSnapshotGoals,
		completedGoals,
		healthy: malformedGoalFiles.length === 0 && ledger.malformed === 0 && staleLocks.length === 0 && orphanedSnapshotGoals.length === 0 && completedGoals.length === 0,
	};
}

/**
 * Apply the safe repair operations with confirmation + backup.
 *
 * Repairs: stale-lock removal (backed up then unlinked) and pool-snapshot
 * refresh and completed-record archival (after backup). Returns what was
 * applied. When `confirm` rejects, nothing is touched.
 */
export async function runRecoveryRepair(
	ctx: GoalFileContext,
	report: RecoveryReport,
	confirm: () => Promise<boolean>,
	archive: typeof archiveGoalFile = archiveGoalFile,
): Promise<RecoveryRepairResult> {
	if (report.staleLocks.length === 0 && report.orphanedSnapshotGoals.length === 0 && report.completedGoals.length === 0) {
		return { applied: [], failures: [], backupDir: null, confirmed: false };
	}
	const confirmed = await confirm();
	if (!confirmed) return { applied: [], failures: [], backupDir: null, confirmed: false };

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	let backupDir: string;
	try {
		const root = path.join(ctx.cwd, RECOVERY_BACKUP_DIR);
		fs.mkdirSync(root, { recursive: true });
		backupDir = fs.mkdtempSync(path.join(root, stamp + "-"));
	} catch (error) {
		return { applied: [], failures: ["Backup failed: " + String(error)], backupDir: null, confirmed: true };
	}
	const applied: string[] = [];
	const failures: string[] = [];
	const currentLocks = scanStaleLocks(ctx.cwd);

	for (const lock of report.staleLocks) {
		const source = path.join(locksDir(ctx.cwd), lock.fileName);
		try {
			const current = currentLocks.find(item => item.fileName === lock.fileName);
			if (!current || current.content !== lock.content || current.pid !== lock.pid || current.startedAt !== lock.startedAt) {
				throw new Error("Lock changed or is no longer stale; run /goal-recovery again.");
			}
			const before = fs.lstatSync(source);
			if (!before.isFile()) throw new Error("Lock is not a regular file; manual review required.");
			const backup = path.join(backupDir, `lock-${safeLockName(lock.fileName)}`);
			fs.copyFileSync(source, backup);
			const after = fs.lstatSync(source);
			const copied = fs.readFileSync(backup);
			if (!after.isFile() || before.ino !== after.ino || before.dev !== after.dev || copied.toString("utf8") !== lock.content || !fs.readFileSync(source).equals(copied)) {
				throw new Error("Lock changed during backup; run /goal-recovery again.");
			}
			fs.unlinkSync(source);
			applied.push(`removed stale lock ${lock.fileName}`);
		} catch (error) {
			failures.push("Lock repair failed for " + lock.fileName + ": " + String(error));
		}
	}

	for (const entry of report.completedGoals) {
		let lock;
		try {
			lock = acquireGoalLock(ctx, entry.goalId);
			const source = path.join(ctx.cwd, entry.relPath), before = fs.lstatSync(source);
			if (!before.isFile()) throw new Error("Completed goal is not a regular file.");
			const content = fs.readFileSync(source);
			if (createHash("sha256").update(content).digest("hex") !== entry.digest) throw new Error("Completed goal changed; run /goal-recovery again.");
			const backup = path.join(backupDir, path.basename(entry.relPath));
			fs.copyFileSync(source, backup);
			const goal = parseGoalFile(backup, true);
			if (!goal || goal.id !== entry.goalId || goal.status !== "complete") throw new Error("Goal is no longer the completed record selected for repair.");
			const after = fs.lstatSync(source);
			if (!after.isFile() || before.ino !== after.ino || before.dev !== after.dev || !fs.readFileSync(backup).equals(content) || !fs.readFileSync(source).equals(content)) throw new Error("Completed goal changed during backup; run /goal-recovery again.");
			const written = archive(ctx, {...goal, activePath: entry.relPath});
			applied.push(`archived completed goal ${written.id}: ${written.archivedPath}`);
		} catch (error) { failures.push(`Archive recovery failed for ${entry.goalId}: ${String(error)}`); }
		finally { lock?.release(); }
	}

	if (report.orphanedSnapshotGoals.length > 0) {
		const snapshotPath = path.join(ctx.cwd, ".pi", ".goals-pool-snapshot.json");
		try {
			if (fs.existsSync(snapshotPath)) {
				fs.copyFileSync(snapshotPath, path.join(backupDir, "pool-snapshot.json"));
			}
			refreshGoalPoolSnapshot(ctx);
			applied.push(`refreshed pool snapshot (${report.orphanedSnapshotGoals.length} orphaned entr${report.orphanedSnapshotGoals.length === 1 ? "y" : "ies"} dropped)`);
		} catch (error) {
			failures.push("Pool snapshot repair failed: " + String(error));
		}
	}

	return { applied, failures, backupDir, confirmed: true };
}

export function formatRecoveryReport(report: RecoveryReport): string {
	const lines: string[] = [];
	lines.push(report.healthy ? "Recovery report: OK — no issues found." : "Recovery report: issues found.");
	if (report.malformedGoalFiles.length > 0) {
		lines.push(`  - ${report.malformedGoalFiles.length} malformed goal file(s):`);
		for (const f of report.malformedGoalFiles) lines.push(`      ${f.relPath} — ${f.error}`);
	}
	if (report.malformedLedgerLines > 0) {
		lines.push(`  - ${report.malformedLedgerLines} malformed ledger line(s) (read-only; manual review advised)`);
	}
	if (report.staleLocks.length > 0) {
		lines.push(`  - ${report.staleLocks.length} stale lock(s):`);
		for (const l of report.staleLocks) lines.push(`      ${l.fileName} (pid ${l.pid}, ${Math.round(l.ageMs / 1000)}s old)`);
	}
	if (report.orphanedSnapshotGoals.length > 0) {
		lines.push(`  - ${report.orphanedSnapshotGoals.length} orphaned snapshot entr${report.orphanedSnapshotGoals.length === 1 ? "y" : "ies"}:`);
		for (const o of report.orphanedSnapshotGoals) lines.push(`      ${o.goalId} (${o.activePath})`);
	}
	if (report.completedGoals.length > 0) {
		lines.push(`  - ${report.completedGoals.length} complete but unarchived goal(s):`);
		for (const entry of report.completedGoals) lines.push(`      ${entry.goalId} (${entry.relPath})`);
	}
	if (report.staleLocks.length > 0 || report.orphanedSnapshotGoals.length > 0 || report.completedGoals.length > 0) {
		lines.push("Run `/goal-recovery repair` to remove stale locks, archive completed goals and refresh the pool snapshot (confirmation + backup required).");
	}
	return lines.join("\n");
}
