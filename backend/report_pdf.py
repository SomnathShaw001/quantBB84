"""PDF Report Generator for BB84 Quantum Key Distribution simulations.

Designed with a Physics Laboratory Notebook / Academic Research Instrument aesthetic:
- Serif headings, precise typography, 1px rules
- Comprehensive protocol summary, QBER calculation, Eve analysis, and ledger excerpt
- Neutral palette: Deep ink (#1B1B1B), Ochre (#B7791F), Vermilion (#C2410C), Green (#2F6B3A)
"""
from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor("#1B1B1B")
INK_MUTED = colors.HexColor("#55524B")
RULE_COLOR = colors.HexColor("#C9C2B3")
PAPER_ALT = colors.HexColor("#F4F1EA")
VERMILION = colors.HexColor("#C2410C")
GREEN = colors.HexColor("#2F6B3A")
OCHRE = colors.HexColor("#B7791F")


def generate_pdf_report(data: dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=INK,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=INK_MUTED,
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "DocBody",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=INK,
    )
    mono_style = ParagraphStyle(
        "DocMono",
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=INK,
    )

    elements: list[Any] = []

    # Title & Metadata Header
    sim_id = data.get("id", "N/A")
    seed = data.get("seed", "N/A")
    cfg = data.get("config", {})
    eve_cfg = cfg.get("eve", {})
    noise_cfg = cfg.get("noise", {})
    verdict = data.get("verdict", {})
    qber_info = data.get("qber", {})
    stages = data.get("stages", {})

    elements.append(Paragraph("LABORATORY REPORT — BB84 QUANTUM KEY DISTRIBUTION", title_style))
    elements.append(
        Paragraph(
            f"Run Reference: <b>{sim_id}</b> | Random Seed: {seed} | Backend: Qiskit Aer (Clifford Stabilizer)",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=RULE_COLOR, spaceAfter=12))

    # Executive Verdict Box
    is_aborted = verdict.get("status") == "aborted"
    verdict_color = VERMILION if is_aborted else GREEN
    verdict_text = f"<b>STATUS:</b> {verdict.get('title', 'Unknown').upper()}<br/><br/>{verdict.get('reason', '')}"

    verdict_table = Table(
        [[Paragraph(verdict_text, ParagraphStyle("VText", parent=body_style, textColor=verdict_color))]],
        colWidths=[532],
    )
    verdict_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_ALT),
                ("BOX", (0, 0), (-1, -1), 1.5, verdict_color),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    elements.append(verdict_table)
    elements.append(Spacer(1, 14))

    # Section 1: Parameters & Summary Metrics Table
    elements.append(Paragraph("§ 1. EXPERIMENTAL CONFIGURATION & STAGE METRICS", h2_style))

    qber_val = qber_info.get("value")
    qber_str = f"{qber_val * 100:.2f}%" if qber_val is not None else "N/A"
    eve_status_str = f"ON ({eve_cfg.get('fraction', 1.0) * 100:.0f}%, {eve_cfg.get('strategy', 'random')})" if eve_cfg.get("enabled") else "OFF (None)"

    param_data = [
        ["Configuration Parameter", "Value", "Protocol Stage", "Qubits / Bits"],
        ["Total Raw Qubits Transmitted (N)", str(cfg.get("n_qubits", "N/A")), "Raw Transmitted", str(stages.get("raw", 0))],
        ["Eavesdropper (Eve)", eve_status_str, "Photons Detected (Bob)", str(stages.get("detected", 0))],
        ["Channel Depolarizing Noise", f"{noise_cfg.get('depolarizing', 0.0) * 100:.1f}%", "Sifted Matching Bases", str(stages.get("matched", 0))],
        ["Channel Loss Probability", f"{noise_cfg.get('loss', 0.0) * 100:.1f}%", "Sacrificed Test Sample", str(stages.get("test", 0))],
        ["Sample Testing Fraction", f"{cfg.get('sample_fraction', 0.25) * 100:.0f}%", "Pre-Correction Key Length", str(stages.get("key_before_ec", 0))],
        ["Abort Threshold (QBER Max)", f"{cfg.get('qber_threshold', 0.11) * 100:.0f}%", "Corrected Key Length", str(stages.get("corrected", 0))],
        ["Measured Sample QBER", f"{qber_str} ({qber_info.get('errors', 0)} / {qber_info.get('compared', 0)})", "Final Amplified Secret Key", str(stages.get("final", 0))],
    ]

    p_table = Table(param_data, colWidths=[166, 100, 166, 100])
    p_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PAPER_ALT),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, RULE_COLOR),
            ]
        )
    )
    elements.append(p_table)
    elements.append(Spacer(1, 14))

    # Section 2: Key Material & Verification
    elements.append(Paragraph("§ 2. KEY RECONCILIATION & CRYPTOGRAPHIC VERIFICATION", h2_style))
    keys = data.get("keys", {})
    final_a = keys.get("final_alice", "")
    final_b = keys.get("final_bob", "")

    key_summary = f"""
    <b>Final Alice Key (First 64 bits):</b> <font name="Courier">{final_a[:64] or '[ABORTED OR EMPTY]'}</font><br/>
    <b>Final Bob Key (First 64 bits):</b> &nbsp;<font name="Courier">{final_b[:64] or '[ABORTED OR EMPTY]'}</font><br/>
    <b>Alice SHA-256 Hash:</b> <font name="Courier">{keys.get('hash_alice') or 'N/A'}</font><br/>
    <b>Bob SHA-256 Hash:</b> &nbsp;&nbsp;<font name="Courier">{keys.get('hash_bob') or 'N/A'}</font><br/>
    <b>Cryptographic Match:</b> {keys.get('final_match')} &nbsp;|&nbsp; <i>Notice: Educational simulation output — not for production cryptography.</i>
    """
    elements.append(Paragraph(key_summary, body_style))
    elements.append(Spacer(1, 14))

    # Section 3: Qubit-by-Qubit Measurement Excerpt (First 20 qubits)
    elements.append(Paragraph("§ 3. SAMPLE MEASUREMENT LEDGER (INITIAL 20 QUBITS)", h2_style))
    qubits = data.get("qubits", [])[:20]

    q_data = [["#", "Alice Bit", "Alice Basis", "State", "Eve Tap", "Bob Basis", "Bob Bit", "Match?", "Error?", "Role"]]
    for q in qubits:
        e_info = f"{q.get('e_basis')}:{q.get('e_bit')}" if q.get("eve") else "—"
        b_bit = str(q.get("b_bit")) if not q.get("lost") else "[LOST]"
        match_str = "YES" if q.get("match") else "NO"
        err_str = "ERR" if q.get("error") else ("OK" if q.get("match") else "—")
        q_data.append([
            str(q.get("i")),
            str(q.get("a_bit")),
            q.get("a_basis", ""),
            q.get("state", ""),
            e_info,
            q.get("b_basis", ""),
            b_bit,
            match_str,
            err_str,
            q.get("role", "").upper(),
        ])

    q_table = Table(q_data, colWidths=[24, 48, 55, 45, 55, 55, 48, 48, 48, 60])
    q_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PAPER_ALT),
                ("FONTNAME", (0, 0), (-1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, RULE_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    elements.append(KeepTogether(q_table))
    elements.append(Spacer(1, 14))

    # Footer note
    elements.append(
        Paragraph(
            "Report compiled automatically by BB84 Quantum Research Workbench. Simulation backed by IBM Qiskit & AerSimulator.",
            subtitle_style,
        )
    )

    doc.build(elements)
    return buf.getvalue()
