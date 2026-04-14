#!/usr/bin/env python3
"""
Guardance - Passive OT/ICS Network Anomaly Detection Tool

Usage:
    python guardance.py <path_to_pcap>
    python guardance.py              # demo mode: generates 50 fake packets
"""

import sys


def generate_demo_packets():
    """Craft 50 fake OT/ICS-style packets for demo mode using Scapy."""
    import random
    from scapy.all import IP, TCP, UDP

    random.seed(42)

    # Devices and ports typical in OT/ICS environments
    baseline_ips = [
        "192.168.1.1",
        "192.168.1.2",
        "192.168.1.3",
        "192.168.1.4",
        "192.168.1.5",
    ]
    # 502 = Modbus/TCP, 102 = S7comm (Siemens), 20000 = DNP3, 44818 = EtherNet/IP
    normal_ports = [502, 102, 20000, 44818, 80]

    packets = []

    # First 25 packets: normal baseline traffic between known devices/ports
    for _ in range(25):
        src = random.choice(baseline_ips)
        dst = random.choice([ip for ip in baseline_ips if ip != src])
        port = random.choice(normal_ports)
        pkt = IP(src=src, dst=dst) / TCP(sport=random.randint(1024, 65535), dport=port)
        packets.append(pkt)

    # Next 20 packets: normal detection-phase traffic (no anomalies)
    for _ in range(20):
        src = random.choice(baseline_ips)
        dst = random.choice([ip for ip in baseline_ips if ip != src])
        port = random.choice(normal_ports)
        pkt = IP(src=src, dst=dst) / TCP(sport=random.randint(1024, 65535), dport=port)
        packets.append(pkt)

    # Anomalous packets injected into detection phase:

    # Anomaly: rogue device never seen in baseline
    packets.append(
        IP(src="192.168.1.50", dst="192.168.1.1")
        / TCP(sport=54321, dport=502)
    )

    # Anomaly: existing device reaching a new destination (lateral movement)
    packets.append(
        IP(src="192.168.1.1", dst="192.168.1.99")
        / TCP(sport=12345, dport=502)
    )

    # Anomaly: new port on an existing device (e.g. HTTP management console)
    packets.append(
        IP(src="192.168.1.2", dst="192.168.1.3")
        / TCP(sport=45678, dport=8080)
    )

    # Repeat rogue device — should NOT produce a duplicate device alert
    packets.append(
        IP(src="192.168.1.50", dst="192.168.1.2")
        / TCP(sport=54322, dport=443)
    )

    # Anomaly: new UDP port (e.g. rogue DNS or exfil channel)
    packets.append(
        IP(src="192.168.1.3", dst="192.168.1.4")
        / UDP(sport=60000, dport=9999)
    )

    return packets


def learn_baseline(packets):
    """
    Extract normal behaviour from baseline packets.

    Returns:
        known_ips         – set of all IP addresses seen
        known_connections – set of (src_ip, dst_ip) pairs seen
        known_ports       – set of destination ports seen
    """
    from scapy.all import IP, TCP, UDP

    known_ips = set()
    known_connections = set()
    known_ports = set()

    for pkt in packets:
        if IP not in pkt:
            continue

        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst

        known_ips.add(src_ip)
        known_ips.add(dst_ip)
        known_connections.add((src_ip, dst_ip))

        # Track only destination ports to avoid noise from ephemeral source ports
        if TCP in pkt:
            known_ports.add(pkt[TCP].dport)
        elif UDP in pkt:
            known_ports.add(pkt[UDP].dport)

    return known_ips, known_connections, known_ports


def detect_anomalies(packets, known_ips, known_connections, known_ports):
    """
    Scan detection-phase packets and emit alerts for anything not in baseline.

    Each anomaly type is alerted only once per unique entity to prevent
    duplicate noise.

    Returns:
        list of alert strings
    """
    from scapy.all import IP, TCP, UDP

    alerts = []

    # Shadow sets — track what we have already alerted on this run
    alerted_ips = set()
    alerted_connections = set()
    alerted_ports = set()

    for pkt in packets:
        if IP not in pkt:
            continue

        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst

        # --- New Device ---
        for ip in (src_ip, dst_ip):
            if ip not in known_ips and ip not in alerted_ips:
                alerts.append(f"[ALERT] New Device Detected: {ip}")
                alerted_ips.add(ip)

        # --- New Connection (src→dst pair) ---
        conn = (src_ip, dst_ip)
        if conn not in known_connections and conn not in alerted_connections:
            alerts.append(f"[ALERT] New Connection: {src_ip} \u2192 {dst_ip}")
            alerted_connections.add(conn)

        # --- New Port ---
        dport = None
        if TCP in pkt:
            dport = pkt[TCP].dport
        elif UDP in pkt:
            dport = pkt[UDP].dport

        if dport is not None and dport not in known_ports and dport not in alerted_ports:
            alerts.append(f"[ALERT] New Port: {src_ip} using port {dport}")
            alerted_ports.add(dport)

    return alerts


def main():
    print("=" * 52)
    print("   Guardance - OT/ICS Anomaly Detection Tool")
    print("=" * 52)
    print()

    # ------------------------------------------------------------------
    # Packet acquisition
    # ------------------------------------------------------------------
    if len(sys.argv) < 2:
        print("[*] No PCAP provided — running demo mode (50 generated packets).")
        print()
        try:
            packets = generate_demo_packets()
        except ImportError:
            print("[ERROR] Scapy is not installed. Install it with: pip install scapy")
            sys.exit(1)
    else:
        pcap_path = sys.argv[1]
        try:
            from scapy.all import rdpcap
            print(f"[*] Loading PCAP: {pcap_path}")
            packets = rdpcap(pcap_path)
            print(f"[*] Loaded {len(packets)} packets.")
            print()
        except FileNotFoundError:
            print(f"[ERROR] File not found: {pcap_path}")
            sys.exit(1)
        except ImportError:
            print("[ERROR] Scapy is not installed. Install it with: pip install scapy")
            sys.exit(1)
        except Exception as exc:
            print(f"[ERROR] Could not read PCAP: {exc}")
            sys.exit(1)

    total = len(packets)
    if total < 2:
        print("[ERROR] Need at least 2 packets to perform analysis.")
        sys.exit(1)

    # ------------------------------------------------------------------
    # Split: first half → baseline, second half → detection
    # ------------------------------------------------------------------
    split = total // 2
    baseline_pkts = packets[:split]
    detection_pkts = packets[split:]

    print(f"[*] Packet split   : {split} baseline  /  {total - split} detection")
    print()

    # ------------------------------------------------------------------
    # Phase 1 — Learn baseline
    # ------------------------------------------------------------------
    print("[*] Learning baseline behaviour...")
    known_ips, known_connections, known_ports = learn_baseline(baseline_pkts)
    print(f"    Devices seen     : {len(known_ips)}")
    print(f"    Connections seen : {len(known_connections)}")
    print(f"    Ports seen       : {len(known_ports)}")
    print()

    # ------------------------------------------------------------------
    # Phase 2 — Anomaly detection
    # ------------------------------------------------------------------
    print("[*] Running anomaly detection...")
    print()

    alerts = detect_anomalies(detection_pkts, known_ips, known_connections, known_ports)

    if alerts:
        for alert in alerts:
            print(alert)
    else:
        print("[*] No anomalies detected.")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    print("--- Summary ---")
    print(f"Baseline: {split} packets analyzed")
    print(f"Detection phase: {total - split} packets scanned")
    print(f"Alerts triggered: {len(alerts)}")


if __name__ == "__main__":
    main()
