# ==============================================================================
# DOCKERFILE: Backend API (Node.js Express + MySQL)
# Dự án: Laptop99 - Khoa CNTT Đại học CMC
# ==============================================================================
FROM node:20-alpine

WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Sao chép mã nguồn backend
COPY . .

# Tạo thư mục uploads chứa hình ảnh
RUN mkdir -p uploads

# Mở cổng API
EXPOSE 4000

ENV NODE_ENV=production \
    PORT=4000

CMD ["npm", "start"]

