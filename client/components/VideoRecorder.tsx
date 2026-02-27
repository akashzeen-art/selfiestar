import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Play, Square, Download, Upload, Loader } from "lucide-react";
import { apiClient } from "@/lib/axios";

interface VideoRecorderProps {
  onClose: () => void;
  challengeId?: string;
}

type FilterType = "none" | "retro" | "vintage" | "bw" | "warm" | "cool" | "smooth";

/**
 * Video Recorder Component
 * Records up to 15 seconds of video with beauty filters
 * Mobile optimized
 */
export default function VideoRecorder({ onClose, challengeId }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const MAX_RECORDING_TIME = 15; // 15 seconds max
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Available filters
  const filters: { id: FilterType; name: string; icon: string }[] = [
    { id: "none", name: "Original", icon: "📷" },
    { id: "retro", name: "Retro", icon: "🎞️" },
    { id: "vintage", name: "Vintage", icon: "📸" },
    { id: "bw", name: "B&W", icon: "⚫" },
    { id: "warm", name: "Warm", icon: "🔥" },
    { id: "cool", name: "Cool", icon: "❄️" },
    { id: "smooth", name: "Smooth", icon: "✨" },
  ];

  // Start camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Apply filter in real-time during recording
  useEffect(() => {
    if (videoRef.current && canvasRef.current && streamRef.current && isRecording) {
      startFilterLoop();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedFilter, isRecording]);

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // No audio recording
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera/microphone access error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera access denied. Please allow permissions in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found. Please connect a device.");
        } else {
          setError(`Access error: ${err.message}`);
        }
      } else {
        setError("Camera access denied. Please allow permissions.");
      }
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
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const startFilterLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const applyFilter = () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !isRecording) {
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(applyFilter);
        }
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (selectedFilter !== "none") {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        applyFilterToImageData(data, selectedFilter);
        ctx.putImageData(imageData, 0, 0);
      }

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(applyFilter);
      }
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
          r = Math.min(255, r * 1.1);
          g = Math.min(255, g * 0.95);
          b = Math.min(255, b * 0.9);
          r = Math.max(0, Math.min(255, (r - 128) * 1.3 + 128));
          g = Math.max(0, Math.min(255, (g - 128) * 1.3 + 128));
          b = Math.max(0, Math.min(255, (b - 128) * 1.3 + 128));
          break;

        case "vintage":
          const vintageR = r * 0.393 + g * 0.769 + b * 0.189;
          const vintageG = r * 0.349 + g * 0.686 + b * 0.168;
          const vintageB = r * 0.272 + g * 0.534 + b * 0.131;
          r = Math.min(255, vintageR);
          g = Math.min(255, vintageG);
          b = Math.min(255, vintageB);
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = r * 0.7 + gray * 0.3;
          g = g * 0.7 + gray * 0.3;
          b = b * 0.7 + gray * 0.3;
          break;

        case "bw":
          const grayScale = r * 0.299 + g * 0.587 + b * 0.114;
          r = grayScale;
          g = grayScale;
          b = grayScale;
          break;

        case "warm":
          r = Math.min(255, r * 1.15);
          g = Math.min(255, g * 1.05);
          b = Math.max(0, b * 0.9);
          break;

        case "cool":
          r = Math.max(0, r * 0.9);
          g = Math.min(255, g * 1.05);
          b = Math.min(255, b * 1.15);
          break;

        case "smooth":
          // Simple smoothing effect (box blur approximation)
          const smoothR = (r + g + b) / 3;
          r = r * 0.7 + smoothR * 0.3;
          g = g * 0.7 + smoothR * 0.3;
          b = b * 0.7 + smoothR * 0.3;
          break;

        case "none":
        default:
          break;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  };

  const startRecording = async () => {
    if (!streamRef.current || !canvasRef.current) {
      setError("Camera not ready");
      return;
    }

    try {
      setIsRecording(true);
      setRecordingTime(0);
      chunksRef.current = [];

      // Create MediaRecorder from canvas stream (no audio)
      const canvasStream = canvasRef.current.captureStream(30); // 30 FPS

      // Create MediaRecorder (video only, no audio)
      const options: MediaRecorderOptions = {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      };

      // Fallback to webm if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "video/webm;codecs=vp8";
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "video/webm";
      }

      const mediaRecorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setIsRecording(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (err) {
      console.error("Recording error:", err);
      setError("Failed to start recording");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const saveVideoToDevice = () => {
    if (!recordedVideo) return;

    const a = document.createElement("a");
    a.href = recordedVideo;
    a.download = `selfistar-video-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadVideo = async () => {
    if (!recordedVideo) return;

    setIsUploading(true);
    setError("");

    try {
      // Convert blob URL to File
      const response = await fetch(recordedVideo);
      const blob = await response.blob();
      const file = new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" });

      // Create FormData
      const formData = new FormData();
      formData.append("video", file);
      if (challengeId) {
        formData.append("challengeId", challengeId);
      }
      formData.append("filter", selectedFilter);

      // Upload to backend
      await apiClient.post("/video/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Success - close modal
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const resetRecording = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm z-10">
        <h2 className="text-xl font-bold text-white">Video Recorder</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
            Recording {recordingTime.toFixed(1)}s / {MAX_RECORDING_TIME}s
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Recorded video preview */}
        {recordedVideo && !isRecording && (
          <video
            src={recordedVideo}
            controls
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-4 border-t border-white/10 space-y-4">
        {/* Filter selector */}
        {!recordedVideo && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter.id)}
                className={`min-w-[60px] h-12 flex flex-col items-center justify-center gap-1 ${
                  selectedFilter === filter.id
                    ? "bg-gradient-to-r from-neon-purple to-neon-pink text-white border-0"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                <span className="text-lg">{filter.icon}</span>
                <span className="text-xs">{filter.name}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Recording controls */}
        <div className="flex items-center justify-center gap-4">
          {!recordedVideo ? (
            <>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  <Play className="h-6 w-6" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  <Square className="h-6 w-6" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={saveVideoToDevice}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={uploadVideo}
                disabled={isUploading}
                className="bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetRecording}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Record Again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
