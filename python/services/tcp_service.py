"""TCP port check service"""
import socket
import time


def execute_tcp_check(target: str, port: int, timeout: int = 5) -> dict:
    """
    Check TCP port connectivity.
    """
    start = time.monotonic()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((target, port))
        elapsed = round((time.monotonic() - start) * 1000, 2)
        sock.close()
        return {
            "success": True,
            "target": target,
            "port": port,
            "connect_ms": elapsed,
            "error": None,
        }
    except socket.timeout:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "target": target,
            "port": port,
            "connect_ms": elapsed,
            "error": "Connection timed out",
        }
    except ConnectionRefusedError:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "target": target,
            "port": port,
            "connect_ms": elapsed,
            "error": "Connection refused",
        }
    except socket.gaierror as e:
        return {
            "success": False,
            "target": target,
            "port": port,
            "connect_ms": None,
            "error": f"DNS resolution failed: {e.strerror}",
        }
    except Exception as e:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "target": target,
            "port": port,
            "connect_ms": elapsed,
            "error": str(e),
        }
