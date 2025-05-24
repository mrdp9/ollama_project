#!/bin/bash
set -e

# Download the script to a temporary file
curl -fsSL https://ollama.com/install.sh -o /tmp/ollama_install.sh

# Notify the user to inspect the script (as no checksum is available)
echo "Ollama installation script downloaded to /tmp/ollama_install.sh."
echo "Please inspect it before proceeding if you have security concerns."
echo "You can cancel this script (Ctrl+C) and run it manually after inspection."
echo "Continuing in 5 seconds..."
sleep 5

# Execute the downloaded script
sh /tmp/ollama_install.sh

# Clean up the temporary file
rm /tmp/ollama_install.sh

ollama pull llama3.2:3b