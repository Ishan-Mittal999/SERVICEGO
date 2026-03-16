"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { useRouter } from "next/navigation";

const LOGO_SRC = "data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFKYRCYBIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKUwiEwCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUwmEQmASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACmEwhMAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFKYQmASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAClMIj3qoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTSqRCeQAAA5OQA5OQA5AAAA5AA5OQAOQAAAAAAA5AA5AAOQA5OQA5OQAAA5AAOQAOQA5OQA5OQAOQAOQA5OQAAAAA5OQA5AAOQA5AAAA5OQAOQA5OQA5OQA5OQA5OQCTlEyD//2Q==";





const theme = {
    gold: "#8B7500",
    goldLight: "#A68A00",
    goldBg: "#FFF8E1",
    goldBorder: "#D4AF37",
    green: "#4CAF50",
    greenLight: "#E8F5E9",
    blue: "#1E90FF",
    blueBg: "#E3F2FD",
    dark: "#1A1A1A",
    muted: "#6B7280",
    bg: "#F9F7F2",
    white: "#FFFFFF",
    red: "#EF4444",
    redBg: "#FEF2F2",
    orange: "#F97316",
    orangeBg: "#FFF7ED",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: 'DM Sans', sans-serif;
    background: ${theme.bg};
    color: ${theme.dark};
    min-height: 100vh;
  }

  .dashboard-layout {
    display: flex;
    min-height: 100vh;
  }

  /* SIDEBAR */
  .sidebar {
    width: 260px;
    background: ${theme.dark};
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0;
    height: 100vh;
    z-index: 100;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  }

  .sidebar-logo {
    padding: 28px 24px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .logo-mark {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 38px; height: 38px;
    background: ${theme.gold};
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 20px;
    color: white;
    position: relative;
  }

  .logo-check {
    position: absolute;
    top: -4px; right: -4px;
    width: 14px; height: 14px;
    background: ${theme.green};
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px;
    color: white;
  }

  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }

  .logo-text span { color: ${theme.goldBorder}; }

  .vendor-badge {
    margin: 0 24px 8px;
    padding: 10px 14px;
    background: rgba(139,117,0,0.15);
    border: 1px solid rgba(212,175,55,0.3);
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
  }

  .vendor-avatar {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, ${theme.gold}, ${theme.goldBorder});
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
    font-size: 15px;
    color: white;
    flex-shrink: 0;
  }

  .vendor-info { flex: 1; overflow: hidden; }
  .vendor-name { font-size: 13px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vendor-role { font-size: 11px; color: ${theme.goldBorder}; }

  .online-dot {
    width: 8px; height: 8px;
    background: ${theme.green};
    border-radius: 50%;
    box-shadow: 0 0 6px ${theme.green};
    flex-shrink: 0;
  }

  .nav-section {
    padding: 8px 0;
    flex: 1;
    overflow-y: auto;
  }

  .nav-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 12px 24px 6px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 24px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    color: rgba(255,255,255,0.6);
    font-size: 14px;
    font-weight: 500;
  }

  .nav-item:hover {
    background: rgba(255,255,255,0.05);
    color: white;
  }

  .nav-item.active {
    background: rgba(139,117,0,0.2);
    color: ${theme.goldBorder};
  }

  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: ${theme.gold};
    border-radius: 0 3px 3px 0;
  }

  .nav-icon { font-size: 18px; width: 22px; text-align: center; }

  .nav-badge {
    margin-left: auto;
    background: ${theme.red};
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 99px;
  }

  .sidebar-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255,255,255,0.4);
    font-size: 13px;
    cursor: pointer;
    padding: 8px 0;
    transition: color 0.2s;
    background: none;
    border: none;
    font-family: inherit;
    width: 100%;
  }

  .logout-btn:hover { color: ${theme.red}; }

  /* MAIN CONTENT */
  .main {
    margin-left: 260px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* TOPBAR */
  .topbar {
    background: white;
    padding: 0 32px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #EDEBE4;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }

  .topbar-left h1 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: ${theme.dark};
  }

  .topbar-left p {
    font-size: 12px;
    color: ${theme.muted};
    margin-top: 1px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .topbar-btn {
    width: 38px; height: 38px;
    border-radius: 10px;
    border: 1px solid #EDEBE4;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    position: relative;
    transition: all 0.2s;
  }

  .topbar-btn:hover { background: ${theme.goldBg}; border-color: ${theme.goldBorder}; }

  .notif-dot {
    position: absolute;
    top: 6px; right: 6px;
    width: 8px; height: 8px;
    background: ${theme.red};
    border-radius: 50%;
    border: 2px solid white;
  }

  .availability-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${theme.greenLight};
    border: 1px solid ${theme.green};
    border-radius: 99px;
    padding: 6px 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .availability-toggle.offline {
    background: ${theme.redBg};
    border-color: ${theme.red};
  }

  .toggle-dot {
    width: 8px; height: 8px;
    background: ${theme.green};
    border-radius: 50%;
    box-shadow: 0 0 6px ${theme.green};
  }

  .availability-toggle.offline .toggle-dot {
    background: ${theme.red};
    box-shadow: 0 0 6px ${theme.red};
  }

  .toggle-text {
    font-size: 12px;
    font-weight: 600;
    color: ${theme.green};
  }

  .availability-toggle.offline .toggle-text { color: ${theme.red}; }

  /* PAGE CONTENT */
  .page-content {
    padding: 28px 32px;
    flex: 1;
  }

  /* STAT CARDS */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 22px;
    border: 1px solid #EDEBE4;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .stat-card::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 80px; height: 80px;
    border-radius: 50%;
    opacity: 0.08;
  }

  .stat-card.gold::after { background: ${theme.gold}; }
  .stat-card.green::after { background: ${theme.green}; }
  .stat-card.blue::after { background: ${theme.blue}; }
  .stat-card.orange::after { background: ${theme.orange}; }

  .stat-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    margin-bottom: 14px;
  }

  .stat-card.gold .stat-icon { background: ${theme.goldBg}; }
  .stat-card.green .stat-icon { background: ${theme.greenLight}; }
  .stat-card.blue .stat-icon { background: ${theme.blueBg}; }
  .stat-card.orange .stat-icon { background: ${theme.orangeBg}; }

  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: ${theme.dark};
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label { font-size: 13px; color: ${theme.muted}; }

  .stat-change {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    margin-top: 8px;
  }

  .stat-change.up { color: ${theme.green}; }
  .stat-change.down { color: ${theme.red}; }

  /* GRID LAYOUT */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .grid-3-1 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  /* CARDS */
  .card {
    background: white;
    border-radius: 16px;
    border: 1px solid #EDEBE4;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  .card-title {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 700;
    color: ${theme.dark};
  }

  .card-body { padding: 16px 24px 24px; }

  .view-all {
    font-size: 12px;
    font-weight: 600;
    color: ${theme.gold};
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
  }

  .view-all:hover { text-decoration: underline; }

  /* BOOKINGS TABLE */
  .booking-table { width: 100%; border-collapse: collapse; }
  .booking-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: ${theme.muted};
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 10px 0;
    border-bottom: 1px solid #EDEBE4;
  }

  .booking-table td {
    padding: 14px 0;
    font-size: 13px;
    border-bottom: 1px solid #F5F3EE;
    vertical-align: middle;
  }

  .booking-table tr:last-child td { border-bottom: none; }

  .booking-id { font-weight: 600; color: ${theme.gold}; }

  .customer-cell { display: flex; align-items: center; gap: 10px; }

  .customer-avatar {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, ${theme.goldBg}, ${theme.goldBorder});
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: ${theme.gold};
    flex-shrink: 0;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
  }

  .status-pill.pending { background: ${theme.orangeBg}; color: ${theme.orange}; }
  .status-pill.confirmed, .status-pill.assigned { background: ${theme.blueBg}; color: ${theme.blue}; }
  .status-pill.completed { background: ${theme.greenLight}; color: ${theme.green}; }
  .status-pill.cancelled { background: ${theme.redBg}; color: ${theme.red}; }

  .action-btn {
    padding: 5px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.2s;
  }

  .action-btn.accept {
    background: ${theme.greenLight};
    color: ${theme.green};
  }

  .action-btn.accept:hover { background: ${theme.green}; color: white; }

  .action-btn.view {
    background: ${theme.goldBg};
    color: ${theme.gold};
  }

  .action-btn.view:hover { background: ${theme.gold}; color: white; }

  /* EARNINGS CHART */
  .earnings-bar-container {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    height: 120px;
    padding: 0 4px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
  }

  .bar {
    width: 100%;
    border-radius: 6px 6px 0 0;
    background: linear-gradient(to top, ${theme.gold}, ${theme.goldBorder});
    transition: opacity 0.2s;
    cursor: pointer;
    min-height: 4px;
  }

  .bar:hover { opacity: 0.8; }
  .bar.active { background: linear-gradient(to top, ${theme.green}, #66BB6A); }

  .bar-label {
    font-size: 10px;
    color: ${theme.muted};
    white-space: nowrap;
  }

  /* REVIEWS */
  .review-item {
    padding: 14px 0;
    border-bottom: 1px solid #F5F3EE;
  }

  .review-item:last-child { border-bottom: none; }

  .review-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .reviewer-info { display: flex; align-items: center; gap: 8px; }

  .reviewer-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${theme.blue}, #42A5F5);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: white;
  }

  .reviewer-name { font-size: 13px; font-weight: 600; color: ${theme.dark}; }

  .stars { font-size: 12px; color: ${theme.goldBorder}; }

  .review-text { font-size: 12px; color: ${theme.muted}; line-height: 1.5; }

  .review-date { font-size: 11px; color: #C4B89A; }

  /* SERVICES */
  .service-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #F5F3EE;
  }

  .service-item:last-child { border-bottom: none; }

  .service-left { display: flex; align-items: center; gap: 12px; }

  .service-icon-box {
    width: 38px; height: 38px;
    border-radius: 10px;
    background: ${theme.goldBg};
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  .service-name { font-size: 14px; font-weight: 600; color: ${theme.dark}; }
  .service-count { font-size: 12px; color: ${theme.muted}; }

  .service-earnings {
    font-size: 14px;
    font-weight: 700;
    color: ${theme.gold};
    font-family: 'Playfair Display', serif;
  }

  /* TOGGLE SWITCH */
  .toggle-switch {
    width: 36px; height: 20px;
    background: #E5E7EB;
    border-radius: 99px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .toggle-switch.on { background: ${theme.green}; }

  .toggle-knob {
    width: 16px; height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px; left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  .toggle-switch.on .toggle-knob { transform: translateX(16px); }

  /* QUICK ACTIONS */
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .quick-action-btn {
    padding: 14px;
    border-radius: 12px;
    border: 1.5px dashed ${theme.goldBorder};
    background: ${theme.goldBg};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .quick-action-btn:hover {
    background: ${theme.gold};
    border-color: ${theme.gold};
    border-style: solid;
  }

  .quick-action-btn:hover span, .quick-action-btn:hover p { color: white !important; }

  .quick-action-icon { font-size: 22px; }
  .quick-action-label { font-size: 12px; font-weight: 600; color: ${theme.gold}; }

  /* PROFILE CARD */
  .profile-completion {
    padding: 20px 24px;
  }

  .profile-pic-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 16px;
  }

  .profile-pic {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${theme.gold}, ${theme.goldBorder});
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin-bottom: 10px;
    position: relative;
  }

  .verified-badge {
    position: absolute;
    bottom: 0; right: 0;
    width: 22px; height: 22px;
    background: ${theme.green};
    border-radius: 50%;
    border: 2px solid white;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    color: white;
  }

  .profile-name {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 700;
    color: ${theme.dark};
    text-align: center;
  }

  .profile-specialty {
    font-size: 12px;
    color: ${theme.gold};
    font-weight: 600;
    text-align: center;
    margin-top: 2px;
  }

  .completion-bar-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 6px;
  }

  .completion-label { color: ${theme.muted}; }
  .completion-pct { font-weight: 700; color: ${theme.gold}; }

  .completion-track {
    height: 8px;
    background: #EDEBE4;
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .completion-fill {
    height: 100%;
    background: linear-gradient(to right, ${theme.gold}, ${theme.goldBorder});
    border-radius: 99px;
    transition: width 0.6s ease;
  }

  .profile-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    border: 1px solid #EDEBE4;
    border-radius: 12px;
    overflow: hidden;
  }

  .profile-stat {
    padding: 12px 8px;
    text-align: center;
    border-right: 1px solid #EDEBE4;
  }

  .profile-stat:last-child { border-right: none; }

  .profile-stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    color: ${theme.dark};
  }

  .profile-stat-lbl { font-size: 10px; color: ${theme.muted}; margin-top: 2px; }

  /* TABS */
  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 24px;
    margin-top: 16px;
    border-bottom: 1px solid #EDEBE4;
  }

  .tab {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    color: ${theme.muted};
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: inherit;
  }

  .tab.active { color: ${theme.gold}; border-bottom-color: ${theme.gold}; }
  .tab:hover:not(.active) { color: ${theme.dark}; }

  /* SCHEDULE */
  .schedule-day {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #F5F3EE;
  }

  .schedule-day:last-child { border-bottom: none; }

  .day-name { font-size: 13px; font-weight: 600; color: ${theme.dark}; width: 80px; }
  .day-slots { font-size: 12px; color: ${theme.muted}; flex: 1; }

  /* ALERT BANNER */
  .alert-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    border: 1px solid;
  }

  .alert-banner.info {
    background: ${theme.blueBg};
    border-color: #90CAF9;
    color: #1565C0;
  }

  .alert-banner.success {
    background: ${theme.greenLight};
    border-color: #A5D6A7;
    color: #2E7D32;
  }

  .alert-icon { font-size: 20px; }
  .alert-text { font-size: 13px; font-weight: 500; }

  /* EMPTY STATE */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    color: ${theme.muted};
    font-size: 13px;
    gap: 8px;
  }

  .empty-icon { font-size: 36px; opacity: 0.4; }

  /* RESPONSIVE */
  @media (max-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-3-1 { grid-template-columns: 1fr; }
  }

  @media (max-width: 900px) {
    .sidebar { width: 60px; }
    .sidebar-logo, .vendor-badge, .nav-label, .nav-item span { display: none; }
    .main { margin-left: 60px; }
    .grid-2 { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .page-content { padding: 20px 16px; }
    .topbar { padding: 0 16px; }
  }
`;

function playRequestTone() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.18);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.55);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.58);
  } catch {
    // Ignore audio failures and fall back to visual/browser alerts.
  }
}

function showBrowserRequestAlert(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  const message = count === 1
    ? "New booking request available in your service category."
    : `${count} new booking requests are available in your service category.`;

  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("ServiceGo vendor request", { body: message });
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("ServiceGo vendor request", { body: message });
        } else {
          window.alert(message);
        }
      });
      return;
    }
  }

  window.alert(message);
}

// ─── DATA ────────────────────────────────────────────────────────────────────

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const icons: Record<string, string> = { pending: "🔔", confirmed: "✅", assigned: "✅", completed: "🎉", cancelled: "❌" };
    return (
        <span className={`status-pill ${status}`}>
            {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

// ─── PAGES ───────────────────────────────────────────────────────────────────

function DashboardHome({ bookings, acceptBooking, completeBooking, vendor, pendingCount, openProfile }: { bookings: any[]; acceptBooking: (id: string) => Promise<void>; completeBooking: (id: string) => Promise<void>; vendor: any; pendingCount: number; openProfile: () => void }) {
    const [bookingTab, setBookingTab] = useState<string>("all");
    const completedCount = bookings.filter((b: any) => b.status === "completed").length;
    const inProgressCount = bookings.filter((b: any) => b.status === "assigned").length;

    const filtered = bookingTab === "all" ? bookings : bookings.filter((b: any) => b.status === bookingTab);

    return (
        <>
            {pendingCount > 0 && (
            <div className="alert-banner info">
                <span className="alert-icon">🎯</span>
                <span className="alert-text">You have <strong>{pendingCount} new booking request{pendingCount !== 1 ? "s" : ""}</strong> waiting for confirmation. Accept them before they expire!</span>
            </div>
            )}

            <div className="stats-grid">
                {[
                    { color: "green", icon: "📋", value: String(bookings.length), label: "Total Bookings", change: "All time", dir: "up" },
                    { color: "blue", icon: "🛠", value: String(inProgressCount), label: "In Progress", change: "Assigned jobs", dir: "up" },
                    { color: "gold", icon: "✅", value: String(completedCount), label: "Completed Jobs", change: "Finished work", dir: "up" },
                    { color: "orange", icon: "🔔", value: String(pendingCount), label: "Pending Requests", change: pendingCount > 0 ? "Needs action" : "All clear", dir: pendingCount > 0 ? "down" : "up" },
                ].map((s, i) => (
                    <div key={i} className={`stat-card ${s.color}`}>
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className={`stat-change ${s.dir}`}>
                            {s.dir === "up" ? "▲" : "▼"} {s.change}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-3-1">
                {/* BOOKINGS TABLE */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Recent Bookings</span>
                        <button className="view-all" onClick={() => setBookingTab("all")}>Show All</button>
                    </div>
                    <div className="tabs">
                        {["all", "pending", "assigned", "completed"].map(t => (
                            <button key={t} className={`tab ${bookingTab === t ? "active" : ""}`} onClick={() => setBookingTab(t)}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="card-body">
                        <table className="booking-table">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Customer</th>
                                    <th>Service</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty-state"><span className="empty-icon">📭</span>No bookings found</div></td></tr>
                                ) : filtered.map((b: any, i: number) => (
                                    <tr key={i}>
                                        <td><span className="booking-id">#{(b.id || "").slice(0, 8)}</span></td>
                                        <td>
                                            <div className="customer-cell">
                                                <div className="customer-avatar">{(b.customer_name || "?")[0]}</div>
                                                {b.customer_name}
                                            </div>
                                        </td>
                                        <td>{b.services?.name || "Service"}</td>
                                        <td style={{ color: theme.muted, fontSize: 12 }}>{b.preferred_time || new Date(b.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 700 }}>—</td>
                                        <td><StatusPill status={b.status} /></td>
                                        <td>
                                          {b.status === "pending" ? (
                                            <button className="action-btn accept" onClick={() => acceptBooking(b.id)}>
                                              Accept Job
                                            </button>
                                          ) : b.status === "assigned" ? (
                                            <button className="action-btn accept" onClick={() => completeBooking(b.id)}>
                                              Complete Job
                                            </button>
                                          ) : <button className="action-btn view">View</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Profile Summary</span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: "grid", gap: 14 }}>
                            <div>
                                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Business Name</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{vendor?.name || "Vendor"}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Phone</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{vendor?.phone || "Not added"}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Service Area</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{vendor?.area || "Not added"}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>Experience</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{vendor?.experience || 0} year(s)</div>
                            </div>
                            <button className="action-btn view" style={{ width: "fit-content" }} onClick={openProfile}>
                                Review Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

              function BookingsPage({ bookings, acceptBooking, completeBooking }: { bookings: any[]; acceptBooking: (id: string) => Promise<void>; completeBooking: (id: string) => Promise<void> }) {
    const [tab, setTab] = useState<string>("all");
    const filtered = tab === "all" ? bookings : bookings.filter((b: any) => b.status === tab);
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">All Bookings</span>
                      <span style={{ fontSize: 12, color: theme.muted }}>{filtered.length} booking(s)</span>
            </div>
            <div className="tabs">
                      {["all", "pending", "assigned", "completed", "cancelled"].map(t => (
                    <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>
            <div className="card-body">
                <table className="booking-table">
                    <thead>
                        <tr>
                            <th>Booking ID</th><th>Customer</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={7}><div className="empty-state"><span className="empty-icon">📭</span>No bookings in this section</div></td></tr>
                        ) : filtered.map((b: any, i: number) => (
                            <tr key={i}>
                                <td><span className="booking-id">#{(b.id || "").slice(0, 8)}</span></td>
                                <td><div className="customer-cell"><div className="customer-avatar">{(b.customer_name || "?")[0]}</div>{b.customer_name}</div></td>
                                <td>{b.services?.name || "Service"}</td>
                                <td style={{ color: theme.muted, fontSize: 12 }}>{b.preferred_time || new Date(b.created_at).toLocaleDateString()}</td>
                                <td style={{ fontWeight: 700 }}>—</td>
                                <td><StatusPill status={b.status} /></td>
                            <td>
                              {b.status === "pending" ? <button className="action-btn accept" onClick={() => acceptBooking(b.id)}>Accept Job</button> : b.status === "assigned" ? <button className="action-btn accept" onClick={() => completeBooking(b.id)}>Complete Job</button> : <button className="action-btn view">View</button>}
                            </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProfilePage({ vendor, bookings, email }: { vendor: any; bookings: any[]; email: string }) {
    const completedJobs = bookings.filter((b: any) => b.status === "completed").length;
    const filledFields = [vendor?.name, vendor?.phone, vendor?.service_id, vendor?.area, vendor?.experience].filter(Boolean).length;
    const completion = Math.round((filledFields / 5) * 100);
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
            <div>
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="profile-completion">
                        <div className="profile-pic-area">
                            <div className="profile-pic">
                                {(vendor?.name || "V")[0]}
                                <div className="verified-badge">✓</div>
                            </div>
                            <div className="profile-name">{vendor?.name || "Vendor"}</div>
                            <div className="profile-specialty">{vendor?.area || "Service Provider"}</div>
                        </div>
                        <div className="completion-bar-label">
                            <span className="completion-label">Profile Completion</span>
                            <span className="completion-pct">{completion}%</span>
                        </div>
                        <div className="completion-track">
                            <div className="completion-fill" style={{ width: `${completion}%` }} />
                        </div>
                        <div className="profile-stats">
                            <div className="profile-stat">
                                <div className="profile-stat-val">{completedJobs}</div>
                                <div className="profile-stat-lbl">Jobs</div>
                            </div>
                            <div className="profile-stat">
                                <div className="profile-stat-val">—</div>
                                <div className="profile-stat-lbl">Rating</div>
                            </div>
                            <div className="profile-stat">
                                <div className="profile-stat-val">{vendor?.experience || 0}yr</div>
                                <div className="profile-stat-lbl">Exp.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="card-header"><span className="card-title">Profile Details</span></div>
                <div className="card-body">
                    {[
                        { label: "Full Name", value: vendor?.name || "", type: "text" },
                      { label: "Registered Email", value: email || "", type: "email" },
                        { label: "Phone Number", value: vendor?.phone || "", type: "tel" },
                        { label: "Service Area", value: vendor?.area || "", type: "text" },
                        { label: "Years of Experience", value: String(vendor?.experience || ""), type: "number" },
                    ].map((f, i) => (
                        <div key={i} style={{ marginBottom: 18 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>{f.label}</label>
                            <div style={{
                                width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4",
                                borderRadius: 10, fontSize: 14, background: theme.bg, color: theme.dark,
                            }}>
                                {f.value || "Not added"}
                            </div>
                        </div>
                    ))}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Current Status</label>
                        <div className={`status-pill ${bookings.length > 0 ? "confirmed" : "pending"}`}>
                            {bookings.length > 0 ? "✅ Ready to receive work" : "🕐 Waiting for first booking"}
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                        Profile editing can be added later once the vendor flow is stable. For now this page shows the live account details used in bookings.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

const navItems = [
    { icon: "🏠", label: "Dashboard", id: "home" },
    { icon: "📋", label: "Bookings", id: "bookings", badge: 3 },
    { icon: "👤", label: "Profile", id: "profile" },
];

const pageTitles = {
    home: { title: "Dashboard Overview", sub: "" },
    bookings: { title: "Bookings", sub: "Manage all your service bookings." },
    profile: { title: "My Profile", sub: "Review your account details and setup." },
};

type VendorProfile = {
  service_id?: string | number | null;
  area?: string | null;
  [key: string]: unknown;
};

export default function VendorDashboard() {
    const router = useRouter();
    const [activePage, setActivePage] = useState("home");
    const [online, setOnline] = useState(true);
    const [vendor, setVendor] = useState<any>(null);
  const [vendorEmail, setVendorEmail] = useState("");
    const [bookings, setBookings] = useState<any[]>([]);
    const [profileChecked, setProfileChecked] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const alertedRequestIdsRef = useRef<string[]>([]);

    useEffect(() => {
    let poller: number | undefined;

        const initialize = async () => {
            const canContinue = await loadVendor();
            if (!canContinue) return;
            await loadBookings();
      poller = window.setInterval(() => {
        loadBookings();
      }, 6000);
        };

        initialize();

    return () => {
      if (poller) {
        window.clearInterval(poller);
      }
    };
    }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    const freshRequestIds = bookings
      .filter((booking: any) => booking.status === "pending")
      .map((booking: any) => String(booking.id));

    const previousRequestIds = alertedRequestIdsRef.current;
    const unseenRequestIds = freshRequestIds.filter((id) => !previousRequestIds.includes(id));
    alertedRequestIdsRef.current = freshRequestIds;

    if (unseenRequestIds.length === 0) {
      return;
    }

    playRequestTone();
    showBrowserRequestAlert(unseenRequestIds.length);
    setDashboardMessage(
      unseenRequestIds.length === 1
        ? "A new booking request just arrived. Review it before another vendor accepts it."
        : `${unseenRequestIds.length} new booking requests just arrived. Review them before another vendor accepts them.`
    );
  }, [bookings, online]);

    const loadVendor = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/vendor/login");
            return false;
        }

        setVendorEmail(user.email || "");

        const { data } = await supabase
            .from("vendors")
            .select("*")
            .eq("auth_user_id", user.id)
            .single();

        const vendorData = data as VendorProfile | null;

        if (!vendorData || !vendorData.service_id || !vendorData.area) {
            router.push("/vendor/onboarding");
            return false;
        }

        setVendor(vendorData);
        setProfileChecked(true);
        return true;
    };

    const loadBookings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const res = await fetch(apiUrl(`/vendors/${user.id}/bookings`));
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    };

    const acceptBooking = async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/vendor/login");
        return;
      }

      const response = await fetch(apiUrl(`/booking/${id}/accept`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_auth_id: user.id }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setDashboardMessage(payload?.error || "This request is no longer available.");
        await loadBookings();
        return;
      }

      setDashboardMessage("Booking accepted. The customer and admin can now see you as the assigned vendor.");
      await loadBookings();
    };

    const completeBooking = async (id: string) => {
        await fetch(apiUrl(`/booking/${id}/complete`), {
            method: "PUT"
        });
      setDashboardMessage("Booking marked as completed.");
        loadBookings(); // refresh table
    };

    const renderPage = () => {
        switch (activePage) {
            case "home": return <DashboardHome bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} vendor={vendor} pendingCount={bookings.filter((b: any) => b.status === "pending").length} openProfile={() => setActivePage("profile")} />;
            case "bookings": return <BookingsPage bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} />;
            case "profile": return <ProfilePage vendor={vendor} bookings={bookings} email={vendorEmail} />;
            default: return null;
        }
    };

    return (
        <>
            {!profileChecked ? null : (
            <style>{styles}</style>
            )}
            {!profileChecked ? null : (
            <div className="dashboard-layout">
                {/* SIDEBAR */}
                <aside className="sidebar">
                    <div className="sidebar-logo">
                        <div className="logo-mark">
                            <img src={LOGO_SRC} alt="ServiceGo" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 8 }} />
                            <span className="logo-text">Service<span>Go</span></span>
                        </div>
                    </div>

                    <div className="vendor-badge">
                        <div className="vendor-avatar">
                            {vendor?.name?.charAt(0) || "V"}
                        </div>
                        <div className="vendor-info">
                            <div className="vendor-name">{vendor?.name || "Vendor"}</div>
                            <div className="vendor-role">Vendor Account</div>
                        </div>
                        <div className="online-dot" />
                    </div>

                    <nav className="nav-section">
                        <div className="nav-label">Main Menu</div>
                        {navItems.slice(0, 2).map(item => {
                            const badge = item.id === "bookings" ? bookings.filter((b: any) => b.status === "pending").length : 0;
                            return (
                            <div
                                key={item.id}
                                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                                onClick={() => setActivePage(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                                {badge > 0 && <span className="nav-badge">{badge}</span>}
                            </div>
                            );
                        })}
                        <div className="nav-label" style={{ marginTop: 8 }}>Account</div>
                        {navItems.slice(2).map(item => (
                            <div
                                key={item.id}
                                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                                onClick={() => setActivePage(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push("/vendor/login"); }}>
                            <span>🚪</span> Sign Out
                        </button>
                    </div>
                </aside>

                {/* MAIN */}
                <main className="main">
                    <header className="topbar">
                        <div className="topbar-left">
                            <h1>{pageTitles[activePage as keyof typeof pageTitles]?.title}</h1>
                            <p>{activePage === "home" ? `Welcome back, ${vendor?.name || "Vendor"}! Here's your activity.` : pageTitles[activePage as keyof typeof pageTitles]?.sub}</p>
                        </div>
                        <div className="topbar-right">
                            <div
                                className={`availability-toggle ${online ? "" : "offline"}`}
                                onClick={() => setOnline(o => !o)}
                            >
                                <div className="toggle-dot" />
                                <span className="toggle-text">{online ? "Online" : "Offline"}</span>
                            </div>
                            <button className="topbar-btn">
                                🔔
                                <div className="notif-dot" />
                            </button>
                            <button className="topbar-btn">⚙️</button>
                        </div>
                    </header>

                    <div className="page-content">
                      {dashboardMessage ? (
                        <div className="alert-banner success" style={{ marginBottom: 16 }}>
                          <span className="alert-icon">🔔</span>
                          <span className="alert-text">{dashboardMessage}</span>
                        </div>
                      ) : null}
                        {renderPage()}
                    </div>
                </main>
            </div>
            )}
        </>
    );
}