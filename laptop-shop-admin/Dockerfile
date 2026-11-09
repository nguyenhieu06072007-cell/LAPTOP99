# ==============================================================================
# DOCKERFILE: Frontend Admin Dashboard (React + Vite + Nginx)
# Dự án: Laptop99 - Khoa CNTT Đại học CMC
# ==============================================================================
# Giai đoạn 1: Build ứng dụng React với Node.js
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Giai đoạn 2: Serve file tĩnh bằng Nginx siêu nhẹ
FROM nginx:alpine

# Sao chép kết quả build từ giai đoạn 1 vào thư mục phục vụ của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Cấu hình Nginx để hỗ trợ React Router SPA (fallback về index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

