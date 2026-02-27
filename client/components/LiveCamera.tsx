import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw } from "lucide-react";

interface LiveCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

type FilterType = "none" | "retro" | "vintage" | "bw" | "warm" | "cool";

/**
 * Live Camera Component with Real-Time Filters
 * Filter-first camera system with instant capture
 * Mobile optimized with lightweight Canvas filters
 */
export default function LiveCamera({ onCapture, onClose }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Available filters
  const filters: { id: FilterType; name: string; icon: string }[] = [
    { id: "none", name: "Original", icon: "📷" },
    { id: "retro", name: "Retro", icon: "🎞️" },
    { id: "vintage", name: "Vintage", icon: "📸" },
    { id: "bw", name: "B&W", icon: "⚫" },
    { id: "warm", name: "Warm", icon: "🔥" },
    { id: "cool", name: "Cool", icon: "❄️" },
  ];

  // Start camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Apply filter in real-time
  useEffect(() => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
      startFilterLoop();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedFilter]);

  const startCamera = async () => {
    try {
      setError("");
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user", // Front camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      const errorMessage =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions."
          : err instanceof Error && err.name === "NotFoundError"
            ? "No camera found."
            : "Unable to access camera.";
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startFilterLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const applyFilter = () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(applyFilter);
        return;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply selected filter
      applyFilterToImageData(data, selectedFilter);

      // Put filtered image data back
      ctx.putImageData(imageData, 0, 0);

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(applyFilter);
    };

    applyFilter();
  };

  const applyFilterToImageData = (data: Uint8ClampedArray, filter: FilterType) => {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      switch (filter) {
        case "retro":
          // Retro: High contrast, slight desaturation, warm tint
          const retroR = r * 1.1;
          const retroG = g * 0.95;
          const retroB = b * 0.9;
          r = Math.min(255, retroR);
          g = Math.min(255, retroG);
          b = Math.min(255, retroB);
          // Increase contrast
          r = Math.max(0, Math.min(255, (r - 128) * 1.3 + 128));
          g = Math.max(0, Math.min(255, (g - 128) * 1.3 + 128));
          b = Math.max(0, Math.min(255, (b - 128) * 1.3 + 128));
          break;

        case "vintage":
          // Vintage: Sepia tone, reduced saturation
          const vintageR = r * 0.393 + g * 0.769 + b * 0.189;
          const vintageG = r * 0.349 + g * 0.686 + b * 0.168;
          const vintageB = r * 0.272 + g * 0.534 + b * 0.131;
          r = Math.min(255, vintageR);
          g = Math.min(255, vintageG);
          b = Math.min(255, vintageB);
          // Slight desaturation
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = r * 0.7 + gray * 0.3;
          g = g * 0.7 + gray * 0.3;
          b = b * 0.7 + gray * 0.3;
          break;

        case "bw":
          // Black & White: Grayscale conversion
          const grayScale = r * 0.299 + g * 0.587 + b * 0.114;
          r = grayScale;
          g = grayScale;
          b = grayScale;
          break;

        case "warm":
          // Warm tone: Increase red/yellow, reduce blue
          r = Math.min(255, r * 1.15);
          g = Math.min(255, g * 1.05);
          b = Math.max(0, b * 0.9);
          break;

        case "cool":
          // Cool tone: Increase blue/cyan, reduce red
          r = Math.max(0, r * 0.9);
          g = Math.min(255, g * 1.05);
          b = Math.min(255, b * 1.15);
          break;

        case "none":
        default:
          // No filter
          break;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);

    try {
      // Get the current filtered image from canvas
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
      onCapture(imageData);
    } catch (error) {
      console.error("Capture error:", error);
      setError("Failed to capture photo. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-4xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white">Live Camera</h2>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Camera Preview */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Hidden video for capture */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="hidden"
          />

          {/* Canvas with filter applied */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            style={{
              transform: "scaleX(-1)", // Mirror for selfie view
            }}
          />

          {/* Capture Button Overlay - Mobile Optimized */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={capturePhoto}
              disabled={isProcessing || !!error}
              size="lg"
              className="h-20 w-20 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/50 border-4 border-white/20 hover:scale-110 transition-transform disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-8 w-8" />
              )}
            </Button>
          </div>
        </div>

        {/* Filter Selection - Mobile Optimized */}
        <div className="p-4 bg-black/50 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg min-w-[80px] transition-all ${
                  selectedFilter === filter.id
                    ? "bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <span className="text-2xl">{filter.icon}</span>
                <span className="text-xs font-medium">{filter.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
