import { type AgentToolResult, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { GOAL_AUDIT_ENTRY, detailedSummary, goalDetails } from "./goal-format.ts";
import {
	buildCompletionReport,
	buildTaskSummary,
	taskCompletionBlockWarning,
	validateGoalCompletion,
} from "./goal-policy.ts";
import { loadGoalSettings } from "./goal-settings.ts";
import { runGoalCompletionAuditor } from "./goal-auditor.ts";
import { goalWorkRevision, nowIso, type GoalCompletionReview } from "./goal-record.ts";
import { latestEventsForGoal, goalRuntimeEvents } from "./goal-ledger.ts";
import { mergeGoalPromptFromDisk } from "./storage/goal-files.ts";
import { showEscapeDialog, type EscapeDialogResult } from "./widgets/goal-escape-dialog.ts";
import type { GoalCore } from "./goal-state.ts";
import type { GoalMutationOutcome } from "./goal-service.ts";
import { retainedScopeCompletionWarning } from "./goal-scope.ts";
import { statusLabel } from "./goal-core.ts";

// update_goal(complete) execution path: validates the completable state,
// runs the independent auditor (or the disabled/legacy-skip branches), and
// commits through the single completion transaction. The auditor derives the
// requirements from the objective and any verification contract and inspects
// actual workspace evidence. An optional completion_summary is forwarded as an
// UNTRUSTED executor claim — never evidence and never an approval bypass.
export async function runGoalCompletionFlow(core: GoalCore, ctx: ExtensionContext, completionSummary?: string): Promise<AgentToolResult<unknown>> {
 const flushError = core.goalService.flushForAudit(ctx);
 if (flushError) return {content: [{type: "text", text: flushError}], details: goalDetails(core.state.goal)};
	core.reconcileFocusedGoalFromDisk(ctx);

	// -- Completion --
	const completionGate = validateGoalCompletion({ goal: core.state.goal, runningGoalId: core.runningGoalId });
	if (!completionGate.ok) {
		return {
			content: [{ type: "text", text: completionGate.message }],
			details: goalDetails(core.state.goal),
		};
	}
	if (!core.state.goal) throw new Error("Goal disappeared during completion validation.");
	const scopeWarning = retainedScopeCompletionWarning(core.state.goal);
	if (scopeWarning) return {content: [{type: "text", text: scopeWarning}], details: goalDetails(core.state.goal)};

	// Task gate: warn if blockCompletion is enabled and tasks remain pending
	const taskWarning = core.state.goal.taskList ? taskCompletionBlockWarning(core.state.goal.taskList) : null;
	if (taskWarning) {
		return {
			content: [{ type: "text", text: taskWarning }],
			details: goalDetails(core.state.goal),
		};
	}

	const auditTarget = mergeGoalPromptFromDisk(ctx, core.state.goal);
	const completionFocus = core.focusedOperationToken(auditTarget.id);
	// Append ledger: completion requested
	try {
		core.goalService.appendEvents(ctx, [{
			type: "completion_requested",
			goalId: auditTarget.id,
			at: nowIso(),
		}]);
	} catch {
		// Ledger append failure should not block completion
	}
	const settings = loadGoalSettings(ctx.cwd);
	const auditorLabel = settings.provider || settings.model || settings.thinkingLevel
		? `${settings.provider ?? "default"}/${settings.model ?? "default"}${settings.thinkingLevel ? `:${settings.thinkingLevel}` : ""}`
		: "default";
	const review = (outcome: GoalCompletionReview["outcome"], report: string, bypassOrigin?: GoalCompletionReview["bypassOrigin"]): GoalCompletionReview => ({
		outcome, report, workRevision: goalWorkRevision(auditTarget), at: nowIso(), ...(bypassOrigin ? {bypassOrigin} : {}),
	});
	function retainReview(latestReview: GoalCompletionReview): AgentToolResult<unknown> | undefined {
		const result = core.goalService.apply(ctx, {focusToken: completionFocus, expectedWorkRevision: latestReview.workRevision,
			mutate: current => ({...current, latestReview, updatedAt: nowIso()})});
		if (!result.ok) return {content: [{type: "text", text: `Could not retain the completion review: ${result.message}. The goal was not completed.\nUnsaved ${latestReview.outcome} report:\n${latestReview.report}`}], details: goalDetails(core.state.goal)};
	}

/**
 * Single transaction for every successful completion commit — audit-approved,
 * globally disabled, legacy per-goal skipped, or user-bypassed via Escape.
 * Deferred archival: sets the goal complete in memory + writes the active
 * file WITHOUT archiving; archival happens at turn_end so the agent can
 * recognise the outcome before the goal is archived.
 *
 * Returns a discriminated result. When GoalService.apply fails (stale focus,
 * missing file, write failure, or invalid lifecycle state), it returns
 * { ok: false, message, terminate: false } — never a completed report and
 * never a termination request (follow-up Stage 3).
 */
type CompletionCommitResult = AgentToolResult<unknown> & { ok: boolean };

function commitGoalCompletion(core: GoalCore, ctx: ExtensionContext, opts: {
	review: GoalCompletionReview;
	completionFocus: { goalId: string; revision: number };
	auditorReport?: string | null;
	auditSkippedReason?: string | null;
	terminate?: boolean;
	trailing?: string[];
}): CompletionCommitResult {
	core.accountProgress(ctx);
	core.auditProgress = null;
	core.goalWidgetComponentRef.current?.invalidate();
	let completeResult: GoalMutationOutcome;
	try {
		completeResult = core.goalService.apply(ctx, {
			reconcile: false,
			focusToken: opts.completionFocus,
			expectedWorkRevision: opts.review.workRevision,
			mutate: (current) => ({ ...current, latestReview: opts.review, status: "complete" as const, stopReason: "agent" as const, updatedAt: nowIso() }),
		});
	} catch (err) {
		// The authoritative file write throws on failure; surface it as a typed
		// mutation outcome so the caller can inspect it instead of crashing.
		completeResult = { ok: false, message: err instanceof Error ? err.message : String(err) };
	}
	if (!completeResult.ok) {
		return {
			ok: false,
			content: [{ type: "text", text: `Goal completion failed: ${completeResult.message ?? "the state mutation was rejected"}. The goal was not completed.` }],
			details: goalDetails(core.state.goal),
			terminate: false,
		};
	}
	if (completeResult.goal) core.runtime.markTurnStopped(completeResult.goal.id);
	const skipped = opts.review.outcome === "audit_skipped";
	if (skipped) try {
		core.goalService.appendEvents(ctx, [{
			type: "audit_skipped", goalId: auditTarget.id, reason: opts.review.bypassOrigin === "user_choice" ? "user_aborted" : "disabled",
			provider: settings.provider, model: settings.model, thinkingLevel: settings.thinkingLevel, at: opts.review.at,
		}]);
	} catch { /* The committed review remains authoritative if the ledger fails. */ }
	core.auditMessages.enqueue(ctx, {
		customType: GOAL_AUDIT_ENTRY,
		content: skipped ? `Goal complete — audit skipped. ${opts.auditSkippedReason}.` : `Auditor: I approve this completion claim.\nAuditor model: ${auditorLabel}\n\n${opts.review.report}`,
		display: true,
		details: {phase: skipped ? "skipped" : "approved", goalId: auditTarget.id, auditor: auditorLabel},
	});
	if (!skipped) core.setAuditResult("approved", opts.review.report);
	core.updateUI(ctx);
	const text = buildCompletionReport({
		detailedSummary: detailedSummary(core.state.goal),
		auditorReport: opts.auditorReport,
		auditSkippedReason: opts.auditSkippedReason,
		taskSummary: core.state.goal?.taskList ? buildTaskSummary(core.state.goal.taskList) : null,
	});
	return {
		ok: true,
		content: [{ type: "text", text: opts.trailing?.length ? [text, "", ...opts.trailing].join("\n") : text }],
		details: goalDetails(core.state.goal),
		...(opts.terminate === false ? {} : { terminate: true }),
	};
}

// Check if auditor is disabled per-goal (legacy persisted skipAuditor:true
// records remain readable and honored for compatibility; no model tool or
// task dialog creates new per-goal bypass state).
if (auditTarget.skipAuditor) {
	return commitGoalCompletion(core, ctx, {
		completionFocus,
		auditSkippedReason: "per-goal auditor disabled",
		review: review("audit_skipped", "Per-goal auditor disabled.", "per_goal"),
	});
}

// settings.disabled is an explicit user-owned setting: completion skips
// the auditor, records audit_skipped, and proceeds through the normal
// deferred-completion path. No model-side bypass flag is required.
if (settings.disabled === true) {
	return commitGoalCompletion(core, ctx, {
		completionFocus,
		auditSkippedReason: "auditor disabled in settings",
		review: review("audit_skipped", "Auditor disabled in settings.", "settings"),
	});
}

	// Auditor is enabled — run the normal audit flow
	core.auditMessages.enqueue(ctx, {
		customType: GOAL_AUDIT_ENTRY,
		content: [
			"Auditor: I am starting the independent completion audit.",
			`Goal id: ${auditTarget.id}`,
			`Auditor model: ${auditorLabel}`,
		].filter((line): line is string => line !== undefined).join("\n"),
		display: true,
		details: { phase: "started", goalId: auditTarget.id, auditor: auditorLabel },
	});
	if (!core.isFocusedOperationCurrent(completionFocus)) {
		return core.focusedOperationCancelledResult("Goal completion", completionFocus);
	}
	// Append ledger: audit started
	try {
		core.goalService.appendEvents(ctx, [{
			type: "audit_started",
			goalId: auditTarget.id,
			provider: settings.provider,
			model: settings.model,
			thinkingLevel: settings.thinkingLevel,
			at: nowIso(),
		}]);
	} catch {
		// Ledger append failure should not block completion
	}
	// Set up auditor progress display (before createAgentSession)
	const auditStartedAt = Date.now();
	core.auditProgress = {
		recentOutput: [],
		phase: "running",
		elapsedMs: 0,
		auditorLabel,
	};
	// Start animation timer for the spinner in the auditor widget
	core.stopAuditAnimation();
	core.auditAnimationTimer = setInterval(() => {
		if (!core.auditProgress) {
			core.stopAuditAnimation();
			return;
		}
		core.auditProgress.elapsedMs = Date.now() - auditStartedAt;
		core.goalWidgetComponentRef.current?.invalidate();
	}, 80);
	core.auditAnimationTimer?.unref?.();

	// Create a dedicated AbortController for the audit so it can be interrupted via Escape
	core.auditAbortController?.abort(); // Clean up any stale controller
	const completionAuditController = new AbortController();
	core.auditAbortController = completionAuditController;

	// P1-6: warm start — seed the auditor with the parent-rendered ledger tail
	// (recent lifecycle + task evidence) so it does not re-derive session facts.
	const ledger = goalRuntimeEvents(ctx, auditTarget.id);
	const warmTail = latestEventsForGoal(ledger, auditTarget.id, 8);
	const warmContext = warmTail.length > 0
		? `Recent goal events (from the shared ledger):\n${warmTail.map((e) => `- ${e.at} ${e.type}${"taskId" in e ? ` (task ${e.taskId})` : ""}${"evidence" in e && e.evidence ? ` evidence: ${e.evidence}` : ""}`).join("\n")}`
		: null;

	const auditor = await (core.dependencies.runCompletionAuditor ?? runGoalCompletionAuditor)({
		ctx,
		goal: auditTarget,
		detailedSummary: detailedSummary(auditTarget),
		completionSummary: completionSummary?.trim() || undefined,
		settings: loadGoalSettings(ctx.cwd),
		warmContext,
		signal: completionAuditController.signal,
		onProgress: (progress) => {
			core.auditProgress = {
				...progress,
				elapsedMs: Date.now() - auditStartedAt,
			};
			core.goalWidgetComponentRef.current?.invalidate();
		},
	});
	// Clear abort controller — audit finished on its own
	if (core.auditAbortController === completionAuditController) core.auditAbortController = null;
	// Clear auditor progress display
	core.stopAuditAnimation();
	if (!core.isFocusedOperationCurrent(completionFocus)) {
		core.auditProgress = null;
		core.goalWidgetComponentRef.current?.invalidate();
		return core.focusedOperationCancelledResult("Goal completion", completionFocus);
	}

	// If the audit was aborted by the user (Esc), show a TUI dialog letting
	// the user choose: mark complete without audit, or continue working.
	// The low-level abort callback (core.abortAudit) only records transient
	// runtime state; exactly one canonical ledger event is appended here after
	// the user's choice (follow-up Stage 2).
	if (auditor.error === "Auditor aborted.") {
		core.auditProgress = null;
		core.goalWidgetComponentRef.current?.invalidate();
		core.updateUI(ctx);

		core.enterGoalModal();
		let userChoice: EscapeDialogResult;
		try {
			userChoice = await showEscapeDialog(ctx, auditTarget.objective);
		} finally {
			core.exitGoalModal();
		}
		// Consume the transient abort state recorded by the low-level callback.
		core.auditAborted = false;
		if (!core.isFocusedOperationCurrent(completionFocus)) {
			return core.focusedOperationCancelledResult("Goal completion", completionFocus);
		}

		if (userChoice === "complete_without_audit") {
			// Deferred archival: set goal complete in memory + write the active file
			// WITHOUT archiving; archival happens at turn_end so the agent can
			// recognise the skipped audit before the goal is archived.
			return commitGoalCompletion(core, ctx, {
				completionFocus,
				auditSkippedReason: "auditor bypassed (user pressed Escape during audit)",
				review: review("audit_skipped", "User chose completion without audit.", "user_choice"),
				terminate: false,
				trailing: ["The goal is complete. Provide a final summary of what was accomplished."],
			});
		}
		// ── Continue working ────────────────────────────────────────
		const cancelledReview = review("cancelled", "User cancelled the completion audit and chose to keep the goal open.");
		const retentionError = retainReview(cancelledReview);
		if (retentionError) return retentionError;
		core.goalService.appendEvents(ctx, [{type: "audit_result", goalId: auditTarget.id, verdict: "cancelled", report: cancelledReview.report, at: cancelledReview.at}]);
		// Preserve the existing lifecycle; cancelling a review never resumes it.
		core.goalWidgetComponentRef.current?.invalidate();
		core.updateUI(ctx);
		return {
			content: [{ type: "text", text: `Audit aborted — the goal remains ${core.state.goal?.status === "active" ? "active" : core.state.goal ? statusLabel(core.state.goal) : "open"}. No completion was committed.` }],
			details: goalDetails(core.state.goal),
		};
	}

	// Show final audit output briefly before clearing
	if (core.auditProgress && auditor.output) {
		const outputLines = auditor.output.split("\n").slice(0, 8);
		core.auditProgress = {
			...core.auditProgress,
			phase: "done",
			recentOutput: outputLines,
			elapsedMs: Date.now() - auditStartedAt,
		};
		core.goalWidgetComponentRef.current?.invalidate();
	}
	// Append ledger: audit result
	const verdict = auditor.approved ? "approved" : auditor.error ? "error" : auditor.disapproved ? "disapproved" : "malformed";
	const latestReview = review(verdict, auditor.output || auditor.error || "Auditor produced no verdict.");
	if (!auditor.approved) {
		const retentionError = retainReview(latestReview);
		if (retentionError) return retentionError;
	}
	try {
		core.goalService.appendEvents(ctx, [{
			type: "audit_result",
			goalId: auditTarget.id,
			verdict,
			report: latestReview.report,
			at: latestReview.at,
		}]);
	} catch {
		// Ledger append failure should not block completion
	}
	if (!auditor.approved) {
		// Clear auditor progress to restore normal widget state, then show the
		// §15.4 result card briefly so the required next work is visible before
		// the normal dashboard returns (the goal stays open).
		core.auditProgress = null;
		core.setAuditResult(auditor.error ? "error" : "disapproved", auditor.output || "Auditor produced no output.");
		core.goalWidgetComponentRef.current?.invalidate();
		const rejectionText = [
			"Goal audit rejected.",
			"",
			"Goal completion rejected by independent auditor.",
			auditor.model ? `Auditor model: ${auditor.model}${auditor.thinkingLevel ? `:${auditor.thinkingLevel}` : ""}` : undefined,
			auditor.error ? `Auditor error: ${auditor.error}` : undefined,
			"",
			auditor.output || "Auditor produced no approval marker.",
		].filter((line): line is string => line !== undefined).join("\n");
		core.auditMessages.enqueue(ctx, {
			customType: GOAL_AUDIT_ENTRY,
			content: rejectionText,
			display: true,
			details: { phase: "rejected", goalId: auditTarget.id, auditor: auditor.model },
		});
		return {
			content: [{ type: "text", text: rejectionText }],
			details: goalDetails(core.state.goal),
		};
	}
	// Account for any remaining elapsed time.
	// Deferred archival happens inside commitGoalCompletion; archival occurs at
	// turn_end so the agent can see the auditor approval before the goal is
	// archived.
	return commitGoalCompletion(core, ctx, {
		completionFocus,
		auditorReport: auditor.output,
		review: latestReview,
	});
}
