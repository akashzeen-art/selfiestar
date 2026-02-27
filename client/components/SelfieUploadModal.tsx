import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, X, Zap, Loader, Download, Sparkles, Image as ImageIcon, Video, Video as VideoIcon } from "lucide-react";
import BeautyEditor from "./BeautyEditor";
import LiveCamera from "./LiveCamera";
import VideoRecorder from "./VideoRecorder";
import { useSelfies } from "@/contexts/SelfieContext";
import { apiClient } from "@/lib/axios";
import { SelfieDto } from "@shared/api";

interface SelfieUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId?: string; // Optional challenge ID for challenge submissions
}

export default function SelfieUploadModal({ isOpen, onClose, challengeId }: SelfieUploadModalProps) {
  const { addSelfie } = useSelfies();
  const [step, setStep] = useState<"source" | "live" | "video" | "preview" | "beautify" | "scoring">("source");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [filter, setFilter] = useState<"none" | "glow" | "vintage" | "bw" | "smooth">("none");
  const [score, setScore] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<{
    baseScore: number;
    brightness: number;
    brightnessBonus: number;
    faceDetected: boolean;
    faceBonus: number;
    symmetry: number;
    smile: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [error, setError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<File | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const filterRequestIdRef = useRef(0);

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup camera stream on unmount or modal close
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!isCameraActive || !streamRef.current || !videoRef.current) {
      return;
    }
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setError("Unable to start camera preview. Please retry.");
    });
  }, [isCameraActive, step]);

  useEffect(() => {
    if (!originalImage) return;

    let isCancelled = false;
    const requestId = ++filterRequestIdRef.current;

    const apply = async () => {
      setIsApplyingFilter(true);
      try {
        const filtered = await applyFilterToDataUrl(originalImage, filter);
        if (isCancelled || requestId !== filterRequestIdRef.current) return;
        setImage(filtered);
        fileRef.current = dataUrlToFile(filtered, `selfistar-${Date.now()}.jpg`);
      } catch {
        if (isCancelled || requestId !== filterRequestIdRef.current) return;
        setError("Failed to apply filter. Please try a different one.");
      } finally {
        if (!isCancelled && requestId === filterRequestIdRef.current) {
          setIsApplyingFilter(false);
        }
      }
    };

    void apply();

    return () => {
      isCancelled = true;
    };
  }, [originalImage, filter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError("");
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setOriginalImage(dataUrl);
        setImage(dataUrl);
        setStep("preview");
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setError("");
      stopCameraStream();
      
      // Mobile-optimized camera constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user", // Front camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          // Mobile-specific optimizations
          ...(navigator.userAgent.match(/Mobile|Android|iPhone|iPad/) && {
            facingMode: { exact: "user" },
          }),
        },
        audio: false, // No audio needed for selfies
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setStep("preview");
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      const errorMessage =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions in your browser settings."
          : err instanceof Error && err.name === "NotFoundError"
            ? "No camera found. Please connect a camera device."
            : "Unable to access camera. Please try again.";
      setError(errorMessage);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        setError("Camera is not ready yet. Please wait a moment and capture again.");
        return;
      }
      const context = canvasRef.current.getContext("2d");
      if (context) {
        // Set canvas dimensions to match video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0);
        
        // Get image as data URL (high quality for mobile)
        const imageData = canvasRef.current.toDataURL("image/jpeg", 0.95);
        
        // Generate filename with timestamp
        const timestamp = Date.now();
        const filename = `selfistar-${timestamp}.jpg`;
        
        // Step 1: Automatically download to device FIRST
        saveImageToDevice(imageData, filename);
        setIsDownloaded(true);
        
        // Step 2: Set image for preview and upload
        setOriginalImage(imageData);
        setImage(imageData);
        
        // Create file object for upload
        fileRef.current = dataUrlToFile(imageData, filename);
        
        // Hide download badge after 3 seconds
        setTimeout(() => setIsDownloaded(false), 3000);

        // Stop camera stream
        stopCameraStream();
        setIsCameraActive(false);
      }
    }
  };

  const analyzeScore = async () => {
    setIsLoading(true);
    setStep("scoring");

    try {
      const file = fileRef.current;
      if (!file) {
        throw new Error("No image selected");
      }

      // Note: Image is already downloaded when captured (in capturePhoto)
      // Now upload to backend (Cloudinary)
      const formData = new FormData();
      formData.append("image", file);
      formData.append("caption", caption);
      formData.append("isPublic", String(isPublic));
      formData.append("filter", filter);
      if (challengeId) {
        formData.append("challengeId", challengeId);
      }
      
      // Upload using Axios
      const response = await apiClient.post<{ selfie: SelfieDto; message?: string }>(
        "/selfies/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      const uploaded = response.data.selfie;
      setScore(uploaded.score);
      if (uploaded.analysis) {
        setAnalysis(uploaded.analysis);
      }
      setStep("scoring");
      addSelfie({
        id: uploaded.id,
        image: (uploaded as any).imageUrl || "",
        score: uploaded.score,
        caption: uploaded.caption,
        isPublic: uploaded.isPublic,
        likes: uploaded.likes,
        comments: uploaded.comments,
        createdAt: uploaded.createdAt,
        challengeId: uploaded.challengeId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("preview");
    }
    setIsLoading(false);
  };

  const uploadSelfie = () => {
    if (image && score !== null) {
      resetModal();
      onClose();
    }
  };

  const resetModal = () => {
    stopCameraStream();
    setStep("source");
    setOriginalImage(null);
    setImage(null);
    setCaption("");
    setIsPublic(true);
    setFilter("none");
    setScore(null);
    setAnalysis(null);
    setIsLoading(false);
    setError("");
    setIsDownloaded(false);
    fileRef.current = null;
    setIsCameraActive(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  // Live Camera renders as full-screen overlay
  if (step === "live") {
    return (
      <LiveCamera
        onCapture={(imageDataUrl) => {
          setOriginalImage(imageDataUrl);
          setImage(imageDataUrl);
          // Create file from data URL
          fileRef.current = dataUrlToFile(imageDataUrl, `selfie-${Date.now()}.jpg`);
          setStep("preview");
        }}
        onClose={() => setStep("source")}
      />
    );
  }

  // Video Recorder renders as full-screen overlay
  if (step === "video") {
    return (
      <VideoRecorder
        onClose={() => setStep("source")}
        challengeId={challengeId}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Modal - Mobile optimized */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-neon-purple/30 bg-card backdrop-blur-sm shadow-2xl md:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6">
          <h2 className="text-xl font-bold">Upload Selfie</h2>
          <button
            onClick={handleClose}
            className="rounded-lg hover:bg-card/80 p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Mobile optimized padding */}
        <div className="p-4 md:p-6">
          {step === "source" && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold mb-2">Create Your Perfect Selfie</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from our advanced AI-powered features
                </p>
              </div>

              {/* Advanced Features Grid (without AR filters) */}
              <div className="grid grid-cols-1 gap-3">
                {/* Live Camera with Filters */}
                <Button
                  onClick={() => setStep("live")}
                  className="w-full h-auto p-4 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white gap-3 justify-start text-left"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Video className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">Live Camera with Filters</div>
                      <div className="text-xs opacity-90">Real-time filters: Retro, Vintage, B&W, Warm, Cool</div>
                    </div>
                  </div>
                </Button>

                {/* Video Recording */}
                <Button
                  onClick={() => setStep("video")}
                  className="w-full h-auto p-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-3 justify-start text-left"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-white/20">
                      <VideoIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">Record Video (15s)</div>
                      <div className="text-xs opacity-90">Short video with beauty filters</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Basic Options */}
              <div className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-auto p-3 gap-2 justify-start"
                >
                  <Upload className="h-5 w-5" />
                  <span>Choose from Gallery</span>
                </Button>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="w-full h-auto p-3 gap-2 justify-start border-neon-cyan/50 hover:bg-neon-cyan/10"
                >
                  <Camera className="h-5 w-5" />
                  <span>Take a Photo</span>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm">
                  {error}
                </div>
              )}
              {image && typeof image === "string" && image.startsWith("data:") && (
                <div className="relative">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full rounded-lg border border-border/40 object-cover max-h-[60vh] md:max-h-[500px]"
                  />
                  {/* Download confirmation badge */}
                  {isDownloaded && (
                    <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium flex items-center gap-1 animate-bounce-in shadow-lg z-10">
                      <Download className="h-3 w-3" />
                      Saved to device
                    </div>
                  )}
                </div>
              )}

              {!image && isCameraActive && (
                <>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg border border-border/40 object-cover max-h-[60vh] md:max-h-[500px]"
                      style={{
                        transform: "scaleX(-1)", // Mirror for selfie view
                      }}
                    />
                    {/* Mobile-optimized capture button overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <Button
                        onClick={capturePhoto}
                        size="lg"
                        className="h-16 w-16 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white shadow-lg shadow-neon-purple/50 border-4 border-white/20 hover:scale-110 transition-transform"
                      >
                        <Camera className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  {/* Desktop capture button */}
                  <Button
                    onClick={capturePhoto}
                    className="hidden md:flex w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white gap-2"
                  >
                    <Camera className="h-5 w-5" />
                    Capture Photo
                  </Button>
                </>
              )}

              {image && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Caption (Optional)</label>
                    <Input
                      type="text"
                      placeholder="What's on your mind?"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="bg-input border-border/40"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-border/40"
                    />
                    <span className="text-sm">Make this selfie public</span>
                  </div>

                  {/* Advanced Editing Tools */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Creative Filter</label>
                      <select
                        value={filter}
                        onChange={(e) =>
                          setFilter(e.target.value as "none" | "glow" | "vintage" | "bw" | "smooth")
                        }
                        disabled={isApplyingFilter}
                        className="w-full rounded-md border border-border/40 bg-input px-3 py-2 text-sm"
                      >
                        <option value="none">None</option>
                        <option value="glow">Glow</option>
                        <option value="vintage">Vintage</option>
                        <option value="bw">Black & White</option>
                        <option value="smooth">Beauty Smooth</option>
                      </select>
                    </div>

                    {/* Advanced Editing Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setStep("beautify")}
                        variant="outline"
                        className="h-auto p-3 gap-2 flex-col border-neon-purple/30 hover:bg-neon-purple/10"
                      >
                        <Sparkles className="h-5 w-5 text-neon-purple" />
                        <span className="text-xs font-medium">AI Beautify</span>
                        <span className="text-[10px] text-muted-foreground">Skin smoothing & more</span>
                      </Button>
                    </div>

                    {/* Analyze Button */}
                    <Button
                      onClick={analyzeScore}
                      disabled={isLoading || isApplyingFilter}
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white gap-2 py-3"
                    >
                      {isLoading || isApplyingFilter ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Get AI Score & Upload
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      stopCameraStream();
                      setIsCameraActive(false);
                      setOriginalImage(null);
                      setImage(null);
                      setCaption("");
                      setStep("source");
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Start Over
                  </Button>
                </>
              )}
            </div>
          )}

          {step === "beautify" && image && (
            <BeautyEditor
              imageSrc={image}
              onSave={(editedBlob) => {
                // Convert blob to data URL and update image
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  setImage(result);
                  // Create new file from edited blob
                  fileRef.current = new File([editedBlob], `selfie-${Date.now()}.jpg`, {
                    type: "image/jpeg",
                  });
                  setStep("preview");
                };
                reader.readAsDataURL(editedBlob);
              }}
              onCancel={() => setStep("preview")}
            />
          )}


          {step === "scoring" && score !== null && (
            <div className="space-y-4 text-center">
              <div className="relative mx-auto h-32 w-32 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white">
                    {score !== null ? score.toFixed(2) : "0.00"}
                  </div>
                  <div className="text-sm text-white/70">/ 100</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">AI Analysis Results</h3>
                <div className="space-y-2 text-sm text-muted-foreground text-left">
                  <div className="flex justify-between">
                    <span>Facial Symmetry</span>
                    <span className="font-medium text-foreground">
                      {analysis ? `${analysis.symmetry.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lighting Quality</span>
                    <span className="font-medium text-foreground">
                      {analysis ? `${analysis.brightness.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expression</span>
                    <span className="font-medium text-foreground">
                      {analysis ? `${analysis.smile.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                  {analysis && analysis.faceDetected && (
                    <div className="flex justify-between pt-2 border-t border-border/20">
                      <span className="text-xs">Face Detected</span>
                      <span className="text-xs font-medium text-green-400">✓ Yes</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={uploadSelfie}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white"
              >
                Save Selfie
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

async function applyFilterToDataUrl(
  dataUrl: string,
  filter: "none" | "glow" | "vintage" | "bw" | "smooth",
) {
  const sourceImage = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  if (filter === "none") {
    ctx.drawImage(sourceImage, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  if (filter === "glow") {
    ctx.filter = "brightness(1.1) saturate(1.25) contrast(1.05)";
    ctx.drawImage(sourceImage, 0, 0);
    ctx.filter = "none";
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.1,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.8,
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    gradient.addColorStop(1, "rgba(255, 215, 170, 0.04)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  if (filter === "vintage") {
    ctx.filter = "sepia(0.55) saturate(0.85) contrast(0.95) brightness(1.05)";
    ctx.drawImage(sourceImage, 0, 0);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(120, 70, 20, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  if (filter === "bw") {
    ctx.filter = "grayscale(1) contrast(1.1)";
    ctx.drawImage(sourceImage, 0, 0);
    ctx.filter = "none";
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  ctx.filter = "blur(1.4px) brightness(1.03) saturate(1.08)";
  ctx.drawImage(sourceImage, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 0.24;
  ctx.drawImage(sourceImage, 0, 0);
  ctx.globalAlpha = 1;
  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Save image to device using download attribute
 * Mobile-optimized with fallback for iOS Safari
 */
function saveImageToDevice(dataUrl: string, filename: string) {
  try {
    // Method 1: Use download attribute (works on most browsers)
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    
    // For iOS Safari, we need to open in new window
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS Safari doesn't support download attribute well
      // Open in new window as fallback
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${dataUrl}" />`);
        newWindow.document.close();
      }
    } else {
      // Standard download for other browsers
      document.body.appendChild(anchor);
      anchor.click();
      // Small delay before removal for better compatibility
      setTimeout(() => {
        document.body.removeChild(anchor);
      }, 100);
    }
  } catch (error) {
    console.warn("Failed to download image:", error);
    // Fallback: Try to open image in new tab
    const newWindow = window.open(dataUrl, "_blank");
    if (!newWindow) {
      console.error("Unable to save image. Please save manually.");
    }
  }
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = /data:(.*);base64/.exec(header);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: mimeType });
}
