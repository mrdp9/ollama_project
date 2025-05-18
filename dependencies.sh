#!/bin/bash
sudo apt update 
sudo apt install curl -y 
docker build -t frontend2 .
docker run -p 80:80 frontend2 && ollama run llama3.2:3b
./ollama.sh