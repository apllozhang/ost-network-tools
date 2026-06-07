"""Network diagnostic tools router"""
from fastapi import APIRouter
from pydantic import BaseModel

from services import ping_service, tcp_service, http_service, dns_service, traceroute_service

router = APIRouter(prefix="/api/tools", tags=["tools"])


# ── Request models ──────────────────────────────────────────────

class PingRequest(BaseModel):
    target: str
    count: int = 4
    timeout: int = 5


class TcpCheckRequest(BaseModel):
    target: str
    port: int
    timeout: int = 5


class HttpCheckRequest(BaseModel):
    url: str
    timeout: int = 10


class DnsLookupRequest(BaseModel):
    hostname: str
    record_type: str = "A"


class TracerouteRequest(BaseModel):
    target: str
    max_hops: int = 30
    timeout: int = 5


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/ping")
def ping(req: PingRequest):
    return ping_service.execute_ping(req.target, req.count, req.timeout)


@router.post("/tcp")
def tcp_check(req: TcpCheckRequest):
    return tcp_service.execute_tcp_check(req.target, req.port, req.timeout)


@router.post("/http")
def http_check(req: HttpCheckRequest):
    return http_service.execute_http_check(req.url, req.timeout)


@router.post("/dns")
def dns_lookup(req: DnsLookupRequest):
    return dns_service.execute_dns_lookup(req.hostname, req.record_type)


@router.post("/traceroute")
def traceroute(req: TracerouteRequest):
    return traceroute_service.execute_traceroute(req.target, req.max_hops, req.timeout)
