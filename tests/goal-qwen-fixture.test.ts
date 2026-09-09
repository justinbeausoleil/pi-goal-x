import assert from "node:assert/strict";
import test from "node:test";
import { makeFixture, milestones, objective } from "../experiments/reliability/qwen-fixture.ts";

test("frozen D6 seeds have 40 data rows, exact independent totals and six contracts", () => {
	for (const [seed, total] of [[101, 150514], [102, 151550], [103, 152586]] as const) {
		const fixture = makeFixture(seed);
		assert.equal(fixture.csv.trimEnd().split("\n").length, 41);
		assert.equal(fixture.expected.normalized.length, 28);
		assert.equal(fixture.expected.rejections.length, 12);
		assert.equal(fixture.expected.totals.total_cents, total);
		assert.match(fixture.csv, /"quoted, order 4"|" quoted, order 4 "/);
		assert.match(fixture.csv, /He said ""hello""/);
	}
	assert.deepEqual(makeFixture(101).expected.normalized[0], { id: "row-101-01", category: "home", amount_cents: 3850, note: "Café order 1" });
	assert.deepEqual(makeFixture(101).expected.totals.categories, [
		{ category: "café", count: 7, total_cents: 38024 },
		{ category: "food", count: 7, total_cents: 38815 },
		{ category: "home", count: 7, total_cents: 36442 },
		{ category: "tools, small", count: 7, total_cents: 37233 },
	]);
	assert.deepEqual(milestones.map(task => task.id), ["parse", "normalize", "aggregate", "rejections", "checks", "docs"]);
	assert(milestones.every(task => objective.includes(task.contract)));
	assert.throws(() => makeFixture(104), /101, 102 or 103/);
});
