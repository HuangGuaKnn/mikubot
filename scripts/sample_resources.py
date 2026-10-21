"""Read-only Linux/container resource samples; never starts or reconfigures services.

Run on the target host, e.g. python scripts/sample_resources.py --container NAME
--seconds 60 --output resource-sample.json. No credentials or chat data are read.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import time


def read_number(path):
    try:
        value = Path(path).read_text().strip()
        return int(value) if value != 'max' else None
    except (OSError, ValueError):
        return None


def linux_sample(pid=None, *, proc_root=Path('/proc'), cgroup_root=Path('/sys/fs/cgroup')):
    result = {'host_memory': {}, 'cgroup': {}, 'process_rss_bytes': None}
    try:
        for line in (proc_root / 'meminfo').read_text().splitlines():
            key, value = line.split(':', 1)
            if key in ('MemTotal', 'MemAvailable', 'SwapTotal', 'SwapFree'):
                result['host_memory'][key] = int(value.split()[0]) * 1024
    except (OSError, ValueError, IndexError):
        pass
    # In a container this is its own cgroup view; host-wide cgroup files are
    # labelled as such rather than attributed to an arbitrary application.
    for name in ('memory.current', 'memory.peak', 'memory.max'):
        result['cgroup'][name] = read_number(cgroup_root / name)
    try:
        result['cgroup']['memory.events'] = {key: int(value) for key, value in
            (line.split() for line in (cgroup_root / 'memory.events').read_text().splitlines())}
    except (OSError, ValueError):
        result['cgroup']['memory.events'] = None
    if pid is not None:
        try:
            pages = int((proc_root / str(pid) / 'statm').read_text().split()[1])
            result['process_rss_bytes'] = pages * os.sysconf('SC_PAGE_SIZE')
        except (OSError, ValueError, AttributeError, IndexError):
            pass
    return result


def docker_sample(container):
    def run(args):
        result = subprocess.run(['docker', *args], capture_output=True, text=True, timeout=15, check=True)
        return json.loads(result.stdout)
    # Avoid docker inspect's environment, mount paths and other private data.
    template = '{"memory_limit_bytes":{{.HostConfig.Memory}},"nano_cpus":{{.HostConfig.NanoCpus}},"oom_killed":{{.State.OOMKilled}},"running":{{.State.Running}},"restart_count":{{.RestartCount}},"exit_code":{{.State.ExitCode}}}'
    try:
        return {'limits': run(['inspect', '--format', template, container]),
                'usage': run(['stats', '--no-stream', '--format', '{{json .}}', container])}
    except (OSError, subprocess.SubprocessError, ValueError):
        return {'error': 'docker_resource_read_failed'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--container', help='Existing container name or ID; no start/stop actions')
    parser.add_argument('--pid', type=int, help='Existing Linux service PID')
    parser.add_argument('--seconds', type=int, default=60)
    parser.add_argument('--interval', type=int, default=5)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    if not 1 <= args.seconds <= 3600 or not 1 <= args.interval <= 60 or args.pid is not None and args.pid < 1:
        parser.error('seconds须1–3600，interval须1–60，pid须为正整数')
    started, samples = time.monotonic(), []
    while True:
        sample = {'elapsed_seconds': round(time.monotonic() - started, 2), **linux_sample(args.pid)}
        if args.container:
            sample['container'] = docker_sample(args.container)
        samples.append(sample)
        left = args.seconds - (time.monotonic() - started)
        if left <= 0:
            break
        time.sleep(min(args.interval, left))
    report = {'schema_version': 1, 'samples': samples,
              'notes': ['Host memory, process RSS and container memory are different measurements.',
                        'QQ/model use must be recorded separately by the tester; this tool never calls them.',
                        'Limits may trigger OOM; they do not reduce application allocation automatically.']}
    value = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(value, encoding='utf-8')
    else:
        print(value)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
