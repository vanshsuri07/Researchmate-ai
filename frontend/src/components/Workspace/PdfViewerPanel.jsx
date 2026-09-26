import React, { useState, useEffect } from 'react';
import { BookOpen, FileCode2, Download, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

const API_BASE = "http://localhost:5000/api";

export default function PdfViewerPanel({ paper }) {
  const docId = paper.document_id || paper.id;
  const pdfUrl = `${API_BASE}/documents/${docId}/pdf`;

  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'reader'
  const [checkingPdf, setCheckingPdf] = useState(true);
  const [hasPdf, setHasPdf] = useState(true);
  const [contentData, setContentData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Check if PDF exists on backend
  const checkPdfAvailability = () => {
    setCheckingPdf(true);
    fetch(pdfUrl)
      .then((res) => {
        if (res.ok) {
          setHasPdf(true);
          setViewMode('pdf');
        } else {
          setHasPdf(false);
          setViewMode('reader');
        }
      })
      .catch(() => {
        setHasPdf(false);
        setViewMode('reader');
      })
      .finally(() => {
        setCheckingPdf(false);
      });
  };

  useEffect(() => {
    checkPdfAvailability();
  }, [docId]);

  // Fetch text chunks for reader view
  useEffect(() => {
    if (viewMode === 'reader' && !contentData) {
      setLoadingContent(true);
      fetch(`${API_BASE}/documents/${docId}/content`)
        .then((res) => res.json())
        .then((data) => {
          if (data.chunks) {
            setContentData(data);
          }
        })
        .catch((err) => console.error("Failed to load chunks", err))
        .finally(() => setLoadingContent(false));
    }
  }, [viewMode, docId, contentData]);

  return (
    <div className="flex flex-col h-full bg-[#131315]">
      {/* Panel Toolbar */}
      <div className="h-11 border-b border-[#2a292d] flex items-center justify-between px-3 shrink-0 bg-[#1a191c]">
        {/* Toggle between PDF & Reader */}
        <div className="flex items-center gap-1 bg-[#0e0e10] p-0.5 rounded-lg border border-[#2a292d]">
          <button
            onClick={() => setViewMode('pdf')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'pdf'
                ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm'
                : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Original PDF
          </button>
          <button
            onClick={() => setViewMode('reader')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'reader'
                ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm'
                : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Reader View
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {hasPdf && (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                title="Open PDF in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Tab</span>
              </a>
              <a
                href={pdfUrl}
                download={paper.fileName || "paper.pdf"}
                className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </>
          )}
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
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none bg-[#131315]"
              title="PDF Viewer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#908fa0] p-6 text-center">
              <AlertCircle className="w-10 h-10 mb-3 text-amber-400" />
              <p className="text-sm font-semibold text-[#e5e1e4] mb-1">
                Raw PDF binary is not stored locally
              </p>
              <p className="text-xs max-w-sm text-[#908fa0] mb-4">
                This document was imported from a web source or abstract. You can read the extracted text chunks seamlessly in Reader View.
              </p>
              <button
                onClick={() => setViewMode('reader')}
                className="px-3.5 py-1.5 rounded-lg bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Switch to Reader View
              </button>
            </div>
          )
        ) : (
          <div className="h-full overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="border-b border-[#2a292d] pb-4 mb-4">
                <span className="text-[10px] font-mono uppercase text-[#7bd0ff] px-2 py-0.5 rounded bg-[#7bd0ff]/10 border border-[#7bd0ff]/20">
                  Manuscript Reader
                </span>
                <h2 className="text-xl font-bold text-[#e5e1e4] mt-2">{paper.title}</h2>
                <p className="text-xs text-[#908fa0] mt-1">
                  {paper.fileName} • {contentData?.chunks?.length || paper.numChunks || 0} Indexed Chunks
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
                    className="text-xs sm:text-sm leading-relaxed text-[#c7c4d7] bg-[#1c1b1d]/60 p-4 rounded-xl border border-[#2a292d] hover:border-[#8083ff]/30 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-[#8083ff] font-semibold block mb-1 opacity-70">
                      SECTION CHUNK #{idx + 1}
                    </span>
                    <p className="whitespace-pre-wrap">{chunk}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#908fa0]">Failed to load document content.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
