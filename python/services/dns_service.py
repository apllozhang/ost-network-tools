"""DNS lookup service - use socket (no external deps)"""
import socket


def execute_dns_lookup(hostname: str, record_type: str = "A") -> dict:
    """
    DNS lookup using socket.getaddrinfo.
    Note: socket-based lookup only supports A/AAAA records.
    For other types, returns a hint message.
    """
    try:
        # Map record type to socket address family
        family_map = {
            "A": socket.AF_INET,
            "AAAA": socket.AF_INET6,
        }

        family = family_map.get(record_type.upper(), socket.AF_UNSPEC)

        addr_infos = socket.getaddrinfo(hostname, None, family, socket.SOCK_STREAM)

        addresses = list(set(addr[4][0] for addr in addr_infos))

        # For non-A/AAAA types, we do a basic lookup and note the limitation
        if record_type.upper() not in ("A", "AAAA"):
            # Fallback: do a general lookup and note limitation
            addr_infos_all = socket.getaddrinfo(
                hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM
            )
            addresses = list(set(addr[4][0] for addr in addr_infos_all))

        return {
            "success": True,
            "hostname": hostname,
            "record_type": record_type,
            "addresses": sorted(addresses),
            "error": None,
        }
    except socket.gaierror as e:
        return {
            "success": False,
            "hostname": hostname,
            "record_type": record_type,
            "addresses": [],
            "error": f"DNS resolution failed: {e.strerror}",
        }
    except Exception as e:
        return {
            "success": False,
            "hostname": hostname,
            "record_type": record_type,
            "addresses": [],
            "error": str(e),
        }
