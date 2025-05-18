#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Start the Ollama server in the background
echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Give the server a moment to start
# A more robust approach would be a loop checking the API health endpoint,
# but a simple sleep is often sufficient for startup pull.
echo "Waiting for Ollama server to initialize..."
sleep 15 # Increased sleep slightly for potentially slower environments

# Pull the specified model
# You can pass the model name as an argument to the script,
# or hardcode it like this if it's always the same.
MODEL_NAME="llama3.2:3b"
echo "Pulling model: ${MODEL_NAME}..."
ollama pull ${MODEL_NAME}

# Wait for the Ollama serve process to keep the container alive
echo "Model pull complete. Ollama server is running."
wait $OLLAMA_PID