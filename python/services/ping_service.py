"""Ping execution service"""
import subprocess
import platform
import re


def execute_ping(target: str, count: int = 4, timeout: int = 5) -> dict:
    """
    Execute ping and return structured results.
    """
    is_windows = platform.system().lower() == "windows"

    if is_windows:
        cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), target]
    else:
        cmd = ["ping", "-c", str(count), "-W", str(timeout), target]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout * count + 10
        )
        raw_output = result.stdout

        # Parse statistics
        sent = count
        received = 0
        loss_rate = 1.0
        min_ms = None
        max_ms = None
        avg_ms = None
        jitter = None

        if is_windows:
            # Windows EN: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
            # Windows CN: 数据包: 已发送 = 2，已接收 = 2，丢失 = 0 (0% 丢失)
            match = re.search(r"(?:Received|已接收)\s*=\s*(\d+)", raw_output)
            if match:
                received = int(match.group(1))
                loss_rate = (sent - received) / sent if sent > 0 else 1.0

            # Windows EN: Minimum = 1ms, Maximum = 2ms, Average = 1ms
            # Windows CN: 最短 = 0ms，最长 = 0ms，平均 = 0ms
            stats = re.search(
                r"(?:Minimum|最短)\s*=\s*([\d.]+)ms[，,]\s*(?:Maximum|最长)\s*=\s*([\d.]+)ms[，,]\s*(?:Average|平均)\s*=\s*([\d.]+)ms",
                raw_output,
                re.IGNORECASE,
            )
            if stats:
                min_ms = float(stats.group(1))
                max_ms = float(stats.group(2))
                avg_ms = float(stats.group(3))
                if min_ms is not None and max_ms is not None:
                    jitter = round(max_ms - min_ms, 2)
        else:
            # Linux: 4 packets transmitted, 4 received, 0% packet loss
            match = re.search(r"(\d+)\s+received", raw_output)
            if match:
                received = int(match.group(1))
                loss_rate = (sent - received) / sent if sent > 0 else 1.0

            # Linux: rtt min/avg/max/mdev = 1.234/2.345/3.456/0.567 ms
            stats = re.search(
                r"min/avg/max/(?:mdev|stddev)\s*=\s*([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)",
                raw_output,
            )
            if stats:
                min_ms = float(stats.group(1))
                avg_ms = float(stats.group(2))
                max_ms = float(stats.group(3))
                jitter = float(stats.group(4))

        success = received > 0

        return {
            "success": success,
            "target": target,
            "packets_sent": sent,
            "packets_received": received,
            "packet_loss_rate": round(loss_rate, 4),
            "latency_ms": avg_ms,
            "min_ms": min_ms,
            "max_ms": max_ms,
            "jitter_ms": jitter,
            "raw_output": raw_output,
            "error": None if success else "No response received",
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "target": target,
            "packets_sent": count,
            "packets_received": 0,
            "packet_loss_rate": 1.0,
            "latency_ms": None,
            "min_ms": None,
            "max_ms": None,
            "jitter_ms": None,
            "raw_output": "",
            "error": "Ping timed out",
        }
    except Exception as e:
        return {
            "success": False,
            "target": target,
            "packets_sent": count,
            "packets_received": 0,
            "packet_loss_rate": 1.0,
            "latency_ms": None,
            "min_ms": None,
            "max_ms": None,
            "jitter_ms": None,
            "raw_output": "",
            "error": str(e),
        }
