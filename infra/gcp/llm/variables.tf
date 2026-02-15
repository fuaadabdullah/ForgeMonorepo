variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "create_project" {
  description = "Whether this module should create/manage the GCP project resource"
  type        = bool
  default     = false
}

variable "billing_account" {
  description = "Billing account ID to link the project to"
  type        = string
  default     = "01BA02-C7A6A7-4F4E25"
}

variable "region" {
  description = "GCP region for Cloud Run and networking"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for the llama GPU VM"
  type        = string
  default     = "us-central1-a"
}

variable "google_credentials_json" {
  description = "Optional JSON credentials for Terraform runs"
  type        = string
  default     = ""
  sensitive   = true
}

variable "create_network" {
  description = "Whether to create a dedicated VPC network"
  type        = bool
  default     = true
}

variable "network_name" {
  description = "Name of the VPC network (used when create_network=false)"
  type        = string
  default     = "llm-net"
}

variable "subnetwork_name" {
  description = "Name of the subnetwork (used when create_network=false)"
  type        = string
  default     = "llm-subnet"
}

variable "network_self_link" {
  description = "Existing VPC network self link (used when create_network=false)"
  type        = string
  default     = ""
}

variable "subnetwork_self_link" {
  description = "Existing subnetwork self link (used when create_network=false)"
  type        = string
  default     = ""
}

variable "subnet_cidr" {
  description = "CIDR block for the LLM subnetwork"
  type        = string
  default     = "10.70.0.0/20"
}

variable "vpc_connector_cidr" {
  description = "CIDR block for the Cloud Run VPC connector"
  type        = string
  default     = "10.70.16.0/28"
}

variable "ollama_allowed_cidrs" {
  description = "Additional CIDR blocks allowed to reach self-hosted LLM VMs"
  type        = list(string)
  default     = []
}

variable "fly_egress_cidrs" {
  description = "Fly.io egress CIDRs that are allowed to reach LLM VM endpoints"
  type        = list(string)
  default     = []
}

variable "ops_allowed_cidrs" {
  description = "Operator/admin CIDRs that are allowed to reach LLM VM endpoints"
  type        = list(string)
  default     = []
}

variable "enable_ollama_vm" {
  description = "Enable provisioning of the llama GPU VM"
  type        = bool
  default     = true
}

variable "ollama_vm_name" {
  description = "Name of the llama GPU VM"
  type        = string
  default     = "ollama-gpu"
}

variable "ollama_static_ip_name" {
  description = "Reserved regional static external IP name for the Ollama VM"
  type        = string
  default     = "ollama-gpu-static-ip"
}

variable "ollama_machine_type" {
  description = "Machine type for the llama VM"
  type        = string
  default     = "n1-standard-8"
}

variable "ollama_enable_gpu" {
  description = "Attach GPU accelerator to Ollama VM (disable for CPU-only fallback)"
  type        = bool
  default     = true
}

variable "ollama_gpu_type" {
  description = "GPU type for the llama VM"
  type        = string
  default     = "nvidia-tesla-t4"
}

variable "ollama_gpu_count" {
  description = "Number of GPUs attached to the llama VM"
  type        = number
  default     = 1
}

variable "ollama_boot_disk_gb" {
  description = "Boot disk size in GB for the llama VM"
  type        = number
  default     = 200
}

variable "ollama_image_project" {
  description = "Image project for the llama VM"
  type        = string
  default     = "ubuntu-os-cloud"
}

variable "ollama_image_family" {
  description = "Image family for the llama VM"
  type        = string
  default     = "ubuntu-2204-lts"
}

variable "ollama_startup_script" {
  description = "Startup script for installing and starting Ollama"
  type        = string
  default     = <<-EOT
    #!/usr/bin/env bash
    set -euo pipefail

    apt-get update -y
    apt-get install -y curl ca-certificates jq

    if ! command -v docker >/dev/null 2>&1; then
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl restart docker
    fi

    mkdir -p /opt/ollama

    cat > /etc/systemd/system/ollama.service <<'EOF'
    [Unit]
    Description=Ollama server (Docker)
    After=network-online.target docker.service
    Requires=docker.service
    Wants=network-online.target

    [Service]
    Restart=always
    RestartSec=5
    ExecStartPre=-/usr/bin/docker rm -f ollama
    ExecStart=/usr/bin/docker run --name ollama --network host -v /opt/ollama:/root/.ollama ollama/ollama:latest
    ExecStop=/usr/bin/docker stop ollama

    [Install]
    WantedBy=multi-user.target
    EOF

    systemctl daemon-reload
    systemctl enable ollama
    systemctl restart ollama

    # Wait for API readiness
    for i in $(seq 1 45); do
      if curl -sf --max-time 2 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
        break
      fi
      sleep 2
    done

    # Best-effort model warm-up (does not fail startup).
    /usr/bin/docker exec ollama ollama pull gemma:2b || true
    /usr/bin/docker exec ollama ollama pull phi3:3.8b || true
    /usr/bin/docker exec ollama ollama pull qwen2.5:3b || true
    /usr/bin/docker exec ollama ollama pull mistral:7b || true
  EOT
}

variable "enable_llamacpp_vm" {
  description = "Enable provisioning of a llama.cpp Compute Engine VM with static IP"
  type        = bool
  default     = true
}

variable "llamacpp_vm_name" {
  description = "Compute Engine VM name for llama.cpp server"
  type        = string
  default     = "llamacpp-server"
}

variable "llamacpp_static_ip_name" {
  description = "Reserved regional static external IP name for the llama.cpp VM"
  type        = string
  default     = "llamacpp-server-static-ip"
}

variable "llamacpp_machine_type" {
  description = "Machine type for the llama.cpp VM"
  type        = string
  default     = "e2-standard-8"
}

variable "llamacpp_boot_disk_gb" {
  description = "Boot disk size in GB for the llama.cpp VM"
  type        = number
  default     = 200
}

variable "llamacpp_image_project" {
  description = "Image project for the llama.cpp VM"
  type        = string
  default     = "ubuntu-os-cloud"
}

variable "llamacpp_image_family" {
  description = "Image family for the llama.cpp VM"
  type        = string
  default     = "ubuntu-2204-lts"
}

variable "llamacpp_startup_script" {
  description = "Startup script for llama.cpp OpenAI-compatible server on :8080"
  type        = string
  default     = <<-EOT
    #!/usr/bin/env bash
    set -euo pipefail

    apt-get update -y
    apt-get install -y curl ca-certificates

    if ! command -v docker >/dev/null 2>&1; then
      curl -fsSL https://get.docker.com | sh
      systemctl enable docker
      systemctl restart docker
    fi

    mkdir -p /opt/llamacpp/models
    MODEL_PATH="/opt/llamacpp/models/model.gguf"
    MODEL_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

    if [ ! -s "$MODEL_PATH" ]; then
      echo "[llamacpp] Downloading model: $MODEL_URL"
      curl -fL --retry 6 --retry-delay 5 --retry-all-errors -o "$${MODEL_PATH}.tmp" "$MODEL_URL"
      mv "$${MODEL_PATH}.tmp" "$MODEL_PATH"
    fi

    cat > /etc/systemd/system/llamacpp.service <<'EOF'
    [Unit]
    Description=llama.cpp OpenAI-compatible server
    After=network-online.target docker.service
    Requires=docker.service
    Wants=network-online.target

    [Service]
    Restart=always
    RestartSec=5
    ExecStartPre=-/usr/bin/docker rm -f llamacpp-server
    ExecStart=/usr/bin/docker run --name llamacpp-server --network host -v /opt/llamacpp/models:/models ghcr.io/ggml-org/llama.cpp:server \
      --host 0.0.0.0 --port 8080 -m /models/model.gguf --ctx-size 4096
    ExecStop=/usr/bin/docker stop llamacpp-server

    [Install]
    WantedBy=multi-user.target
    EOF

    systemctl daemon-reload
    systemctl enable llamacpp
    systemctl restart llamacpp

    # Best-effort startup verification for diagnostics.
    for i in $(seq 1 30); do
      if curl -sf --max-time 2 "http://127.0.0.1:8080/v1/models" >/dev/null 2>&1; then
        echo "[llamacpp] API healthy on :8080"
        exit 0
      fi
      sleep 2
    done
    echo "[llamacpp] API not healthy after startup window"
  EOT
}

variable "create_service_account" {
  description = "Create a dedicated service account for the LLM services"
  type        = bool
  default     = true
}

variable "service_account_name" {
  description = "Service account name for LLM workloads"
  type        = string
  default     = "llm-runtime"
}

variable "ollama_service_account_email" {
  description = "Existing service account email for the llama VM"
  type        = string
  default     = ""
}

variable "enable_llamacpp_service" {
  description = "Enable Cloud Run llama.cpp service"
  type        = bool
  default     = true
}

variable "llamacpp_service_name" {
  description = "Cloud Run service name for llama.cpp"
  type        = string
  default     = "llamacpp"
}

variable "llamacpp_image" {
  description = "Container image for llama.cpp"
  type        = string
  default     = "ghcr.io/ggml-org/llama.cpp:server"
}

variable "llamacpp_container_port" {
  description = "Container port for llama.cpp"
  type        = number
  default     = 8080
}

variable "llamacpp_min_instances" {
  description = "Minimum instances for llama.cpp Cloud Run service"
  type        = number
  default     = 0
}

variable "llamacpp_max_instances" {
  description = "Maximum instances for llama.cpp Cloud Run service"
  type        = number
  default     = 2
}

variable "llamacpp_env" {
  description = "Environment variables for llama.cpp"
  type        = map(string)
  default = {
    MODEL_PATH = "/models/model.gguf"
  }
}

variable "enable_gateway_service" {
  description = "Enable Cloud Run model gateway service"
  type        = bool
  default     = true
}

variable "gateway_service_name" {
  description = "Cloud Run service name for the model gateway"
  type        = string
  default     = "model-gateway"
}

variable "gateway_image" {
  description = "Container image for the model gateway (local-llm-proxy)"
  type        = string
  default     = "ghcr.io/goblinos/local-llm-proxy:latest"
}

variable "gateway_container_port" {
  description = "Container port for the model gateway"
  type        = number
  default     = 8002
}

variable "gateway_min_instances" {
  description = "Minimum instances for the model gateway"
  type        = number
  default     = 1
}

variable "gateway_max_instances" {
  description = "Maximum instances for the model gateway"
  type        = number
  default     = 3
}

variable "gateway_env" {
  description = "Environment variables for the model gateway"
  type        = map(string)
  default     = {}
}

variable "cloud_run_ingress" {
  description = "Ingress setting for Cloud Run services"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}
