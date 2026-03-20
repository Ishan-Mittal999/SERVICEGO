"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiUrl, WEB_PUSH_PUBLIC_KEY } from "@/lib/env";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { detectUserLocation } from "@/lib/location";

const LOGO_SRC = "/newwlogo.png";





const theme = {
  gold: "#7A6A00",
  goldLight: "#8B7500",
  goldBg: "#F5F0D0",
  goldBorder: "#D4AF37",
    green: "#4CAF50",
    greenLight: "#E8F5E9",
  blue: "#1670CC",
  blueBg: "#E8F3FF",
  dark: "#1F2937",
  muted: "#667085",
  bg: "#F8F6EF",
    white: "#FFFFFF",
    red: "#EF4444",
    redBg: "#FEF2F2",
    orange: "#F97316",
    orangeBg: "#FFF7ED",
};

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: var(--font-body), sans-serif;
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
    text-decoration: none;
  }

  .logo-icon {
    width: 38px; height: 38px;
    background: ${theme.gold};
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
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
    padding: 0;
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
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
    font-size: 17px;
    font-weight: 700;
    color: ${theme.dark};
  }

  .card-body { padding: 16px 24px 24px; }
  .card-body { overflow-x: auto; }

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
  .booking-table { width: 100%; border-collapse: collapse; min-width: 680px; }
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
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
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
    font-family: var(--font-display), serif;
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

  .profile-layout {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
  }

  /* RESPONSIVE */
  @media (max-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-3-1 { grid-template-columns: 1fr; }
  }

  @media (max-width: 900px) {
    .sidebar {
      width: 100%;
      height: 68px;
      left: 0;
      right: 0;
      top: auto;
      bottom: 0;
      flex-direction: row;
      align-items: center;
      padding: 0 8px;
      z-index: 120;
    }

    .sidebar-logo,
    .vendor-badge,
    .sidebar-footer,
    .nav-label {
      display: none;
    }

    .nav-section {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0;
      overflow: visible;
    }

    .nav-item {
      padding: 8px 10px;
      flex-direction: column;
      gap: 4px;
      border-radius: 10px;
      min-width: 84px;
      justify-content: center;
      font-size: 11px;
    }

    .nav-item.active::before {
      left: 10px;
      right: 10px;
      width: auto;
      height: 2px;
      top: 0;
      bottom: auto;
      border-radius: 0 0 2px 2px;
    }

    .nav-icon {
      font-size: 16px;
      width: auto;
      line-height: 1;
    }

    .nav-text {
      display: inline;
      line-height: 1;
    }

    .nav-badge {
      position: absolute;
      top: 4px;
      right: 6px;
      margin-left: 0;
      padding: 2px 6px;
    }

    .main {
      margin-left: 0;
      padding-bottom: 76px;
    }

    .grid-2 { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .page-content { padding: 16px 12px; }
    .topbar {
      padding: 0 12px;
      height: auto;
      min-height: 62px;
      gap: 10px;
    }

    .topbar-left h1 { font-size: 18px; }
    .topbar-left p { font-size: 11px; }

    .topbar-right {
      gap: 8px;
      flex-shrink: 0;
    }

    .topbar-btn {
      width: 34px;
      height: 34px;
      font-size: 15px;
    }

    .availability-toggle { padding: 5px 10px; }
    .toggle-text { font-size: 11px; }

    .profile-layout {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .booking-table { min-width: 620px; }
  }

  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { padding: 14px; border-radius: 12px; }
    .stat-value { font-size: 30px; }
    .stat-label { font-size: 12px; }
    .card-header { padding: 14px 14px 0; }
    .card-body { padding: 12px 14px 14px; }
    .tabs { padding: 0 14px; }
    .alert-banner { padding: 12px 14px; }
    .booking-table { min-width: 580px; }
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

  const showFallbackAlert = () => {
    try {
      window.alert(message);
    } catch {
      // Ignore fallback failures.
    }
  };

  const showViaServiceWorker = () => {
    if (!("serviceWorker" in navigator)) {
      showFallbackAlert();
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration) {
          showFallbackAlert();
          return;
        }

        return registration.showNotification("ServiceGo vendor request", {
          body: message,
          icon: "/newwlogo.png",
          badge: "/newwlogo.png",
          data: { url: "/vendor/dashboard" },
        });
      })
      .catch(() => {
        showFallbackAlert();
      });
  };

  try {
    if ("Notification" in window && typeof Notification === "function") {
      if (Notification.permission === "granted") {
        showViaServiceWorker();
        return;
      }

      if (Notification.permission === "default" && typeof Notification.requestPermission === "function") {
        Promise.resolve(Notification.requestPermission())
          .then((permission) => {
            if (permission === "granted") {
              showViaServiceWorker();
              return;
            }

            showFallbackAlert();
          })
          .catch(() => {
            showFallbackAlert();
          });
        return;
      }
    }

    showFallbackAlert();
  } catch {
    showFallbackAlert();
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function parseVendorListField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

async function registerVendorPushSubscription(vendorAuthId: string) {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (!WEB_PUSH_PUBLIC_KEY) {
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  let registration;

  try {
    registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  } catch {
    return;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return;
    }
  }

  if (permission !== "granted") {
    return;
  }

  let subscription = null;

  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
      });
    }
  } catch {
    return;
  }

  try {
    await fetch(apiUrl("/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor_auth_id: vendorAuthId,
        subscription,
      }),
    });
  } catch {
    // Ignore network errors for push subscription sync.
  }
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

function ProfilePage({
  vendor,
  bookings,
  email,
  onUpdateLocation,
  onSaveProfile,
  isSavingProfile,
  isUpdatingLocation,
  locationUpdateMessage,
}: {
  vendor: any;
  bookings: any[];
  email: string;
  onUpdateLocation: () => Promise<void>;
  onSaveProfile: (payload: {
    name: string;
    phone: string;
    area: string;
    experience: number;
    aboutShop: string;
    subServices: string[];
    shopImageUrls: string[];
  }) => Promise<void>;
  isSavingProfile: boolean;
  isUpdatingLocation: boolean;
  locationUpdateMessage: string | null;
}) {
    const completedJobs = bookings.filter((b: any) => b.status === "completed").length;
    const filledFields = [vendor?.name, vendor?.phone, vendor?.service_id, vendor?.area, vendor?.experience].filter(Boolean).length;
    const completion = Math.round((filledFields / 5) * 100);
    const [name, setName] = useState(vendor?.name || "");
    const [phone, setPhone] = useState(vendor?.phone || "");
    const [area, setArea] = useState(vendor?.area || "");
    const [experience, setExperience] = useState(String(vendor?.experience || 0));
    const [aboutShop, setAboutShop] = useState(String(vendor?.about_shop || ""));
    const [subServicesText, setSubServicesText] = useState(parseVendorListField(vendor?.sub_services).join(", "));
    const [shopImageUrlsText, setShopImageUrlsText] = useState(parseVendorListField(vendor?.shop_image_urls).join("\n"));

    useEffect(() => {
      setName(vendor?.name || "");
      setPhone(vendor?.phone || "");
      setArea(vendor?.area || "");
      setExperience(String(vendor?.experience || 0));
      setAboutShop(String(vendor?.about_shop || ""));
      setSubServicesText(parseVendorListField(vendor?.sub_services).join(", "));
      setShopImageUrlsText(parseVendorListField(vendor?.shop_image_urls).join("\n"));
    }, [vendor]);

    const submitProfile = async () => {
      await onSaveProfile({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        experience: Number(experience) || 0,
        aboutShop: aboutShop.trim(),
        subServices: subServicesText.split(",").map((item) => item.trim()).filter(Boolean),
        shopImageUrls: shopImageUrlsText.split("\n").map((item) => item.trim()).filter(Boolean),
      });
    };

    return (
        <div className="profile-layout">
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
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Registered Email</label>
                        <div style={{
                            width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4",
                            borderRadius: 10, fontSize: 14, background: theme.bg, color: theme.dark,
                        }}>
                            {email || "Not added"}
                        </div>
                    </div>

                    {[
                        { label: "Full Name", value: name, setter: setName, type: "text" },
                        { label: "Phone Number", value: phone, setter: setPhone, type: "tel" },
                        { label: "Service Area", value: area, setter: setArea, type: "text" },
                        { label: "Years of Experience", value: experience, setter: setExperience, type: "number" },
                    ].map((f, i) => (
                        <div key={i} style={{ marginBottom: 18 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>{f.label}</label>
                            <input
                              value={f.value}
                              onChange={(event) => f.setter(event.target.value)}
                              type={f.type}
                              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                            />
                        </div>
                    ))}

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Sub-services (comma separated)</label>
                      <textarea
                        value={subServicesText}
                        onChange={(event) => setSubServicesText(event.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark, resize: "vertical" }}
                      />
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Shop image URLs (one URL per line)</label>
                      <textarea
                        value={shopImageUrlsText}
                        onChange={(event) => setShopImageUrlsText(event.target.value)}
                        rows={4}
                        style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark, resize: "vertical" }}
                      />
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>About Shop</label>
                      <textarea
                        value={aboutShop}
                        onChange={(event) => setAboutShop(event.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark, resize: "vertical" }}
                      />
                    </div>

                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Current Status</label>
                        <div className={`status-pill ${bookings.length > 0 ? "confirmed" : "pending"}`}>
                            {bookings.length > 0 ? "✅ Ready to receive work" : "🕐 Waiting for first booking"}
                        </div>
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Location</label>
                        <button
                          type="button"
                          onClick={onUpdateLocation}
                          disabled={isUpdatingLocation}
                          className="action-btn accept"
                          style={{ width: "100%", justifyContent: "center", opacity: isUpdatingLocation ? 0.8 : 1 }}
                        >
                          {isUpdatingLocation ? "Updating location..." : "Update Location from Current GPS"}
                        </button>
                        {locationUpdateMessage ? (
                          <p style={{ marginTop: 8, fontSize: 12, color: locationUpdateMessage.startsWith("Location updated") ? "#2f855a" : "#b42318" }}>
                            {locationUpdateMessage}
                          </p>
                        ) : null}
                    </div>
                    <p style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                        Keep profile details accurate so customers can trust your listing and book faster.
                    </p>
                    <button
                      type="button"
                      onClick={submitProfile}
                      disabled={isSavingProfile}
                      className="action-btn accept"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center", opacity: isSavingProfile ? 0.8 : 1 }}
                    >
                      {isSavingProfile ? "Saving profile..." : "Save Profile Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => { await supabase.auth.signOut(); window.location.href = '/vendor/login'; }}
                      className="action-btn"
                      style={{ marginTop: 12, width: "100%", justifyContent: "center", background: "#EF4444", color: "white", border: "none" }}
                    >
                      🚪 Logout
                    </button>
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
  is_active?: boolean;
  auth_user_id?: string | null;
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
  const [isUpdatingVendorLocation, setIsUpdatingVendorLocation] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [locationUpdateMessage, setLocationUpdateMessage] = useState<string | null>(null);
  const alertedRequestIdsRef = useRef<string[]>([]);
  const initializedAlertStateRef = useRef(false);

    useEffect(() => {
    let poller: number | undefined;

        const initialize = async () => {
            const canContinue = await loadVendor();
            if (!canContinue) return;
            await loadBookings();
      await setupPushForVendor();
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

  const setupPushForVendor = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      await registerVendorPushSubscription(user.id);
    } catch (error) {
      console.error("Push setup failed:", error);
    }
  };

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

    if (!initializedAlertStateRef.current) {
      initializedAlertStateRef.current = true;
      return;
    }

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

  useEffect(() => {
    if (!vendor?.service_id || !online) {
      return;
    }

    const serviceId = String(vendor.service_id);
    const channel = supabase
      .channel(`vendor-booking-alert-${serviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `service_id=eq.${serviceId}`,
        },
        (payload) => {
          const booking = payload.new as { status?: string; vendor_id?: string | null };
          if (booking.status !== "pending" || booking.vendor_id) {
            return;
          }

          playRequestTone();
          showBrowserRequestAlert(1);
          setDashboardMessage("A new booking request just arrived. Review it before another vendor accepts it.");
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor?.service_id, online]);

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
        setOnline(vendorData.is_active !== false);
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

    const updateVendorLocation = async () => {
      try {
        setIsUpdatingVendorLocation(true);
        setLocationUpdateMessage(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/vendor/login");
          return;
        }

        const location = await detectUserLocation();
        const areaValue = `${location.fullAddress || location.city || "Detected area"} (Lat ${location.lat.toFixed(6)}, Lng ${location.lng.toFixed(6)})`;

        const { error } = await supabase
          .from("vendors")
          .update({ area: areaValue } as never)
          .eq("auth_user_id", user.id);

        if (error) {
          throw new Error(error.message);
        }

        setVendor((current: any) => ({
          ...(current || {}),
          area: areaValue,
        }));
        setLocationUpdateMessage("Location updated successfully.");
      } catch (error) {
        console.error("Failed to update vendor location", error);
        setLocationUpdateMessage(error instanceof Error ? error.message : "Could not update location.");
      } finally {
        setIsUpdatingVendorLocation(false);
      }
    };

    const toggleAvailability = async () => {
      if (!vendor) {
        return;
      }

      const nextOnline = !online;
      setOnline(nextOnline);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/vendor/login");
        return;
      }

      const { error } = await supabase
        .from("vendors")
        .update({ is_active: nextOnline } as never)
        .eq("auth_user_id", user.id);

      if (error) {
        setOnline(!nextOnline);
        setDashboardMessage("Could not update online/offline status. Please try again.");
        return;
      }

      setVendor((current: VendorProfile | null) => ({ ...(current || {}), is_active: nextOnline }));
      setDashboardMessage(nextOnline ? "You are now online and visible for bookings." : "You are offline. Your shop appears as not taking orders.");
    };

    const showNotificationSummary = () => {
      const pendingRequests = bookings.filter((booking: any) => booking.status === "pending").length;
      const assignedJobs = bookings.filter((booking: any) => booking.status === "assigned").length;
      const completedJobs = bookings.filter((booking: any) => booking.status === "completed").length;
      setDashboardMessage(`Notifications: ${pendingRequests} pending, ${assignedJobs} active, ${completedJobs} completed bookings.`);
    };

    const saveVendorProfile = async (payload: {
      name: string;
      phone: string;
      area: string;
      experience: number;
      aboutShop: string;
      subServices: string[];
      shopImageUrls: string[];
    }) => {
      try {
        setIsSavingProfile(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/vendor/login");
          return;
        }

        const extendedPayload = {
          name: payload.name,
          phone: payload.phone,
          area: payload.area,
          experience: payload.experience,
          about_shop: payload.aboutShop || null,
          sub_services: payload.subServices,
          shop_image_urls: payload.shopImageUrls,
        };

        let { error } = await supabase
          .from("vendors")
          .update(extendedPayload as never)
          .eq("auth_user_id", user.id);

        if (error) {
          const basicPayload = {
            name: payload.name,
            phone: payload.phone,
            area: payload.area,
            experience: payload.experience,
          };

          const fallback = await supabase
            .from("vendors")
            .update(basicPayload as never)
            .eq("auth_user_id", user.id);
          error = fallback.error;
        }

        if (error) {
          throw new Error(error.message);
        }

        setVendor((current: VendorProfile | null) => ({
          ...(current || {}),
          name: payload.name,
          phone: payload.phone,
          area: payload.area,
          experience: payload.experience,
          about_shop: payload.aboutShop,
          sub_services: payload.subServices,
          shop_image_urls: payload.shopImageUrls,
        }));

        setDashboardMessage("Profile updated successfully.");
      } catch (error) {
        setDashboardMessage(error instanceof Error ? error.message : "Could not save profile changes.");
      } finally {
        setIsSavingProfile(false);
      }
    };

    const renderPage = () => {
        switch (activePage) {
            case "home": return <DashboardHome bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} vendor={vendor} pendingCount={bookings.filter((b: any) => b.status === "pending").length} openProfile={() => setActivePage("profile")} />;
            case "bookings": return <BookingsPage bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} />;
            case "profile":
              return (
                <ProfilePage
                  vendor={vendor}
                  bookings={bookings}
                  email={vendorEmail}
                  onUpdateLocation={updateVendorLocation}
                  onSaveProfile={saveVendorProfile}
                  isSavingProfile={isSavingProfile}
                  isUpdatingLocation={isUpdatingVendorLocation}
                  locationUpdateMessage={locationUpdateMessage}
                />
              );
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
                      <Link href="/" className="logo-mark" aria-label="Go to homepage">
                        <img src={LOGO_SRC} alt="ServiceGo" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 8 }} />
                        <span className="logo-text">Service<span>Go</span></span>
                      </Link>
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
                                <span className="nav-text">{item.label}</span>
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
                                <span className="nav-text">{item.label}</span>
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
                              onClick={toggleAvailability}
                            >
                                <div className="toggle-dot" />
                                <span className="toggle-text">{online ? "Online" : "Offline"}</span>
                            </div>
                            <button className="topbar-btn" onClick={showNotificationSummary}>
                                🔔
                                <div className="notif-dot" />
                            </button>
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
