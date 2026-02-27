#!/bin/bash

# Download face-api.js models to public/models/
# This script downloads the required models for AR face tracking

MODEL_DIR="public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

echo "📥 Downloading face-api.js models..."
echo ""

# Create models directory
mkdir -p "$MODEL_DIR"

# Download tiny_face_detector model
echo "Downloading tiny_face_detector model..."
curl -L "${BASE_URL}/tiny_face_detector_model-weights_manifest.json" -o "${MODEL_DIR}/tiny_face_detector_model-weights_manifest.json"
curl -L "${BASE_URL}/tiny_face_detector_model-shard1" -o "${MODEL_DIR}/tiny_face_detector_model-shard1"

# Download face_landmark_68 model
echo "Downloading face_landmark_68 model..."
curl -L "${BASE_URL}/face_landmark_68_model-weights_manifest.json" -o "${MODEL_DIR}/face_landmark_68_model-weights_manifest.json"
curl -L "${BASE_URL}/face_landmark_68_model-shard1" -o "${MODEL_DIR}/face_landmark_68_model-shard1"

echo ""
echo "✅ Models downloaded successfully!"
echo "Location: ${MODEL_DIR}/"
echo ""
echo "Files downloaded:"
ls -lh "$MODEL_DIR"
