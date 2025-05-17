import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const models = [
  {
    id: 1,
    name: "Bear",
    folder: "/bear", // folder inside public with model.gltf + textures
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
  const modelViewerRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  function takeScreenshot() {
    if (!modelViewerRef.current) return;
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
              {/* You can add thumbnails if you have */}
              <img
                src={`${model.folder}/thumbnail.png`} // optional thumbnail if you have it
                alt={model.name}
                className="rounded"
                loading="lazy"
                onError={(e) => (e.currentTarget.style.display = "none")} // hide if no thumbnail
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
              src={`${selectedModel.folder}/${selectedModel.file}`}
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
