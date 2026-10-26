#!/usr/bin/env python3
"""Read-only host metrics for Windows7 Desktop. No inbound server/socket."""
import argparse
import datetime
import json
import os
import pathlib
import platform
import subprocess
import time


def run(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=5, check=True).stdout


def cpu_sample():
    result = []
    for line in pathlib.Path('/proc/stat').read_text().splitlines():
        if not line.startswith('cpu'):
            break
        values = [int(n) for n in line.split()[1:9]]
        result.append((sum(values), values[3] + values[4]))
    return result


def snapshot(previous):
    current = cpu_sample()
    usage = []
    for index, (total, idle) in enumerate(current):
        old_total, old_idle = previous[index] if index < len(previous) else (total, idle)
        usage.append(round(max(0, min(100, 100 * (1 - (idle-old_idle)/(total-old_total)))) if total > old_total else 0, 1))
    memory = {}
    for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        memory[key] = int(value.strip().split()[0]) * 1024
    total = memory.get('MemTotal', 0)
    available = memory.get('MemAvailable', memory.get('MemFree', 0))
    processes = []
    try:
        for line in run(['ps', '-eo', 'pid=,user=,comm=,%cpu=,rss=,nlwp=,etime=', '--sort=-%cpu']).splitlines()[:1000]:
            fields = line.split()
            if len(fields) == 7:
                pid, user, name, cpu, rss, threads, elapsed = fields
                processes.append(dict(pid=int(pid), user=user, name=name, cpu=float(cpu), rss=int(rss), threads=int(threads), elapsed=elapsed))
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    interfaces = []
    for line in pathlib.Path('/proc/net/dev').read_text().splitlines()[2:]:
        name, values = line.split(':', 1)
        name = name.strip()
        if name == 'lo':
            continue
        values = values.split()
        try:
            speed = int(pathlib.Path('/sys/class/net', name, 'speed').read_text()) * 1000000
        except (OSError, ValueError):
            speed = None
        interfaces.append(dict(name=name, received=int(values[0]), sent=int(values[8]), speed=speed))
    containers = []
    docker_available = False
    try:
        for line in run(['docker', 'ps', '-a', '--no-trunc', '--format', '{{json .}}']).splitlines()[:1000]:
            item = json.loads(line)
            containers.append(dict(id=item.get('ID', '')[:12], name=item.get('Names', ''), image=item.get('Image', ''), state=item.get('State', ''), status=item.get('Status', '')))
        docker_available = True
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    return dict(version=1, generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), scope='host',
                host=dict(hostname=platform.node(), platform=platform.system(), arch=platform.machine(), cpus=os.cpu_count(), cpuPercent=usage[0], cpuPerCore=usage[1:],
                          totalMemory=total, freeMemory=available, usedMemory=max(0, total-available), cachedMemory=memory.get('Cached', 0),
                          swapTotal=memory.get('SwapTotal', 0), swapUsed=memory.get('SwapTotal', 0)-memory.get('SwapFree', 0),
                          kernelPaged=memory.get('SReclaimable', 0), kernelNonpaged=memory.get('SUnreclaim', 0),
                          committedMemory=memory.get('Committed_AS', 0), commitLimit=memory.get('CommitLimit', 0),
                          uptime=float(pathlib.Path('/proc/uptime').read_text().split()[0]), threads=sum(p['threads'] for p in processes)),
                processes=processes, interfaces=interfaces, containers=containers, dockerAvailable=docker_available), current


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='/Explorer/.explorer/host-monitor.json')
    parser.add_argument('--interval', type=float, default=2)
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    previous = cpu_sample()
    while True:
        time.sleep(max(0.5, args.interval))
        try:
            data, previous = snapshot(previous)
            temporary = output.with_suffix('.tmp')
            temporary.write_text(json.dumps(data))
            os.chmod(temporary, 0o640)
            os.chown(temporary, 0, 1000)
            os.replace(temporary, output)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            print('Host-Monitor:', error, flush=True)
        if args.once:
            break


if __name__ == '__main__':
    main()
