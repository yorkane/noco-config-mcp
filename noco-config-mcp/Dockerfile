FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 13001
ENTRYPOINT ["node", "index.js"]
