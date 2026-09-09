/** D6 input and independent expected results. No executor parser is reused. */
export const milestones = [
	{ id: "parse", title: "Parse CSV", contract: "Parse the four-column UTF-8 CSV, including quoted commas, doubled quotes and empty fields, without changing record order." },
	{ id: "normalize", title: "Normalize accepted rows", contract: "Produce normalized.json with trimmed IDs and notes, lowercase trimmed categories, exact integer amount_cents, first-valid-ID deduplication and ascending ID order." },
	{ id: "aggregate", title: "Aggregate exact totals", contract: "Produce totals.json with exact accepted/rejected counts and integer-cent totals overall and by category, with categories in ascending order." },
	{ id: "rejections", title: "Report rejected rows", contract: "Produce rejections.json with every rejected data-row number and the specified reason, in input order, without silently dropping invalid or duplicate rows." },
	{ id: "checks", title: "Run executable checks", contract: "Add and run Node's built-in tests covering quoting, normalization, exact aggregation, invalid fields and duplicate IDs; the normalizer must also work on a fresh input/output path." },
	{ id: "docs", title: "Document the rules", contract: "Write README.md explaining the CLI, four input columns, normalization, duplicate policy, rejection reasons and how to run the executable checks." },
] as const;

export interface NormalizedRow { id: string; category: string; amount_cents: number; note: string }
export interface Rejection { row: number; reason: string }

// A separate, frozen fresh-path check prevents a hardcoded 40-row artifact from
// substituting for the requested normalizer. These expected values are literals.
export const validationProbe = {
	csv: 'id,category,amount,note\r\nprobe-x,food,bad,invalid first occurrence\r\nprobe-z," TOOLS, SMALL ",0.07,"He said ""yes"", then left."\r\nprobe-a,Food,2.5,\r\nprobe-x,home,3.02,valid later occurrence\r\nprobe-a,home,9.00,later duplicate\r\nprobe-unsafe,home,9007199254740992.00,unsafe cents\r\n',
	expected: {
		normalized: [
			{ id: "probe-a", category: "food", amount_cents: 250, note: "" },
			{ id: "probe-x", category: "home", amount_cents: 302, note: "valid later occurrence" },
			{ id: "probe-z", category: "tools, small", amount_cents: 7, note: 'He said "yes", then left.' },
		],
		totals: { accepted: 3, rejected: 3, total_cents: 559, categories: [
			{ category: "food", count: 1, total_cents: 250 },
			{ category: "home", count: 1, total_cents: 302 },
			{ category: "tools, small", count: 1, total_cents: 7 },
		] },
		rejections: [{ row: 1, reason: "invalid_amount" }, { row: 5, reason: "duplicate_id" }, { row: 6, reason: "invalid_amount" }],
	},
};

export function makeFixture(seed: number) {
	if (![101, 102, 103].includes(seed)) throw new Error("D6 input seed must be 101, 102 or 103");
	const categories = ["café", "food", "home", "tools, small"];
	const records: string[][] = [];
	const normalized: NormalizedRow[] = [];
	for (let index = 1; index <= 28; index++) {
		const id = `row-${seed}-${String(index).padStart(2, "0")}`;
		const category = categories[(seed + index) % categories.length]!;
		const cents = seed * 37 + index * 113;
		const note = index % 5 === 0 ? "" : index % 7 === 0 ? 'He said "hello".' : index % 4 === 0 ? `quoted, order ${index}` : `Café order ${index}`;
		records.push([` ${id} `, ` ${category.toUpperCase()} `, ` ${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")} `, ` ${note} `]);
		// Expected values come directly from the generated domain values, before
		// CSV encoding. They are never produced by parsing the executor's input.
		normalized.push({ id, category, amount_cents: cents, note });
	}
	for (let index = 0; index < 4; index++) records.push([normalized[index]!.id, "food", "999.99", "Later duplicate must lose"]);
	records.push(
		["", "food", "1.00", "Missing ID"],
		["bad-category", " ", "1.00", "Missing category"],
		["bad-empty", "food", "", "Missing amount"],
		["bad-negative", "food", "-1.00", "Negative amount"],
		["bad-precision", "food", "1.234", "Too many decimal places"],
		["bad-number", "food", "abc", "Not a number"],
		["bad-wide", "food", "1.00", "Extra column", "unexpected"],
		["bad-narrow", "food", "1.00"],
	);
	const rejections: Rejection[] = [
		...[29, 30, 31, 32].map(row => ({ row, reason: "duplicate_id" })),
		{ row: 33, reason: "missing_id" }, { row: 34, reason: "missing_category" },
		...[35, 36, 37, 38].map(row => ({ row, reason: "invalid_amount" })),
		{ row: 39, reason: "column_count" }, { row: 40, reason: "column_count" },
	];
	const totals = {
		accepted: normalized.length,
		rejected: rejections.length,
		total_cents: normalized.reduce((sum, row) => sum + row.amount_cents, 0),
		categories: categories.map(category => {
			const rows = normalized.filter(row => row.category === category);
			return { category, count: rows.length, total_cents: rows.reduce((sum, row) => sum + row.amount_cents, 0) };
		}),
	};
	const csvField = (value: string) => /[,"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
	const csv = ["id,category,amount,note", ...records.map(row => row.map(csvField).join(","))].join("\n") + "\n";
	return { seed, csv, expected: { normalized, totals, rejections } };
}

export const objective = `Build a tiny JavaScript CSV normalizer in this synthetic project, using only Node's standard library. Work only in this project; no network or external packages are needed.

Implement: node normalize.mjs INPUT.csv OUTPUT_DIRECTORY
It must read the supplied path and create normalized.json, totals.json and rejections.json in the supplied directory. Also run it on the provided input.csv into output/.

Input rules: a UTF-8 header id,category,amount,note. The provided fixture has 40 data rows; the normalizer must handle any data-row count. Support quoted commas, doubled double-quotes, empty fields, LF or CRLF line endings, and a final newline. Data-row numbering starts at 1 after the header. Trim every field; lowercase category; preserve ID case and note text after trimming. All four columns must be present. ID and category must be nonempty. Amount must match a nonnegative decimal integer with an optional one- or two-digit fractional part (no exponent/sign/empty value); convert to exact integer cents. Reject unsafe integer-cent amounts. Note may be empty.

Validation order is column_count, missing_id, missing_category, invalid_amount, duplicate_id. A duplicate ID means an otherwise valid row whose trimmed ID already appeared in an accepted row; the first valid row wins. Invalid rows never reserve an ID. Rejections contain only {row,reason}, in input order, using those exact reason strings.

normalized.json is an array of {id,category,amount_cents,note}, sorted by ID using ordinary ascending string order. totals.json is {accepted,rejected,total_cents,categories}; categories is an array of {category,count,total_cents} sorted by category using ordinary ascending string order. Use numbers for all counts and cents. No other JSON fields are required. This must be a working normalizer, not hardcoded outputs for this one input.

Create the following six required tasks through set_goal_tasks, with these exact IDs and verification contracts. Complete them in the listed order through update_goal_task, with evidence of real work and checks. After each milestone, end the response with a concise progress report so the host can continue. The harness will exercise native compaction after the first three milestones; preserve completed work and resume from the current task. Do not mark later milestones done early or bypass the completion auditor.
${milestones.map((task, index) => `${index + 1}. ${task.id}: ${task.title}. Contract: ${task.contract}`).join("\n")}

Use Node's built-in test runner (node --test) with at least one .test.mjs file. Document the CLI and every input/error rule in README.md. Complete the goal only after all six contracts are satisfied, generated artifacts are checked and the enabled independent auditor approves.`;
