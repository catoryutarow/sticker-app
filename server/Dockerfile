FROM node:20-alpine

# FFmpegをインストール
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
