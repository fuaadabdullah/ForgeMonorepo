# Docker Daemon Reference (dockerd)

## Overview
This is the official Docker documentation for the `dockerd` command, the persistent process that manages containers. Docker uses different binaries for the daemon and client. To run the daemon you type `dockerd`.

## Usage
```
dockerd [OPTIONS]
```

A self-sufficient runtime for containers.

## Options
- `--add-runtime runtime`: Register an additional OCI compatible runtime (default [])
- `--allow-direct-routing`: Allow remote access to published ports on container IP addresses
- `--authorization-plugin list`: Authorization plugins to load
- `--bip string`: IPv4 address for the default bridge
- `--bip6 string`: IPv6 address for the default bridge
- `-b, --bridge string`: Attach containers to a network bridge
- `--cdi-spec-dir list`: CDI specification directories to use
- `--cgroup-parent string`: Set parent cgroup for all containers
- `--config-file string`: Daemon configuration file (default "/etc/docker/daemon.json")
- `--containerd string`: containerd grpc address
- `--containerd-namespace string`: Containerd namespace to use (default "moby")
- `--containerd-plugins-namespace string`: Containerd namespace to use for plugins (default "plugins.moby")
- `--cpu-rt-period int`: Limit the CPU real-time period in microseconds for the parent cgroup for all containers (not supported with cgroups v2)
- `--cpu-rt-runtime int`: Limit the CPU real-time runtime in microseconds for the parent cgroup for all containers (not supported with cgroups v2)
- `--cri-containerd`: start containerd with cri
- `--data-root string`: Root directory of persistent Docker state (default "/var/lib/docker")
- `-D, --debug`: Enable debug mode
- `--default-address-pool pool-options`: Default address pools for node specific local networks
- `--default-cgroupns-mode string`: Default mode for containers cgroup namespace ("host" | "private") (default "private")
- `--default-gateway ip`: Default gateway IPv4 address for the default bridge network
- `--default-gateway-v6 ip`: Default gateway IPv6 address for the default bridge network
- `--default-ipc-mode string`: Default mode for containers ipc ("shareable" | "private") (default "private")
- `--default-network-opt mapmap`: Default network options (default map[])
- `--default-runtime string`: Default OCI runtime for containers (default "runc")
- `--default-shm-size bytes`: Default shm size for containers (default 64MiB)
- `--default-ulimit ulimit`: Default ulimits for containers (default [])
- `--dns list`: DNS server to use
- `--dns-opt list`: DNS options to use
- `--dns-search list`: DNS search domains to use
- `--exec-opt list`: Runtime execution options
- `--exec-root string`: Root directory for execution state files (default "/var/run/docker")
- `--experimental`: Enable experimental features
- `--feature map`: Enable feature in the daemon
- `--fixed-cidr string`: IPv4 subnet for the default bridge network
- `--fixed-cidr-v6 string`: IPv6 subnet for the default bridge network
- `-G, --group string`: Group for the unix socket (default "docker")
- `--help`: Print usage
- `-H, --host list`: Daemon socket(s) to connect to
- `--host-gateway-ip list`: IP addresses that the special 'host-gateway' string in --add-host resolves to. Defaults to the IP addresses of the default bridge
- `--http-proxy string`: HTTP proxy URL to use for outgoing traffic
- `--https-proxy string`: HTTPS proxy URL to use for outgoing traffic
- `--icc`: Enable inter-container communication for the default bridge network (default true)
- `--init`: Run an init in the container to forward signals and reap processes
- `--init-path string`: Path to the docker-init binary
- `--insecure-registry list`: Enable insecure registry communication
- `--ip ip`: Host IP for port publishing from the default bridge network (default 0.0.0.0)
- `--ip-forward`: Enable IP forwarding in system configuration (default true)
- `--ip-forward-no-drop`: Do not set the filter-FORWARD policy to DROP when enabling IP forwarding
- `--ip-masq`: Enable IP masquerading for the default bridge network (default true)
- `--ip6tables`: Enable addition of ip6tables rules (default true)
- `--iptables`: Enable addition of iptables rules (default true)
- `--ipv6`: Enable IPv6 networking for the default bridge network
- `--label list`: Set key=value labels to the daemon
- `--live-restore`: Enable live restore of docker when containers are still running
- `--log-driver string`: Default driver for container logs (default "json-file")
- `--log-format string`: Set the logging format ("text"|"json") (default "text")
- `-l, --log-level string`: Set the logging level ("debug"|"info"|"warn"|"error"|"fatal") (default "info")
- `--log-opt map`: Default log driver options for containers (default map[])
- `--max-concurrent-downloads int`: Set the max concurrent downloads (default 3)
- `--max-concurrent-uploads int`: Set the max concurrent uploads (default 5)
- `--max-download-attempts int`: Set the max download attempts for each pull (default 5)
- `--metrics-addr string`: Set default address and port to serve the metrics api on
- `--mtu int`: Set the MTU for the default "bridge" network (default 1500)
- `--network-control-plane-mtu int`: Network Control plane MTU (default 1500)
- `--no-new-privileges`: Set no-new-privileges by default for new containers
- `--no-proxy string`: Comma-separated list of hosts or IP addresses for which the proxy is skipped
- `--node-generic-resource list`: Advertise user-defined resource
- `-p, --pidfile string`: Path to use for daemon PID file (default "/var/run/docker.pid")
- `--raw-logs`: Full timestamps without ANSI coloring
- `--registry-mirror list`: Preferred registry mirror
- `--rootless`: Enable rootless mode; typically used with RootlessKit
- `--seccomp-profile string`: Path to seccomp profile. Set to "unconfined" to disable the default seccomp profile (default "builtin")
- `--selinux-enabled`: Enable selinux support
- `--shutdown-timeout int`: Set the default shutdown timeout (default 15)
- `-s, --storage-driver string`: Storage driver to use
- `--storage-opt list`: Storage driver options
- `--swarm-default-advertise-addr string`: Set default address or interface for swarm advertised address
- `--tls`: Use TLS; implied by --tlsverify
- `--tlscacert string`: Trust certs signed only by this CA (default "~/.docker/ca.pem")
- `--tlscert string`: Path to TLS certificate file (default "~/.docker/cert.pem")
- `--tlskey string`: Path to TLS key file (default "~/.docker/key.pem")
- `--tlsverify`: Use TLS and verify the remote
- `--userland-proxy`: Use userland proxy for loopback traffic (default true)
- `--userland-proxy-path string`: Path to the userland proxy binary
- `--userns-remap string`: User/Group setting for user namespaces
- `--validate`: Validate daemon configuration and exit
- `-v, --version`: Print version information and quit

Options with [] may be specified multiple times.

## Description
`dockerd` is the persistent process that manages containers. Docker uses different binaries for the daemon and client. To run the daemon you type `dockerd`.

To run the daemon with debug output, use `dockerd --debug` or add `"debug": true` to the daemon.json file.

**Note**: Enabling experimental features: Enable experimental features by starting dockerd with the `--experimental` flag or adding `"experimental": true` to the daemon.json file.

## Environment Variables
The following list of environment variables are supported by the dockerd daemon. Some of these environment variables are supported both by the Docker Daemon and the docker CLI.

- `DOCKER_CERT_PATH`: Location of your authentication keys. This variable is used both by the docker CLI and the dockerd daemon.
- `DOCKER_DRIVER`: The storage driver to use.
- `DOCKER_RAMDISK`: If set this disables pivot_root.
- `DOCKER_TLS_VERIFY`: When set Docker uses TLS and verifies the remote. This variable is used both by the docker CLI and the dockerd daemon.
- `DOCKER_TMPDIR`: Location for temporary files created by the daemon.
- `HTTP_PROXY`: Proxy URL for HTTP requests unless overridden by NoProxy.
- `HTTPS_PROXY`: Proxy URL for HTTPS requests unless overridden by NoProxy.
- `MOBY_DISABLE_PIGZ`: Disables the use of unpigz to decompress layers in parallel when pulling images, even if it is installed.
- `NO_PROXY`: Comma-separated values specifying hosts that should be excluded from proxying.
- `TMPDIR`: Location for temporary files created by the daemon.

## Examples

### Proxy Configuration
If you are behind an HTTP proxy server, you may need to configure the Docker daemon to use the proxy server. This can be done using environment variables (HTTP_PROXY, HTTPS_PROXY, and NO_PROXY), the http-proxy, https-proxy, and no-proxy fields in the daemon configuration file, or the --http-proxy, --https-proxy, and --no-proxy command-line options.

### Daemon Socket Option
The Docker daemon can listen for Docker Engine API requests via unix, tcp, and fd sockets.

By default, a unix domain socket is created at `/var/run/docker.sock`.

For remote access, you can enable TCP socket with `-H tcp://0.0.0.0:2375`, or use TLS with `-H tcp://0.0.0.0:2376`.

### Bind Docker to Another Host/Port or Unix Socket
To bind to a specific IP and port: `sudo dockerd -H tcp://192.168.1.100:2375`

To use multiple sockets: `sudo dockerd -H unix:///var/run/docker.sock -H tcp://127.0.0.1:2375`

### Daemon Storage Driver
On Linux, supported storage drivers include overlay2, fuse-overlayfs, btrfs, and zfs. overlay2 is preferred.

### Runtime Options
By default, Docker uses runc as the container runtime. Additional runtimes can be registered.

### Daemon DNS Options
Set DNS server: `sudo dockerd --dns 8.8.8.8`

Set DNS search domain: `sudo dockerd --dns-search example.com`

### Insecure Registries
To allow insecure registries: `sudo dockerd --insecure-registry myregistry:5000`

### Default Ulimit Settings
Set default ulimits: `sudo dockerd --default-ulimit nofile=1024:2048`

### Access Authorization
Install authorization plugins: `sudo dockerd --authorization-plugin=plugin1`

### Daemon User Namespace Options
Enable user namespace remapping: `sudo dockerd --userns-remap=default`

### Configure Host Gateway IP
Set custom host gateway IPs: `sudo dockerd --host-gateway-ip 192.168.1.1 --host-gateway-ip 2001:db8::1`

### Configure CDI Devices
Set CDI spec directories: `sudo dockerd --cdi-spec-dir /etc/cdi --cdi-spec-dir /var/run/cdi`

### Miscellaneous Options
- Disable IP masquerading: `--ip-masq=false`
- Set data root: `--data-root /mnt/docker-data`
- Set cgroup parent: `--cgroup-parent=/docker`

### Enable Feature in the Daemon
Enable features: `dockerd --feature cdi=true --feature containerd-snapshotter`

### Daemon Configuration File
Use `/etc/docker/daemon.json` for persistent configuration. Options set in the file must not conflict with command-line flags.

### Run Multiple Daemons
Configure separate data roots, exec roots, and sockets for each daemon instance.

### Default Network Options
Configure default network options in daemon.json under "default-network-opts".

## Full Configuration Examples

### Linux daemon.json
```json
{
  "allow-direct-routing": false,
  "authorization-plugins": [],
  "bip": "",
  "bip6": "",
  "bridge": "",
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "10GB",
      "policy": [
        { "keepStorage": "10GB", "filter": ["unused-for=2200h"] },
        { "keepStorage": "50GB", "filter": ["unused-for=3300h"] },
        { "keepStorage": "100GB", "all": true }
      ]
    }
  },
  "cgroup-parent": "",
  "containerd": "/run/containerd/containerd.sock",
  "containerd-namespace": "docker",
  "containerd-plugins-namespace": "docker-plugins",
  "data-root": "",
  "debug": true,
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    },
    {
      "base": "172.31.0.0/16",
      "size": 24
    }
  ],
  "default-cgroupns-mode": "private",
  "default-gateway": "",
  "default-gateway-v6": "",
  "default-network-opts": {},
  "default-runtime": "runc",
  "default-shm-size": "64M",
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Name": "nofile",
      "Soft": 64000
    }
  },
  "dns": [],
  "dns-opts": [],
  "dns-search": [],
  "exec-opts": [],
  "exec-root": "",
  "experimental": false,
  "features": {
    "cdi": true,
    "containerd-snapshotter": true
  },
  "fixed-cidr": "",
  "fixed-cidr-v6": "",
  "group": "",
  "host-gateway-ip": "",
  "hosts": [],
  "proxies": {
    "http-proxy": "http://proxy.example.com:80",
    "https-proxy": "https://proxy.example.com:443",
    "no-proxy": "*.test.example.com,.example.org"
  },
  "icc": false,
  "init": false,
  "init-path": "/usr/libexec/docker-init",
  "insecure-registries": [],
  "ip": "0.0.0.0",
  "ip-forward": false,
  "ip-masq": false,
  "iptables": false,
  "ip6tables": false,
  "ipv6": false,
  "labels": [],
  "live-restore": true,
  "log-driver": "json-file",
  "log-format": "text",
  "log-level": "",
  "log-opts": {
    "cache-disabled": "false",
    "cache-max-file": "5",
    "cache-max-size": "20m",
    "cache-compress": "true",
    "env": "os,customer",
    "labels": "somelabel",
    "max-file": "5",
    "max-size": "10m"
  },
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5,
  "max-download-attempts": 5,
  "mtu": 0,
  "no-new-privileges": false,
  "node-generic-resources": [
    "NVIDIA-GPU=UUID1",
    "NVIDIA-GPU=UUID2"
  ],
  "pidfile": "",
  "raw-logs": false,
  "registry-mirrors": [],
  "runtimes": {
    "cc-runtime": {
      "path": "/usr/bin/cc-runtime"
    },
    "custom": {
      "path": "/usr/local/bin/my-runc-replacement",
      "runtimeArgs": [
        "--debug"
      ]
    }
  },
  "seccomp-profile": "",
  "selinux-enabled": false,
  "shutdown-timeout": 15,
  "storage-driver": "",
  "storage-opts": [],
  "swarm-default-advertise-addr": "",
  "tls": true,
  "tlscacert": "",
  "tlscert": "",
  "tlskey": "",
  "tlsverify": true,
  "userland-proxy": false,
  "userland-proxy-path": "/usr/libexec/docker-proxy",
  "userns-remap": ""
}
```

### Windows daemon.json
```json
{
  "authorization-plugins": [],
  "bridge": "",
  "containerd": "\\\\.\\pipe\\containerd-containerd",
  "containerd-namespace": "docker",
  "containerd-plugins-namespace": "docker-plugins",
  "data-root": "",
  "debug": true,
  "default-network-opts": {},
  "default-runtime": "",
  "default-ulimits": {},
  "dns": [],
  "dns-opts": [],
  "dns-search": [],
  "exec-opts": [],
  "experimental": false,
  "features": {},
  "fixed-cidr": "",
  "group": "",
  "host-gateway-ip": "",
  "hosts": [],
  "insecure-registries": [],
  "labels": [],
  "log-driver": "",
  "log-format": "text",
  "log-level": "",
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5,
  "max-download-attempts": 5,
  "mtu": 0,
  "pidfile": "",
  "raw-logs": false,
  "registry-mirrors": [],
  "shutdown-timeout": 15,
  "storage-driver": "",
  "storage-opts": [],
  "swarm-default-advertise-addr": "",
  "tlscacert": "",
  "tlscert": "",
  "tlskey": "",
  "tlsverify": true
}
```

## Feature Options
Configure features in daemon.json:
```json
{
  "features": {
    "containerd-snapshotter": true,
    "cdi": true
  }
}
```

## Configuration Reload Behavior
Some options can be reloaded without restarting the daemon:
- debug
- labels
- live-restore
- max-concurrent-downloads/uploads
- max-download-attempts
- default-runtime
- runtimes
- authorization-plugin
- insecure-registries
- registry-mirrors
- shutdown-timeout
- features

## Source
This documentation is from the official Docker documentation at https://docs.docker.com/reference/cli/dockerd/

Last updated: Based on Docker Engine documentation
