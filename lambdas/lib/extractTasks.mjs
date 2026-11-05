// Shared by the deployed Lambda and the local evaluation harness.
export const PROMPT_VERSION = 'task-extraction-v1';
export const DEFAULT_MODEL = 'gpt-4o-mini';

export function buildMessages({ transcript, userLocalTime, userTimeZone, utcDateTime }) {
  const currentDateStringPrompt = userLocalTime && userTimeZone && utcDateTime
    ? `The user's current local date and time is ${userLocalTime} (timezone: ${userTimeZone}). The current UTC time is ${utcDateTime}.`
    : '';
  return [
    { role: 'system', content: `
                ${currentDateStringPrompt}
                Your role is to identify the main tasks and sub-tasks described in the user's input.
                Only consider a task as a sub-task if it is described as part of another task.
                If the task includes time, date, and/or temporal adverb information, translate the info into the scheduled_datetime_utc field below.
                If the task only contains time info, assume the date is the current date in the user's timezone.
                If the task only contains a date or temporal adverbs, assume the time is 6:00AM in the user's timezone.
                Do NOT guess tasks beyond what the user stays in their input.
                Respond only in English.
                Return your analysis in the following JSON format:
                {
                  "tasks": [
                    {
                      "uuid": "<RFC-compliant UUID>",
                      "text": "<task name (include schedule info if specified) (capitalize its first letter of task name, not necessarily every word)>", 
                      "parent_item_uuid": <UUID of parent task if this is a subtask>,
                      "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above, or null if no date or time info provided>
                  ]
                }` },
    { role: 'user', content: `User-provided input: ${transcript}` },
  ];
}

export async function extractTasks({ client, model = DEFAULT_MODEL, anonymousId, captureOutputErrors = false, ...input }) {
  const completion = await client.chat.completions.create({
    model,
    messages: buildMessages(input),
    response_format: { type: 'json_object' },
    user: anonymousId,
  });
  const rawContent = completion.choices[0].message.content;
  // Preserve the raw response on output errors so evals can distinguish them from API errors.
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const error = new Error('Extraction returned invalid JSON');
    error.name = 'ExtractionOutputError';
    if (captureOutputErrors) {
      error.rawContent = rawContent;
      error.usage = completion.usage;
    }
    throw error;
  }
  return { tasks: parsed?.tasks, usage: completion.usage, rawContent, model: completion.model };
}
