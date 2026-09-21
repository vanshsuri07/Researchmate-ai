import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import HeroSection from './components/HeroSection.jsx';
import UploadSection from './components/UploadSection.jsx';
import ActiveIngestionCard from './components/ActiveIngestionCard.jsx';
import RecentPapersList from './components/RecentPapersList.jsx';
import LibraryView from './components/LibraryView.jsx';
import Footer from './components/Footer.jsx';
import Modals from './components/Modals.jsx';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  // Navigation & Search State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Real Uploaded Papers List
  const [papers, setPapers] = useState(() => {
    try {
      const saved = localStorage.getItem('researchmate_papers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Upload State
  const [activeUpload, setActiveUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modals
  const [selectedPaperForInsights, setSelectedPaperForInsights] = useState(null);
  const [selectedPaperForChat, setSelectedPaperForChat] = useState(null);

  // Backend Status
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [toast, setToast] = useState(null);

  // Persist papers in local storage
  useEffect(() => {
    try {
      localStorage.setItem('researchmate_papers', JSON.stringify(papers));
    } catch {
      // ignore
    }
  }, [papers]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Check Backend Health
  const checkHealth = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real File Upload Handler
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const file = fileArray[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setActiveUpload({
      fileName: file.name,
      progress: 25,
      stage: 'Uploading and parsing PDF text...',
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      setActiveUpload((prev) => ({
        ...prev,
        progress: 50,
        stage: 'Generating vector embeddings & FAISS index...',
      }));

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setActiveUpload((prev) => ({
        ...prev,
        progress: 85,
        stage: 'Extracting paper title via LLM...',
      }));

      // Extract title
      let paperTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      try {
        const titleRes = await fetch(`${API_BASE}/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: data.document_id }),
        });
        const titleData = await titleRes.json();
        if (titleRes.ok && titleData.title && typeof titleData.title === 'string') {
          const raw = titleData.title.trim();
          if (
            raw.length > 0 &&
            !raw.toLowerCase().includes('gemini_api_key') &&
            !raw.toLowerCase().includes('api error') &&
            !raw.toLowerCase().includes('error:') &&
            !raw.toLowerCase().includes('please set')
          ) {
            paperTitle = raw;
          }
        }
      } catch {
        // use fallback title
      }

      const newPaper = {
        id: data.document_id,
        document_id: data.document_id,
        title: paperTitle,
        fileName: data.filename,
        numChunks: data.num_chunks,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setPapers((prev) => [newPaper, ...prev]);
      setActiveUpload({
        fileName: file.name,
        progress: 100,
        stage: 'Processing complete!',
      });
      showToast(`Indexed "${newPaper.title}" (${data.num_chunks} chunks)`);
    } catch (err) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setActiveUpload(null), 1500);
    }
  };

  // Delete Paper Handler
  const handleDeletePaper = (paperId) => {
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
    showToast('Paper removed from active collection.');
  };

  // Export Synthesis Report
  const handleExportInsights = () => {
    if (papers.length === 0) return;
    const report = `# ResearchMate AI — Literature Collection Report
Generated: ${new Date().toLocaleString()}
Total Indexed Manuscripts: ${papers.length}

${papers
  .map(
    (p, i) => `### ${i + 1}. ${p.title}
- File Name: ${p.fileName}
- Document ID: ${p.document_id}
- Vector Chunks Indexed: ${p.numChunks}
- Ingested: ${p.uploadedAt}
`
  )
  .join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResearchMate_Collection_Report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Collection report exported to Markdown.');
  };

  // Filtered papers by search query
  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalChunks = papers.reduce((acc, p) => acc + (p.numChunks || 0), 0);

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex flex-col selection:bg-[#8083ff]/30 selection:text-[#c0c1ff]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#201f21] border border-[#8083ff]/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs text-[#e5e1e4] flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-ping" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        serverStatus={serverStatus}
        onCheckHealth={checkHealth}
      />

      {/* Main View */}
      <main className="w-full pt-20 sm:pt-24 pb-12 flex-1">
        {activeTab === 'dashboard' && (
          <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8">
            <div className="relative w-full overflow-hidden">
              {/* Ambient Glows */}
              <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#8083ff]/10 rounded-full blur-3xl pointer-events-none -z-10" />
              <div className="absolute top-48 right-1/4 w-[28rem] h-[28rem] bg-[#00a6e0]/10 rounded-full blur-3xl pointer-events-none -z-10" />

              <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <HeroSection
                  totalPapers={papers.length}
                  totalChunks={totalChunks}
                  serverStatus={serverStatus}
                />

                {/* Upload Zone & Ingestion Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-8">
                    <UploadSection
                      onFileUpload={handleFileUpload}
                      isUploading={isUploading}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <ActiveIngestionCard
                      activeUpload={activeUpload}
                      totalPapers={papers.length}
                    />
                  </div>
                </div>

                {/* Papers List */}
                <RecentPapersList
                  papers={filteredPapers}
                  onOpenInsights={(paper) => setSelectedPaperForInsights(paper)}
                  onOpenChat={(paper) => setSelectedPaperForChat(paper)}
                  onDeletePaper={handleDeletePaper}
                  onExportInsights={handleExportInsights}
                />
              </div>
            </div>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="px-4 sm:px-6 lg:px-8">
            <LibraryView
              papers={filteredPapers}
              onOpenInsights={(p) => setSelectedPaperForInsights(p)}
              onOpenChat={(p) => setSelectedPaperForChat(p)}
              onDeletePaper={handleDeletePaper}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Real Modals */}
      <Modals
        selectedPaperForInsights={selectedPaperForInsights}
        onCloseInsights={() => setSelectedPaperForInsights(null)}
        selectedPaperForChat={selectedPaperForChat}
        onCloseChat={() => setSelectedPaperForChat(null)}
        onDocumentUnavailable={(paper) => {
          handleDeletePaper(paper.id);
          setSelectedPaperForInsights(null);
          setSelectedPaperForChat(null);
        }}
      />
    </div>
  );
}
