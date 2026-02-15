# GCP LLM Canary Infra

Terraform module for a canary LLM stack on GCP:

- **Ollama GPU VM** (GCE) for GPU-backed inference.
- **llama.cpp** on **Compute Engine VM** with a reserved static IP.
- Optional **llama.cpp Cloud Run** service (can be disabled).
- **Model gateway** on **Cloud Run** (OpenAI-compatible proxy for routing).
- **Cloudflare Worker** enforces JWT/rate limits at the edge (see `infra/cloudflare/model-gateway/worker.js`).

## Architecture

```
Cloudflare Worker (JWT + rate limit)
  -> Cloud Run model-gateway (local-llm-proxy)
     -> Ollama VM (GPU)
     -> llama.cpp VM (static IP)
```

## Usage

```bash
cd infra/gcp/llm
terraform init
terraform plan -var "project_id=YOUR_PROJECT" -var "region=us-central1" -var "zone=us-central1-a"
terraform apply -var "project_id=YOUR_PROJECT" -var "region=us-central1" -var "zone=us-central1-a"
```

### Key Variables

- `enable_ollama_vm`: toggle the GPU VM (default `true`).
- `ollama_enable_gpu`: set `false` to run Ollama in CPU-only mode when GPU billing/quota is unavailable.
- `enable_llamacpp_vm`: toggle llama.cpp VM with static IP (default `true`).
- `enable_llamacpp_service`: optional Cloud Run llama.cpp fallback.
- `enable_gateway_service`: toggle model-gateway Cloud Run (default `true`).
- `create_project`: set `false` when using an existing project ID.
- `cloud_run_ingress`: set to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` once private ingress is available.
- `gateway_env`: configure proxy settings and auth (API key, allowed models, metrics).
- `fly_egress_cidrs` and `ops_allowed_cidrs`: lock ingress to trusted CIDRs.

### Required network allowlist

When either self-hosted VM is enabled, `fly_egress_cidrs` must be set to real Fly.io egress CIDRs.
Terraform now enforces this precondition on the VM firewall rules.

Example `terraform.tfvars` fragment:

```hcl
fly_egress_cidrs = [
  "x.x.x.x/32",
  "y.y.y.y/32",
]

ops_allowed_cidrs = [
  "a.a.a.a/32",
]
```

### Outputs

- `ollama_vm_public_ip`
- `ollama_vm_static_ip`
- `ollama_vm_private_ip`
- `llamacpp_url`
- `llamacpp_vm_public_ip`
- `llamacpp_vm_static_ip`
- `gateway_url`

## Canary Deploy + Smoke Tests

Use the CI deploy script:

```bash
tools/deploy/ci/deploy_ollama_gcp.sh
```

This script:
1) Applies the terraform module
2) Runs `tools/deploy/ci/test_llamacpp_server.py` against the canary endpoint
3) Returns a pass/fail exit code

## Observability

### Metrics export

The gateway and model runtimes should expose these **ai_** metrics:

- `ai_request_latency_seconds_bucket` (histogram)
- `ai_model_loaded` (gauge: 1 loaded, 0 unloaded)
- `ai_memory_used_bytes` (gauge)
- `ai_memory_total_bytes` (gauge)
- `ai_request_errors_total` (counter)

> Ensure the gateway container exports these via `/metrics` and that Prometheus/Datadog scrapes the endpoint.

### Prometheus alerts

See `infra/gcp/llm/prometheus-alerts.yaml` for:
- p95 latency alert
- model not loaded alert
- memory usage alert

### Datadog monitors

See `infra/gcp/llm/datadog-monitors.md` for Datadog monitor queries and thresholds.

## SLOs

- **Availability**: 99.5% successful responses
- **Latency**: p95 < 2s (gateway) for canary traffic
- **Model readiness**: `ai_model_loaded == 1` for active model

## Runbook

### Symptom: p95 latency spike
1. Check `ai_request_latency_seconds_bucket` (Prometheus) or Datadog p95 monitor.
2. Inspect Cloud Run logs for timeouts or cold starts.
3. Confirm VM GPU utilization and disk I/O (VM metrics).
4. Reduce traffic / scale down concurrency to isolate.

### Symptom: model not loaded
1. Check gateway `/health` and llama.cpp `/health`.
2. Confirm model path and disk mounts in Cloud Run.
3. Verify Ollama model is present on VM (`ollama list`) and llama.cpp responds on `:8080`.

### Symptom: memory pressure
1. Review `ai_memory_used_bytes / ai_memory_total_bytes`.
2. Reduce context size or model size.
3. Restart the model runtime to clear fragmentation.

## Notes

- **Hosting choice**: this module assumes **Ollama on GCE GPU VM** (Option A).
- **Model catalog** and **licensing** are tracked separately. See the repo-level planning notes to confirm which models are approved for production.
