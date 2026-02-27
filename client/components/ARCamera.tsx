import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Sparkles, Crown, Glasses, Heart } from "lucide-react";
import * as faceapi from "face-api.js";

interface ARCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

type StickerType = "none" | "glasses" | "crown" | "sparkles" | "blush";

interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
}

/**
 * AR Camera Component with Face Tracking Stickers
 * Uses face-api.js for real-time face detection
 * Stickers move with detected faces
 * Mobile optimized
 */
export default function ARCamera({ onCapture, onClose }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const modelsLoadedRef = useRef(false);
  
  const [selectedSticker, setSelectedSticker] = useState<StickerType>("none");
  const [showStickerPanel, setShowStickerPanel] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [error, setError] = useState("");
  const [detectedFaces, setDetectedFaces] = useState<FaceDetection[]>([]);

  // Available stickers
  const stickers: { id: StickerType; name: string; icon: React.ReactNode }[] = [
    { id: "none", name: "None", icon: <X className="h-5 w-5" /> },
    { id: "glasses", name: "Glasses", icon: <Glasses className="h-5 w-5" /> },
    { id: "crown", name: "Crown", icon: <Crown className="h-5 w-5" /> },
    { id: "sparkles", name: "Sparkles", icon: <Sparkles className="h-5 w-5" /> },
    { id: "blush", name: "Blush", icon: <Heart className="h-5 w-5" /> },
  ];

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        // Try local models first, fallback to GitHub raw content
        const MODEL_URL = "/models";
        const GITHUB_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
        
        try {
          // Try loading from local public/models first
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          ]);
          console.log("✅ Loaded face-api models from local storage");
        } catch (localError) {
          console.warn("Local models not found, using GitHub CDN:", localError);
          // Fallback to GitHub raw content (more reliable than jsdelivr)
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(GITHUB_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(GITHUB_URL),
          ]);
          console.log("✅ Loaded face-api models from GitHub CDN");
        }
        
        modelsLoadedRef.current = true;
        setIsLoadingModels(false);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        setError("Failed to load face detection models. Please download models or check your internet connection.");
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, []);

  // Start camera
  useEffect(() => {
    if (modelsLoadedRef.current) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [modelsLoadedRef.current]);

  // Face detection and sticker rendering loop
  useEffect(() => {
    if (videoRef.current && canvasRef.current && streamRef.current && modelsLoadedRef.current) {
      startDetectionLoop();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedSticker, modelsLoadedRef.current]);

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Front camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startDetectionLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size to match video display size (not video element size)
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateCanvasSize();

    const detectAndDraw = async () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !modelsLoadedRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectAndDraw);
        return;
      }

      // Update canvas size if needed (responsive)
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        console.log(`📐 Canvas resized to: ${displayWidth}x${displayHeight}`);
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Don't mirror the context - instead we'll mirror coordinates when needed
      // The video is mirrored with CSS, so we need to mirror our drawing coordinates
      
      // Set canvas background to transparent (for debugging, we can make it semi-transparent)
      // ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
      // ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Note: We don't draw video on canvas - video element handles that
      // Canvas is only for overlaying stickers

      // Detect faces - use video element dimensions for detection
      try {
        // Use lower threshold for better detection
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 416, 
            scoreThreshold: 0.3 
          }))
          .withFaceLandmarks();

        // Calculate scale factors for coordinate conversion
        const videoWidth = video.videoWidth || 1280;
        const videoHeight = video.videoHeight || 720;
        const scaleX = canvas.width / videoWidth;
        const scaleY = canvas.height / videoHeight;
        
        console.log(`📏 Scaling: Video ${videoWidth}x${videoHeight} -> Canvas ${canvas.width}x${canvas.height} (scale: ${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`);

        if (detections.length === 0) {
          setDetectedFaces([]);
          animationFrameRef.current = requestAnimationFrame(detectAndDraw);
          return;
        }

        // Debug: Log detection
        if (detections.length > 0 && selectedSticker !== "none") {
          console.log(`✅ Detected ${detections.length} face(s), drawing ${selectedSticker} sticker`);
        }

        // Update detected faces state and draw stickers
        const faces: FaceDetection[] = detections.map((detection) => {
          const landmarks = detection.landmarks;
          const leftEyePoints = landmarks?.getLeftEye() || [];
          const rightEyePoints = landmarks?.getRightEye() || [];
          const nosePoints = landmarks?.getNose() || [];
          const mouthPoints = landmarks?.getMouth() || [];

          // Calculate center points for each feature (in video coordinates)
          const leftEyeCenter = leftEyePoints.length > 0
            ? {
                x: leftEyePoints.reduce((sum, p) => sum + p.x, 0) / leftEyePoints.length,
                y: leftEyePoints.reduce((sum, p) => sum + p.y, 0) / leftEyePoints.length,
              }
            : { x: 0, y: 0 };

          const rightEyeCenter = rightEyePoints.length > 0
            ? {
                x: rightEyePoints.reduce((sum, p) => sum + p.x, 0) / rightEyePoints.length,
                y: rightEyePoints.reduce((sum, p) => sum + p.y, 0) / rightEyePoints.length,
              }
            : { x: 0, y: 0 };

          const noseCenter = nosePoints.length > 0
            ? {
                x: nosePoints.reduce((sum, p) => sum + p.x, 0) / nosePoints.length,
                y: nosePoints.reduce((sum, p) => sum + p.y, 0) / nosePoints.length,
              }
            : { x: 0, y: 0 };

          const mouthCenter = mouthPoints.length > 0
            ? {
                x: mouthPoints.reduce((sum, p) => sum + p.x, 0) / mouthPoints.length,
                y: mouthPoints.reduce((sum, p) => sum + p.y, 0) / mouthPoints.length,
              }
            : { x: 0, y: 0 };

          // Convert box coordinates to canvas coordinates
          // Mirror X coordinates because video is mirrored with CSS transform
          const box = detection.detection.box;
          const scaledBox = {
            x: (videoWidth - box.x - box.width) * scaleX, // Mirror X
            y: box.y * scaleY,
            width: box.width * scaleX,
            height: box.height * scaleY,
          };

          // Convert landmark coordinates to canvas coordinates (mirror X)
          const scaledLandmarks = landmarks
            ? {
                leftEye: {
                  x: (videoWidth - leftEyeCenter.x) * scaleX, // Mirror X
                  y: leftEyeCenter.y * scaleY,
                },
                rightEye: {
                  x: (videoWidth - rightEyeCenter.x) * scaleX, // Mirror X
                  y: rightEyeCenter.y * scaleY,
                },
                nose: {
                  x: (videoWidth - noseCenter.x) * scaleX, // Mirror X
                  y: noseCenter.y * scaleY,
                },
                mouth: {
                  x: (videoWidth - mouthCenter.x) * scaleX, // Mirror X
                  y: mouthCenter.y * scaleY,
                },
              }
            : undefined;

          return {
            box: scaledBox,
            landmarks: scaledLandmarks,
          };
        });

        setDetectedFaces(faces);

        // Draw stickers on detected faces
        if (selectedSticker !== "none" && faces.length > 0) {
          console.log(`🎨 Drawing ${selectedSticker} on ${faces.length} face(s)`);
          faces.forEach((face, index) => {
            if (face.landmarks) {
              console.log(`  Face ${index + 1}:`, {
                box: face.box,
                leftEye: face.landmarks.leftEye,
                rightEye: face.landmarks.rightEye,
                nose: face.landmarks.nose,
              });
              
              // Draw a test circle first to verify canvas is working
              ctx.save();
              ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; // More opaque
              ctx.beginPath();
              const centerX = face.box.x + face.box.width / 2;
              const centerY = face.box.y + face.box.height / 2;
              ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
              ctx.fill();
              // Also draw a border
              ctx.strokeStyle = "#FF0000";
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.restore();
              console.log(`🔴 Test circle at: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
              
              drawSticker(ctx, face, selectedSticker);
            } else {
              console.warn(`  Face ${index + 1}: No landmarks available`);
            }
          });
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();
  };

  const drawSticker = (
    ctx: CanvasRenderingContext2D,
    face: FaceDetection,
    stickerType: StickerType
  ) => {
    if (!face.landmarks) {
      console.warn("Cannot draw sticker: no landmarks");
      return;
    }

    const { box, landmarks } = face;
    const { leftEye, rightEye, nose, mouth } = landmarks;

    // Validate coordinates
    if (!leftEye || !rightEye || !nose) {
      console.warn("Cannot draw sticker: missing required landmarks");
      return;
    }

    console.log(`Drawing ${stickerType} at:`, { 
      box, 
      leftEye, 
      rightEye, 
      nose,
      canvasSize: { width: ctx.canvas.width, height: ctx.canvas.height }
    });

    ctx.save();
    
    // Ensure we're drawing on top
    ctx.globalCompositeOperation = "source-over";
    
    // Verify coordinates are within canvas bounds
    if (box.x < 0 || box.y < 0 || box.x + box.width > ctx.canvas.width || box.y + box.height > ctx.canvas.height) {
      console.warn(`⚠️ Coordinates out of bounds! Box:`, box, `Canvas:`, ctx.canvas.width, 'x', ctx.canvas.height);
    }

    switch (stickerType) {
      case "glasses":
        // Draw glasses between eyes - MUCH LARGER AND MORE VISIBLE
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const eyeY = (leftEye.y + rightEye.y) / 2;
        const lensRadius = eyeDistance * 0.5; // Increased from 0.35

        // Make glasses VERY visible with thick black frames
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(8, box.width * 0.02); // Much thicker
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // More opaque

        // Left lens - larger
        ctx.beginPath();
        ctx.arc(leftEye.x, eyeY, lensRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right lens - larger
        ctx.beginPath();
        ctx.arc(rightEye.x, eyeY, lensRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bridge - thicker
        ctx.beginPath();
        ctx.moveTo(leftEye.x + lensRadius, eyeY);
        ctx.lineTo(rightEye.x - lensRadius, eyeY);
        ctx.lineWidth = Math.max(6, box.width * 0.015);
        ctx.stroke();
        break;

      case "crown":
        // Draw crown above head - MUCH LARGER
        const crownY = box.y - box.height * 0.3;
        const crownWidth = box.width * 1.5; // Increased
        const crownX = box.x + box.width / 2 - crownWidth / 2;
        const crownHeight = box.height * 0.25; // Increased

        // Make crown VERY visible with bright gold/yellow
        ctx.fillStyle = "#FFD700";
        ctx.strokeStyle = "#FF8C00";
        ctx.lineWidth = Math.max(5, box.width * 0.015); // Thicker

        // Crown base - larger
        ctx.fillRect(crownX, crownY, crownWidth, crownHeight);
        ctx.strokeRect(crownX, crownY, crownWidth, crownHeight);

        // Crown points - larger
        const pointCount = 5;
        const pointWidth = crownWidth / pointCount;
        for (let i = 0; i < pointCount; i++) {
          const x = crownX + i * pointWidth + pointWidth / 2;
          ctx.beginPath();
          ctx.moveTo(x, crownY);
          ctx.lineTo(x - pointWidth * 0.4, crownY - crownHeight * 0.8);
          ctx.lineTo(x + pointWidth * 0.4, crownY - crownHeight * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;

      case "sparkles":
        // Draw sparkles around face - MUCH LARGER AND BRIGHTER
        const sparkleCount = 15;
        const sparkleSize = Math.max(20, box.width * 0.04); // Much larger
        for (let i = 0; i < sparkleCount; i++) {
          const angle = (i / sparkleCount) * Math.PI * 2;
          const radius = box.width * 0.7;
          const x = box.x + box.width / 2 + Math.cos(angle) * radius;
          const y = box.y + box.height / 2 + Math.sin(angle) * radius;

          // VERY bright colored sparkle
          ctx.fillStyle = `hsl(${(i * 24) % 360}, 100%, 80%)`;
          ctx.beginPath();
          ctx.arc(x, y, sparkleSize, 0, Math.PI * 2);
          ctx.fill();

          // Thick white cross lines for sparkle effect
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = Math.max(5, box.width * 0.015);
          ctx.beginPath();
          ctx.moveTo(x - sparkleSize * 2, y);
          ctx.lineTo(x + sparkleSize * 2, y);
          ctx.moveTo(x, y - sparkleSize * 2);
          ctx.lineTo(x, y + sparkleSize * 2);
          ctx.stroke();
        }
        break;

      case "blush":
        // Draw blush on cheeks - MUCH LARGER AND MORE VISIBLE
        const cheekSize = box.width * 0.3; // Increased from 0.2
        const cheekY = nose.y + box.height * 0.2;
        const leftCheekX = leftEye.x - box.width * 0.3;
        const rightCheekX = rightEye.x + box.width * 0.3;

        // Left cheek - VERY vibrant pink
        const leftGradient = ctx.createRadialGradient(
          leftCheekX,
          cheekY,
          0,
          leftCheekX,
          cheekY,
          cheekSize
        );
        leftGradient.addColorStop(0, "rgba(255, 20, 147, 1.0)"); // Hot pink, fully opaque
        leftGradient.addColorStop(0.3, "rgba(255, 105, 180, 0.9)");
        leftGradient.addColorStop(0.6, "rgba(255, 192, 203, 0.7)");
        leftGradient.addColorStop(1, "rgba(255, 192, 203, 0)");
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.arc(leftCheekX, cheekY, cheekSize, 0, Math.PI * 2);
        ctx.fill();

        // Right cheek - VERY vibrant pink
        const rightGradient = ctx.createRadialGradient(
          rightCheekX,
          cheekY,
          0,
          rightCheekX,
          cheekY,
          cheekSize
        );
        rightGradient.addColorStop(0, "rgba(255, 20, 147, 1.0)"); // Hot pink, fully opaque
        rightGradient.addColorStop(0.3, "rgba(255, 105, 180, 0.9)");
        rightGradient.addColorStop(0.6, "rgba(255, 192, 203, 0.7)");
        rightGradient.addColorStop(1, "rgba(255, 192, 203, 0)");
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.arc(rightCheekX, cheekY, cheekSize, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  };

  const handleCapture = () => {
    if (!canvasRef.current) return;

    setIsProcessing(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      onCapture(dataUrl);
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture image");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingModels) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neon-purple border-t-transparent mx-auto"></div>
          <p className="text-white">Loading face detection models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm z-10">
        <h2 className="text-xl font-bold text-white">AR Camera</h2>
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
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror for selfie view
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ 
            zIndex: 10,
            transform: 'scaleX(-1)', // Mirror to match video
            backgroundColor: 'transparent'
          }}
        />
        
        {/* Face detection indicator */}
        {detectedFaces.length > 0 && (
          <div className="absolute top-4 left-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
            {detectedFaces.length} face{detectedFaces.length > 1 ? "s" : ""} detected
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Sticker Panel */}
      {showStickerPanel && (
        <div className="bg-black/80 backdrop-blur-sm p-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-sm text-white/80">Stickers</span>
          </div>
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
            {stickers.map((sticker) => {
              const isSelected = selectedSticker === sticker.id;
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedSticker(sticker.id);
                  }}
                  className={`whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-md px-3 min-w-[60px] h-14 flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-gradient-to-r from-neon-purple to-neon-pink text-white border-0 hover:from-neon-purple/90 hover:to-neon-pink/90"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  {sticker.icon}
                  <span className="text-xs">{sticker.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-4">
          {/* Toggle sticker panel */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowStickerPanel(!showStickerPanel)}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            {showStickerPanel ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </Button>

          {/* Capture button */}
          <Button
            onClick={handleCapture}
            disabled={isProcessing}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>

          {/* Close button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
