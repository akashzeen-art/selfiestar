import sharp from "sharp";

/**
 * AI Scoring Service
 * Simulates AI-powered selfie scoring with brightness analysis and face detection
 * Efficient and scalable - analyzes image buffer directly
 */

interface ScoringResult {
  score: number; // Final score (60-95)
  analysis: {
    baseScore: number;
    brightness: number;
    brightnessBonus: number;
    faceDetected: boolean;
    faceBonus: number;
    symmetry: number;
    smile: number;
  };
}

/**
 * Analyze image brightness from buffer
 * Uses sharp for efficient image processing
 */
async function analyzeBrightness(imageBuffer: Buffer): Promise<number> {
  try {
    // Get image statistics
    const stats = await sharp(imageBuffer)
      .greyscale() // Convert to grayscale for brightness analysis
      .stats();

    // Calculate average brightness (0-255)
    // stats.channels[0] is the grayscale channel
    const avgBrightness = stats.channels[0]?.mean || 128;
    
    // Normalize to 0-100 scale
    return Math.round((avgBrightness / 255) * 100);
  } catch (error) {
    // Fallback to random if analysis fails
    console.warn("Brightness analysis failed, using fallback:", error);
    return 60 + Math.round(Math.random() * 40);
  }
}

/**
 * Mock face detection function
 * Simulates face detection with realistic probability
 * In production, this would use actual ML face detection
 */
function mockFaceDetection(imageBuffer: Buffer): boolean {
  // Simulate face detection with 85% success rate
  // Larger images are more likely to have detectable faces
  const imageSize = imageBuffer.length;
  const hasFaceProbability = Math.min(0.85, 0.5 + (imageSize / 1000000) * 0.35);
  
  return Math.random() < hasFaceProbability;
}

/**
 * Calculate base score (60-85 range)
 * Provides foundation for final score
 */
function calculateBaseScore(): number {
  // Base score between 60-85
  return 60 + Math.round(Math.random() * 25);
}

/**
 * Calculate brightness bonus
 * High brightness (>70) gets bonus points
 */
function calculateBrightnessBonus(brightness: number): number {
  if (brightness >= 80) {
    return 8; // Excellent lighting
  } else if (brightness >= 70) {
    return 5; // Good lighting
  } else if (brightness >= 60) {
    return 2; // Acceptable lighting
  } else if (brightness < 40) {
    return -3; // Too dark
  }
  return 0; // No bonus/penalty
}

/**
 * Calculate face detection bonus
 * Face detected gets bonus points
 */
function calculateFaceBonus(faceDetected: boolean): number {
  return faceDetected ? 7 : 0;
}

/**
 * Generate symmetry score (mock)
 * Simulates facial symmetry analysis
 */
function calculateSymmetry(): number {
  // Symmetry score between 60-90
  return 60 + Math.round(Math.random() * 30);
}

/**
 * Generate smile score (mock)
 * Simulates smile detection
 */
function calculateSmile(faceDetected: boolean): number {
  if (!faceDetected) {
    // Lower score if no face detected
    return 50 + Math.round(Math.random() * 20);
  }
  // Higher score if face detected (more likely to have smile)
  return 65 + Math.round(Math.random() * 30);
}

/**
 * Score a selfie image
 * Analyzes image buffer and returns comprehensive scoring
 * 
 * @param imageBuffer - Image file buffer
 * @returns Scoring result with final score and analysis breakdown
 */
export async function scoreSelfie(imageBuffer: Buffer): Promise<ScoringResult> {
  // Analyze image properties
  const brightness = await analyzeBrightness(imageBuffer);
  const faceDetected = mockFaceDetection(imageBuffer);

  // Calculate components
  const baseScore = calculateBaseScore();
  const brightnessBonus = calculateBrightnessBonus(brightness);
  const faceBonus = calculateFaceBonus(faceDetected);
  const symmetry = calculateSymmetry();
  const smile = calculateSmile(faceDetected);

  // Calculate final score
  // Formula: baseScore + bonuses, capped at 95
  let finalScore = baseScore + brightnessBonus + faceBonus;
  
  // Add weighted components for more realistic scoring
  finalScore = Math.round(
    finalScore * 0.6 + // Base + bonuses (60%)
    symmetry * 0.2 + // Symmetry (20%)
    smile * 0.2 // Smile (20%)
  );

  // Ensure score is between 60-95
  finalScore = Math.max(60, Math.min(95, finalScore));

  return {
    score: finalScore,
    analysis: {
      baseScore,
      brightness,
      brightnessBonus,
      faceDetected,
      faceBonus,
      symmetry,
      smile,
    },
  };
}

/**
 * Legacy function for backward compatibility
 * Uses random scoring if no buffer provided
 */
export function scoreSelfieLegacy() {
  const symmetry = 65 + Math.round(Math.random() * 35);
  const brightness = 60 + Math.round(Math.random() * 40);
  const smile = 55 + Math.round(Math.random() * 45);
  const score = Math.round(symmetry * 0.4 + brightness * 0.35 + smile * 0.25);

  return {
    score: Math.max(60, Math.min(95, Math.max(0, Math.min(100, score)))),
    analysis: {
      baseScore: 70,
      brightness,
      brightnessBonus: 0,
      faceDetected: Math.random() > 0.15,
      faceBonus: 0,
      symmetry,
      smile,
    },
  };
}
