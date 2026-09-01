FROM node:18-slim

# Install dependencies untuk yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install yt-dlp --no-cache-dir

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "bot.js"]
