"""HTTP check service - use urllib (no external deps needed)"""
import urllib.request
import time


def execute_http_check(url: str, timeout: int = 10, method: str = "GET") -> dict:
    """
    Check HTTP URL availability.
    """
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header("User-Agent", "OST-NetworkTools/1.0")
        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed = round((time.monotonic() - start) * 1000, 2)
            content_length = response.headers.get("Content-Length")
            return {
                "success": True,
                "url": url,
                "status_code": response.status,
                "response_ms": elapsed,
                "content_length": int(content_length) if content_length else None,
                "error": None,
            }
    except urllib.error.HTTPError as e:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "url": url,
            "status_code": e.code,
            "response_ms": elapsed,
            "content_length": None,
            "error": f"HTTP {e.code}: {e.reason}",
        }
    except urllib.error.URLError as e:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "url": url,
            "status_code": None,
            "response_ms": elapsed,
            "content_length": None,
            "error": f"URL error: {e.reason}",
        }
    except Exception as e:
        elapsed = round((time.monotonic() - start) * 1000, 2)
        return {
            "success": False,
            "url": url,
            "status_code": None,
            "response_ms": elapsed,
            "content_length": None,
            "error": str(e),
        }
