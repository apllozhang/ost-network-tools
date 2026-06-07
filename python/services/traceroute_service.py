"""Traceroute service"""
import subprocess
import platform
import re


def execute_traceroute(target: str, max_hops: int = 30, timeout: int = 5) -> dict:
    """
    Execute traceroute.
    """
    is_windows = platform.system().lower() == "windows"

    if is_windows:
        cmd = ["tracert", "-d", "-h", str(max_hops), "-w", str(timeout * 1000), target]
    else:
        cmd = ["traceroute", "-n", "-m", str(max_hops), "-w", str(timeout), target]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout * max_hops + 30
        )
        raw_output = result.stdout
        hops = []

        if is_windows:
            # Windows:  1    <1 ms    <1 ms    <1 ms  192.168.1.1
            # Windows:  2     *        *        *     Request timed out.
            pattern = re.compile(
                r"^\s*(\d+)\s+"
                r"(?:<1 ms|[\d.]+ ms|\*)\s+"
                r"(?:<1 ms|[\d.]+ ms|\*)\s+"
                r"(?:<1 ms|[\d.]+ ms|\*)\s+"
                r"([\d.]+|Request timed out\.|\*)",
                re.MULTILINE,
            )
            for match in pattern.finditer(raw_output):
                hop_num = int(match.group(1))
                dest = match.group(2).strip()
                if dest in ("Request timed out.", "*"):
                    hops.append(
                        {"hop": hop_num, "ip": None, "latency_ms": None, "hostname": None}
                    )
                else:
                    # Extract latency from first attempt
                    latency_pattern = re.compile(
                        r"^\s*" + str(hop_num) + r"\s+([\d.]+|<1)\s*ms", re.MULTILINE
                    )
                    lat_match = latency_pattern.search(raw_output)
                    lat = None
                    if lat_match:
                        val = lat_match.group(1)
                        lat = 0.5 if val == "<1" else float(val)
                    hops.append(
                        {"hop": hop_num, "ip": dest, "latency_ms": lat, "hostname": None}
                    )
        else:
            # Linux: 1  192.168.1.1  1.234 ms  1.456 ms  1.789 ms
            # Linux: 2  * * *
            for line in raw_output.splitlines():
                match = re.match(
                    r"^\s*(\d+)\s+(?:\(([\d.]+)\)\s+)?([\d.]+|[*])\s+ms", line
                )
                if not match:
                    # Try the * * * pattern
                    match_star = re.match(r"^\s*(\d+)\s+\*\s+\*\s+\*", line)
                    if match_star:
                        hops.append(
                            {
                                "hop": int(match_star.group(1)),
                                "ip": None,
                                "latency_ms": None,
                                "hostname": None,
                            }
                        )
                    continue

                hop_num = int(match.group(1))
                ip = match.group(2)  # May be None for hostname format
                latency_str = match.group(3)

                if latency_str == "*":
                    hops.append(
                        {"hop": hop_num, "ip": None, "latency_ms": None, "hostname": None}
                    )
                else:
                    hops.append(
                        {
                            "hop": hop_num,
                            "ip": ip,
                            "latency_ms": float(latency_str),
                            "hostname": None,
                        }
                    )

        return {
            "success": len(hops) > 0,
            "target": target,
            "hops": hops,
            "total_hops": len(hops),
            "raw_output": raw_output,
            "error": None if hops else "No hops found",
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "target": target,
            "hops": [],
            "total_hops": 0,
            "raw_output": "",
            "error": "Traceroute timed out",
        }
    except FileNotFoundError:
        return {
            "success": False,
            "target": target,
            "hops": [],
            "total_hops": 0,
            "raw_output": "",
            "error": "Traceroute command not found",
        }
    except Exception as e:
        return {
            "success": False,
            "target": target,
            "hops": [],
            "total_hops": 0,
            "raw_output": "",
            "error": str(e),
        }
