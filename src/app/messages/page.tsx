"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Mail,
  MailOpen,
  MessageSquare,
  Clock,
  User,
  Trash2,
  CheckCircle2,
  Reply,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: "UNREAD" | "READ" | "REPLIED" | "ARCHIVED";
  createdAt: string;
}

function formatDate(val: any, withTime = false): string {
  if (!val) return "";
  let d: Date;
  if (typeof val === "number") {
    d = new Date(val);
  } else if (typeof val === "string") {
    const s = val.trim();
    if (/^\d+$/.test(s)) {
      d = new Date(Number(s));
    } else if (s.includes(" ") && !s.includes("T") && !s.includes("Z")) {
      d = new Date(s.replace(" ", "T") + "Z");
    } else {
      d = new Date(s);
    }
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return "";
  return withTime
    ? d.toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : d.toLocaleDateString("en-NG", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [search, setSearch] = useState("");

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: status as any } : m))
        );
        if (selectedMessage?.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: status as any } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = messages.filter((m) => m.status === "UNREAD").length;
  const repliedCount = messages.filter((m) => m.status === "REPLIED").length;

  const filtered = messages.filter((m) => {
    if (filter === "UNREAD" && m.status !== "UNREAD") return false;
    if (filter === "READ" && m.status !== "READ") return false;
    if (filter === "REPLIED" && m.status !== "REPLIED") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <Header title="Customer Messages & Inquiries" />

      <div className="page-pad">
        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Inquiries
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{messages.length}</h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unread Messages
                </p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{unreadCount}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Mail className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Replied / Resolved
                </p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{repliedCount}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-[#0F6B4B]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "UNREAD", "READ", "REPLIED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === tab
                    ? "bg-[#0F6B4B] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "ALL" && `All (${messages.length})`}
                {tab === "UNREAD" && `Unread (${unreadCount})`}
                {tab === "READ" && "Read"}
                {tab === "REPLIED" && `Replied (${repliedCount})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, topic..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B4B]"
              />
            </div>
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Messages List & Preview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`${selectedMessage ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading inquiries...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-8">
                <MailOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No messages match this filter</p>
                <p className="text-xs text-slate-400 mt-1">Inquiries submitted on facotransport.com appear here automatically.</p>
              </div>
            ) : (
              filtered.map((m) => {
                const isSelected = selectedMessage?.id === m.id;
                const isUnread = m.status === "UNREAD";

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMessage(m);
                      if (m.status === "UNREAD") {
                        updateStatus(m.id, "READ");
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? "border-[#0F6B4B] ring-1 ring-[#0F6B4B] shadow-sm"
                        : isUnread
                        ? "border-amber-300 bg-amber-50/20 hover:border-slate-300"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
                        )}
                        <h4 className="font-bold text-sm text-slate-900 truncate">{m.name}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="neutral" className="text-[10px] uppercase font-semibold">
                        {m.subject}
                      </Badge>
                      <span className="text-xs text-slate-500 truncate">{m.email}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {m.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Detail View */}
          {selectedMessage && (
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-20 self-start">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedMessage.name}</h3>
                    <Badge
                      variant={
                        selectedMessage.status === "UNREAD"
                          ? "warning"
                          : selectedMessage.status === "REPLIED"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {selectedMessage.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>{selectedMessage.email}</span>
                    {selectedMessage.phone && <span>· {selectedMessage.phone}</span>}
                    <span>· {formatDate(selectedMessage.createdAt, true)}</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 lg:hidden"
                >
                  Close
                </button>
              </div>

              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Topic / Subject
                </span>
                <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">
                  {selectedMessage.subject}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Message Content
                </span>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mt-1 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: Faco Transport Support - ${selectedMessage.subject}`}
                    onClick={() => updateStatus(selectedMessage.id, "REPLIED")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0F6B4B] text-white hover:bg-[#0D5B40] transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply via Email
                  </a>

                  {selectedMessage.status !== "REPLIED" && (
                    <button
                      onClick={() => updateStatus(selectedMessage.id, "REPLIED")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Mark Replied
                    </button>
                  )}
                </div>

                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
