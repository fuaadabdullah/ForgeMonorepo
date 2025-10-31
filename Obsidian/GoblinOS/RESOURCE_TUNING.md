# Resource Limit Tuning Guide

This guide explains how to monitor and adjust Kubernetes resource limits for Overmind based on actual usage patterns.

## Current Resource Allocations

### API Deployment (FastAPI)
```yaml
requests:
  memory: "256Mi"  # Baseline Python FastAPI + dependencies
  cpu: "100m"      # 0.1 CPU (10% of 1 core)
limits:
  memory: "512Mi"  # 2x request (spike buffer)
  cpu: "500m"      # 0.5 CPU (max burst)
```

**Rationale:**
- FastAPI is lightweight, primarily I/O bound
- Acts as proxy to Node.js bridge (minimal processing)
- 256Mi sufficient for HTTP handling + JSON marshalling
- 2x memory limit prevents OOMKill on traffic spikes

### Bridge Deployment (Node.js + TypeScript)
```yaml
requests:
  memory: "512Mi"  # Node.js + TypeScript + LLM clients
  cpu: "200m"      # 0.2 CPU (routing calculations)
limits:
  memory: "1Gi"    # 2x request (large LLM responses)
  cpu: "1000m"     # 1 full CPU (parallel LLM calls)
```

**Rationale:**
- TypeScript Overmind core + Express + LLM client libraries
- Routing logic is CPU-intensive (complexity analysis, cost calculations)
- LLM API responses can be large (1-2MB JSON payloads)
- Memory router + memory manager add overhead

## Monitoring Commands

### 1. Real-time Resource Usage
```bash
# Watch all pods
kubectl top pod -n overmind --watch

# Specific component
kubectl top pod -n overmind -l component=api
kubectl top pod -n overmind -l component=bridge

# With sorting
kubectl top pod -n overmind --sort-by=memory
kubectl top pod -n overmind --sort-by=cpu
```

### 2. Historical Metrics (Prometheus)
```promql
# Memory usage percentage
100 * (
  container_memory_working_set_bytes{namespace="overmind",pod=~"overmind-.*"}
  /
  container_spec_memory_limit_bytes{namespace="overmind",pod=~"overmind-.*"}
)

# CPU usage percentage
100 * rate(container_cpu_usage_seconds_total{namespace="overmind"}[5m])
/
container_spec_cpu_quota{namespace="overmind"}
* container_spec_cpu_period{namespace="overmind"}

# p95 memory usage (last 24h)
histogram_quantile(0.95,
  rate(container_memory_working_set_bytes{namespace="overmind"}[24h])
)
```

### 3. Check for OOMKills
```bash
# Look for OOMKilled containers
kubectl get pods -n overmind -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}' | grep OOMKilled

# Describe pod for detailed events
kubectl describe pod <pod-name> -n overmind | grep -A 5 OOMKilled
```

### 4. Check for CPU Throttling
```bash
# Get throttling metrics from cAdvisor
kubectl exec -it <pod-name> -n overmind -- cat /sys/fs/cgroup/cpu/cpu.stat

# Output example:
# nr_periods: 1000        # Total enforcement periods
# nr_throttled: 50        # Periods where throttled
# throttled_time: 500000  # Nanoseconds throttled
```

## Adjustment Decision Tree

### Memory Adjustments

#### Increase Memory If:
- **OOMKills observed**: Immediate action required
- **Usage consistently > 80% of limit**: Risk of OOMKill
- **p95 usage > 75% of request**: Under-provisioned

**Action:**
```bash
# Increase limits in deployment YAML
sed -i 's/memory: "512Mi"/memory: "768Mi"/' k8s/api-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
```

#### Decrease Memory If:
- **Usage consistently < 50% of request**: Over-provisioned
- **Cluster capacity constrained**: Reclaim unused resources
- **Cost optimization goal**: Reduce waste

**Action:**
```bash
# Decrease requests (keep limit for burst capacity)
# requests: "256Mi" -> "192Mi"
kubectl apply -f k8s/api-deployment.yaml
```

### CPU Adjustments

#### Increase CPU If:
- **Throttling > 10%**: Performance degradation
- **p95 latency increasing**: CPU-bound
- **Usage consistently > 80% of limit**: Saturation

**Action:**
```bash
# Increase CPU limits
# cpu: "500m" -> "750m"
kubectl apply -f k8s/api-deployment.yaml
```

#### Decrease CPU If:
- **Usage consistently < 30% of request**: Over-provisioned
- **No throttling observed**: Excess capacity
- **Cluster CPU pressure**: Reclaim for other workloads

**Action:**
```bash
# Decrease requests
# cpu: "200m" -> "150m"
kubectl apply -f k8s/api-deployment.yaml
```

## HPA Tuning

Current HPA settings (see `k8s/hpa.yaml`):
```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### When to Adjust HPA

**Increase minReplicas (2 -> 3):**
- Traffic patterns show consistent load
- Cold start latency unacceptable
- High availability requirement

**Increase maxReplicas (10 -> 20):**
- Cluster capacity available
- Traffic spikes exceed 10x baseline
- Cost acceptable for elasticity

**Lower CPU target (70% -> 60%):**
- Latency-sensitive workload
- Prefer more replicas over throttling
- Headroom for traffic bursts

**Raise memory target (80% -> 85%):**
- Memory usage very stable
- OOMKills never observed
- Cluster memory constrained

## Recommended Workflow

1. **Establish Baseline** (1 week)
   - Deploy with current settings
   - Monitor with `kubectl top pod`
   - Export Prometheus metrics

2. **Analyze Patterns**
   - Calculate p50, p95, p99 for memory and CPU
   - Identify peak usage periods
   - Check for OOMKills and throttling

3. **Adjust Requests**
   - Set requests = p75 observed usage
   - Ensures proper scheduling
   - Leaves headroom for variability

4. **Set Limits**
   - Memory limits = 2x requests (spike buffer)
   - CPU limits = 2-3x requests (burst capacity)
   - Prevents noisy neighbor issues

5. **Test Under Load**
   - Use load testing tool (k6, Locust)
   - Simulate peak traffic patterns
   - Verify no OOMKills or excessive throttling

6. **Re-evaluate Quarterly**
   - Traffic patterns change over time
   - New features add overhead
   - Cluster capacity evolves

## Example Tuning Session

```bash
# 1. Check current usage
kubectl top pod -n overmind

# Sample output:
# NAME                      CPU(cores)   MEMORY(bytes)
# overmind-api-xxx          45m          180Mi
# overmind-bridge-xxx       120m         420Mi

# 2. Analysis:
# - API: 45m CPU (request: 100m) = 45% utilization ✓
# - API: 180Mi RAM (request: 256Mi) = 70% utilization ✓
# - Bridge: 120m CPU (request: 200m) = 60% utilization ✓
# - Bridge: 420Mi RAM (request: 512Mi) = 82% utilization ⚠️

# 3. Decision: Increase bridge memory request
# Edit k8s/bridge-deployment.yaml:
# memory: "512Mi" -> "640Mi" (request)
# memory: "1Gi" -> "1.25Gi" (limit, maintain 2x ratio)

# 4. Apply changes
kubectl apply -f k8s/bridge-deployment.yaml

# 5. Monitor for 1 week, repeat
```

## Alerting Rules (Prometheus)

```yaml
# Add to prometheus-rules.yaml
groups:
  - name: overmind-resources
    interval: 30s
    rules:
      - alert: OvermindHighMemoryUsage
        expr: |
          100 * (
            container_memory_working_set_bytes{namespace="overmind"}
            / container_spec_memory_limit_bytes{namespace="overmind"}
          ) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.pod }} memory usage > 85%"
          description: "Current: {{ $value }}%"

      - alert: OvermindCPUThrottling
        expr: |
          rate(container_cpu_cfs_throttled_seconds_total{namespace="overmind"}[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.pod }} is being CPU throttled"
          description: "Throttling rate: {{ $value }}"

      - alert: OvermindOOMKill
        expr: |
          kube_pod_container_status_last_terminated_reason{namespace="overmind",reason="OOMKilled"} == 1
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.pod }} was OOMKilled"
          description: "Pod killed due to out-of-memory"
```

## References

- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Vertical Pod Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [Resource Metrics Pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Monitoring with Prometheus](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Last updated**: October 25, 2025
**Owner**: GoblinOS Overmind Team
