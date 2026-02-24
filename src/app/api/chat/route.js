import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function getSystemPrompt() {
  try {
    const path = join(process.cwd(), "prompts", "system-prompt.txt");
    return readFileSync(path, "utf-8").trim();
  } catch {
    return "";
  }
}

function getCurrentDateContext() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const yy = String(year).slice(-2);
  const m = month;
  const d = day;
  const todayFormatted = `${m}/${d}/${yy}`;
  return `Current date: ${weekday}, ${month}/${day}/${year} (today as m/d/yy: ${todayFormatted}). Use this to compute relative dates like "next Sunday" or "next Friday".`;
}

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env.local (project root)" },
      { status: 500 },
    );
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const { messages, tasks = [] } = await req.json();

    if (!messages?.length) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const formattedMessages = messages.map(({ role, text }) => ({
      role: role === "assistant" ? "assistant" : "user",
      content: text,
    }));

    const baseSystemPrompt = getSystemPrompt();
    const dateContext = getCurrentDateContext();
    const tasksContext =
      tasks.length > 0
        ? `Jun's current task list (use ONLY this list for this reply):\n${tasks
            .map((t) => `- [id: ${t.id}] ${t.title} (due: ${t.dueLabel})`)
            .join("\n")}`
        : "Jun's current task list: EMPTY. He has NO tasks. For this reply say he has nothing due; ignore any tasks mentioned in earlier messages.";
    const systemPrompt = baseSystemPrompt
      ? `${baseSystemPrompt}\n\n${dateContext}${tasksContext}`
      : `${dateContext}${tasksContext}`;

    // Attach current task list to the latest user message so the model uses it instead of conversation history
    const lastIdx = formattedMessages.length - 1;
    if (lastIdx >= 0 && formattedMessages[lastIdx].role === "user") {
      formattedMessages[lastIdx].content = `[Current task list for this turn: ${tasks.length === 0 ? "EMPTY - no tasks." : tasksContext}]\n\nUser: ${formattedMessages[lastIdx].content}`;
    }

    const tools = [
      {
        name: "add_task",
        description:
          "Add a task for the user with a title and due label. Use when the user asks to add, create, or schedule a task.",
        input_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description:
                "Short task name. ALWAYS MAX THREE WORDS, 6 CHARACTERS MAX PER WORD THIS IS BIGGEST RULE SUMMARIZE IT SOMEHOW",
            },
            dueLabel: {
              type: "string",
              description:
                "Either 'DUE TODAY' or 'DUE TMR' for today/tomorrow, OR a specific date in m/d/yy format (e.g. 10/6/25, 1/25/26). No leading zeros. For relative dates like 'next Sunday' use the current date context to compute the actual date.",
            },
          },
          required: ["title", "dueLabel"],
        },
      },
      {
        name: "complete_task",
        description:
          "Mark a task as complete and remove it from the user's list. Use when the user says they finished a task, did it, or want to mark it complete.",
        input_schema: {
          type: "object",
          properties: {
            taskId: {
              type: "number",
              description:
                "The id of the task from the current task list (use the [id: N] value from the task list).",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "delete_task",
        description:
          "Delete or remove a task by its name and due date. Use when the user asks to delete, remove, or cancel a task and gives the task name and/or due date. Match against the current task list (title and dueLabel).",
        input_schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description:
                "Task name as shown in the list (e.g. Psych Quiz, Microsoft Event). Match the wording from the current task list.",
            },
            dueLabel: {
              type: "string",
              description:
                "Due date from the list: 'DUE TODAY', 'DUE TMR', or m/d/yy (e.g. 3/14/26). Use the exact dueLabel from the task list.",
            },
          },
          required: ["title", "dueLabel"],
        },
      },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      tools,
      ...(systemPrompt && { system: systemPrompt }),
      messages: formattedMessages,
    });

    const assistantText = (response.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    let actions = (response.content || [])
      .filter((block) => block.type === "tool_use" && block.input)
      .flatMap((block) => {
        if (
          block.name === "add_task" &&
          typeof block.input.title === "string" &&
          typeof block.input.dueLabel === "string"
        ) {
          return [
            {
              type: "add_task",
              title: String(block.input.title).trim(),
              dueLabel: String(block.input.dueLabel).trim(),
            },
          ];
        }
        if (
          block.name === "complete_task" &&
          (typeof block.input.taskId === "number" ||
            (typeof block.input.taskId === "string" &&
              block.input.taskId.trim() !== ""))
        ) {
          const taskId = Number(block.input.taskId);
          if (Number.isInteger(taskId)) {
            return [{ type: "complete_task", taskId }];
          }
        }
        if (
          block.name === "delete_task" &&
          typeof block.input.title === "string" &&
          typeof block.input.dueLabel === "string"
        ) {
          const title = String(block.input.title).trim().toLowerCase();
          const dueLabel = String(block.input.dueLabel).trim();
          const match = tasks.find((t) => {
            const tTitle = (t.title ?? "").trim().toLowerCase();
            const tDue = String(t.dueLabel ?? "").trim();
            const titleMatch =
              tTitle === title ||
              tTitle.includes(title) ||
              title.includes(tTitle);
            return titleMatch && tDue === dueLabel;
          });
          if (match) {
            return [{ type: "complete_task", taskId: match.id }];
          }
        }
        return [];
      });

    // Fallback: sometimes the model says it added a task in text but forgets
    // to call the add_task tool. Try to infer a single task from the message.
    if ((!actions || actions.length === 0) && assistantText) {
      // Examples we try to catch:
      // "Added Psych Quiz for 3/14/26."
      // "Added task Psych Quiz for DUE TMR."
      // "Ok, added Psych Quiz due 3/14/26."
      const addRegex =
        /added\s+(?:task\s+)?(.+?)\s+(?:for|due)\s+((?:DUE TODAY|DUE TMR|\d{1,2}\/\d{1,2}\/\d{2}))/i;
      const match = assistantText.match(addRegex);
      if (match) {
        const [, rawTitle, rawDueLabel] = match;
        const title = rawTitle.trim();
        const dueLabel = rawDueLabel.trim().toUpperCase();
        if (title && dueLabel) {
          actions = [
            {
              type: "add_task",
              title,
              dueLabel,
            },
          ];
        }
      }
    }

    return NextResponse.json({
      message: assistantText || "Done.",
      actions,
    });
  } catch (err) {
    console.error("Chat API error:", err);
    const status = err.status ?? 500;
    const message = err.message ?? "Failed to get response from assistant";
    return NextResponse.json({ error: message }, { status });
  }
}
