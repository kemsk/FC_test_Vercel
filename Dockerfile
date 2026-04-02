# Stage 2: Base build stage
FROM python:3.13-slim AS builder

# Create the app directory
RUN mkdir /app

# Set the working directory
WORKDIR /app

# Set environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1 

# Upgrade pip and install dependencies
RUN pip install --upgrade pip 

# Copy the requirements file first (better caching)
COPY requirements.txt /app/

# Install MySQL development dependencies for mysqlclient compilation
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2.5: Frontend build stage
FROM node:22-alpine AS frontend-builder
ENV NODE_ENV=development
WORKDIR /frontend
COPY Frontend/package*.json /frontend/
RUN npm ci --include=dev
COPY Frontend/index.html /frontend/
COPY Frontend/components.json /frontend/
COPY Frontend/eslint.config.js /frontend/
COPY Frontend/postcss.config.js /frontend/
COPY Frontend/tailwind.config.js /frontend/
COPY Frontend/tsconfig.json /frontend/
COPY Frontend/tsconfig.app.json /frontend/
COPY Frontend/tsconfig.node.json /frontend/
COPY Frontend/vite.config.ts /frontend/
COPY Frontend/vitest.shims.d.ts /frontend/
COPY Frontend/public /frontend/public
COPY Frontend/src /frontend/src
COPY Frontend/.storybook /frontend/.storybook
RUN npm run build

# Stage 3: Production stage
FROM python:3.13-slim
RUN useradd -m -r appuser && \
   mkdir /app && \
   chown -R appuser /app
RUN apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*

# Copy the Python dependencies from the builder stage
COPY --from=builder /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Set the working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .
COPY --from=frontend-builder --chown=appuser:appuser /static/frontend /app/frontend_dist

# Set environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1 

# Fix Windows CRLF line endings and make entrypoint executable
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8001
CMD ["/bin/bash", "/app/entrypoint.sh"]