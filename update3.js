const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Workspace/WorkspaceView.jsx', 'utf8');

if (!code.includes('isReadingRef')) {
  // Add states
  code = code.replace(/const \\[actionMessage, setActionMessage\\] = useState\\(""\\);/, 
    "const [actionMessage, setActionMessage] = useState(\\\"\\\");\n  const [isReading, setIsReading] = useState(false);\n  const isReadingRef = React.useRef(false);\n");

  // Add handleToggleRead function
  const readFn = \
  const handleToggleRead = async () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      isReadingRef.current = false;
      showActionMessage("Stopped reading.");
      return;
    }

    if (!documentId) return;

    showActionMessage("Preparing to read...");
    try {
      const res = await fetch(\\\\/documents/\/content\\\);
      const data = await res.json();
      
      if (!data.chunks || data.chunks.length === 0) {
         showActionMessage("No text found.");
         return;
      }
      
      window.speechSynthesis.cancel();
      let currentIndex = 0;
      
      const speakNextChunk = () => {
         if (!isReadingRef.current) return;
         if (currentIndex >= data.chunks.length) {
            setIsReading(false);
            isReadingRef.current = false;
            showActionMessage("Finished reading.");
            return;
         }
         
         const utterance = new SpeechSynthesisUtterance(data.chunks[currentIndex]);
         utterance.rate = 1.0; 
         
         utterance.onend = () => {
             currentIndex++;
             speakNextChunk();
         };
         
         utterance.onerror = (e) => {
             // onend might not fire on error
             console.error("TTS Error", e);
             setIsReading(false);
             isReadingRef.current = false;
         };
         
         window.speechSynthesis.speak(utterance);
      };
      
      setIsReading(true);
      isReadingRef.current = true;
      speakNextChunk();
      showActionMessage("Reading started...");

    } catch (e) {
      showActionMessage("Failed to load text.");
    }
  };
\;
  code = code.replace(/const showActionMessage = \\(message\\) => \\{/, readFn + '\n  const showActionMessage = (message) => {');

  // Update button onClick and label
  const newButton = \
            <button 
              onClick={handleToggleRead}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-linear-to-r from-[#8083ff] to-[#6c6fff] hover:opacity-90 text-white text-[11px] font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(128,131,255,0.3)]"
            >
              {isReading ? <span className="w-2.5 h-2.5 bg-white rounded-sm" /> : <Play className="w-3 h-3 fill-white" />}
              {isReading ? "Stop" : "Start"}
            </button>
\;
  
  code = code.replace(/<button className="flex items-center gap-1\\.5 px-3\\.5 py-1\\.5 rounded-lg bg-linear-to-r from-\\[#8083ff\\] to-\\[#6c6fff\\][\\s\\S]*?<Play className="w-3 h-3 fill-white" \\/>\\s*Start\\s*<\\/button>/, newButton.trim());

  fs.writeFileSync('frontend/src/components/Workspace/WorkspaceView.jsx', code);
  console.log("Success");
} else {
  console.log("Already updated");
}
