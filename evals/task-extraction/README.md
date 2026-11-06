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

Live evals use native Node fetch and need the selected provider API key. Live requests incur API usage. Tests, dataset validation, and replay use no network or API key. Keep the key in your shell or a local `.env` file; for the latter run `node --env-file=.env run.mjs --label baseline`.

Reports are written to the ignored `results/` directory as JSON and Markdown. Reports contain transcripts, time context, model output, checks, latency, and token usage. The supplied dataset is synthetic; keep any real user transcripts and review files inside ignored `results/`. No fixed pricing estimate is used.

## Iterate and compare

```bash
npm run eval -- --case tomorrow --label tomorrow-check
npm run eval -- --tag scheduling --repeats 3 --concurrency 2 --label schedule-check
npm run eval -- --label candidate --baseline results/BASELINE.json
```

`--case` selects an exact ID; `--tag` selects a category. Requests use bounded concurrency, a 60-second request timeout, and up to two provider-request retries. Repeats and concurrency accept integers from 1 to 100. `--model MODEL` overrides the extraction model for the run without changing the Lambda. `--cases PATH` supplies another JSONL dataset. Paths supplied as arguments resolve from the current working directory. `--output-dir PATH` overrides report location.

Save prompt changes as new named JSON versions in `../../lambdas/lib/prompts/`, register them in `manifest.json`, and set its `latest` version. Every report also captures a prompt hash. No deployment occurs when running evals. Baseline comparisons show fully-passed improvements/regressions for identical case inputs and expectations; modified cases are marked as not comparable. API errors count as unsuccessful checks, but are also reported separately.

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

The Lambda now imports `./lib/extractTasks.mjs`. Include `lambdas/lib/extractTasks.mjs`, `lambdas/lib/promptVersions.mjs`, and the full `lambdas/lib/prompts/` directory in the deployed artifact under `lib/` relative to the handler. Keep the existing OpenAI dependency available in the Lambda package or layer. Installing this eval package does not change the deployed dependencies or deploy the Lambda.

API integration reference: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

## Local eval studio

Run `npm run studio` from `evals/task-extraction`, then open
[http://127.0.0.1:4317](http://127.0.0.1:4317). The server loads `.env` if present;
restart it after changing the key. Set `PORT` to change the port. It binds only to
loopback and requires no additional frontend dependencies.

Choose a model, case/category, repeats, concurrency, and optional saved baseline.
Outputs enter the review queue as each request completes. Compare the transcript,
time context, expected meaning, generated tasks, and deterministic failures.
Assign expected tasks to generated tasks when automatic hints are insufficient,
then save an approval or rejection with notes. Reviews are bound to the output
hash and persist immediately, including while the rest of a run is executing.

“Generate reviewed report” replays the saved outputs without API calls and writes
JSON/Markdown reports with the current review decisions. Download either format
from the workspace. Review changes invalidate those download links until you
regenerate. Pending reviews remain explicitly pending; generating a report does
not approve them. Saved runs can be selected as baselines for later experiments;
comparison currently measures deterministic changes, with semantic decisions
reported separately.

Existing JSON reports in `results/` are imported on startup without modifying the
originals. Studio state and review notes live in ignored `results/studio/`.
Interrupted runs retain completed outputs for review and report generation, but
do not resume outstanding API requests. One live run is allowed at a time. The
browser must remain connected only for viewing, not for execution. This is a
local development tool; keep it on loopback rather than exposing it publicly.

Create a new prompt JSON version, update its manifest, and restart the studio before running the next experiment.

### Comparing saved experiments

The Overview offers New experiment and Compare runs. New experiment contains
all live-run configuration; Run history has its own sidebar section, with Compare runs in its header.
Compare runs selects any two saved runs as Baseline and Candidate without API
calls. Metrics use identical saved case definitions at the same repeat index;
changed cases and missing records are listed separately and excluded from deltas.
Pass Rate requires both checks and semantic approval. Pending reviews count as
not fully passed; review coverage is shown separately. Latency and token metrics exclude
pairs missing either side's telemetry. Category tables and expandable per-output
results help identify regressions. Download the comparison as JSON or Markdown.
These are descriptive comparisons, not statistical significance tests.

### Prompt History and named versions

Prompt History shows every version registered in `lambdas/lib/prompts/manifest.json`,
including the latest, with exact system, time-context and user templates. Only the
original v1 exists initially; no earlier versions are invented. Saved run reports
retain their original version/hash and are not rewritten by this migration.

To change the prompt, copy `task-extraction-v1.json` to a new uniquely named JSON
file, set its matching `version`, `name`, `description` and template fields, add the
version to the manifest's `versions` array, and set `latest` when ready. Treat
registered versions as immutable: make another version rather than editing an
existing one. Versions created through the UI are available immediately; restart after manual file edits. Required template slots are
`{{timeContext}}` in `systemTemplate` and `{{transcript}}` in `userTemplate`.
Time context supports `{{userLocalTime}}`, `{{userTimeZone}}`, `{{utcDateTime}}`.

New experiment defaults to the manifest's latest version but can select any saved
version. The CLI supports `--prompt-version task-extraction-v1`. The Lambda uses
latest by default; callers of the shared extractor can pass `promptVersion`.
New live reports include a full `promptSnapshot` as well as version and hash;
replays preserve saved metadata. Package the registry module and JSON directory
with the Lambda. No deployment is performed by this workflow.

In Prompt History, choose **Create version** to clone the selected prompt. Give
it a unique version ID, edit templates and change notes, then choose **Save
version** or **Save & new experiment**. The latter opens New experiment with the
new version selected; launching the live run remains a separate action. Versions
are saved to the local JSON registry immediately without restarting. The optional
“Use as latest default” checkbox is off by default so a candidate can be evaluated
before it becomes the default. Existing saved versions cannot be overwritten.

### Models, provider adapters and Model History

New experiment selects Provider, Model and Prompt version independently. The
catalog contains the original GPT-4o mini baseline, GPT-5.4 mini, and four
alternatives: Claude Sonnet 5.5, Gemini 3.6 Flash, Mistral Large 4 and Grok 4.7.
This is a configured comparison set, not a universal quality ranking. Model IDs
and availability change; the catalog has a checked date and official references.
An existing local key does not guarantee account entitlement or model availability.

Set credentials in the local `.env` or shell and restart:

| Provider | Environment variable |
|---|---|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GEMINI_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| xAI | `XAI_API_KEY` |

```bash
npm run eval -- --provider anthropic --model claude-sonnet-5-5 --prompt-version task-extraction-v1 --label claude-v1
npm run eval -- --provider google --model gemini-3.6-flash --prompt-version task-extraction-v1 --label gemini-v1
npm run eval -- --provider mistral --model mistral-large-4 --prompt-version task-extraction-v1 --label mistral-v1
npm run eval -- --provider xai --model grok-4.7 --prompt-version task-extraction-v1 --label grok-v1
```

`--provider` defaults to OpenAI for backward compatibility. Pass `--model` explicitly
when choosing another provider. Custom native IDs supported by an adapter can be
used from the CLI; add them to `models.json` for selection in the UI.

Model History lists configured models and historical models found in saved runs.
It shows per-run fully-passed scores, pending reviews, API/output
errors, latency, tokens, category scores, prompt and dataset hashes. Unmeasured
models are explicitly “Not yet evaluated”; no external accuracy values are
invented. Provider documentation and published evaluation references are separate
from local task scores. Use Compare runs to control for saved case differences.

New reports capture provider, requested model, model/adapter snapshot, and the
provider-returned model ID on each output. Replay retains these values and needs
no credentials. Reports from before provider support are treated as OpenAI.
Credential values never reach the browser or reports. Provider output modes and
reasoning defaults differ; adapter settings and native usage are saved so these
differences remain inspectable. Token counts do not estimate cross-provider cost.

See [adapters/README.md](adapters/README.md) for the standardized adapter contract,
provider mappings, error policy and extension guide. Every provider has a separate,
short source file. The deployed Lambda keeps its existing OpenAI SDK call path;
this change enables the alternative adapters in the local eval harness only.

### Pass Rate and failed-output highlighting

All quality metric views and new JSON/Markdown reports show **Pass Rate**:
fully passed outputs divided by total outputs. Fully passed requires every
deterministic check and semantic approval. Errors, incomplete matching and
pending/rejected reviews count as not fully passed; an empty run is shown as —. Comparisons use
comparable paired outputs, categories use their own outputs, and the dashboard
shows the latest run rather than pooling unrelated experiments. Existing saved
runs receive updated summaries when loaded; regenerate old final exports to
include Pass Rate.

Run history marks runs containing failed outputs in light pink. Inside a run,
failed/incomplete deterministic checks, semantic rejection, and API/output errors
highlight the affected output in the task queue. Pending semantic review alone
does not produce a pink highlight.

### Traces and Error Analysis

New live outputs contain a local `trace` with a trace ID, UTC event timestamps,
elapsed times, provider request attempts, HTTP statuses/request IDs when supplied,
retry reasons/delays, prompt/generation/parse/grading events, and final execution
outcome. Raw generated text and native usage remain in the output record. Traces
exclude credentials and request payloads. HTTP error responses are retained as
bounded, sanitized diagnostics, with only selected response headers. Technical
attributes remain allowlisted. There is no external telemetry
service. Traces persist with completed outputs and survive offline replay; an
interrupted in-flight request cannot be reconstructed after server termination.

Error Analysis has a landing page with per-run Pass Rate, failures, categorization
coverage, trace coverage and the most common assigned error categories. Choose a
run, inspect each failing case/repeat with expected/actual tasks, raw output,
review notes and trace timeline, select existing categories or create new ones,
then Save categories & next. Multiple categories may apply to one output. Pending
semantic review by itself is not treated as a failure. Older outputs are explicitly
marked as having no captured trace rather than synthesizing execution events.

Categories are shared across runs in ignored `results/studio/error-categories.json`.
Assignments and notes live in each run's saved state, bound to a hash of the exact
input/output/error evidence. Changes invalidate cached final exports; regenerate
the report to include assignments, category definitions, error-analysis summary
and trace data. Assigning a category does not alter semantic approval or Pass Rate.
The analysis detail view can also download a standalone JSON evidence report.

Live-run reports already managed by studio state are not re-imported as duplicate
experiments. Older duplicate auto-import state files remain on disk for recovery
but are excluded from run lists and analysis totals.

### Re-running errored results

In a run workspace, choose **Re-run all errored tasks** in the upper-right header.
This retries every result with an API/output error, failed/incomplete check, or
rejected semantic review, independent of selection or queue filter. Results that
only await semantic review are excluded. Requests execute sequentially with
progress and a checkpoint after every replacement. Each request can use the
existing bounded transport retries and incurs provider usage.

Each replacement uses its saved input/expectations, the run's requested provider
and model, and the saved prompt snapshot. Legacy reports without a snapshot must
match their saved prompt hash. The current provider adapter is used and recorded
on each replacement. Previous attempts, traces, semantic reviews and error
categories remain in Previous attempts. Replacements require fresh semantic
review; successful results remain unchanged. Metrics and current-output usage are
updated as results finish, and final exports must be regenerated. Concurrent
execution and deletion during execution are blocked. If interrupted, completed
replacements remain saved and remaining failures can be retried later.

### Provider API error diagnostics

New HTTP errors retain a bounded, sanitized response under `record.error.response`
for the terminal failure, and under each failed request trace event's
`attributes.providerResponse`. Responses from failed attempts remain available
when a subsequent retry succeeds. Error Analysis exposes these details alongside
status, request IDs and retry history; run raw-output views and JSON/Markdown
exports include them as well.

Capture reads at most 32 KiB per error response, limits long strings/nesting and
marks truncation/redaction/read failures explicitly. JSON error envelopes retain
provider fields such as message, type, code and structured details. Non-JSON
responses retain a sanitized text excerpt. Credentials, recognized echoed request
fields and known request text are redacted; only content type, request IDs,
retry-after and rate-limit response headers are retained. This is not a raw wire
dump. Some 503 responses contain only a generic service-unavailable message.
Previously discarded error bodies cannot be recovered; re-running failures can
capture details from new responses.

The Error Analysis landing page includes a category insights panel. Choose a model, then all of its
runs or an individual run to see ranked categories, shares of categorized failing
outputs, categorization coverage, and the largest contributing runs. Select a
category and open a contributing run to review its filtered failure queue.
Percentages can total more than 100% because outputs can carry multiple labels.
The uncategorized action opens the run with the largest outstanding classification
backlog in the selected scope. These counts identify review workload, not a model
quality ranking across different datasets or review coverage.

Error Analysis uses separate provider/model tabs. Its top-line metrics, category
rankings, review backlog and run choices are scoped to the selected model; labels
remain reusable across models. Returning from a failure queue retains that model.
