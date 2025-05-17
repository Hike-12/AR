import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const models = [
  {
    id: 1,
    name: "Fox",
    url: "https://cdn.spline.design/fox.glb", // replace with real URLs from Spline or free sources
  },
  {
    id: 2,
    name: "Rabbit",
    url: "https://cdn.spline.design/rabbit.glb",
  },
  {
    id: 3,
    name: "Bear",
    url: "https://cdn.spline.design/bear.glb",
  },
];

function App() {
  const [selectedModel, setSelectedModel] = useState(null);
  const modelViewerRef = useRef(null);

  // Check if mobile device for AR support
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  // Screenshot for desktop users
  function takeScreenshot() {
    if (!modelViewerRef.current) return;
    // Note: model-viewer doesn't provide screenshot API out of the box
    // You can capture the canvas or iframe in advanced way or just tell user to use OS screenshot shortcut
    alert(
      "To capture the model, please use your OS screenshot feature (e.g., PrintScreen or Cmd+Shift+4)."
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">AR Model Viewer</h1>

      {!selectedModel && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {models.map((model) => (
            <motion.div
              key={model.id}
              className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition"
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedModel(model)}
            >
              <p className="text-xl font-semibold mb-2">{model.name}</p>
              {/* You can add thumbnail here */}
              <img
                src={`https://modelviewer.dev/shared-assets/models/${model.name.toLowerCase()}.png`}
                alt={model.name}
                className="rounded"
                loading="lazy"
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selectedModel && (
          <motion.div
            key="model-viewer"
            className="mt-8 max-w-3xl mx-auto flex flex-col items-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <button
              className="self-start mb-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
              onClick={() => setSelectedModel(null)}
            >
              ← Back to list
            </button>

            <model-viewer
              ref={modelViewerRef}
              src={selectedModel.url}
              alt={selectedModel.name}
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate
              style={{ width: "100%", height: "500px", borderRadius: "12px" }}
            ></model-viewer>

            <div className="mt-4 flex gap-4">
              {isMobile ? (
                <button
                  onClick={() => {
                    alert(
                      "On mobile, tap the AR button inside the model-viewer to place the model and take pictures."
                    );
                  }}
                  className="px-6 py-3 bg-green-600 rounded hover:bg-green-700 transition"
                >
                  How to take AR photo
                </button>
              ) : (
                <button
                  onClick={takeScreenshot}
                  className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                  Take Screenshot
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
