import React, { useState } from 'react';
import { FileText, MessageSquare, Sparkles, Trash2, Search, Layers, Clock } from 'lucide-react';

export default function LibraryView({ papers, onOpenInsights, onOpenChat, onDeletePaper }) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.fileName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header with Search and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0e0e10]/90 border border-[#353437]/70 backdrop-blur-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#e5e1e4] tracking-tight">
            Document Repository
          </h2>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-1">
            Browse and manage all uploaded research papers indexed in your vector store
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#908fa0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter library..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1c1b1d] border border-[#353437] text-xs text-[#e5e1e4] placeholder:text-[#908fa0] focus:outline-none focus:border-[#8083ff]"
          />
        </div>
      </div>

      {/* Grid of Papers */}
      {filteredPapers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl bg-[#0e0e10]/60 border border-[#353437]/40 border-dashed">
          <FileText className="w-12 h-12 text-[#908fa0] mb-3" />
          <h3 className="text-base font-semibold text-[#e5e1e4]">
            {papers.length === 0 ? 'Your library is empty' : 'No matching documents found'}
          </h3>
          <p className="text-xs text-[#908fa0] max-w-sm mt-1">
            {papers.length === 0
              ? 'Upload research PDFs on the Dashboard to populate your document library.'
              : 'Try searching with a different keyword or title.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-[#0e0e10]/90 border border-[#353437]/70 hover:border-[#8083ff]/50 transition-all gap-4 group shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#2a2a2c] border border-[#464554]/40 flex items-center justify-center text-[#c0c1ff] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => onDeletePaper(paper.id)}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-[#908fa0] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#e5e1e4] group-hover:text-[#c0c1ff] transition-colors line-clamp-2">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-[#908fa0] truncate mt-1">{paper.fileName}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#908fa0] pt-2 border-t border-[#353437]/40">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#7bd0ff]" />
                    {paper.numChunks} Chunks
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    {paper.uploadedAt || 'Just now'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => onOpenInsights(paper)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs font-semibold text-[#e5e1e4] hover:text-[#c0c1ff] transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" />
                  <span>Insights</span>
                </button>

                <button
                  onClick={() => onOpenChat(paper)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_12px_rgba(128,131,255,0.3)] transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
