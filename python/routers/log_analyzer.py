import re
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LogParseRequest(BaseModel):
    section: str
    raw_output: str


class LogSectionsRequest(BaseModel):
    raw_output: str


# Common AOS log sections and their CLI commands
SECTION_PATTERNS = [
    (r"show\s+system", "show system"),
    (r"show\s+health", "show health"),
    (r"show\s+temperature", "show temperature"),
    (r"show\s+vlan", "show vlan"),
    (r"show\s+interfaces", "show interfaces"),
    (r"show\s+interfaces\s+status", "show interfaces status"),
    (r"show\s+interfaces\s+detail", "show interfaces detail"),
    (r"show\s+power", "show power"),
    (r"show\s+poe", "show poe"),
    (r"show\s+mac-address", "show mac-address"),
    (r"show\s+lldp", "show lldp"),
    (r"show\s+spanning-tree", "show spanning-tree"),
    (r"show\s+ip\s+route", "show ip route"),
    (r"show\s+arp", "show arp"),
    (r"show\s+logging", "show logging"),
    (r"show\s+version", "show version"),
    (r"show\s+running", "show running"),
    (r"show\s+flash", "show flash"),
    (r"show\s+memory", "show memory"),
    (r"show\s+cpu", "show cpu"),
]


def _extract_sections(raw_output: str) -> list[str]:
    """Extract available sections from tech_support.log content."""
    sections = []
    seen = set()
    for pattern, command in SECTION_PATTERNS:
        if re.search(pattern, raw_output, re.IGNORECASE) and command not in seen:
            sections.append(command)
            seen.add(command)
    return sections


@router.post("/api/log/parse")
def parse_log_section(req: LogParseRequest):
    """Parse a specific section from log output using textfsm-aos."""
    try:
        from textfsm_aos.parser import parse

        try:
            result = parse("ale_aos8", req.section, req.raw_output)
        except Exception:
            result = parse("ale_aos6", req.section, req.raw_output)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


@router.post("/api/log/sections")
def extract_log_sections(req: LogSectionsRequest):
    """Extract available sections from raw tech_support.log text."""
    try:
        sections = _extract_sections(req.raw_output)
        return {"success": True, "data": sections}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}
