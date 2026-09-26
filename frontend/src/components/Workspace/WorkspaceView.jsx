import React, { useState } from "react";
import {
  ArrowLeft,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  Play,
  MessageSquare,
  Maximize2,
} from "lucide-react";
import PdfViewerPanel from "./PdfViewerPanel.jsx";
import InsightsPanel from "./InsightsPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";

export default function WorkspaceView({
  paper,
  availablePapers,
  onSelectPaper,
  initialTab,
  onClose,
  selectedModel,
  setSelectedModel,
  serverStatus,
  onDeletePaper,
  isChatPoppedOut,
  isChatVisible,
  onToggleChat,
}) {
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-[#0e0e10]">
      {/* Workspace Sub-Header */}
      <div className="h-11 shrink-0 bg-[#1a191c] border-b border-[#2a292d] flex items-center justify-between px-4 gap-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="h-4 w-px bg-[#353437]" />
          <h2 className="text-sm font-bold text-[#e5e1e4] truncate">
            {paper?.title || "Document"}
          </h2>
          <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8083ff]/10 text-[#c0c1ff] border border-[#8083ff]/20">
            {paper?.numChunks || 0} Chunks
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[#353437]" />

          {/* Start */}
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#8083ff] to-[#6c6fff] hover:opacity-90 text-white text-[11px] font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(128,131,255,0.3)]">
            <Play className="w-3 h-3 fill-white" />
            Start
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: PDF Viewer */}
        <div className="flex-1 min-w-0 border-r border-[#2a292d] overflow-hidden">
          {paper && <PdfViewerPanel paper={paper} />}
        </div>

        {/* RIGHT: Chat Panel Dock Target */}
        {paper && isChatVisible && !isChatPoppedOut && (
          <div
            id="chat-dock-target"
            className="w-[380px] lg:w-[420px] xl:w-[440px] shrink-0 overflow-hidden relative"
          />
        )}
      </div>

      {!isChatVisible && !isChatPoppedOut && (
        <button
          type="button"
          onClick={onToggleChat}
          className="absolute right-4 top-16 z-30 flex items-center gap-2 rounded-xl bg-[#8083ff] px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-[#7073ef] transition-colors cursor-pointer"
          title="Open chat"
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
      )}

      {/* BOTTOM: Analysis / Insights Panel */}
      <div
        className={`shrink-0 border-t border-[#2a292d] bg-[#131315] transition-all duration-300 flex flex-col ${
          insightsExpanded ? "h-[260px] lg:h-[280px]" : "h-10"
        }`}
      >
        {/* Analysis Header Bar */}
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-[#1a191c] border-b border-[#2a292d]">
          <span className="text-xs font-bold text-[#e5e1e4] tracking-wide">
            Analysis
          </span>
          <button
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#c0c1ff] text-[11px] font-semibold transition-colors cursor-pointer border border-[#353437]/60"
          >
            {insightsExpanded ? "Collapse" : "Expand"}
            {insightsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
        {/* Insights Content */}
        {insightsExpanded && (
          <div className="flex-1 overflow-hidden">
            {paper && (
              <InsightsPanel paper={paper} selectedModel={selectedModel} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
