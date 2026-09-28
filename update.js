const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Workspace/PdfViewerPanel.jsx', 'utf8');

// 1. Update imports
code = code.replace(/import "react-pdf\/dist\/esm\/Page\/AnnotationLayer\.css";/g, 'import "react-pdf/dist/Page/AnnotationLayer.css";');
code = code.replace(/import "react-pdf\/dist\/esm\/Page\/TextLayer\.css";/g, 'import "react-pdf/dist/Page/TextLayer.css";');

// 2. Add cMapUrl and standardFontDataUrl below API_BASE
const cmapsStr = \
const cMapUrl = \\\https://unpkg.com/pdfjs-dist@\/cmaps/\\\;
const standardFontDataUrl = \\\https://unpkg.com/pdfjs-dist@\/standard_fonts/\\\;
\;
if (!code.includes('const cMapUrl')) {
  code = code.replace(/const API_BASE = .*?;/, match => match + '\n' + cmapsStr);
}

// 3. Update useEffect CSS
const newCss = \
      .pdf-container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        background-color: #525659;
        padding: 20px;
        overflow-y: auto;
        height: 100%;
      }
      .react-pdf__Page__canvas {
        margin: 0 auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }
      .highlight-rect {
        position: absolute;
        cursor: pointer;
        transition: opacity 0.2s, box-shadow 0.2s;
        z-index: 10;
      }
      .highlight-rect:hover { filter: brightness(0.9); }
      .highlight-note-indicator {
        position: absolute;
        top: -4px; right: -4px;
        width: 10px; height: 10px;
        background: #f59e0b;
        border-radius: 50%;
        border: 2px solid #131315;
        z-index: 11;
      }
      .react-pdf__Page { 
        position: relative;
        margin-bottom: 24px; 
        border-radius: 4px; 
        overflow: hidden; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
        background: white;
      }
      .react-pdf__Document { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
      }
      .react-pdf__Page__textContent {
        user-select: text;
        cursor: text;
      }
      .react-pdf__Page__textContent ::selection {
        background: rgba(128, 131, 255, 0.3) !important;
        color: transparent !important;
      }
\;

code = code.replace(/\\.highlight-rect {[\\s\\S]*?\\.react-pdf__Page__textContent ::selection {[\\s\\S]*?}/, newCss.trim());

// 4. Add containerWidth state and effect
if (!code.includes('const [containerWidth')) {
  code = code.replace(/const \\[scale, setScale\\] = useState\\(1\\.2\\);/, match => match + '\n  const [containerWidth, setContainerWidth] = useState(0);\n');
}
if (!code.includes('ResizeObserver')) {
  const resizeEffect = \
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasPdf]);
\;
  code = code.replace(/const containerRef = useRef\\(null\\);/, match => match + '\n' + resizeEffect);
}

// 5. Update <Document> props
code = code.replace(/<Document\\s*file=\\{pdfUrl\\}/, '<Document file={pdfUrl} cMapUrl={cMapUrl} standardFontDataUrl={standardFontDataUrl}');

// 6. Update container class and <Page> props
code = code.replace(/className=\\{\\\pdf-reader-selection flex-1 h-full overflow-y-auto p-8 custom-scrollbar/, 'className={\pdf-container pdf-reader-selection flex-1 h-full overflow-y-auto p-8 custom-scrollbar');

// 7. Render annotation layer correctly to match CSS layout, also add width
code = code.replace(/renderAnnotationLayer=\\{false\\}/g, 'renderAnnotationLayer={true}');
code = code.replace(/<Page\\s+pageNumber=\\{index \\+ 1\\}\\s+scale=\\{scale\\}/g, '<Page pageNumber={index + 1} scale={scale} width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined}');

fs.writeFileSync('frontend/src/components/Workspace/PdfViewerPanel.jsx', code);
console.log("Success");
