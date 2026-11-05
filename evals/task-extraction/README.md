# Local task extraction evals

Requires Node.js 22+. This harness evaluates the same `extractTasks` module used by the Lambda. It skips audio transcription and moderation. The original prompt and default `gpt-4o-mini` model are preserved for the first baseline.

From the repository root:

```bash
cd evals/task-extraction
npm install
npm test
npm run eval -- --validate-only
export OPENAI_API_KEY='your-key'
npm run eval -- --label baseline
```

Only live evals need the SDK installed and an API key. Live requests incur API usage. Tests, dataset validation, and replay use no network or API key. Keep the key in your shell or a local `.env` file; for the latter run `node --env-file=.env run.mjs --label baseline`.

Reports are written to the ignored `results/` directory as JSON and Markdown. Reports contain transcripts, time context, model output, checks, latency, and token usage. The supplied dataset is synthetic; keep any real user transcripts and review files inside ignored `results/`. No fixed pricing estimate is used.

## Iterate and compare

```bash
npm run eval -- --case tomorrow --label tomorrow-check
npm run eval -- --tag scheduling --repeats 3 --concurrency 2 --label schedule-check
npm run eval -- --label candidate --baseline results/BASELINE.json
```

`--case` selects an exact ID; `--tag` selects a category. Requests use bounded concurrency, a 60-second request timeout, and up to two SDK retries. Repeats and concurrency accept integers from 1 to 100. `--model MODEL` overrides the extraction model for the run without changing the Lambda. `--cases PATH` supplies another JSONL dataset. Paths supplied as arguments resolve from the current working directory. `--output-dir PATH` overrides report location.

Edit `../../lambdas/lib/extractTasks.mjs` to change the shared prompt and increment `PROMPT_VERSION`. Every report also captures a prompt hash. No deployment occurs when running evals. Baseline comparisons show deterministic improvements/regressions for identical case inputs and expectations; modified cases are marked as not comparable. API errors count as unsuccessful checks, but are also reported separately.

Exit code 1 means an API/output error, failed or incomplete deterministic checks, or rejected semantic review. Exit code 0 can still include pending semantic reviews; inspect `fullyPassed` before accepting a prompt. This is deliberately a manual workflow, with no paid runs wired into CI.

## Understand and review scores

Deterministic checks validate task count, UUIDs, parent references/cycles, and UTC schedules. Root tasks may omit `parent_item_uuid` or use null, matching the existing prompt. Every task must have an explicit null or valid UTC `scheduled_datetime_utc`. Equivalent UTC instants are compared rather than timestamp spelling.

Expected tasks have stable IDs, a human-readable `meaning`, a regex `match` hint, a `parentId`, and a `scheduledDatetimeUtc`. Matching hints associate generated tasks with expectations independently of order and UUIDs. Unmatched or ambiguous tasks require human matching before schedule and relationship checks can finish. These hints do not establish semantic accuracy.

Read the report and review task meaning, omissions, invented tasks, language, retained schedule wording, capitalization, and grouping. For nonempty task output, semantic review is always pending until explicitly recorded. An empty result for an expected no-task case passes automatically. Model-based grading is intentionally deferred until human-reviewed examples exist.

Create a review file inside `results/`, keyed by `case-id#repeat`. Copy the `outputHash` from the report and optionally provide an expected task ID → generated UUID mapping when the hints did not match correctly:

```json
{
  "tomorrow#1": {
    "outputHash": "COPY_FROM_REPORT",
    "semanticPass": true,
    "matches": {
      "milk": "COPY_GENERATED_TASK_UUID"
    },
    "notes": "One task; correct meaning, schedule wording, and grouping."
  }
}
```

Use `semanticPass: false` to reject semantic output. Reviews bind to the exact generated task output by hash; stale reviews are ignored. Replay regrades the original saved responses without API calls:

```bash
npm run eval -- --replay results/BASELINE.json --reviews results/reviews.json --label reviewed-baseline
```

Replay uses the saved input and expectations, prompt/model metadata, usage, and latency. It does not rerun the current prompt. For subsequent comparisons, point `--baseline` at the reviewed report. Semantic reviews for a baseline do not automatically approve a new run.

## Dataset policy

The 32 synthetic cases cover basic tasks, hierarchy, negation, corrections, no-task input, language, transcription artifacts, instruction following, time/date-only scheduling, timezone offsets, DST, and year boundaries. Review these expectations as product decisions before using them as acceptance gates.

Cases avoid undefined temporal behavior: no nonexistent or repeated DST times, vague dates without time context, or phrases such as “sometime next week.” Add such cases only after defining the desired policy. Current explicit policies include date-only = 6 AM local, time-only = the supplied local date even when the time has passed, and no schedule inheritance for subtasks unless specified by a future policy.

## Lambda packaging

The Lambda now imports `./lib/extractTasks.mjs`. Include `lambdas/lib/extractTasks.mjs` in the deployed artifact at `lib/extractTasks.mjs` relative to the handler. Keep the existing OpenAI dependency available in the Lambda package or layer. Installing this eval package does not change the deployed dependencies or deploy the Lambda.

API integration reference: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
