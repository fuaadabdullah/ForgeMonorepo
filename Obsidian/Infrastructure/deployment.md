# Deployment

This guide covers deploying ForgeTM Backend to production environments.

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (optional, for container orchestration)
- SSL certificate (for HTTPS)
- Domain name (optional)
- Monitoring infrastructure (Jaeger, Sentry)

## Quick Start with Docker Compose

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: forge-backend:latest
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - APP_ENV=production
      - LOG_LEVEL=INFO
      - REDIS_URL=redis://redis:6379/0
      - ENABLE_TRACING=true
      - SENTRY_DSN=${SENTRY_DSN}
    ports:
      - "8000:8000"
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

### 2. Environment Setup

```bash
# Create production environment file
cp .env.example .env.prod

# Edit with production values
# SENTRY_DSN=https://your-dsn@sentry.io/project
# REDIS_URL=redis://redis:6379/0
```

### 3. Deploy

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Kubernetes Deployment

### 1. Namespace

```bash
kubectl create namespace forge
```

### 2. Secrets

```bash
# Create secrets from environment file
kubectl create secret generic forge-secrets \
  --from-env-file=.env.prod \
  --namespace forge
```

### 3. ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: forge-config
  namespace: forge
data:
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
  ENABLE_TRACING: "true"
```

### 4. Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: forge-backend
  namespace: forge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: forge-backend
  template:
    metadata:
      labels:
        app: forge-backend
    spec:
      containers:
      - name: forge-backend
        image: forge-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: forge-config
        - secretRef:
            name: forge-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 5. Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: forge-backend
  namespace: forge
spec:
  selector:
    app: forge-backend
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

### 6. Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: forge-backend
  namespace: forge
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: forge-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: forge-backend
            port:
              number: 80
```

### 7. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n forge
kubectl get services -n forge
kubectl get ingress -n forge
```

## SSL/TLS Configuration

### Let's Encrypt with cert-manager

```yaml
# k8s/ingress.yaml (with cert-manager)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: forge-backend
  namespace: forge
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: forge-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: forge-backend
            port:
              number: 80
```

## Monitoring Setup

### Jaeger Tracing

```yaml
# docker-compose.prod.yml (add jaeger)
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    restart: unless-stopped
```

### Prometheus Metrics

Add Prometheus annotations to deployment:

```yaml
# k8s/deployment.yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
```

## Background Tasks

### Celery Worker Deployment

```yaml
# k8s/celery-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: forge-worker
  namespace: forge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: forge-worker
  template:
    metadata:
      labels:
        app: forge-worker
    spec:
      containers:
      - name: celery-worker
        image: forge-backend:latest
        command: ["celery", "worker", "-A", "forge.celery_app", "--loglevel=info"]
        envFrom:
        - configMapRef:
            name: forge-config
        - secretRef:
            name: forge-secrets
```

## Scaling

### Horizontal Pod Autoscaling

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: forge-backend-hpa
  namespace: forge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: forge-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Backup and Recovery

### Redis Backup

```bash
# Backup Redis data
docker exec forge-redis redis-cli SAVE

# Copy backup from container
docker cp forge-redis:/data/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb
```

### Database Backup (if applicable)

```bash
# Add database backup cron job
kubectl create job --from=cronjob/backup-job backup-$(date +%s)
```

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check logs with `kubectl logs -n forge deployment/forge-backend`
2. **Health checks failing**: Verify environment variables and service dependencies
3. **High memory usage**: Adjust resource limits or investigate memory leaks
4. **Slow responses**: Check Redis connectivity and background task queues

### Debug Commands

```bash
# Check pod status
kubectl get pods -n forge

# View logs
kubectl logs -f -n forge deployment/forge-backend

# Exec into pod
kubectl exec -it -n forge deployment/forge-backend -- /bin/bash

# Check service endpoints
kubectl get endpoints -n forge
```

## Performance Tuning

### Resource Limits

```yaml
# k8s/deployment.yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Environment Variables

```bash
# Production optimizations
WORKERS=4
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=50
```

## Security Considerations

- Run containers as non-root user
- Use read-only root filesystem where possible
- Implement network policies
- Regular security updates
- Secret rotation
- Audit logging
