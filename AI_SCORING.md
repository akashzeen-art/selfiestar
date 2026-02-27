# AI Scoring System

## Overview
The AI scoring system analyzes selfies and generates scores between 60-95 with intelligent bonuses based on image quality metrics.

## Features

### 1. **Brightness Analysis**
- Uses Sharp library for efficient image processing
- Analyzes grayscale brightness (0-100 scale)
- Calculates average brightness from image buffer
- **Bonuses:**
  - Excellent lighting (≥80): +8 points
  - Good lighting (≥70): +5 points
  - Acceptable lighting (≥60): +2 points
  - Too dark (<40): -3 points

### 2. **Face Detection (Mock)**
- Simulates face detection with 85% success rate
- Larger images have higher detection probability
- **Bonus:** +7 points if face detected

### 3. **Base Score**
- Random base score between 60-85
- Provides foundation for final calculation

### 4. **Additional Metrics**
- **Symmetry:** 60-90 (weighted 20%)
- **Smile:** 50-95 (weighted 20%, higher if face detected)

## Scoring Formula

```
Final Score = (Base + Bonuses) × 60% + Symmetry × 20% + Smile × 20%
Capped between 60-95
```

### Example Calculation

```
Base Score: 75
Brightness: 82 → Bonus: +8
Face Detected: true → Bonus: +7
Symmetry: 80
Smile: 85

Calculation:
(75 + 8 + 7) × 0.6 = 54
80 × 0.2 = 16
85 × 0.2 = 17
Final Score: 54 + 16 + 17 = 87
```

## User Stats Auto-Update

When a selfie is saved:
- **totalSelfies** increments by 1
- **totalScore** increases by the selfie's score

When a selfie is deleted:
- **totalSelfies** decrements by 1
- **totalScore** decreases by the selfie's score

This is handled automatically by Mongoose middleware in the Selfie model.

## Performance

- **Efficient:** Analyzes image buffer directly (no file I/O)
- **Scalable:** Uses Sharp for fast image processing
- **Non-blocking:** Async operations don't block the event loop
- **Atomic Updates:** User stats updated with MongoDB `$inc` operator

## API Response

```json
{
  "message": "Selfie uploaded successfully",
  "selfie": {
    "id": "string",
    "userId": "string",
    "imageUrl": "https://res.cloudinary.com/...",
    "score": 87,
    "analysis": {
      "baseScore": 75,
      "brightness": 82,
      "brightnessBonus": 8,
      "faceDetected": true,
      "faceBonus": 7,
      "symmetry": 80,
      "smile": 85
    },
    "isPublic": true,
    "caption": "My selfie!",
    "likes": 0,
    "comments": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Future Enhancements

1. **Real Face Detection:** Integrate ML model (TensorFlow.js, Face-API.js)
2. **Symmetry Analysis:** Actual facial symmetry calculation
3. **Smile Detection:** Real smile detection using ML
4. **Pose Analysis:** Body pose and angle scoring
5. **Background Quality:** Background blur and quality metrics
6. **Resolution Bonus:** Higher resolution images get bonus

## Dependencies

- **sharp:** Fast image processing library
  - Used for brightness analysis
  - Efficient buffer processing
  - No external file dependencies

## Error Handling

- If brightness analysis fails, falls back to random brightness (60-100)
- Face detection always returns a boolean (never throws)
- All errors are logged but don't break the upload process
