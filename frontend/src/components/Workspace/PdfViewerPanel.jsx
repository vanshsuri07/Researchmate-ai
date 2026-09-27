import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, FileCode2, Download, AlertCircle, Loader2, ExternalLink, RefreshCw, Edit3, Copy, Sparkles, Bookmark, Highlighter, StickyNote } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AnnotationSidebar from './AnnotationSidebar.jsx';
import MiniBookmarkStrip from './MiniBookmarkStrip.jsx';

const API_BASE = "http://localhost:5000/api";

const HIGHLIGHT_COLORS = {
  Important: 'rgba(168, 85, 247, 0.25)',
  Definition: 'rgba(59, 130, 246, 0.25)',
  Methodology: 'rgba(6, 182, 212, 0.25)',
  Results: 'rgba(16, 185, 129, 0.25)'
};

export default function PdfViewerPanel({ paper }) {
  const docId = paper.document_id || paper.id;
  const pdfUrl = `${API_BASE}/documents/${docId}/pdf`;

  const [viewMode, setViewMode] = useState('pdf');
  const [checkingPdf, setCheckingPdf] = useState(true);
  const [hasPdf, setHasPdf] = useState(true);
  const [contentData, setContentData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Highlights — persisted per document
  const [highlights, setHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem(`highlights_${docId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Bookmarks — persisted per document
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem(`bookmarks_${docId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist highlights + bookmarks
  useEffect(() => {
    if (docId) localStorage.setItem(`highlights_${docId}`, JSON.stringify(highlights));
  }, [highlights, docId]);

  useEffect(() => {
    if (docId) localStorage.setItem(`bookmarks_${docId}`, JSON.stringify(bookmarks));
  }, [bookmarks, docId]);

  // UI State
  const [toolbar, setToolbar] = useState({ visible: false, x: 0, y: 0, text: '', chunkIndex: -1, startOffset: 0, endOffset: 0 });
  const [notePopover, setNotePopover] = useState({ visible: false, highlightId: null, x: 0, y: 0, text: '' });
  const [highlightMode, setHighlightMode] = useState(false);
  const [lastUsedColor, setLastUsedColor] = useState(HIGHLIGHT_COLORS.Important);
  const [pulsingHighlightId, setPulsingHighlightId] = useState(null);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('notes');
  const [sidebarSearch, setSidebarSearch] = useState('');

  const readerRef = useRef(null);

  // ── PDF check ──
  const checkPdfAvailability = () => {
    setCheckingPdf(true);
    fetch(pdfUrl)
      .then((res) => {
        if (res.ok) { setHasPdf(true); setViewMode('pdf'); }
        else { setHasPdf(false); setViewMode('reader'); }
      })
      .catch(() => { setHasPdf(false); setViewMode('reader'); })
      .finally(() => setCheckingPdf(false));
  };

  useEffect(() => { checkPdfAvailability(); }, [docId]);

  useEffect(() => {
    if (viewMode === 'reader' && !contentData) {
      setLoadingContent(true);
      fetch(`${API_BASE}/documents/${docId}/content`)
        .then((res) => res.json())
        .then((data) => { if (data.chunks) setContentData(data); })
        .catch((err) => console.error("Failed to load chunks", err))
        .finally(() => setLoadingContent(false));
    }
  }, [viewMode, docId, contentData]);

  // ── Jump to chunk (used by sidebar, mini-strip, AI evidence) ──
  const scrollToChunk = useCallback((chunkIndex, highlightId) => {
    // Switch to reader view if needed
    if (viewMode !== 'reader') setViewMode('reader');

    // Give DOM time to render if we just switched view modes
    setTimeout(() => {
      const el = document.querySelector(`[data-chunk-idx="${chunkIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (highlightId) {
          setPulsingHighlightId(highlightId);
          setTimeout(() => setPulsingHighlightId(null), 600);
        }
      }
    }, viewMode !== 'reader' ? 200 : 50);
  }, [viewMode]);

  // ── Listen for events from AI Chat ──
  useEffect(() => {
    const handleHighlightFromChat = (e) => {
      const { chunkIndex, text } = e.detail;
      // Create a highlight from the AI evidence snippet
      const newId = uuidv4();
      const newHighlight = {
        documentId: docId,
        highlightId: newId,
        pageNumber: chunkIndex + 1,
        selectedText: text,
        startOffset: 0,
        endOffset: 0,
        color: HIGHLIGHT_COLORS.Important,
        createdAt: new Date().toISOString(),
        chunkIndex,
        note: ''
      };

      // Try to find the actual offsets in the chunk text
      if (contentData?.chunks?.[chunkIndex]) {
        const chunkText = contentData.chunks[chunkIndex];
        const snippetClean = text.replace(/\.\.\.$/,'').trim();
        const idx = chunkText.indexOf(snippetClean);
        if (idx >= 0) {
          newHighlight.startOffset = idx;
          newHighlight.endOffset = idx + snippetClean.length;
        }
      }

      setHighlights(prev => [...prev, newHighlight]);
      scrollToChunk(chunkIndex, newId);
    };

    const handleSaveNoteFromChat = (e) => {
      const { chunkIndex, text, noteContent } = e.detail;
      const newId = uuidv4();
      const newHighlight = {
        documentId: docId,
        highlightId: newId,
        pageNumber: chunkIndex + 1,
        selectedText: text,
        startOffset: 0,
        endOffset: 0,
        color: HIGHLIGHT_COLORS.Important,
        createdAt: new Date().toISOString(),
        chunkIndex,
        note: noteContent || ''
      };

      if (contentData?.chunks?.[chunkIndex]) {
        const chunkText = contentData.chunks[chunkIndex];
        const snippetClean = text.replace(/\.\.\.$/,'').trim();
        const idx = chunkText.indexOf(snippetClean);
        if (idx >= 0) {
          newHighlight.startOffset = idx;
          newHighlight.endOffset = idx + snippetClean.length;
        }
      }

      setHighlights(prev => [...prev, newHighlight]);
      scrollToChunk(chunkIndex, newId);
    };

    window.addEventListener('highlight-from-chat', handleHighlightFromChat);
    window.addEventListener('save-note-from-chat', handleSaveNoteFromChat);
    return () => {
      window.removeEventListener('highlight-from-chat', handleHighlightFromChat);
      window.removeEventListener('save-note-from-chat', handleSaveNoteFromChat);
    };
  }, [docId, contentData, scrollToChunk]);

  // ── Text selection helpers ──
  const getAbsoluteOffset = (container, node, offset) => {
    let absOffset = 0;
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let curr = walk.nextNode();
    while (curr) {
      if (curr === node) { absOffset += offset; break; }
      absOffset += curr.textContent.length;
      curr = walk.nextNode();
    }
    return absOffset;
  };

  const handleSelection = (e) => {
    if (e.target.closest('#selection-toolbar') || e.target.closest('#note-popover')) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0 && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      while (container && container.nodeType !== 1) container = container.parentNode;
      let chunkEl = container ? container.closest('.chunk-container') : null;

      if (chunkEl) {
        const chunkIndex = parseInt(chunkEl.getAttribute('data-chunk-idx'), 10);
        const startOffset = getAbsoluteOffset(chunkEl, range.startContainer, range.startOffset);
        const endOffset = getAbsoluteOffset(chunkEl, range.endContainer, range.endOffset);
        const rect = range.getBoundingClientRect();
        const parentRect = chunkEl.closest('.reader-scroll-area').getBoundingClientRect();

        // In highlight mode, auto-highlight immediately
        if (highlightMode) {
          const newId = uuidv4();
          setHighlights(prev => [...prev, {
            documentId: docId, highlightId: newId, pageNumber: chunkIndex + 1,
            selectedText: selection.toString(), startOffset, endOffset,
            color: lastUsedColor, createdAt: new Date().toISOString(), chunkIndex, note: ''
          }]);
          window.getSelection().removeAllRanges();
          return;
        }

        setToolbar({
          visible: true,
          x: rect.left + rect.width / 2,
          y: Math.max(rect.top - 50, parentRect.top + 10),
          text: selection.toString(), chunkIndex, startOffset, endOffset
        });
        setNotePopover({ visible: false, highlightId: null, x: 0, y: 0, text: '' });
      } else {
        setToolbar(prev => ({ ...prev, visible: false }));
      }
    } else {
      setToolbar(prev => ({ ...prev, visible: false }));
    }
  };

  // ── Highlight actions ──
  const addHighlight = (color) => {
    setLastUsedColor(color);
    const newId = uuidv4();
    setHighlights(prev => [...prev, {
      documentId: docId, highlightId: newId, pageNumber: toolbar.chunkIndex + 1,
      selectedText: toolbar.text, startOffset: toolbar.startOffset, endOffset: toolbar.endOffset,
      color, createdAt: new Date().toISOString(), chunkIndex: toolbar.chunkIndex, note: ''
    }]);
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const openNotePopover = () => {
    const newId = uuidv4();
    setHighlights(prev => [...prev, {
      documentId: docId, highlightId: newId, pageNumber: toolbar.chunkIndex + 1,
      selectedText: toolbar.text, startOffset: toolbar.startOffset, endOffset: toolbar.endOffset,
      color: HIGHLIGHT_COLORS.Important, createdAt: new Date().toISOString(), chunkIndex: toolbar.chunkIndex, note: ''
    }]);
    setNotePopover({ visible: true, highlightId: newId, x: toolbar.x, y: toolbar.y, text: '' });
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const saveNote = () => {
    setHighlights(prev => prev.map(h =>
      h.highlightId === notePopover.highlightId ? { ...h, note: notePopover.text } : h
    ));
    setNotePopover({ visible: false, highlightId: null, x: 0, y: 0, text: '' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toolbar.text);
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const handleAskAI = () => {
    window.dispatchEvent(new CustomEvent('ask-ai', { detail: toolbar.text }));
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  // ── Bookmark actions ──
  const getCurrentVisibleChunk = () => {
    if (!readerRef.current) return 0;
    const chunks = readerRef.current.querySelectorAll('.chunk-container');
    const scrollTop = readerRef.current.scrollTop;
    const containerTop = readerRef.current.getBoundingClientRect().top;
    let best = 0;
    chunks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top - containerTop <= scrollTop + 100) {
        best = parseInt(el.getAttribute('data-chunk-idx'), 10);
      }
    });
    return best;
  };

  const toggleBookmark = () => {
    const chunkIdx = getCurrentVisibleChunk();
    const existing = bookmarks.find(b => b.chunkIndex === chunkIdx);
    if (existing) {
      setBookmarks(prev => prev.filter(b => b.bookmarkId !== existing.bookmarkId));
    } else {
      setBookmarkAnimating(true);
      setTimeout(() => setBookmarkAnimating(false), 200);
      setBookmarks(prev => [...prev, {
        bookmarkId: uuidv4(), chunkIndex: chunkIdx,
        label: `Section ${chunkIdx + 1}`, createdAt: new Date().toISOString()
      }]);
    }
  };

  const isCurrentChunkBookmarked = () => {
    if (!readerRef.current) return false;
    const chunkIdx = getCurrentVisibleChunk();
    return bookmarks.some(b => b.chunkIndex === chunkIdx);
  };

  // ── Sidebar handlers ──
  const handleDeleteHighlight = (highlightId) => {
    setHighlights(prev => prev.filter(h => h.highlightId !== highlightId));
  };

  const handleDeleteBookmark = (bookmarkId) => {
    setBookmarks(prev => prev.filter(b => b.bookmarkId !== bookmarkId));
  };

  const handleUpdateBookmarkLabel = (bookmarkId, newLabel) => {
    setBookmarks(prev => prev.map(b =>
      b.bookmarkId === bookmarkId ? { ...b, label: newLabel } : b
    ));
  };

  const annotationCount = highlights.filter(h => h.note?.trim()).length + bookmarks.length;

  // ── Render chunk text with highlights ──
  const renderChunkText = (text, chunkIdx) => {
    const chunkHighlights = highlights
      .filter(h => h.chunkIndex === chunkIdx && h.startOffset >= 0 && h.endOffset > h.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset);

    if (chunkHighlights.length === 0) return <span className="whitespace-pre-wrap leading-relaxed">{text}</span>;

    let elements = [];
    let lastIndex = 0;

    chunkHighlights.forEach(h => {
      if (h.startOffset > lastIndex) {
        elements.push(text.substring(lastIndex, h.startOffset));
      }
      if (h.startOffset >= lastIndex && h.endOffset <= text.length) {
        const isPulsing = pulsingHighlightId === h.highlightId;
        elements.push(
          <span
            key={h.highlightId}
            className={`relative inline rounded px-0.5 cursor-pointer transition-colors hover:brightness-110 animate-highlight-fadein ${isPulsing ? 'animate-pulse-highlight' : ''}`}
            style={{ backgroundColor: h.color }}
            title={h.note ? `Note: ${h.note}` : ''}
          >
            {text.substring(h.startOffset, h.endOffset)}
            {h.note && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-[#131315]"></span>
              </span>
            )}
          </span>
        );
        lastIndex = h.endOffset;
      }
    });

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return <span className="whitespace-pre-wrap leading-relaxed">{elements}</span>;
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-[#131315] min-h-0 relative">
      {/* Panel Toolbar */}
      <div className="h-11 border-b border-[#2a292d] flex items-center justify-between px-3 shrink-0 bg-[#1a191c]">
        {/* Left: View Toggle */}
        <div className="flex items-center gap-1 bg-[#0e0e10] p-0.5 rounded-lg border border-[#2a292d]">
          <button
            onClick={() => setViewMode('pdf')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'pdf' ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm' : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Original PDF
          </button>
          <button
            onClick={() => setViewMode('reader')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'reader' ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm' : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Reader View
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {hasPdf && (
            <>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                title="Open PDF in new tab">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Tab</span>
              </a>
              <a href={pdfUrl} download={paper.fileName || "paper.pdf"}
                className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                title="Download PDF">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </>
          )}

          <div className="h-4 w-px bg-[#353437] mx-0.5" />

          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCurrentChunkBookmarked()
                ? 'text-[#8083ff] hover:bg-[#2a2a2c]'
                : 'text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]'
            } ${bookmarkAnimating ? 'animate-bookmark-fill' : ''}`}
            title="Bookmark current section"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isCurrentChunkBookmarked() ? 'fill-current' : ''}`} />
          </button>

          {/* Highlight Mode */}
          <button
            onClick={() => setHighlightMode(!highlightMode)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              highlightMode
                ? 'bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40'
                : 'text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]'
            }`}
            title={highlightMode ? "Disable highlight mode" : "Enable highlight mode"}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
              sidebarOpen
                ? 'bg-[#8083ff]/20 text-[#c0c1ff]'
                : 'text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]'
            }`}
            title="Annotations"
          >
            <StickyNote className="w-3.5 h-3.5" />
            {annotationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#8083ff] text-[8px] font-bold text-white flex items-center justify-center">
                {annotationCount > 9 ? '9+' : annotationCount}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-[#353437] mx-0.5" />

          <button
            onClick={checkPdfAvailability}
            className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
            title="Reload PDF"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[#0e0e10]">
        {checkingPdf ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#908fa0]">
            <Loader2 className="w-6 h-6 animate-spin text-[#8083ff]" />
            <span className="text-xs">Connecting to manuscript server...</span>
          </div>
        ) : viewMode === 'pdf' ? (
          hasPdf ? (
            <iframe src={pdfUrl} className="w-full h-full border-none bg-[#131315]" title="PDF Viewer" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#908fa0] p-6 text-center">
              <AlertCircle className="w-10 h-10 mb-3 text-amber-400" />
              <p className="text-sm font-semibold text-[#e5e1e4] mb-1">Raw PDF binary is not stored locally</p>
              <p className="text-xs max-w-sm text-[#908fa0] mb-4">
                This document was imported from a web source or abstract. You can read the extracted text seamlessly in Reader View.
              </p>
              <button onClick={() => setViewMode('reader')}
                className="px-3.5 py-1.5 rounded-lg bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-md transition-all cursor-pointer">
                Switch to Reader View
              </button>
            </div>
          )
        ) : (
          <div className="h-full relative">
            {/* Annotation Sidebar (overlay) */}
            <AnnotationSidebar
              highlights={highlights}
              bookmarks={bookmarks}
              isOpen={sidebarOpen}
              activeTab={sidebarTab}
              searchQuery={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onTabChange={setSidebarTab}
              onJumpToChunk={(chunkIndex, highlightId) => {
                scrollToChunk(chunkIndex, highlightId);
                setSidebarOpen(false);
              }}
              onDeleteHighlight={handleDeleteHighlight}
              onDeleteBookmark={handleDeleteBookmark}
              onUpdateBookmarkLabel={handleUpdateBookmarkLabel}
              onClose={() => setSidebarOpen(false)}
            />

            {/* Reader scroll area */}
            <div
              ref={readerRef}
              className={`h-full overflow-y-auto p-6 sm:p-8 custom-scrollbar relative reader-scroll-area ${highlightMode ? 'cursor-text' : ''}`}
              onMouseUp={handleSelection}
            >
              <div className="max-w-3xl mx-auto space-y-4 relative">
                <div className="border-b border-[#2a292d] pb-4 mb-4">
                  <span className="text-[10px] font-mono uppercase text-[#7bd0ff] px-2 py-0.5 rounded bg-[#7bd0ff]/10 border border-[#7bd0ff]/20">
                    Manuscript Reader
                  </span>
                  <h2 className="text-xl font-bold text-[#e5e1e4] mt-2">{paper.title}</h2>
                  <p className="text-xs text-[#908fa0] mt-1">
                    {paper.fileName} • {contentData?.chunks?.length || paper.numChunks || 0} Pages
                  </p>
                </div>

                {loadingContent ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#908fa0] gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#8083ff]" />
                    <span className="text-xs">Loading manuscript text...</span>
                  </div>
                ) : contentData?.chunks ? (
                  contentData.chunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      data-chunk-idx={idx}
                      className="chunk-container text-xs sm:text-sm text-[#c7c4d7] bg-[#1c1b1d]/60 p-4 rounded-xl border border-[#2a292d] hover:border-[#8083ff]/30 transition-colors"
                    >
                      <span className="text-[10px] font-mono text-[#8083ff] font-semibold block mb-1 opacity-70 select-none">
                        PAGE {idx + 1} • SECTION
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed m-0">{renderChunkText(chunk, idx)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#908fa0]">Failed to load document content.</p>
                )}
              </div>
            </div>

            {/* Mini Bookmark Strip */}
            <MiniBookmarkStrip
              highlights={highlights}
              bookmarks={bookmarks}
              totalChunks={contentData?.chunks?.length || 0}
              onJumpToChunk={scrollToChunk}
              containerRef={readerRef}
            />
          </div>
        )}
      </div>

      {/* Floating Toolbar */}
      {toolbar.visible && (
        <div
          id="selection-toolbar"
          className="fixed z-50 flex items-center gap-1 p-1 bg-[#1c1b1d]/90 backdrop-blur-md border border-[#2a292d] rounded-lg shadow-xl"
          style={{ top: toolbar.y, left: toolbar.x, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-1 border-r border-[#2a292d] pr-1 mr-1">
            {Object.entries(HIGHLIGHT_COLORS).map(([label, color]) => (
              <button
                key={label} title={`Highlight: ${label}`}
                onClick={() => addHighlight(color)}
                className="w-4 h-4 rounded-full border border-[#2a292d] hover:scale-110 transition-transform shadow-inner cursor-pointer"
                style={{ backgroundColor: color.replace('0.25', '0.8') }}
              />
            ))}
          </div>
          <button onClick={openNotePopover} className="p-1.5 text-[#c7c4d7] hover:text-white hover:bg-[#2a292d] rounded-md transition-colors cursor-pointer" title="Add Note">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopy} className="p-1.5 text-[#c7c4d7] hover:text-white hover:bg-[#2a292d] rounded-md transition-colors cursor-pointer" title="Copy">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleAskAI} className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-[#2a292d] rounded-md transition-colors flex items-center gap-1 cursor-pointer" title="Ask AI">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold pr-1">Ask AI</span>
          </button>
        </div>
      )}

      {/* Note Popover */}
      {notePopover.visible && (
        <div
          id="note-popover"
          className="fixed z-50 flex flex-col gap-2 p-3 bg-[#1c1b1d]/95 backdrop-blur-md border border-[#2a292d] rounded-xl shadow-2xl w-64 animate-note-popover"
          style={{ top: notePopover.y, left: notePopover.x, transform: 'translateX(-50%) translateY(10px)' }}
        >
          <div className="text-[11px] font-semibold text-[#c7c4d7] mb-0.5">Add Note</div>
          <div className="text-[10px] italic text-[#908fa0] border-l-2 border-[#8083ff] pl-2 mb-2 truncate bg-[#0e0e10]/50 p-1 rounded-r">
            "{highlights.find(h => h.highlightId === notePopover.highlightId)?.selectedText}"
          </div>
          <textarea
            autoFocus value={notePopover.text}
            onChange={e => setNotePopover({ ...notePopover, text: e.target.value })}
            placeholder="Write your thought..."
            className="w-full h-20 bg-[#0e0e10] border border-[#2a292d] rounded-md p-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#8083ff] resize-none"
          />
          <div className="flex justify-end gap-2 mt-1">
            <button onClick={() => setNotePopover({ visible: false, highlightId: null, x: 0, y: 0, text: '' })}
              className="px-2 py-1 text-[10px] text-[#908fa0] hover:text-white transition-colors cursor-pointer">Cancel</button>
            <button onClick={saveNote}
              className="px-3 py-1 text-[10px] bg-[#8083ff] hover:bg-[#8083ff]/90 text-white rounded-md font-semibold transition-colors cursor-pointer">Save Note</button>
          </div>
        </div>
      )}
    </div>
  );
}
