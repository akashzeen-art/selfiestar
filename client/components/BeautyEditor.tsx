import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sparkles, RotateCcw, Download } from "lucide-react";

interface BeautyEditorProps {
  imageSrc: string;
  onSave: (editedImageBlob: Blob) => void;
  onCancel: () => void;
}

/**
 * Advanced Beauty Editor Component
 * Provides real-time beautification tools using HTML5 Canvas
 * Mobile optimized with touch-friendly controls
 */
export default function BeautyEditor({ imageSrc, onSave, onCancel }: BeautyEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Beautification settings
  const [skinSmoothing, setSkinSmoothing] = useState(0); // 0-100
  const [brightness, setBrightness] = useState(0); // -50 to 50
  const [contrast, setContrast] = useState(0); // -50 to 50
  const [blemishRemoval, setBlemishRemoval] = useState(0); // 0-100
  const [faceReshape, setFaceReshape] = useState(0); // -20 to 20 (negative = thinner, positive = fuller)

  // Load image and initialize canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      drawImage();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw image when settings change
  useEffect(() => {
    if (originalImageRef.current) {
      drawImage();
    }
  }, [skinSmoothing, brightness, contrast, blemishRemoval, faceReshape]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply image data filters
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply brightness and contrast
    if (brightness !== 0 || contrast !== 0) {
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        // Brightness
        data[i] = Math.max(0, Math.min(255, data[i] + brightness)); // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // B

        // Contrast
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
      }
    }

    // Apply skin smoothing (blur effect)
    if (skinSmoothing > 0) {
      ctx.putImageData(imageData, 0, 0);
      const blurAmount = (skinSmoothing / 100) * 3; // Max 3px blur
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = "none";
    } else {
      ctx.putImageData(imageData, 0, 0);
    }

    // Apply blemish removal (selective blur on darker spots)
    if (blemishRemoval > 0) {
      const blemishImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const blemishData = blemishImageData.data;
      const blurRadius = (blemishRemoval / 100) * 5; // Max 5px blur radius

      // Create a temporary canvas for blur
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(blemishImageData, 0, 0);
        tempCtx.filter = `blur(${blurRadius}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = "none";

        const blurredData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Blend blurred areas for darker spots (blemishes)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          // Apply blur to darker areas (potential blemishes)
          if (brightness < 150) {
            const blendAmount = (150 - brightness) / 150 * (blemishRemoval / 100);
            data[i] = data[i] * (1 - blendAmount) + blurredData[i] * blendAmount;
            data[i + 1] = data[i + 1] * (1 - blendAmount) + blurredData[i + 1] * blendAmount;
            data[i + 2] = data[i + 2] * (1 - blendAmount) + blurredData[i + 2] * blendAmount;
          }
        }
        ctx.putImageData(blemishImageData, 0, 0);
      }
    }

    // Apply face reshaping (scale transform simulation)
    if (faceReshape !== 0) {
      const reshapeImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const reshapeData = reshapeImageData.data;

      // Simulate face reshaping by scaling the center region
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceWidth = canvas.width * 0.4; // Approximate face width
      const faceHeight = canvas.height * 0.5; // Approximate face height

      // Create a temporary canvas for reshaping
      const reshapeCanvas = document.createElement("canvas");
      reshapeCanvas.width = canvas.width;
      reshapeCanvas.height = canvas.height;
      const reshapeCtx = reshapeCanvas.getContext("2d");
      if (reshapeCtx) {
        reshapeCtx.putImageData(reshapeImageData, 0, 0);

        // Apply horizontal scaling for face width
        const scaleX = 1 + (faceReshape / 100) * 0.1; // Max 10% change
        const scaleY = 1 - (faceReshape / 100) * 0.05; // Slight vertical adjustment

        reshapeCtx.save();
        reshapeCtx.translate(centerX, centerY);
        reshapeCtx.scale(scaleX, scaleY);
        reshapeCtx.translate(-centerX, -centerY);

        // Draw with gradient mask for smooth transition
        const gradient = reshapeCtx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          Math.max(faceWidth, faceHeight) / 2
        );
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");

        reshapeCtx.globalCompositeOperation = "source-over";
        reshapeCtx.drawImage(reshapeCanvas, 0, 0);
        reshapeCtx.restore();

        // Blend the reshaped area back
        const finalData = reshapeCtx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const distX = Math.abs(x - centerX);
            const distY = Math.abs(y - centerY);
            const dist = Math.sqrt(distX * distX + distY * distY);
            const maxDist = Math.max(faceWidth, faceHeight) / 2;
            const blend = Math.max(0, 1 - dist / maxDist);

            if (blend > 0) {
              reshapeData[idx] = reshapeData[idx] * (1 - blend) + finalData[idx] * blend;
              reshapeData[idx + 1] = reshapeData[idx + 1] * (1 - blend) + finalData[idx + 1] * blend;
              reshapeData[idx + 2] = reshapeData[idx + 2] * (1 - blend) + finalData[idx + 2] * blend;
            }
          }
        }
        ctx.putImageData(reshapeImageData, 0, 0);
      }
    }
  };

  const handleOneTapBeautify = () => {
    setSkinSmoothing(30);
    setBrightness(5);
    setContrast(10);
    setBlemishRemoval(40);
    setFaceReshape(0);
  };

  const handleReset = () => {
    setSkinSmoothing(0);
    setBrightness(0);
    setContrast(0);
    setBlemishRemoval(0);
    setFaceReshape(0);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onSave(blob);
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (error) {
      console.error("Error saving image:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      {/* Canvas Preview - Mobile Optimized */}
      <div className="relative w-full bg-black rounded-xl overflow-hidden border border-border/40">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[60vh] md:max-h-[70vh] object-contain"
          style={{ display: "block" }}
        />
      </div>

      {/* Controls - Mobile Optimized */}
      <div className="space-y-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/40 p-4 md:p-6">
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleOneTapBeautify}
            className="flex-1 min-w-[120px] bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            One-Tap Beautify
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 min-w-[120px] gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Skin Smoothing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Skin Smoothing</span>
            <span className="text-muted-foreground">{skinSmoothing}%</span>
          </div>
          <Slider
            value={[skinSmoothing]}
            onValueChange={([value]) => setSkinSmoothing(value)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Brightness</span>
            <span className="text-muted-foreground">
              {brightness > 0 ? `+${brightness}` : brightness}
            </span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={([value]) => setBrightness(value)}
            min={-50}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Contrast</span>
            <span className="text-muted-foreground">
              {contrast > 0 ? `+${contrast}` : contrast}
            </span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={([value]) => setContrast(value)}
            min={-50}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Blemish Removal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Blemish Removal</span>
            <span className="text-muted-foreground">{blemishRemoval}%</span>
          </div>
          <Slider
            value={[blemishRemoval]}
            onValueChange={([value]) => setBlemishRemoval(value)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Face Reshape */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Face Reshape</span>
            <span className="text-muted-foreground">
              {faceReshape > 0 ? `+${faceReshape}` : faceReshape}%
            </span>
          </div>
          <Slider
            value={[faceReshape]}
            onValueChange={([value]) => setFaceReshape(value)}
            min={-20}
            max={20}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Negative = Thinner, Positive = Fuller
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border/40">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink hover:from-neon-purple/90 hover:to-neon-pink/90 text-white gap-2"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
