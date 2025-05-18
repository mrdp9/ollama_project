FROM nginx:latest
COPY . /usr/share/nginx/html
RUN apt update && \
    apt install -y curl && \
    apt upgrade -y
EXPOSE 80