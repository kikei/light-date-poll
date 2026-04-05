FROM public.ecr.aws/docker/library/node:24-slim

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.0 \
     /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

CMD ["node", "server.js"]
