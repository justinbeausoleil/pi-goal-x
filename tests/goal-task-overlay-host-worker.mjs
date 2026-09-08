import assert from "node:assert/strict";
import { TuiMainScreen } from "@earendil-works/pi-tui";
import { createMockExtensionContext, createMockTheme } from "./tui-test-utils.ts";
import { showTaskListOverlay } from "../extensions/widgets/task-list-overlay.ts";
import { renderConfirmationTasks, showTaskConfirmation } from "../extensions/goal-task-confirmation.ts";

process.env.PI_GOAL_AUTO_CONFIRM = "0";
const tokens = Array.from({ length: 600 }, (_, i) => `proof-${i}-🧭`);
const goal = {
  id: "review", objective: "Review every requirement", status: "active",
  taskList: { tasks: Array.from({ length: 200 }, (_, i) => ({ id: `t${i + 1}`, title: `node-${i + 1}-end`, status: "pending" })) },
};
goal.taskList.tasks[141].verificationContract = tokens.join(" ");
for (const view of ["overlay", "confirmation"]) {
  const ctx = createMockExtensionContext();
  if (view === "overlay") void showTaskListOverlay(ctx, new Map([[goal.id, goal]]), goal.id);
  else void showTaskConfirmation(ctx, renderConfirmationTasks(goal.taskList.tasks, 0).join("\n"));
  const call = ctx._customCalls[0];
  const terminal = { columns: 80, rows: 24, write() {}, hideCursor() {} };
  const tui = new TuiMainScreen(terminal);
  tui.requestRender = () => {};
  const component = await call.factory(tui, createMockTheme(), {}, () => {});
  tui.showOverlay(component, call.options.overlayOptions);
  const frame = () => tui.compositeOverlays([], terminal.columns, terminal.rows).join("\n");
  for (const [columns, rows] of [[80, 24], [120, 40], [80, 24]]) {
    Object.assign(terminal, { columns, rows });
    component.handleInput("\x1b[H");
    let seen = "";
    for (let page = 0; page < 200; page++) {
      seen += frame() + "\n";
      component.handleInput("\x1b[6~");
    }
    for (let i = 1; i <= 200; i++) assert.ok(seen.includes(`node-${i}-end`), `${view} ${columns}x${rows}: node ${i} reachable through host compositor`);
    for (const token of tokens) assert.ok(seen.includes(token), `${view} ${columns}x${rows}: ${token} reachable through host compositor`);
    component.handleInput("\x1b[F");
    assert.match(frame(), /node-200-end/);
    component.handleInput("\x1b[H");
    assert.match(frame(), /node-1-end/);
  }
  component.dispose?.();
}
console.log("PASS: native host overlay and confirmation expose 200 tasks and complete long requirements at 80x24 and after resize.");
