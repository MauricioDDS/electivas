FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
COPY .env .      # add this if you need env vars at build time
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Optional: copy custom nginx config if using SPA routing
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
