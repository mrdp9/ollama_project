FROM nginx:1.25-alpine
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY dompurify.min.js /usr/share/nginx/html/
EXPOSE 80