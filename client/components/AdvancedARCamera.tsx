import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Sparkles, Crown, Glasses, Heart, Loader } from "lucide-react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera as MediaPipeCamera } from "@mediapipe/camera_utils";
import * as THREE from "three";

interface AdvancedARCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

type FilterType = 
  | "none" 
  | "dog" 
  | "cat" 
  | "glasses3d" 
  | "crown3d" 
  | "bighead" 
  | "sparkles" 
  | "confetti"
  | "vintage";

/**
 * Advanced AR Camera Component with MediaPipe Face Mesh
 * Supports Snapchat-type 3D filters
 */
export default function AdvancedARCamera({ onCapture, onClose }: AdvancedARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const mediaPipeCameraRef = useRef<MediaPipeCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const filterMeshRef = useRef<THREE.Group | null>(null);
  
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  // Available filters
  const filters: { id: FilterType; name: string; icon: React.ReactNode }[] = [
    { id: "none", name: "None", icon: <X className="h-5 w-5" /> },
    { id: "dog", name: "Dog", icon: <Sparkles className="h-5 w-5" /> },
    { id: "cat", name: "Cat", icon: <Sparkles className="h-5 w-5" /> },
    { id: "glasses3d", name: "3D Glasses", icon: <Glasses className="h-5 w-5" /> },
    { id: "crown3d", name: "3D Crown", icon: <Crown className="h-5 w-5" /> },
    { id: "bighead", name: "Big Head", icon: <Heart className="h-5 w-5" /> },
    { id: "sparkles", name: "Sparkles", icon: <Sparkles className="h-5 w-5" /> },
    { id: "confetti", name: "Confetti", icon: <Sparkles className="h-5 w-5" /> },
    { id: "vintage", name: "Vintage", icon: <Sparkles className="h-5 w-5" /> },
  ];

  // Initialize MediaPipe Face Mesh
  useEffect(() => {
    const initializeFaceMesh = async () => {
      try {
        setIsLoading(true);
        setError("");

        const faceMesh = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            setFaceDetected(true);
            const landmarks = results.multiFaceLandmarks[0];
            updateFilterPosition(landmarks);
            
            // Debug: log first few landmarks
            if (landmarks.length > 0) {
              console.log("🎯 Face detected:", {
                landmarksCount: landmarks.length,
                noseTip: landmarks[4],
                leftEye: landmarks[33],
                rightEye: landmarks[263]
              });
            }
          } else {
            setFaceDetected(false);
          }
        });

        faceMeshRef.current = faceMesh;

        // Initialize Three.js scene
        if (containerRef.current && canvasRef.current) {
          const scene = new THREE.Scene();
          
          // Match video aspect ratio and perspective
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          const aspect = width / height;
          
          // Use orthographic camera for 2D-like overlay, or perspective with correct FOV
          const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
          camera.position.set(0, 0, 1); // Position camera to view filters at z=0

          const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true, // Important for capture
          });
          renderer.setSize(width, height);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
          renderer.setClearColor(0x000000, 0); // Transparent background

          sceneRef.current = scene;
          cameraRef.current = camera;
          rendererRef.current = renderer;

          // Add lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
          scene.add(ambientLight);
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(0, 0, 5);
          scene.add(directionalLight);
          
          console.log("✅ Three.js scene initialized");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize MediaPipe:", err);
        setError("Failed to initialize AR filters. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initializeFaceMesh();

    return () => {
      if (mediaPipeCameraRef.current) {
        mediaPipeCameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Start camera when ready
  useEffect(() => {
    if (!isLoading && faceMeshRef.current && videoRef.current) {
      startCamera();
    }
  }, [isLoading]);

  // Update filter when selection changes
  useEffect(() => {
    if (selectedFilter !== "none" && sceneRef.current) {
      createFilter(selectedFilter);
    } else if (filterMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(filterMeshRef.current);
      filterMeshRef.current = null;
    }
  }, [selectedFilter]);

  const startCamera = async () => {
    try {
      if (!videoRef.current || !faceMeshRef.current) return;

      const camera = new MediaPipeCamera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      await camera.start();
      mediaPipeCameraRef.current = camera;

      // Start Three.js render loop
      animate();
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const animate = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Update camera aspect if container size changed
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const updateFilterPosition = (landmarks: any[]) => {
    if (!filterMeshRef.current || !cameraRef.current || !containerRef.current) return;

    // MediaPipe landmarks are normalized (0-1) with origin at top-left
    // We need to convert to Three.js coordinate system (center origin, y-up)
    if (landmarks && landmarks.length >= 10) {
      // Use nose tip (landmark 4) or face center for positioning
      const noseTip = landmarks[4] || landmarks[10] || { x: 0.5, y: 0.5, z: 0 };
      
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Convert normalized coordinates to screen space, then to Three.js space
      // MediaPipe: (0,0) = top-left, (1,1) = bottom-right
      // Three.js: center origin, y-up
      const x = (noseTip.x - 0.5) * 2; // -1 to 1
      const y = (0.5 - noseTip.y) * 2; // -1 to 1 (flip Y)
      const z = (noseTip.z || 0) * 0.5; // Scale Z appropriately
      
      // Scale based on face size (use distance between eyes as reference)
      if (landmarks.length >= 468) {
        const leftEye = landmarks[33] || { x: 0.4, y: 0.4 };
        const rightEye = landmarks[263] || { x: 0.6, y: 0.4 };
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const scale = Math.max(0.5, Math.min(2.0, eyeDistance * 3)); // Scale between 0.5 and 2.0
        filterMeshRef.current.scale.set(scale, scale, scale);
      }

      filterMeshRef.current.position.set(x, y, z);
      
      // Rotate filter to face camera (optional - can be improved with face rotation)
      filterMeshRef.current.rotation.set(0, 0, 0);
    }
  };

  const createFilter = (filterType: FilterType) => {
    if (!sceneRef.current) return;

    // Remove existing filter
    if (filterMeshRef.current) {
      sceneRef.current.remove(filterMeshRef.current);
    }

    const filterGroup = new THREE.Group();

    switch (filterType) {
      case "dog":
        // Dog face mask - larger and more visible
        const dogGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const dogMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xffa500,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        const dogMesh = new THREE.Mesh(dogGeometry, dogMaterial);
        dogMesh.position.z = 0.1;
        filterGroup.add(dogMesh);
        
        // Add ears
        const ear1 = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0xff8c00 })
        );
        ear1.position.set(-0.4, 0.5, 0);
        filterGroup.add(ear1);
        
        const ear2 = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0xff8c00 })
        );
        ear2.position.set(0.4, 0.5, 0);
        filterGroup.add(ear2);
        break;

      case "cat":
        // Cat face mask - larger and more visible
        const catGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const catMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xff69b4,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        const catMesh = new THREE.Mesh(catGeometry, catMaterial);
        catMesh.position.z = 0.1;
        filterGroup.add(catMesh);
        
        // Add cat ears
        const catEar1 = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0xff1493 })
        );
        catEar1.position.set(-0.3, 0.5, 0);
        catEar1.rotation.z = -0.3;
        filterGroup.add(catEar1);
        
        const catEar2 = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0xff1493 })
        );
        catEar2.position.set(0.3, 0.5, 0);
        catEar2.rotation.z = 0.3;
        filterGroup.add(catEar2);
        break;

      case "glasses3d":
        // 3D Glasses - larger and more visible
        const glassesGroup = new THREE.Group();
        
        // Left lens - bigger
        const leftLens = new THREE.Mesh(
          new THREE.CircleGeometry(0.3, 32),
          new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a, 
            transparent: true, 
            opacity: 0.7,
            side: THREE.DoubleSide
          })
        );
        leftLens.position.set(-0.35, 0, 0.05);
        glassesGroup.add(leftLens);

        // Right lens - bigger
        const rightLens = new THREE.Mesh(
          new THREE.CircleGeometry(0.3, 32),
          new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a, 
            transparent: true, 
            opacity: 0.7,
            side: THREE.DoubleSide
          })
        );
        rightLens.position.set(0.35, 0, 0.05);
        glassesGroup.add(rightLens);

        // Bridge - thicker
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.08, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        bridge.position.set(0, 0, 0.05);
        glassesGroup.add(bridge);

        // Temples
        const leftTemple = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        leftTemple.position.set(-0.6, 0, 0.05);
        glassesGroup.add(leftTemple);

        const rightTemple = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        rightTemple.position.set(0.6, 0, 0.05);
        glassesGroup.add(rightTemple);

        filterGroup.add(glassesGroup);
        break;

      case "crown3d":
        // 3D Crown - larger and more visible
        const crownGroup = new THREE.Group();
        
        // Base - bigger
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.7, 0.15, 32),
          new THREE.MeshStandardMaterial({ 
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2
          })
        );
        base.position.y = 0.4;
        crownGroup.add(base);

        // Points - bigger and more
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2;
          const point = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.3, 8),
            new THREE.MeshStandardMaterial({ 
              color: 0xffd700,
              metalness: 0.8,
              roughness: 0.2
            })
          );
          point.position.set(
            Math.cos(angle) * 0.6,
            0.55,
            Math.sin(angle) * 0.6
          );
          crownGroup.add(point);
        }

        // Add gem in center
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.15, 0),
          new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.9,
            roughness: 0.1
          })
        );
        gem.position.y = 0.6;
        crownGroup.add(gem);

        filterGroup.add(crownGroup);
        break;

      case "bighead":
        // Big head effect - larger wireframe
        const headGeometry = new THREE.SphereGeometry(1.0, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          wireframe: true,
          side: THREE.DoubleSide
        });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        filterGroup.add(headMesh);
        filterGroup.scale.set(1.8, 1.8, 1.8);
        break;

      case "sparkles":
        // Animated sparkles - larger and brighter
        for (let i = 0; i < 30; i++) {
          const sparkle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshStandardMaterial({ 
              color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
              transparent: true,
              opacity: 0.9,
              emissive: new THREE.Color().setHSL(Math.random(), 1, 0.5),
              emissiveIntensity: 0.5
            })
          );
          sparkle.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1
          );
          filterGroup.add(sparkle);
        }
        break;

      case "confetti":
        // Confetti particles - larger and more colorful
        for (let i = 0; i < 50; i++) {
          const confetti = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ 
              color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
              transparent: true,
              opacity: 0.9
            })
          );
          confetti.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2
          );
          confetti.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );
          filterGroup.add(confetti);
        }
        break;
    }

    sceneRef.current.add(filterGroup);
    filterMeshRef.current = filterGroup;
    
    console.log("✅ Filter created:", filterType, {
      position: filterGroup.position,
      scale: filterGroup.scale,
      children: filterGroup.children.length
    });
  };

  const handleCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;

    setIsProcessing(true);
    try {
      // Create a temporary canvas to composite video + 3D filter
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoRef.current.videoWidth || 1280;
      tempCanvas.height = videoRef.current.videoHeight || 720;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        // Draw video frame
        ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);

        // Draw 3D canvas on top (if filter is active)
        if (selectedFilter !== "none" && canvasRef.current) {
          ctx.drawImage(canvasRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
        }

        const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.9);
        onCapture(dataUrl);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture image");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto"></div>
          <p className="text-white">Loading AR filters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm z-10">
        <h2 className="text-xl font-bold text-white">AR Filters</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Face detection indicator */}
        {faceDetected && (
          <div className="absolute top-4 left-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
            Face detected
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-black/80 backdrop-blur-sm p-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-sm text-white/80">AR Filters</span>
        </div>
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
          {filters.map((filter) => {
            const isSelected = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
                className={`whitespace-nowrap text-sm font-medium transition-colors rounded-md px-3 min-w-[60px] h-14 flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? "bg-gradient-to-r from-neon-purple to-neon-pink text-white border-0"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                }`}
              >
                {filter.icon}
                <span className="text-xs">{filter.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handleCapture}
            disabled={isProcessing}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
