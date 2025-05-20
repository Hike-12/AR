import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  Menu,
  X,
  Hand,
  HandMetal,
  Camera,
  Repeat,
  HelpCircle,
} from 'lucide-react';

const models = [
  { name: 'Bear', path: '/bear/scene.gltf' },
  { name: 'Elk', path: '/elk/scene.gltf' },
  { name: 'Owl', path: '/owl/scene.gltf' },
  { name: 'Panther', path: '/panther/scene.gltf' },
  { name: 'Horse', path: '/horse/scene.gltf' },
];

export default function AUGMINT() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const controlsRef = useRef();
  const streamRef = useRef();
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [renderer, setRenderer] = useState(null);
  const modelGroupRef = useRef();
  const sceneRef = useRef();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [showToast, setShowToast] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [modelControlsActive, setModelControlsActive] = useState(false);
  
  // Setup camera stream
  useEffect(() => {
    async function setupCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const constraints = { 
          video: { facingMode: facingMode } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    }

    setupCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle model controls
  const toggleModelControls = () => {
    const newState = !modelControlsActive;
    setModelControlsActive(newState);
    
    if (renderer && controlsRef.current) {
      renderer.domElement.style.pointerEvents = newState ? 'auto' : 'none';
      controlsRef.current.enabled = newState;
    }
  };

  // Setup Three.js scene
  useEffect(() => {
    let scene, camera, rendererLocal, controls, loader;
    let modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    
    const init = () => {
      // Create scene
      scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Set up camera
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 2;

      // Set up renderer
      rendererLocal = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
      });
      rendererLocal.setSize(window.innerWidth, window.innerHeight);
      rendererLocal.setClearColor(0x000000, 0);

      // Clear and set up canvas
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        rendererLocal.domElement.style.position = 'absolute';
        rendererLocal.domElement.style.inset = '0';
        rendererLocal.domElement.style.width = '100%';
        rendererLocal.domElement.style.height = '100%';
        rendererLocal.domElement.style.pointerEvents = 'none'; // Default: can't interact
        canvasRef.current.appendChild(rendererLocal.domElement);
      }

      setRenderer(rendererLocal);

      // Configure orbit controls with strong boundaries
      controls = new OrbitControls(camera, rendererLocal.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      
      // Strict constraints to keep model in view
      controls.minDistance = 0.5; 
      controls.maxDistance = 3;
      controls.maxPolarAngle = Math.PI * 0.7; // Don't go too far below
      controls.minPolarAngle = Math.PI * 0.2; // Don't go too far above
      
      // Limit panning to keep model centered
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.7;
      
      // Restrict rotation to prevent disorientation
      controls.minAzimuthAngle = -Math.PI / 2;
      controls.maxAzimuthAngle = Math.PI / 2;

      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
      
      // Disabled by default - will be enabled by button
      controls.enabled = false;
      controlsRef.current = controls;

      // Add lights for better model visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(1, 10, 5);
      scene.add(directionalLight);
      
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-1, -1, 2);
      scene.add(fillLight);

      // Set up GLTF loader
      loader = new GLTFLoader();
      loadModel(selectedModel.path);

      // Handle window resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        rendererLocal.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        
        // Add slight rotation to model when not actively controlled
        if (!modelControlsActive && modelGroup) {
          modelGroup.rotation.y += 0.002;
        }
        
        rendererLocal.render(scene, camera);
      };

      animate();
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const loadModel = (path) => {
      loader.load(
        path,
        (gltf) => {
          modelGroup.clear();
          
          // Auto-center and scale the model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Center model properly
          gltf.scene.position.x -= center.x;
          gltf.scene.position.y -= center.y;
          gltf.scene.position.z -= center.z;
          
          // Scale model to reasonable size
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;
          gltf.scene.scale.set(scale, scale, scale);
          
          modelGroup.add(gltf.scene);
          scene.add(modelGroup);
          
          // Reset camera position to frame model nicely
          camera.position.z = 2;
          
          // Reset model controls when loading a new model
          setModelControlsActive(false);
          if (renderer) {
            renderer.domElement.style.pointerEvents = 'none';
          }
          if (controlsRef.current) {
            controlsRef.current.enabled = false;
            controlsRef.current.reset();
          }
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
        }
      );
    };

    init();

    return () => {
      rendererLocal && rendererLocal.dispose();
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
      }
    };
  }, [selectedModel]);

  // Toggle camera facing mode (front/back)
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture photo function
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoRef.current.videoWidth;
    captureCanvas.height = videoRef.current.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    if (renderer) {
      ctx.drawImage(renderer.domElement, 0, 0, captureCanvas.width, captureCanvas.height);
    }
    
    const link = document.createElement('a');
    link.download = `AUGMINT_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = captureCanvas.toDataURL('image/png');
    link.click();
  };

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

 return (
  <div className="flex h-screen w-full bg-neutral-950 text-gray-100 overflow-hidden">
    {/* Sidebar (model selector) */}
    <div 
      className={`h-full w-72 bg-neutral-900 border-r border-blue-900 shadow-lg z-10 transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
        <span className="text-lg font-bold text-blue-400">Select Model</span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-2xl text-blue-300 hover:text-blue-500 transition"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>
      <div className="p-5 space-y-3 flex flex-col">
        {models.map((m) => (
          <button
            key={m.name}
            onClick={() => {
              setSelectedModel(m);
              setSidebarOpen(false);
              setModelControlsActive(false);
              if (renderer && controlsRef.current) {
                renderer.domElement.style.pointerEvents = 'none';
                controlsRef.current.enabled = false;
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
              selectedModel.name === m.name
                ? 'bg-blue-600 text-white shadow'
                : 'bg-neutral-800 hover:bg-blue-800 text-blue-200'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>

    {/* Main content area */}
    <div className="flex flex-col w-full h-full relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-neutral-900/95 to-neutral-900/60 shadow-lg z-10">
        {/* App name */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-blue-700 hover:bg-blue-600 p-2 rounded-lg text-white transition"
            aria-label="Toggle model selector"
          >
            <Menu size={22} />
          </button>
          <span className="text-2xl font-extrabold tracking-tight text-blue-400">AUGMINT</span>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleModelControls}
            className={`px-4 py-2 rounded-lg font-semibold transition-all shadow ${
              modelControlsActive
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-blue-200'
            } flex items-center gap-2`}
          >
            {modelControlsActive ? (
              <>
                <HandMetal size={18} /> Exit 3D
              </>
            ) : (
              <>
                <Hand size={18} /> Control Model
              </>
            )}
          </button>
          <button
            onClick={toggleCameraFacing}
            className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-lg text-blue-300 transition"
            aria-label="Switch camera"
          >
            <Repeat size={20} />
          </button>
          <button
            onClick={capturePhoto}
            className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-lg text-blue-300 transition"
            aria-label="Take photo"
          >
            <Camera size={20} />
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="bg-neutral-800 hover:bg-neutral-700 p-3 rounded-lg text-blue-300 transition"
            aria-label="Help"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-grow overflow-hidden">
        {/* Video background */}
        <video
          ref={videoRef}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover z-0"
          playsInline
          muted
        />

        {/* 3D canvas */}
        <div ref={canvasRef} className="absolute inset-0 w-full h-full z-5" />

        {/* Model controls active indicator */}
        {modelControlsActive && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-700 px-4 py-2 rounded-lg text-white text-sm z-10 pointer-events-none shadow-lg border border-blue-400">
            3D Controls Active
          </div>
        )}

        {/* Toast notification */}
        {showToast && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 bg-opacity-95 text-white px-6 py-3 rounded-xl z-10 pointer-events-none shadow-lg border border-blue-900">
            <div className="text-center">
              <p>Welcome to <span className="text-blue-400 font-bold">AUGMINT</span>! Click "Control Model" to interact.</p>
              <p className="text-sm text-blue-200 mt-1">Tap the ❓ button for help</p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Sidebar overlay - only shown when sidebar is open on small screens */}
    {sidebarOpen && (
      <div
        className="md:hidden absolute inset-0 bg-black/40 z-5"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close sidebar overlay"
      />
    )}

    {/* Help modal */}
    {showHelp && (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
        <div className="bg-neutral-900 p-6 rounded-xl max-w-md w-full shadow-2xl border border-blue-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-400">AUGMINT Controls</h3>
            <button
              onClick={() => setShowHelp(false)}
              className="text-blue-300 hover:text-blue-500 text-2xl transition"
            >
              <X size={28} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold mb-1 text-blue-400">Model Controls:</h4>
              <ul className="ml-4 space-y-1 text-blue-100">
                <li>• Click <strong>"Control Model"</strong> to interact with the 3D model</li>
                <li>• <strong>One finger/Left mouse</strong>: Rotate model</li>
                <li>• <strong>Two fingers pinch/Mouse wheel</strong>: Zoom in/out</li>
                <li>• <strong>Two fingers pan/Right mouse</strong>: Move model</li>
                <li>• Click <strong>"Exit 3D Mode"</strong> to return to normal scrolling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-1 text-blue-400">Camera Controls:</h4>
              <ul className="ml-4 space-y-1 text-blue-100">
                <li>• <strong>Camera switch</strong>: Toggle front/back camera</li>
                <li>• <strong>Camera button</strong>: Take and save a photo</li>
                <li>• <strong>Menu button</strong>: Open/close model selector</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}