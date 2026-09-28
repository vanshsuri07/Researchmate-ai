const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/ComparePapersCard.jsx', 'utf8');

// Add states for the comparison
if (!code.includes('const [comparisonResult')) {
  code = code.replace(/const \\[copied, setCopied\\] = useState\\(false\\);/, "const [copied, setCopied] = useState(false);\n  const [comparisonResult, setComparisonResult] = useState(null);\n  const [compareError, setCompareError] = useState(null);\n");
}

// Modify handleCompare to call backend
const newHandleCompare = \
  const handleCompare = async () => {
    if (!paperA && !paperB) {
      showToast("Please select Paper A and Paper B to compare.");
      return;
    }
    if (!paperA) {
      showToast("Please select Paper A.");
      return;
    }
    if (!paperB) {
      showToast("Please select Paper B.");
      return;
    }

    if (!paperA.id || !paperB.id) {
       showToast("Please select papers from the indexed library dropdown instead of uploading raw files.");
       return;
    }

    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await fetch("http://localhost:5000/api/compare", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
             document_a_id: paperA.id || paperA.document_id,
             document_b_id: paperB.id || paperB.document_id,
             model: "auto"
         })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");
      
      setComparisonResult(data.comparison);
      setShowComparisonModal(true);
    } catch(err) {
      setCompareError(err.message);
      showToast("Failed to compare: " + err.message);
    } finally {
      setIsComparing(false);
    }
  };
\;

code = code.replace(/const handleCompare = \\(\\) => \\{[\\s\\S]*?\\};/, newHandleCompare.trim());

// Render Markdown instead of hardcoded sections in the modal
if (!code.includes('import ReactMarkdown')) {
  code = code.replace(/import React, \\{ useState, useRef \\} from "react";/, 'import React, { useState, useRef } from "react";\nimport ReactMarkdown from "react-markdown";');
}

const newModalBody = \
            {/* Modal Body: Scrollable Comparison Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Paper Header Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#1c1b1d]/70 border border-[#8083ff]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase text-[#7bd0ff] font-bold">
                      Paper A
                    </span>
                    <span className="text-[11px] text-[#908fa0] font-mono">
                      {paperA?.size || "Indexed"}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#e5e1e4]">
                    {paperA?.title || paperA?.name || "Paper A"}
                  </h4>
                </div>

                <div className="p-4 rounded-xl bg-[#1c1b1d]/70 border border-[#c0c1ff]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase text-[#c0c1ff] font-bold">
                      Paper B
                    </span>
                    <span className="text-[11px] text-[#908fa0] font-mono">
                      {paperB?.size || "Indexed"}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#e5e1e4]">
                    {paperB?.title || paperB?.name || "Paper B"}
                  </h4>
                </div>
              </div>

              {compareError ? (
                 <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                   {compareError}
                 </div>
              ) : comparisonResult ? (
                 <div className="markdown-content prose prose-invert max-w-none text-sm text-[#c7c4d7]">
                   <ReactMarkdown>{comparisonResult}</ReactMarkdown>
                 </div>
              ) : (
                 <div className="text-center text-[#908fa0] py-10">No comparison generated.</div>
              )}
            </div>
\;

code = code.replace(/\\{\\/\\* Modal Body: Scrollable Comparison Content \\*\\/\\}[\\s\\S]*?<\\/div>\\s*\\{\\/\\* Modal Footer \\*\\/\\}/, newModalBody + '\\n            {/* Modal Footer */}');

// Update copy functionality to copy the real result
const newHandleCopy = \
  const handleCopyMarkdown = () => {
    if (!comparisonResult) return;
    navigator.clipboard.writeText(comparisonResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Comparison copied to clipboard.");
  };
\;
code = code.replace(/const handleCopyMarkdown = \\(\\) => \\{[\\s\\S]*?\\};/, newHandleCopy.trim());

// Add select dropdown in Paper A and Paper B empty states
const paperADropdown = \
              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <FilePlus2 className="w-5 h-5 text-[#c7c4d7]" />
                <span className="text-xs sm:text-sm font-medium text-[#e5e1e4]">
                  Paper A
                </span>
                <select
                  className="mt-2 w-full max-w-[200px] bg-[#141316] border border-[#353437] rounded px-2 py-1.5 text-xs text-[#e5e1e4] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const selected = indexedPapers.find(p => p.id === e.target.value);
                    if (selected) setPaperA(selected);
                  }}
                  value=""
                >
                  <option value="">Select Indexed Paper...</option>
                  {indexedPapers.map(p => (
                    <option key={p.id} value={p.id}>{p.title || p.fileName}</option>
                  ))}
                </select>
              </div>
\;

const paperBDropdown = \
              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <FilePlus2 className="w-5 h-5 text-[#c7c4d7]" />
                <span className="text-xs sm:text-sm font-medium text-[#e5e1e4]">
                  Paper B
                </span>
                <select
                  className="mt-2 w-full max-w-[200px] bg-[#141316] border border-[#353437] rounded px-2 py-1.5 text-xs text-[#e5e1e4] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const selected = indexedPapers.find(p => p.id === e.target.value);
                    if (selected) setPaperB(selected);
                  }}
                  value=""
                >
                  <option value="">Select Indexed Paper...</option>
                  {indexedPapers.map(p => (
                    <option key={p.id} value={p.id}>{p.title || p.fileName}</option>
                  ))}
                </select>
              </div>
\;

code = code.replace(/<div className="flex flex-col items-center justify-center gap-2">\\s*<FilePlus2 className="w-5 h-5 text-\\[#c7c4d7\\]" \\/>\\s*<span className="text-xs sm:text-sm font-medium text-\\[#e5e1e4\\]">\\s*Paper A\\s*<\\/span>\\s*<\\/div>/, paperADropdown.trim());

code = code.replace(/<div className="flex flex-col items-center justify-center gap-2">\\s*<FilePlus2 className="w-5 h-5 text-\\[#c7c4d7\\]" \\/>\\s*<span className="text-xs sm:text-sm font-medium text-\\[#e5e1e4\\]">\\s*Paper B\\s*<\\/span>\\s*<\\/div>/, paperBDropdown.trim());


fs.writeFileSync('frontend/src/components/ComparePapersCard.jsx', code);
console.log("Success");
