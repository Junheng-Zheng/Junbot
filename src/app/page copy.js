export default function Home() {
  const messages = [
    { role: "user", label: "USER", text: "What is REM? Can you tell me more" },
    {
      role: "assistant",
      label: "REM",
      text: "REM is Junheng's personal assistant! I run on his MacBook and keep track of everything going on with him utilizing a load of MCPs!",
    },
    { role: "user", label: "USER", text: "Tell me a bit about myself then" },
    {
      role: "assistant",
      label: "REM",
      text: "Jun was previously at Liberty Mutual Insurance as a Design Engineer Intern! He logged 40 hours of Figma this week.",
    },
  ];

  return (
    <div
      className="flex flex-col bg-[var(--chat-bg)] text-[var(--chat-text)]"
      style={{ height: "100dvh" }}
    >
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="space-y-1.5">
              <span
                className="text-xs font-medium tracking-wide"
                style={{ color: "var(--chat-label)" }}
              >
                [{msg.label}]
              </span>
              {msg.role === "user" ? (
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "var(--chat-user-bubble)" }}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            type="text"
            placeholder="Type something here"
            data-chat-input
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none placeholder:font-normal"
            style={{
              backgroundColor: "var(--chat-input-bg)",
              color: "var(--chat-text)",
            }}
          />
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--chat-accent)" }}
            aria-label="Send"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--chat-icon-active)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4L22 2Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>

        {/* Bottom action bar */}
        <div className="mx-auto mt-3 flex max-w-2xl justify-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            style={{
              borderColor: "var(--chat-icon)",
              color: "var(--chat-icon)",
            }}
            aria-label="Grid"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            style={{
              borderColor: "var(--chat-icon)",
              color: "var(--chat-icon)",
            }}
            aria-label="Chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            style={{
              borderColor: "var(--chat-icon)",
              color: "var(--chat-icon)",
            }}
            aria-label="Calendar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
