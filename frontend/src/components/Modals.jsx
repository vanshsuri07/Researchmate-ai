import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  Sparkles,
  MessageSquareCode,
  Send,
  BookOpen,
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  ExternalLink,
  Layers,
  HelpCircle,
  BookMarked,
  Lightbulb,
  Compass,
  Link as LinkIcon,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

export default function Modals({
  selectedModel,
  selectedPaperForInsights,
  onCloseInsights,
  selectedPaperForChat,
  onCloseChat,
}) {
  // ─── Insights Modal State ───
  const [insightTab, setInsightTab] = useState("summary");
  const [insightData, setInsightData] = useState({});
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [customSkills, setCustomSkills] = useState([]);
  const [loadingInsightModel, setLoadingInsightModel] = useState("auto");
  const [copied, setCopied] = useState(false);

  // ─── Chat Modal State ───
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingChat, setSendingChat] = useState(false);

  // Initialize chat when paper opens
  useEffect(() => {
    if (selectedPaperForChat) {
      setChatMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello! I have indexed **${selectedPaperForChat.title}** (${selectedPaperForChat.numChunks} chunks). Ask me anything about its methodology, results, equations, or conclusions!`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  }, [selectedPaperForChat]);

  
  // Fetch custom skills
  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then(res => res.json())
      .then(data => setCustomSkills(data.skills || []))
      .catch(e => console.error(e));
  }, []);

  // Reset insight cache when paper changes
  useEffect(() => {
    if (selectedPaperForInsights) {
      setInsightData({});
      setInsightTab("summary");
      fetchInsight("summary", selectedPaperForInsights.document_id);
    }
  }, [selectedPaperForInsights]);

  // Fetch insight for active tab
  const fetchInsight = async (tabKey, docId) => {
    if (!docId) return;
    if (insightData[tabKey]) return; // already cached

    const requestModel = selectedModel;
    setLoadingInsight(true);
    setLoadingInsightModel(requestModel);
    const endpointMap = {
      summary: { url: `${API_BASE}/summarize`, key: "summary" },
      keywords: { url: `${API_BASE}/keywords`, key: "keywords" },
      citations: { url: `${API_BASE}/citations`, key: "citations" },
      gaps: { url: `${API_BASE}/research-gaps`, key: "research_gaps" },
      future: { url: `${API_BASE}/future-work`, key: "future_work" },
      flashcards: { url: `${API_BASE}/flashcards`, key: "flashcards" },
      glossary: { url: `${API_BASE}/glossary`, key: "glossary" },
      similar: { url: `${API_BASE}/similar-papers`, key: "similar_papers" },
    };

    let target = endpointMap[tabKey];
    let isCustomSkill = false;
    let customSkillId = null;

    if (!target) {
      const customMatch = customSkills.find(s => s.id === tabKey);
      if (customMatch) {
        isCustomSkill = true;
        customSkillId = customMatch.id;
        target = { url: `${API_BASE}/skills/run`, key: "result" };
      } else {
        setLoadingInsight(false);
        return;
      }
    }

    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, model: requestModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch insight");

      let parsed = data[target.key];
      // Try parsing JSON if flashcards or glossary
      if (
        (tabKey === "flashcards" || tabKey === "glossary") &&
        typeof parsed === "string"
      ) {
        try {
          const clean = parsed
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          parsed = JSON.parse(clean);
        } catch {
          // Keep as string if json parse fails
        }
      }

      setInsightData((prev) => ({
        ...prev,
        [tabKey]: parsed,
      }));
    } catch (err) {
      setInsightData((prev) => ({
        ...prev,
        [tabKey]: `Error: ${err.message}`,
      }));
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleTabSwitch = (key) => {
    setInsightTab(key);
    if (selectedPaperForInsights && !insightData[key]) {
      fetchInsight(key, selectedPaperForInsights.document_id);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(
      typeof text === "string" ? text : JSON.stringify(text, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!selectedPaperForInsights) return;
    const content = `# Research Insights: ${selectedPaperForInsights.title}
File: ${selectedPaperForInsights.fileName}
Chunks Indexed: ${selectedPaperForInsights.numChunks}

---

## Executive Summary
${insightData.summary || "Not loaded"}

## Key Terms & Concepts
${insightData.keywords || "Not loaded"}

## Citation Analysis
${insightData.citations || "Not loaded"}

## Research Gaps
${insightData.gaps || "Not loaded"}

## Suggested Future Work
${insightData.future || "Not loaded"}
`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPaperForInsights.fileName.replace(/\.[^/.]+$/, "")}_Insights.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Chat Send Handler ───
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedPaperForChat || sendingChat) return;

    const userText = chatInput.trim();
    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setSendingChat(true);

    const loadingId = (Date.now() + 1).toString();
    setChatMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        sender: "ai",
        text: "Searching vector index & generating grounded answer...",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        loading: true,
      },
    ]);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selectedPaperForChat.document_id,
          question: userText,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: data.answer,
                sourcesCount: data.sources_used,
                loading: false,
              }
            : m,
        ),
      );
    } catch (err) {
      const errorText = err.message.includes("Document not found")
        ? "This document was uploaded before persistence was enabled. Please upload the PDF file again on the Dashboard."
        : `Error: ${err.message}`;
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: errorText,
                loading: false,
              }
            : m,
        ),
      );
    } finally {
      setSendingChat(false);
    }
  };

  const insightTabs = [
    { key: "summary", label: "Summary", icon: FileText },
    { key: "keywords", label: "Keywords", icon: BookMarked },
    { key: "citations", label: "Citations", icon: LinkIcon },
    { key: "gaps", label: "Research Gaps", icon: HelpCircle },
    { key: "future", label: "Future Work", icon: Lightbulb },
    { key: "flashcards", label: "Flashcards", icon: Sparkles },
    { key: "glossary", label: "Glossary", icon: BookOpen },
    { key: "similar", label: "Related Papers", icon: Compass },
  ];

  return (
    <>
      {/* ─── 1. Paper Insights Modal ─── */}
      {selectedPaperForInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#131315] border border-[#353437] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#353437]/70 bg-[#1c1b1d]/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#e5e1e4] truncate">
                    {selectedPaperForInsights.title}
                  </h3>
                  <p className="text-xs text-[#908fa0] truncate">
                    {selectedPaperForInsights.fileName} •{" "}
                    {selectedPaperForInsights.numChunks} Chunks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadReport}
                  title="Download Markdown report"
                  className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={onCloseInsights}
                  className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex items-center gap-1.5 p-2 px-5 bg-[#0e0e10] border-b border-[#353437]/50 overflow-x-auto">
              {insightTabs.map((t) => {
                const Icon = t.icon;
                const isActive = insightTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabSwitch(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40"
                        : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#1c1b1d]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto min-h-[320px] max-h-[60vh] text-sm text-[#e5e1e4] leading-relaxed">
              {loadingInsight ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Loader2 className="w-8 h-8 text-[#8083ff] animate-spin" />
                  <span className="text-xs text-[#908fa0]">
                    Generating analysis with {loadingInsightModel || "Auto"} model...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Copy button */}
                  {insightData[insightTab] && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleCopy(insightData[insightTab])}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Content</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Render content based on active tab */}
                  {insightTab === "flashcards" &&
                  Array.isArray(insightData.flashcards) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {insightData.flashcards.map((fc, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-2"
                        >
                          <span className="text-xs font-mono text-[#8083ff] font-semibold">
                            Card #{i + 1}
                          </span>
                          <h4 className="text-xs font-bold text-[#e5e1e4]">
                            {fc.question}
                          </h4>
                          <p className="text-xs text-[#c7c4d7] bg-[#201f21] p-3 rounded-lg border border-[#353437]/50 mt-1">
                            {fc.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : insightTab === "glossary" &&
                    Array.isArray(insightData.glossary) ? (
                    <div className="flex flex-col gap-3">
                      {insightData.glossary.map((item, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-1"
                        >
                          <span className="text-xs font-bold text-[#7bd0ff] font-mono">
                            {item.term}
                          </span>
                          <p className="text-xs text-[#c7c4d7]">
                            {item.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : insightTab === "similar" &&
                    Array.isArray(insightData.similar) ? (
                    <div className="flex flex-col gap-3">
                      {insightData.similar.length === 0 ? (
                        <p className="text-xs text-[#908fa0]">
                          No related papers found on Semantic Scholar.
                        </p>
                      ) : (
                        insightData.similar.map((p, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-[#e5e1e4]">
                                {p.title}
                              </h4>
                              {p.url && (
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#8083ff] hover:text-[#c0c1ff] shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#908fa0]">
                              <span>
                                {p.authors?.join(", ") || "Unknown authors"}
                              </span>
                              {p.year && <span>• {p.year}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="markdown-content p-4 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/50 text-xs sm:text-sm">
                      {insightData[insightTab] ? (
                        <ReactMarkdown>
                          {String(insightData[insightTab])}
                        </ReactMarkdown>
                      ) : (
                        "Click to load analysis."
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Chat with Paper Modal (Slide-over / Drawer) ─── */}
      {selectedPaperForChat && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-[#131315] border-l border-[#353437] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#353437] bg-[#1c1b1d]/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#8083ff] flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(128,131,255,0.4)]">
                  <MessageSquareCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#e5e1e4] truncate">
                    {selectedPaperForChat.title}
                  </h3>
                  <span className="text-[11px] text-[#7bd0ff] font-mono">
                    RAG Grounded Q&A • {selectedPaperForChat.numChunks} Vector
                    Chunks
                  </span>
                </div>
              </div>

              <button
                onClick={onCloseChat}
                className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user"
                      ? "ml-auto items-end"
                      : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#8083ff] text-white rounded-br-none shadow-[0_0_16px_rgba(128,131,255,0.3)]"
                        : "bg-[#1c1b1d] text-[#e5e1e4] border border-[#353437] rounded-bl-none"
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 text-[#7bd0ff]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{msg.text}</span>
                      </div>
                    ) : msg.sender === "ai" ? (
                      <div className="markdown-content">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-[#908fa0] font-mono">
                    <span>{msg.time}</span>
                    {msg.sourcesCount !== undefined && (
                      <span>• Grounded on {msg.sourcesCount} chunks</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions Strip */}
            <div className="px-4 py-2 bg-[#0e0e10] border-t border-[#353437]/40 flex gap-2 overflow-x-auto">
              {[
                "What is the core methodology?",
                "What are the primary findings?",
                "What are the main limitations?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setChatInput(prompt)}
                  className="px-2.5 py-1 rounded-full bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-[11px] text-[#908fa0] hover:text-[#c0c1ff] whitespace-nowrap transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendChat}
              className="p-4 bg-[#1c1b1d] border-t border-[#353437]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about this paper..."
                  disabled={sendingChat}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#131315] border border-[#353437] text-xs sm:text-sm text-[#e5e1e4] placeholder:text-[#908fa0] focus:outline-none focus:border-[#8083ff]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingChat}
                  className="p-2.5 rounded-xl bg-[#8083ff] hover:bg-[#8083ff]/90 disabled:opacity-50 text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(128,131,255,0.4)]"
                >
                  {sendingChat ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
