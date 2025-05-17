import React, { useState, useEffect, useRef } from "react";

const models = [
  {
    id: 1,
    name: "Bear",
    folder: "/bear",
    file: "scene.gltf",
  },
  {
    id: 2,
    name: "Elk",
    folder: "/elk",
    file: "scene.gltf",
  },
  {
    id: 3,
    name: "Owl",
    folder: "/owl",
    file: "scene.gltf",
  },
  {
    id: 4,
    name: "Panther",
    folder: "/panther",
    file: "scene.gltf",
  },
  {
    id: 5,
    name: "Horse",
    folder: "/horse",
    file: "scene.gltf",
  },
];

function App() {
  const [selectedModel, setSelectedModel] = useState(null);
  const [arMode, setArMode] = useState(false);
  const modelViewerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  // Function to activate AR mode
  const activateAR = () => {
    if (modelViewerRef.current) {
      const modelViewer = modelViewerRef.current;
      modelViewer.activateAR();
      setArMode(true);
    }
  };

  const takeScreenshot = () => {
    if (!modelViewerRef.current) return;
    alert("To capture the model, please use your OS screenshot feature (e.g., PrintScreen or Cmd+Shift+4).");
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col p-6 md:p-10">
      <header className="mb-12 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text pb-2">
          AR Model Viewer
        </h1>
        <p className="text-center text-gray-300 mt-3 text-lg">Select a 3D model to view in AR</p>
      </header>

      {!selectedModel ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl hover:shadow-blue-900/30 hover:border-blue-600/50 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => setSelectedModel(model)}
            >
              <div className="h-52 bg-black flex items-center justify-center relative overflow-hidden">
                <img
                  src={`${model.folder}/thumbnail.png`}
                  alt={model.name}
                  className="max-h-full max-w-full object-contain p-4"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.innerHTML = `<div class="text-6xl text-gray-600 font-bold">${model.name.charAt(0)}</div>`;
                  }}
                />
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-blue-400">{model.name}</h2>
                <p className="text-gray-400 text-sm mt-2">Click to view in 3D or AR</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 max-w-6xl mx-auto w-full flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
            <button
              className="px-5 py-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-300 flex items-center gap-3 border border-gray-800 shadow-lg"
              onClick={() => {
                setSelectedModel(null);
                setArMode(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{selectedModel.name}</h2>
            <div className="w-24"></div> {/* Empty space for symmetry */}
          </div>

          <div className="w-full bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            <model-viewer
              ref={modelViewerRef}
              src={`${selectedModel.folder}/${selectedModel.file}`}
              alt={selectedModel.name}
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate
              environment-image="neutral"
              shadow-intensity="1"
              exposure="1"
              style={{ width: "100%", height: "580px" }}
            ></model-viewer>
          </div>

          <div className="mt-10 flex flex-wrap gap-5 justify-center">
            {isMobile ? (
              <button
                onClick={activateAR}
                className="px-7 py-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center gap-3 font-medium shadow-lg shadow-blue-900/20 text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                </svg>
                View in AR Camera
              </button>
            ) : (
              <button
                onClick={() => {
                  alert("AR mode works best on mobile devices with AR capabilities. Please open this page on your mobile device.");
                }}
                className="px-7 py-4 bg-gray-800 rounded-lg text-gray-300 flex items-center gap-3 font-medium shadow-md text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                </svg>
                AR Mode (Mobile Only)
              </button>
            )}
            
            <button
              onClick={takeScreenshot}
              className="px-7 py-4 bg-purple-700 rounded-lg hover:bg-purple-800 transition-all duration-300 flex items-center gap-3 font-medium shadow-lg shadow-purple-900/20 text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Take Screenshot
            </button>
            
            <button
              onClick={() => {
                if (modelViewerRef.current) {
                  modelViewerRef.current.autoRotate = !modelViewerRef.current.autoRotate;
                }
              }}
              className="px-7 py-4 bg-gray-900 rounded-lg hover:bg-gray-800 transition-all duration-300 flex items-center gap-3 font-medium border border-gray-700 shadow-md text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              Toggle Rotation
            </button>
          </div>
          
          {isMobile && (
            <div className="mt-10 p-7 bg-blue-900/20 rounded-xl border border-blue-800/70 text-base max-w-2xl mx-auto w-full backdrop-blur-sm shadow-xl">
              <p className="font-medium mb-4 text-blue-300 flex items-center gap-2 text-lg">
                <span>📱</span> AR Mode Instructions:
              </p>
              <ol className="list-decimal pl-7 space-y-2.5 text-gray-300">
                <li>Click "View in AR Camera" to activate AR mode</li>
                <li>Point your camera at a flat surface</li>
                <li>Tap the screen to place the 3D model</li>
                <li>Use pinch gestures to resize the model</li>
                <li>Take pictures using your device's camera button</li>
              </ol>
            </div>
          )}
        </div>
      )}
      
      <footer className="mt-auto pt-12 pb-4 text-center">
        <p className="text-gray-500 text-sm">© 2025 AR Model Viewer | Enhance your reality</p>
      </footer>
    </div>
  );
}

export default App;