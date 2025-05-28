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
  { name: 'Tank', path: '/tank/scene.gltf' },
  { name: 'Skull', path: '/skull/scene.gltf' },
  { name: 'Skeleton', path: '/skeleton/scene.gltf' },
  // { name: 'Dog', path: '/dog/scene.gltf' },
  // { name: 'Bike', path: '/bike/scene.gltf' },
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
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false
  });
  
  // Detect screen size for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        isMobile: window.innerWidth < 640,
        isTablet: window.innerWidth >= 640 && window.innerWidth < 1024
      });
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Setup camera stream
  useEffect(() => {
    async function setupCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const constraints = { 
          video: { 
            facingMode: facingMode,
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight }
          } 
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
      
      // Set up camera with responsive aspect ratio
      camera = new THREE.PerspectiveCamera(
        65, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
      );
      camera.position.z = screenSize.isMobile ? 2.5 : 2; // Further away on mobile

      // Set up renderer
      rendererLocal = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance", // Add this
        failIfMajorPerformanceCaveat: false  // Add this
      });
      rendererLocal.setSize(window.innerWidth, window.innerHeight);
      rendererLocal.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererLocal.setClearColor(0x000000, 0);

      // Add these lines to prevent texture warnings
      rendererLocal.outputColorSpace = THREE.SRGBColorSpace; // Add this
      rendererLocal.toneMapping = THREE.ACESFilmicToneMapping; // Add this
      rendererLocal.toneMappingExposure = 1; // Add this

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

      // Configure orbit controls with responsive settings
      controls = new OrbitControls(camera, rendererLocal.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      
      // Adjust control sensitivity based on device
      controls.rotateSpeed = screenSize.isMobile ? 0.7 : 1;
      controls.zoomSpeed = screenSize.isMobile ? 0.8 : 1;
      controls.panSpeed = screenSize.isMobile ? 0.5 : 0.7;
      
      // Strict constraints to keep model in view
      controls.minDistance = screenSize.isMobile ? 0.7 : 0.5; 
      controls.maxDistance = screenSize.isMobile ? 4 : 3;
      controls.maxPolarAngle = Math.PI * 0.7; // Don't go too far below
      controls.minPolarAngle = Math.PI * 0.2; // Don't go too far above
      
      // Limit panning to keep model centered
      // controls.screenSpacePanning = true;

      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };

      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN // Right mouse button for panning
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
      
      // Create a wrapper group for better control
      const wrapper = new THREE.Group();
      
      // Auto-center and scale the model
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // More aggressive centering - move to origin first
      gltf.scene.position.set(-center.x, -center.y, -center.z);
      
      // Scale model to reasonable size with responsive adjustments
      const maxDim = Math.max(size.x, size.y, size.z);
      const baseScale = maxDim > 0 ? 1.2 / maxDim : 1; // Increased from 1 to 1.2 for better visibility
      const scaleFactor = screenSize.isMobile ? 0.85 : 1; // Slightly smaller on mobile
      const scale = baseScale * scaleFactor;
      
      gltf.scene.scale.set(scale, scale, scale);
      
      // Add the scene to wrapper, then wrapper to modelGroup
      wrapper.add(gltf.scene);
      
      // Force the wrapper to be at world origin
      wrapper.position.set(0, 0, 0);
      wrapper.rotation.set(0, 0, 0);
      
      modelGroup.add(wrapper);
      scene.add(modelGroup);
      
      // Force modelGroup to center of world
      modelGroup.position.set(0, 0, 0);
      
      // Reset camera position to frame model nicely
      camera.position.set(0, 0, screenSize.isMobile ? 2.5 : 2);
      camera.lookAt(0, 0, 0);
      
      // Reset model controls when loading a new model
      setModelControlsActive(false);
      if (renderer) {
        renderer.domElement.style.pointerEvents = 'none';
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        controlsRef.current.reset();
        controlsRef.current.target.set(0, 0, 0); // Force controls to look at center
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
  }, [selectedModel, screenSize]);

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

  // Close sidebar when user clicks outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && screenSize.isMobile && 
          !e.target.closest('.sidebar') && 
          !e.target.closest('.sidebar-toggle')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [sidebarOpen, screenSize.isMobile]);

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-gray-100 overflow-hidden">
      {/* Sidebar (model selector) */}
      <div
        className={`sidebar fixed top-0 left-0 h-full bg-neutral-900 border-r border-blue-900 shadow-lg z-30 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${screenSize.isMobile ? 'w-64' : 'w-72'}`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <span className={`font-bold text-blue-400 ${screenSize.isMobile ? 'text-base' : 'text-lg'}`}>Select Model</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-blue-300 hover:text-blue-500 transition"
            aria-label="Close sidebar"
          >
            <X size={screenSize.isMobile ? 20 : 24} />
          </button>
        </div>
        <div className="p-4 space-y-2 flex flex-col">
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
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                selectedModel.name === m.name
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-neutral-800 hover:bg-blue-800 text-blue-200'
              } ${screenSize.isMobile ? 'text-sm' : 'text-base'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-full h-full relative">
        {/* Top bar */}
        <div className={`flex items-center justify-between px-2 sm:px-4 py-2 bg-gradient-to-b from-neutral-900/95 to-neutral-900/60 shadow-lg z-10 ${screenSize.isMobile ? 'flex-wrap gap-1' : ''}`}>
          {/* App name */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle bg-blue-700 hover:bg-blue-600 p-1.5 sm:p-2 rounded-lg text-white transition"
              aria-label="Toggle model selector"
            >
              <Menu size={screenSize.isMobile ? 18 : 22} />
            </button>
            <span className={`font-extrabold tracking-tight text-blue-400 ${screenSize.isMobile ? 'text-xl' : 'text-2xl'}`}>AUGMINT</span>
          </div>
          
          {/* Controls - use flexbox to wrap on mobile */}
          <div className={`flex items-center gap-1 sm:gap-2 ${screenSize.isMobile ? 'flex-wrap justify-end' : ''}`}>
            <button
              onClick={toggleModelControls}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-all shadow ${
                modelControlsActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-blue-200'
              } flex items-center gap-1 sm:gap-2 ${screenSize.isMobile ? 'text-xs' : 'text-sm'}`}
            >
              {modelControlsActive ? (
                <>
                  <HandMetal size={screenSize.isMobile ? 14 : 18} />
                  {screenSize.isMobile ? 'Exit' : 'Exit 3D'}
                </>
              ) : (
                <>
                  <Hand size={screenSize.isMobile ? 14 : 18} />
                  {screenSize.isMobile ? '3D' : 'Control Model'}
                </>
              )}
            </button>
            <button
              onClick={toggleCameraFacing}
              className="bg-neutral-800 hover:bg-neutral-700 p-2 sm:p-3 rounded-lg text-blue-300 transition"
              aria-label="Switch camera"
            >
              <Repeat size={screenSize.isMobile ? 16 : 20} />
            </button>
            <button
              onClick={capturePhoto}
              className="bg-neutral-800 hover:bg-neutral-700 p-2 sm:p-3 rounded-lg text-blue-300 transition"
              aria-label="Take photo"
            >
              <Camera size={screenSize.isMobile ? 16 : 20} />
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="bg-neutral-800 hover:bg-neutral-700 p-2 sm:p-3 rounded-lg text-blue-300 transition"
              aria-label="Help"
            >
              <HelpCircle size={screenSize.isMobile ? 16 : 20} />
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
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white shadow-lg border border-blue-400 z-10 pointer-events-none ${screenSize.isMobile ? 'text-xs' : 'text-sm'}`}>
              3D Controls Active
            </div>
          )}

          {/* Toast notification - responsive sizing */}
          {showToast && (
            <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 bg-opacity-95 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl z-10 pointer-events-none shadow-lg border border-blue-900 max-w-xs sm:max-w-md text-center ${screenSize.isMobile ? 'w-11/12' : ''}`}>
              <div className="flex flex-col items-center">
                <p className={screenSize.isMobile ? 'text-sm' : 'text-base'}>
                  Welcome to <span className="text-blue-400 font-bold">AUGMINT</span>! Click "
                  {screenSize.isMobile ? '3D' : 'Control Model'}" to interact.
                </p>
                <p className={`text-blue-200 mt-1 ${screenSize.isMobile ? 'text-xs' : 'text-sm'}`}>
                  Tap the ❓ button for help
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar overlay - only shown when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Help modal - responsive */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-3 sm:p-4">
          <div className={`bg-neutral-900 p-4 sm:p-6 rounded-xl w-full shadow-2xl border border-blue-900 ${screenSize.isMobile ? 'max-w-xs' : 'max-w-md'}`}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className={`font-bold text-blue-400 ${screenSize.isMobile ? 'text-lg' : 'text-xl'}`}>AUGMINT Controls</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-blue-300 hover:text-blue-500 transition"
              >
                <X size={screenSize.isMobile ? 20 : 28} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="font-bold mb-1 text-blue-400">Models:</h4>
                <ul>
                  <li className={`ml-3 sm:ml-4 text-blue-100 ${screenSize.isMobile ? 'text-sm' : 'text-base'}`}>• Click on the top left sidebar for more models</li>
                </ul>
                <h4 className="font-bold mb-1 text-blue-400 mt-2">Model Controls:</h4>
                <ul className={`ml-3 sm:ml-4 space-y-0.5 sm:space-y-1 text-blue-100 ${screenSize.isMobile ? 'text-sm' : 'text-base'}`}>
                  <li>• Click <strong>{screenSize.isMobile ? '"3D"' : '"Control Model"'}</strong> to interact with the 3D model</li>
                  <li>• <strong>One finger/Left mouse</strong>: Rotate model</li>
                  <li>• <strong>Two fingers pinch/Mouse wheel</strong>: Zoom in/out</li>
                  <li>• <strong>Two fingers pan/Right mouse</strong>: Move model</li>
                  <li>• Click <strong>{screenSize.isMobile ? '"Exit"' : '"Exit 3D Mode"'}</strong> to return to normal scrolling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-1 text-blue-400">Camera Controls:</h4>
                <ul className={`ml-3 sm:ml-4 space-y-0.5 sm:space-y-1 text-blue-100 ${screenSize.isMobile ? 'text-sm' : 'text-base'}`}>
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