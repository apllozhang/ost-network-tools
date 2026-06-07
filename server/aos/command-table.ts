// AOS CLI Command Table — ported from OmniVista Smart Tool RestUrl.cs
// %_DATA_% is a positional placeholder replaced by buildCommand()

export const CMD_TBL = {
  // ── System / Chassis / Health ──────────────────────────────────────
  SHOW_SYSTEM: "show system",
  SHOW_CHASSIS: "show chassis",
  SHOW_CMM: "show cmm",
  SHOW_HW_INFO: "show hardware-info",
  SHOW_MICROCODE: "show microcode",
  SHOW_CONFIGURATION: "show configuration snapshot",
  SHOW_RUNNING_DIR: "show running-directory",
  SHOW_TEMPERATURE: "show temperature",
  SHOW_HEALTH: "show health all cpu",
  SHOW_HEALTH_CONFIG: "show health configuration",
  SHOW_FREE_SPACE: "freespace /flash",
  SHOW_USER: "show user",
  SHOW_AAA_AUTH: "show aaa authentication",
  SHOW_AAA_RADIUS: "show aaa radius-server",
  SHOW_LICENSE: "show license",
  SHOW_SYSTEM_UPTIME: "show system uptime",
  SHOW_POWER_SUPPLY: "show chassis power-supply",
  SHOW_FAN: "show chassis fan",

  // ── ARP / IP ───────────────────────────────────────────────────────
  SHOW_ARP: "show arp",
  SHOW_IP_INTERFACE: "show ip interface",
  SHOW_IP_ROUTES: "show ip routes",
  SHOW_IP_SERVICE: "show ip service",
  SHOW_IP_ROUTER_DATABASE: "show ip router database",
  SHOW_STATIC_ROUTES: "show ip static-route",

  // ── VLAN ───────────────────────────────────────────────────────────
  SHOW_VLAN: "show vlan",
  SHOW_VLAN_MEMBERS: "show vlan %_DATA_% members",
  SHOW_VLAN_PORT: "show vlan port %_DATA_%",
  CREATE_VLAN: "vlan %_DATA_%",
  DELETE_VLAN: "no vlan %_DATA_%",
  VLAN_PORT_MEMBERSHIP: "vlan %_DATA_% members port %_DATA_%",
  VLAN_PORT_TAGGED: "vlan %_DATA_% members port %_DATA_% tagged",
  VLAN_PORT_UNTAGGED: "vlan %_DATA_% members port %_DATA_% untagged",
  NO_VLAN_PORT_MEMBERSHIP: "no vlan %_DATA_% members port %_DATA_%",
  SET_VLAN_NAME: "vlan %_DATA_% name %_DATA_%",
  SET_VLAN_ADMIN_STATE: "vlan %_DATA_% admin-state enable",
  SET_DEFAULT_VLAN: "vlan %_DATA_% default-vlan enable",

  // ── Interfaces ─────────────────────────────────────────────────────
  SHOW_INTERFACES: "show interfaces",
  SHOW_TRANSCIEVERS: "show transceivers",
  SHOW_INTERFACE_PORT: "show interfaces port %_DATA_%",
  SHOW_PORTS_LIST: "show interfaces alias",
  SHOW_PORT_STATUS: "show interfaces port %_DATA_% status",
  SHOW_PORT_ALIAS: "show interfaces port %_DATA_% alias",
  SHOW_PORT_DETAIL: "show interfaces port %_DATA_% detail",
  SHOW_PORT_STATS: "show interfaces port %_DATA_% statistics",
  SHOW_IP_INTERFACE_BRIEF: "show ip interface brief",
  ETHERNET_ENABLE: "interfaces %_DATA_% admin-state enable",
  ETHERNET_DISABLE: "interfaces %_DATA_% admin-state disable",
  SET_PORT_ALIAS: "interfaces port %_DATA_% alias %_DATA_%",
  SET_PORT_SPEED_DUPLEX: "interfaces port %_DATA_% speed-duplex %_DATA_%",
  SET_PORT_AUTONEG: "interfaces port %_DATA_% autoneg %_DATA_%",
  CLEAR_PORT_STATS: "clear statistics port %_DATA_%",
  SHOW_PORT_QOS: "show qos port %_DATA_%",

  // ── Spanning Tree ──────────────────────────────────────────────────
  SHOW_BLOCKED_PORTS: "show spantree ports",
  SHOW_SPANTREE: "show spantree",
  SHOW_SPANTREE_VLAN: "show spantree vlan %_DATA_%",

  // ── Link Aggregation ───────────────────────────────────────────────
  SHOW_LINKAGG: "show linkagg agg %_DATA_%",
  SHOW_LINKAGG_PORT: "show linkagg port",
  SHOW_LINKAGG_ALL: "show linkagg",
  CREATE_LINKAGG: "linkagg %_DATA_% size %_DATA_% admin-state enable",
  DELETE_LINKAGG: "no linkagg %_DATA_%",
  LINKAGG_ADD_PORT: "linkagg %_DATA_% member port %_DATA_%",
  LINKAGG_REMOVE_PORT: "no linkagg %_DATA_% member port %_DATA_%",

  // ── PoE / Lanpower ────────────────────────────────────────────────
  SHOW_LAN_POWER: "show lanpower slot %_DATA_%",
  SHOW_LAN_POWER_CONFIG: "show lanpower slot %_DATA_% port-config",
  SHOW_LAN_POWER_FEATURE: "show lanpower slot %_DATA_% %_DATA_%",
  SHOW_CHASSIS_LAN_POWER_STATUS: "show lanpower chassis %_DATA_% status",
  SHOW_SLOT_LAN_POWER_STATUS: "show lanpower slot %_DATA_% status",
  SHOW_PORT_POWER: "show lanpower slot %_DATA_%|grep %_DATA_%",
  SHOW_LAN_POWER_GLOBAL: "show lanpower global",
  POWER_UP_PORT: "lanpower port %_DATA_% admin-state enable",
  POWER_DOWN_PORT: "lanpower port %_DATA_% admin-state disable",
  POWER_UP_SLOT: "lanpower slot %_DATA_% service start",
  POWER_DOWN_SLOT: "lanpower slot %_DATA_% service stop",
  POWER_PRIORITY_PORT: "lanpower port %_DATA_% priority %_DATA_%",
  SET_MAX_POWER_PORT: "lanpower port %_DATA_% power %_DATA_%",
  POWER_4PAIR_PORT: "lanpower port %_DATA_% 4pair enable",
  POWER_2PAIR_PORT: "lanpower port %_DATA_% 4pair disable",
  CAPACITOR_DETECTION_ENABLE: "lanpower port %_DATA_% capacitor-detection enable",
  CAPACITOR_DETECTION_DISABLE: "lanpower port %_DATA_% capacitor-detection disable",
  POWER_823BT_ENABLE: "lanpower slot %_DATA_% 8023bt enable",
  POWER_823BT_DISABLE: "lanpower slot %_DATA_% 8023bt disable",
  SET_LANPOWER_BUDGET: "lanpower slot %_DATA_% maxpower %_DATA_%",

  // ── LLDP ───────────────────────────────────────────────────────────
  SHOW_LLDP_LOCAL: "show lldp local-port",
  SHOW_LLDP_REMOTE: "show lldp nearest-bridge remote-system",
  SHOW_LLDP_INVENTORY: "show lldp remote-system med inventory",
  SHOW_PORT_LLDP_REMOTE: "show lldp port %_DATA_% remote-system",
  SHOW_LLDP_REMOTE_DETAIL: "show lldp port %_DATA_% remote-system detail",
  SHOW_LLDP_STATISTICS: "show lldp statistics",

  // ── MAC Learning ───────────────────────────────────────────────────
  SHOW_MAC_LEARNING: "show mac-learning domain vlan",
  SHOW_PORT_MAC_ADDRESS: "show mac-learning port %_DATA_%",
  SHOW_MAC_LEARNING_VLAN: "show mac-learning vlan %_DATA_%",
  SHOW_MAC_ADDRESS_TABLE: "show mac-address-table",

  // ── TDR Cable Test ─────────────────────────────────────────────────
  ENABLE_TDR: "interfaces port %_DATA_% tdr enable",
  SHOW_TDR_STATISTICS: "show interfaces port %_DATA_% tdr-statistics",
  CLEAR_TDR_STATISTICS: "clear interfaces %_DATA_% tdr-statistics",

  // ── SNMP ───────────────────────────────────────────────────────────
  SHOW_SNMP_COMMUNITY: "show snmp community-map",
  SHOW_SNMP_STATION: "show snmp station",
  SHOW_SNMP_SECURITY: "show snmp security",
  SHOW_SNMP_ENGINE_ID: "show snmp engineID",
  SHOW_SNMP_STATS: "show snmp statistics",
  SNMP_COMMUNITY_MAP: 'snmp community-map "%_DATA_%" user "%_DATA_%" enable',
  SNMP_STATION: 'snmp station %_DATA_% 162 "%_DATA_%" %_DATA_% enable',
  DELETE_COMMUNITY: "no snmp community-map %_DATA_%",
  DELETE_STATION: "no snmp station %_DATA_%",
  SNMP_USER_AUTH: 'snmp user "%_DATA_%" auth %_DATA_% %_DATA_%',
  SNMP_USER_PRIV: 'snmp user "%_DATA_%" auth %_DATA_% %_DATA_% priv %_DATA_%',
  DELETE_SNMP_USER: 'no snmp user "%_DATA_%"',

  // ── System Config ──────────────────────────────────────────────────
  SET_SYSTEM_NAME: "system name %_DATA_%",
  SET_LOCATION: 'system location "%_DATA_%"',
  SET_CONTACT: "system contact %_DATA_%",
  SET_PASSWORD: "user %_DATA_% password %_DATA_%",
  SET_DEFAULT_GATEWAY: "ip static-route 0.0.0.0/0 gateway %_DATA_%",
  WRITE_MEMORY: "write memory flash-synchro",
  REBOOT_SWITCH: "reload from working no rollback-timeout",
  SET_IP_INTERFACE: "ip interface %_DATA_% vlan %_DATA_% ipaddress %_DATA_%",
  DELETE_IP_INTERFACE: "no ip interface %_DATA_%",
  SET_DNS_SERVER: "ip dns server-address %_DATA_%",
  CLEAR_DNS_SERVER: "no ip dns server-address %_DATA_%",

  // ── Services ───────────────────────────────────────────────────────
  ENABLE_SSH: "ip service ssh admin-state enable",
  DISABLE_SSH: "ip service ssh admin-state disable",
  ENABLE_TELNET: "ip service telnet admin-state enable",
  DISABLE_TELNET: "ip service telnet admin-state disable",
  ENABLE_FTP: "ip service ftp admin-state enable",
  DISABLE_FTP: "ip service ftp admin-state disable",
  ENABLE_HTTP: "ip service http admin-state enable",
  DISABLE_HTTP: "ip service http admin-state disable",
  ENABLE_HTTPS: "ip service https admin-state enable",
  DISABLE_HTTPS: "ip service https admin-state disable",
  SHOW_SERVICE: "show service",

  // ── NTP ────────────────────────────────────────────────────────────
  SHOW_NTP: "show ntp associations",
  SET_NTP_SERVER: "ntp server %_DATA_%",
  DELETE_NTP_SERVER: "no ntp server %_DATA_%",
  SET_NTP_AUTH: "ntp authentication-key %_DATA_% md5 %_DATA_%",
  ENABLE_NTP: "ntp admin-state enable",
  DISABLE_NTP: "ntp admin-state disable",

  // ── QoS ────────────────────────────────────────────────────────────
  SHOW_QOS_PORT: "show qos port",
  SHOW_QOS_LOG: "show qos log",
  SHOW_QOS_GLOBAL: "show qos global",

  // ── 802.1X / Port Security ────────────────────────────────────────
  SHOW_8021X: "show dot1x",
  SHOW_8021X_PORT: "show dot1x port %_DATA_%",
  SHOW_PORT_SECURITY: "show port-security",
  SHOW_PORT_SECURITY_BRIEF: "show port-security brief",
  ENABLE_8021X_PORT: "dot1x port %_DATA_% admin-state enable",
  DISABLE_8021X_PORT: "dot1x port %_DATA_% admin-state disable",

  // ── UNP (User Network Profile) ─────────────────────────────────────
  SHOW_UNP: "show unp",
  SHOW_UNP_USER: "show unp user",
  SHOW_UNP_USER_DETAIL: "show unp user details",

  // ── Multicast ──────────────────────────────────────────────────────
  SHOW_IGMP: "show igmp snooping",
  SHOW_IGMP_VLAN: "show igmp snooping vlan %_DATA_%",
  ENABLE_IGMP_SNOOPING: "igmp-snooping admin-state enable",
  DISABLE_IGMP_SNOOPING: "igmp-snooping admin-state disable",

  // ── Logging ────────────────────────────────────────────────────────
  SHOW_LOG_EVENTS: "show log events",
  SHOW_COMMAND_LOG: "show command-log",
  SHOW_LOG_SWITCHOVER: "show log switchover",

  // ── Tech Support ───────────────────────────────────────────────────
  SHOW_TECH_SUPPORT: "show tech-support",
  SHOW_LAG_ETHERNET: "show linkagg ethernet",
} as const;

export type Command = keyof typeof CMD_TBL;

export function buildCommand(cmd: Command, ...data: string[]): string {
  const template = CMD_TBL[cmd];
  const placeholders = (template.match(/%_DATA_%/g) ?? []).length;

  if (placeholders > data.length) {
    throw new Error(
      `Command ${cmd} requires ${placeholders} data params, got ${data.length}`,
    );
  }

  let result: string = template;
  for (const d of data) {
    result = result.replace("%_DATA_%", d);
  }
  return result;
}
