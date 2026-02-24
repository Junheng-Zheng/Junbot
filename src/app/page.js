"use client";
import { useState, useRef, useEffect } from "react";
import { autoAnimate } from "@formkit/auto-animate";
import Link from "next/link";
import {
  SendHorizontal,
  MessageSquare,
  Calendar,
  GripVertical,
  Check,
  Plus,
} from "lucide-react";

const INITIAL_MESSAGES = [];
const DEFAULT_TASKS = [];

const STORAGE_KEYS = {
  messages: "junbot-messages",
  tasks: "junbot-tasks",
  tab: "junbot-tab",
  highlight: "junbot-highlight",
};

function getStored(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or other errors
  }
}

export default function Home() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [selectedTab, setSelectedTab] = useState("messages");
  const [completingId, setCompletingId] = useState(null);
  const [highlightColor, setHighlightColor] = useState("#82c93c");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(getStored(STORAGE_KEYS.messages, INITIAL_MESSAGES));
    setTasks(getStored(STORAGE_KEYS.tasks, DEFAULT_TASKS));
    setSelectedTab(getStored(STORAGE_KEYS.tab, "messages"));
    setHighlightColor(getStored(STORAGE_KEYS.highlight, "#82c93c"));
  }, []);

  useEffect(() => {
    setStored(STORAGE_KEYS.messages, messages);
  }, [messages]);

  useEffect(() => {
    setStored(STORAGE_KEYS.tasks, tasks);
  }, [tasks]);

  useEffect(() => {
    setStored(STORAGE_KEYS.tab, selectedTab);
  }, [selectedTab]);

  useEffect(() => {
    setStored(STORAGE_KEYS.highlight, highlightColor);
  }, [highlightColor]);

  // Basic service worker registration for PWA/offline support.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed:", err));
    });
  }, []);

  const onAddTask = ({ title, dueLabel }) => {
    setTasks((prev) => {
      const nextId =
        prev.length > 0 ? Math.max(...prev.map((t) => t.id)) + 1 : 1;
      return [...prev, { id: nextId, title, dueLabel }];
    });
  };

  const onAddTasks = (toAdd) => {
    if (!toAdd?.length) return;
    setTasks((prev) => {
      let nextId = prev.length > 0 ? Math.max(...prev.map((t) => t.id)) + 1 : 1;
      return [
        ...prev,
        ...toAdd.map(({ title, dueLabel }) => ({
          id: nextId++,
          title,
          dueLabel,
        })),
      ];
    });
  };

  const onCompleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const tasksForChat =
    completingId != null ? tasks.filter((t) => t.id !== completingId) : tasks;

  return (
    <div
      className="w-full fixed text-lg h-dvh flex flex-col bg"
      style={{ "--highlight-color": highlightColor }}
    >
      {selectedTab === "messages" && (
        <MessagesTab
          messages={messages}
          setMessages={setMessages}
          tasks={tasksForChat}
          onAddTask={onAddTask}
          onAddTasks={onAddTasks}
          onCompleteTask={onCompleteTask}
          setSelectedTab={setSelectedTab}
        />
      )}
      {selectedTab === "calendar" && (
        <CalendarTab
          tasks={tasks}
          setTasks={setTasks}
          completingId={completingId}
          setCompletingId={setCompletingId}
        />
      )}
      {selectedTab === "settings" && (
        <SettingsTab
          highlightColor={highlightColor}
          setHighlightColor={setHighlightColor}
        />
      )}

      <Nav setSelectedTab={setSelectedTab} selectedTab={selectedTab} />
      <div className="text-xs pb-12  flex text-gray0 p-4 bg-black justify-between">
        <p className="mono">[JUNBOT]</p>
        <p className="mono">ALL RIGHTS RESERVED . 2026</p>
      </div>
    </div>
  );
}

const Nav = ({ setSelectedTab, selectedTab }) => {
  return (
    <div className="p-4 sticky bottom-0 flex items-center justify-between gap-4 nav">
      <IconButton
        onClick={() => {
          setSelectedTab("settings");
        }}
        className={`message gray0 ${selectedTab === "settings" && "border-2 border-primary"}`}
      >
        <GripVertical />
      </IconButton>
      <div className="flex gap-3 items-center justify-center">
        <IconButton
          onClick={() => {
            setSelectedTab("messages");
          }}
          className={`message gray0 ${selectedTab === "messages" && "border-2 border-primary"}`}
        >
          <MessageSquare />
        </IconButton>
        <IconButton
          onClick={() => {
            setSelectedTab("calendar");
          }}
          className={`message gray0 ${selectedTab === "calendar" && "border-2 border-primary"}`}
        >
          <Calendar />
        </IconButton>
      </div>
    </div>
  );
};

const IconButton = ({ children, onClick, className, link }) => {
  return (
    <>
      {link ? (
        <Link href={link}>
          <button
            className={`w-11 h-11  active:scale-90 transition-all duration-200 rounded-xl flex items-center cursor-pointer justify-center ${className}`}
            onClick={onClick}
          >
            {children}
          </button>
        </Link>
      ) : (
        <button
          className={`w-11 h-11  active:scale-90 transition-all duration-200 rounded-xl flex items-center cursor-pointer justify-center ${className}`}
          onClick={onClick}
        >
          {children}
        </button>
      )}
    </>
  );
};
const UserMessage = ({ message }) => (
  <div className="w-full p-4 rounded-sm gray1 flex flex-col gap-2">
    <p className="text-xs gray0 mono">[USER]</p>
    <p className="textgray0">{message}</p>
  </div>
);

const AssistantMessage = ({ message }) => (
  <div className="w-full p-4 flex flex-col gap-2">
    <p className="text-xs gray0">[REM]</p>
    <p className="textgray0">{message}</p>
  </div>
);

const TaskCard = ({ task, isCompleting, onDone }) => {
  return (
    <div
      className={` flex gap-8 p-3 aspect-square rounded-md transition-all duration-300 ease-out ${
        isCompleting
          ? "bg-lime-500 text-black scale-[0.98] opacity-90"
          : "gray1 textgray0"
      }`}
    >
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <p
          className={`text-xs mono text-nowrap ${
            isCompleting ? "text-black line-through" : "gray0"
          }`}
        >
          [{task.dueLabel}]
        </p>
        <p
          className={`uppercase text-xl font-extrabold leading-[21px] transition-all duration-300 ${
            isCompleting ? "line-through text-black" : ""
          }`}
        >
          {task.title}
        </p>
      </div>
      <div className="flex flex-col justify-end  gap-2 shrink-0">
        <IconButton
          className={isCompleting ? "text-black bg-lime-600" : "gray0 message"}
          onClick={() => onDone(task.id)}
        >
          <Check
            className={isCompleting ? "scale-110" : ""}
            style={{ transition: "transform 0.2s ease-out" }}
          />
        </IconButton>
      </div>
    </div>
  );
};
const MessagesTab = ({
  messages,
  setMessages,
  tasks = [],
  onAddTask,
  onAddTasks,
  onCompleteTask,
  setSelectedTab,
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError(null);
    const userMessage = { role: "user", label: "USER", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(({ role, text }) => ({
        role,
        text,
      }));
      const currentTasks = getStored(STORAGE_KEYS.tasks, DEFAULT_TASKS);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, tasks: currentTasks }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", label: "REM", text: data.message },
      ]);
      if (data.actions?.length) {
        const addActions = data.actions.filter((a) => a.type === "add_task");
        if (addActions.length) {
          onAddTasks?.(
            addActions.map((a) => ({ title: a.title, dueLabel: a.dueLabel })),
          );
        }
        data.actions
          .filter((a) => a.type === "complete_task")
          .forEach((a) => onCompleteTask?.(a.taskId));
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-4 flex gap-3  border-b-2 border-white/5">
        <p className="text-2xl uppercase text-gray0 font-extrabold">MESSAGES</p>
      </div>
      <div
        ref={scrollRef}
        className="w-full flex-1 min-h-0 overflow-y-auto gap-2 flex flex-col p-4"
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <UserMessage key={i} message={msg.text} />
          ) : (
            <AssistantMessage key={i} message={msg.text} />
          ),
        )}
        {isLoading && (
          <div className="w-full p-4 flex flex-col gap-2">
            <p className="text-xs gray0">[REM]</p>
            <p className="textgray0 opacity-70">Thinking...</p>
          </div>
        )}
        {error && <p className="p-4 text-red-400 text-sm">Error: {error}</p>}
      </div>
      <div className="relative border-t-2 border-white/5 h-[112px]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask me anything"
          className="w-full p-4 h-full textgray0 resize-none outline-none message"
          disabled={isLoading}
        />
        <IconButton
          onClick={handleSend}
          disabled={isLoading}
          className="absolute bottom-4 right-4 z-20 primary text-black disabled:opacity-50"
        >
          <SendHorizontal />
        </IconButton>
      </div>
    </>
  );
};

const CalendarTab = ({ tasks, setTasks, completingId, setCompletingId }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) autoAnimate(listRef.current);
  }, []);

  const handleTaskDone = (id) => {
    setCompletingId(id);
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletingId(null);
    }, 400);
  };

  return (
    <>
      <div className="p-4 flex gap-3  border-b-2 border-white/5">
        <p className="text-2xl uppercase text-gray0 font-extrabold">TASKS</p>
      </div>
      <div
        ref={listRef}
        className="grid flex-1 grid-cols-2 gap-3 p-4 content-start"
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isCompleting={completingId === task.id}
            onDone={handleTaskDone}
          />
        ))}
      </div>
    </>
  );
};

const HIGHLIGHT_OPTIONS = [
  "#82c93c", // green (default)
  "#f97316", // orange
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#eab308", // yellow
];

const SettingsTab = ({ highlightColor, setHighlightColor }) => {
  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <p className="text-2xl uppercase text-gray0 font-extrabold">
        Highlight Color
      </p>
      <div className="flex flex-col gap-2 h-full">
        {HIGHLIGHT_OPTIONS.map((color) => {
          const isSelected = color === highlightColor;
          return (
            <button
              key={color}
              type="button"
              className="w-full h-full rounded-lg relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/30"
              style={{ backgroundColor: color }}
              onClick={() => setHighlightColor(color)}
              aria-pressed={isSelected}
              aria-label={`Set highlight color to ${color}`}
            >
              {isSelected && (
                <span className="font-extrabold text-black/10 text-5xl">
                  SELECTED
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-xs flex text-gray0 justify-between">
        <p className="mono">[BY JUNHENG ZHENG]</p>
        <p className="mono">[W/ REACT + TAILWIND]</p>
      </div>
    </div>
  );
};
