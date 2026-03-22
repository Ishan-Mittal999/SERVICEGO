"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
    background:
      linear-gradient(150deg, rgba(255, 255, 255, 1) 0%, rgba(251, 249, 242, 0.92) 100%);
    border-radius: 18px;
    padding: 22px;
    border: 1px solid #E7E2D3;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.8) inset,
      0 10px 28px rgba(16, 24, 40, 0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-3px);
    border-color: #D9D0B5;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 16px 34px rgba(16, 24, 40, 0.1);
  }

  .stat-card.clickable {
    cursor: pointer;
  }

  .stat-card.clickable:focus-visible {
    outline: 2px solid ${theme.blue};
    outline-offset: 2px;
  }

  .stat-card.active-filter {
    border-color: #9CC4F5;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 0 0 2px rgba(22, 112, 204, 0.12),
      0 12px 24px rgba(16, 24, 40, 0.08);
  }

  .stat-card::after {
    content: '';
    position: absolute;
    top: -22px; right: -22px;
    width: 120px; height: 120px;
    border-radius: 50%;
    opacity: 0.1;
    filter: blur(1px);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    opacity: 0.75;
  }

  .stat-card.gold::before { background: ${theme.gold}; }
  .stat-card.green::before { background: ${theme.green}; }
  .stat-card.blue::before { background: ${theme.blue}; }
  .stat-card.orange::before { background: ${theme.orange}; }

  .stat-card.gold::after { background: ${theme.gold}; }
  .stat-card.green::after { background: ${theme.green}; }
  .stat-card.blue::after { background: ${theme.blue}; }
  .stat-card.orange::after { background: ${theme.orange}; }

  .stat-icon {
    width: 46px; height: 46px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    margin-bottom: 14px;
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  }

  .stat-card.gold .stat-icon { background: ${theme.goldBg}; }
  .stat-card.green .stat-icon { background: ${theme.greenLight}; }
  .stat-card.blue .stat-icon { background: ${theme.blueBg}; }
  .stat-card.orange .stat-icon { background: ${theme.orangeBg}; }

  .stat-value {
    font-family: var(--font-display), serif;
    font-size: 30px;
    font-weight: 700;
    color: ${theme.dark};
    line-height: 1.05;
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }

  .stat-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${theme.muted};
    font-weight: 700;
  }

  .stat-change {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-top: 10px;
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
  .desktop-booking-table { display: table; }

  .mobile-booking-list {
    display: none;
  }

  .mobile-booking-card {
    background: #fff;
    border: 1px solid #EDEBE4;
    border-radius: 12px;
    padding: 10px;
    display: grid;
    gap: 8px;
  }

  .mobile-booking-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mobile-booking-meta {
    display: grid;
    grid-template-columns: 84px 1fr;
    gap: 8px;
    align-items: start;
    font-size: 12px;
  }

  .mobile-booking-meta span {
    color: ${theme.muted};
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  .mobile-booking-meta strong {
    color: ${theme.dark};
    font-size: 12px;
    line-height: 1.35;
    word-break: break-word;
  }

  .mobile-booking-action {
    border-top: 1px dashed #EDEBE4;
    padding-top: 8px;
  }
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
    .tabs {
      overflow-x: auto;
      white-space: nowrap;
      -webkit-overflow-scrolling: touch;
    }

    .tabs::-webkit-scrollbar {
      height: 4px;
    }

    .tabs::-webkit-scrollbar-thumb {
      background: #D9D2C0;
      border-radius: 999px;
    }

    .desktop-booking-table {
      display: none;
    }

    .mobile-booking-list {
      display: grid;
      gap: 10px;
    }

    .page-content { padding: 14px 10px; }
    .topbar {
      padding: 8px 10px;
      height: auto;
      min-height: 62px;
      gap: 10px;
    }

    .topbar-left h1 { font-size: 17px; }
    .topbar-left p {
      font-size: 11px;
      max-width: 48vw;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

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

    .stat-card--secondary {
      padding: 12px 11px;
      opacity: 0.9;
    }

    .stat-card--secondary .stat-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: 15px;
      margin-bottom: 8px;
    }

    .stat-card--secondary .stat-value {
      font-size: 20px;
    }

    .stat-card--secondary .stat-label {
      font-size: 10px;
      letter-spacing: 0.04em;
    }

    .stat-card--secondary .stat-change {
      display: none;
    }

    .booking-table { min-width: 620px; }
  }

  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { padding: 14px 13px; border-radius: 14px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 12px; font-size: 18px; margin-bottom: 10px; }
    .stat-value { font-size: 26px; }
    .stat-label { font-size: 12px; }
    .card-header { padding: 14px 14px 0; }
    .card-body { padding: 12px 14px 14px; }
    .tabs { padding: 0 14px; }
    .alert-banner { padding: 12px 14px; }
    .topbar-left p { display: none; }
    .alert-banner { gap: 8px; }
    .alert-icon { font-size: 16px; }
    .alert-text { font-size: 12px; }

    .booking-table {
      min-width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .booking-table thead {
      display: none;
    }

    .booking-table tbody {
      display: grid;
      gap: 10px;
    }

    .booking-table tr {
      display: grid;
      grid-template-columns: 1fr;
      background: #fff;
      border: 1px solid #EDEBE4;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 2px 6px rgba(16, 24, 40, 0.04);
    }

    .booking-table td {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px dashed #F1ECE1;
      font-size: 12px;
      word-break: break-word;
    }

    .booking-table td:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .booking-table td::before {
      font-size: 10px;
      font-weight: 700;
      color: ${theme.muted};
      text-transform: uppercase;
      letter-spacing: 0.06em;
      flex-shrink: 0;
      min-width: 84px;
    }

    .booking-table td:nth-child(1)::before { content: "Booking"; }
    .booking-table td:nth-child(2)::before { content: "Customer"; }
    .booking-table td:nth-child(3)::before { content: "Service"; }
    .booking-table td:nth-child(4)::before { content: "Date"; }
    .booking-table td:nth-child(5)::before { content: "Amount"; }
    .booking-table td:nth-child(6)::before { content: "Status"; }
    .booking-table td:nth-child(7)::before { content: "Action"; }

    .booking-table td[colspan] {
      display: block;
      border: none;
      padding: 0;
    }

    .booking-table td[colspan]::before {
      content: "";
      display: none;
    }

    .booking-table td:last-child > div {
      width: 100%;
    }

    .booking-table td:last-child .action-btn,
    .booking-table td:last-child select {
      width: 100%;
    }

    .inline-add-row,
    .subservice-row,
    .shop-image-grid {
      grid-template-columns: 1fr !important;
    }
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

function parsePostgresArrayString(raw: string): string[] {
  if (!raw.startsWith("{") || !raw.endsWith("}")) {
    return [];
  }

  const body = raw.slice(1, -1);
  if (!body.trim()) {
    return [];
  }

  const items: string[] = [];
  let current = "";
  let inQuotes = false;
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      items.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items.filter(Boolean);
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
      // Fallback to structured string formats.
    }

    const postgresArray = parsePostgresArrayString(normalized);
    if (postgresArray.length > 0) {
      return postgresArray;
    }

    if (normalized.startsWith("data:image/")) {
      return [normalized];
    }

    return normalized.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function isSchemaColumnCompatibilityError(error: { message?: string } | null | undefined) {
  const message = String(error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("schema cache") ||
    message.includes("could not find the")
  );
}

const REQUIRED_VENDOR_PROFILE_COLUMNS = new Set<string>([
  "about_shop",
  "shop_image_urls",
  "service_ids",
  "selected_service_names",
  "sub_services",
  "servicemen_count",
  "servicemen_details",
]);

function extractMissingColumnFromSchemaError(error: { message?: string } | null | undefined) {
  const message = String(error?.message || "");
  if (!message) {
    return "";
  }

  const couldNotFindMatch = message.match(/could not find the ['\"]([^'\"]+)['\"] column/i);
  if (couldNotFindMatch?.[1]) {
    return couldNotFindMatch[1].trim();
  }

  const columnDoesNotExistMatch = message.match(/column ['\"]?([^'\"\s]+)['\"]? .* does not exist/i);
  if (columnDoesNotExistMatch?.[1]) {
    return columnDoesNotExistMatch[1].trim();
  }

  return "";
}

async function updateVendorWithSchemaCompatibility(userId: string, payload: Record<string, unknown>) {
  const nextPayload = { ...payload };
  let lastError: { message?: string } | null = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await supabase
      .from("vendors")
      .update(nextPayload as never)
      .eq("auth_user_id", userId);

    if (!error) {
      return null;
    }

    lastError = error;

    if (!isSchemaColumnCompatibilityError(error)) {
      return error;
    }

    const missingColumn = extractMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      return error;
    }

    if (REQUIRED_VENDOR_PROFILE_COLUMNS.has(missingColumn)) {
      return {
        message: `Database is missing required column '${missingColumn}'. Run backend/sql/add_vendor_profile_fields.sql in Supabase SQL editor, then save again.`,
      };
    }

    delete nextPayload[missingColumn];
  }

  return lastError;
}

function parsePricedSubServiceRows(value: unknown): Array<{ name: string; price: string }> {
  return parseVendorListField(value)
    .map((entry) => {
      const normalized = String(entry || "").trim();
      if (!normalized) {
        return null;
      }

      if (normalized.includes("::")) {
        const [rawName, rawPrice] = normalized.split("::");
        const name = String(rawName || "").trim();
        const cleanedPrice = String(rawPrice || "").replace(/[^0-9.]/g, "").trim();
        return name ? { name, price: cleanedPrice } : null;
      }

      return { name: normalized, price: "" };
    })
    .filter((item): item is { name: string; price: string } => Boolean(item));
}

function parseServiceSubservices(value: unknown): string[] {
  return parseVendorListField(value)
    .map((entry) => {
      const trimmed = String(entry || "").trim();
      if (!trimmed) {
        return "";
      }

      if (trimmed.includes("::")) {
        return String(trimmed.split("::")[0] || "").trim();
      }

      return trimmed;
    })
    .filter(Boolean);
}

type VendorServiceman = {
  id: string;
  name: string;
  phone: string;
  aadharNumber?: string;
  serviceCategory?: string;
  photo?: string;
  aadharPhoto?: string;
};

function parseVendorServicemen(value: unknown, fallbackCount = 0): VendorServiceman[] {
  const asArray = (() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) {
        return [] as unknown[];
      }

      try {
        const parsed = JSON.parse(normalized);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [] as unknown[];
      }
    }

    return [] as unknown[];
  })();

  const parsed = asArray
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const person = entry as Record<string, unknown>;
      const name = String(person.name || "").trim();
      const phone = String(person.phone || "").trim();
      const id = String(person.id || `serviceman-${index + 1}`).trim();

      if (!id) {
        return null;
      }

      const resolvedName = name || `Serviceman ${index + 1}`;

      return {
        id,
        name: resolvedName,
        phone,
        aadharNumber: String(person.aadharNumber || person.aadhar_number || "").trim(),
        serviceCategory: String(person.serviceCategory || person.service_category || "").trim(),
        photo: String(person.photo || person.profile_photo || person.photo_url || "").trim(),
        aadharPhoto: String(person.aadharPhoto || person.aadhar_photo || "").trim(),
      } as VendorServiceman;
    })
    .filter((entry): entry is VendorServiceman => Boolean(entry));

  if (parsed.length === 0 && fallbackCount > 0) {
    return Array.from({ length: fallbackCount }).map((_, index) => ({
      id: `serviceman-${index + 1}`,
      name: `Serviceman ${index + 1}`,
      phone: "",
      aadharNumber: "",
      serviceCategory: "",
      photo: "",
      aadharPhoto: "",
    }));
  }

  return parsed;
}

function readFilesAsDataUrl(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not read image"));
          reader.readAsDataURL(file);
        })
    )
  );
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

function DashboardHome({
  bookings,
  acceptBooking,
  completeBooking,
  vendor,
  pendingCount,
  openProfile,
  servicemen,
  bookingServicemanSelection,
  onSelectServiceman,
}: {
  bookings: any[];
  acceptBooking: (id: string, servicemanId: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  vendor: any;
  pendingCount: number;
  openProfile: () => void;
  servicemen: VendorServiceman[];
  bookingServicemanSelection: Record<string, string>;
  onSelectServiceman: (bookingId: string, servicemanId: string) => void;
}) {
    const [bookingTab, setBookingTab] = useState<string>("all");
  const bookingsSectionRef = useRef<HTMLDivElement | null>(null);
    const completedCount = bookings.filter((b: any) => b.status === "completed").length;
    const inProgressCount = bookings.filter((b: any) => b.status === "assigned").length;
    const busyServicemanIds = new Set(
      bookings
        .filter((b: any) => b.status === "assigned")
        .map((b: any) => String(b.assigned_serviceman_id || "").trim())
        .filter(Boolean)
    );
    const freeServicemenCount = servicemen.filter((person) => !busyServicemanIds.has(person.id)).length;
    const assignedServicemenCount = servicemen.length - freeServicemenCount;

    const filtered = bookingTab === "all" ? bookings : bookings.filter((b: any) => b.status === bookingTab);

    const handleStatCardSelect = (target: "all" | "pending" | "assigned" | "completed" | "profile") => {
      if (target === "profile") {
        openProfile();
        return;
      }

      setBookingTab(target);
      bookingsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

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
                    { color: "green", icon: "📋", value: String(bookings.length), label: "Total Bookings", change: "All time", dir: "up", target: "all" },
                    { color: "blue", icon: "🛠", value: String(inProgressCount), label: "In Progress", change: "Assigned jobs", dir: "up", target: "assigned" },
                    { color: "gold", icon: "✅", value: String(completedCount), label: "Completed Jobs", change: "Finished work", dir: "up", target: "completed" },
                    { color: "orange", icon: "🔔", value: String(pendingCount), label: "Pending Requests", change: pendingCount > 0 ? "Needs action" : "All clear", dir: pendingCount > 0 ? "down" : "up", target: "pending" },
              { color: "green", icon: "👷", value: String(freeServicemenCount), label: "Servicemen Free", change: `${servicemen.length} total`, dir: "up", target: "profile" },
              { color: "blue", icon: "🧰", value: String(assignedServicemenCount), label: "Servicemen Assigned", change: "On active jobs", dir: "up", target: "profile" },
                ].map((s, i) => (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleStatCardSelect(s.target as "all" | "pending" | "assigned" | "completed" | "profile")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleStatCardSelect(s.target as "all" | "pending" | "assigned" | "completed" | "profile");
                      }
                    }}
                    className={`stat-card clickable ${s.color} ${i >= 4 ? "stat-card--secondary" : "stat-card--primary"} ${bookingTab === s.target ? "active-filter" : ""}`}
                  >
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
                <div className="card" ref={bookingsSectionRef}>
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
                                            <div style={{ display: "grid", gap: 6 }}>
                                              <select
                                                value={bookingServicemanSelection[String(b.id)] || ""}
                                                onChange={(event) => onSelectServiceman(String(b.id), event.target.value)}
                                                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 12, background: "#fff", color: theme.dark }}
                                              >
                                                <option value="">Assign serviceman</option>
                                                {servicemen
                                                  .filter((person) => !busyServicemanIds.has(person.id))
                                                  .map((person) => (
                                                    <option key={`${b.id}-${person.id}`} value={person.id}>
                                                      {person.name}{person.phone ? ` (${person.phone})` : ""}
                                                    </option>
                                                  ))}
                                              </select>
                                              <button
                                                className="action-btn accept"
                                                onClick={() => acceptBooking(String(b.id), bookingServicemanSelection[String(b.id)] || "")}
                                                disabled={!bookingServicemanSelection[String(b.id)]}
                                                style={{ opacity: bookingServicemanSelection[String(b.id)] ? 1 : 0.7 }}
                                              >
                                                Accept Job
                                              </button>
                                            </div>
                                          ) : b.status === "assigned" ? (
                                            <div style={{ display: "grid", gap: 6 }}>
                                              <div style={{ fontSize: 11, color: theme.muted }}>
                                                {b.assigned_serviceman_name ? `Serviceman: ${b.assigned_serviceman_name}` : "Serviceman not assigned"}
                                              </div>
                                              <button className="action-btn accept" onClick={() => completeBooking(b.id)}>
                                                Complete Job
                                              </button>
                                            </div>
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

              function BookingsPage({
                bookings,
                acceptBooking,
                completeBooking,
                servicemen,
                bookingServicemanSelection,
                onSelectServiceman,
              }: {
                bookings: any[];
                acceptBooking: (id: string, servicemanId: string) => Promise<void>;
                completeBooking: (id: string) => Promise<void>;
                servicemen: VendorServiceman[];
                bookingServicemanSelection: Record<string, string>;
                onSelectServiceman: (bookingId: string, servicemanId: string) => void;
              }) {
    const [tab, setTab] = useState<string>("all");
    const filtered = tab === "all" ? bookings : bookings.filter((b: any) => b.status === tab);
                  const busyServicemanIds = new Set(
                    bookings
                      .filter((b: any) => b.status === "assigned")
                      .map((b: any) => String(b.assigned_serviceman_id || "").trim())
                      .filter(Boolean)
                  );

    const renderBookingAction = (booking: any, keyPrefix: string) => {
      if (booking.status === "pending") {
        return (
          <div style={{ display: "grid", gap: 6 }}>
            <select
              value={bookingServicemanSelection[String(booking.id)] || ""}
              onChange={(event) => onSelectServiceman(String(booking.id), event.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 12, background: "#fff", color: theme.dark }}
            >
              <option value="">Assign serviceman</option>
              {servicemen
                .filter((person) => !busyServicemanIds.has(person.id))
                .map((person) => (
                  <option key={`${keyPrefix}-${booking.id}-${person.id}`} value={person.id}>
                    {person.name}{person.phone ? ` (${person.phone})` : ""}
                  </option>
                ))}
            </select>
            <button
              className="action-btn accept"
              onClick={() => acceptBooking(String(booking.id), bookingServicemanSelection[String(booking.id)] || "")}
              disabled={!bookingServicemanSelection[String(booking.id)]}
              style={{ opacity: bookingServicemanSelection[String(booking.id)] ? 1 : 0.7 }}
            >
              Accept Job
            </button>
          </div>
        );
      }

      if (booking.status === "assigned") {
        return (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, color: theme.muted }}>
              {booking.assigned_serviceman_name ? `Serviceman: ${booking.assigned_serviceman_name}` : "Serviceman not assigned"}
            </div>
            <button className="action-btn accept" onClick={() => completeBooking(booking.id)}>Complete Job</button>
          </div>
        );
      }

      return <button className="action-btn view">View</button>;
    };

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
                <div className="mobile-booking-list">
                  {filtered.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📭</span>No bookings in this section</div>
                  ) : filtered.map((b: any, i: number) => (
                    <article key={`mobile-${i}-${b.id}`} className="mobile-booking-card">
                      <div className="mobile-booking-head">
                        <span className="booking-id">#{(b.id || "").slice(0, 8)}</span>
                        <StatusPill status={b.status} />
                      </div>
                      <div className="mobile-booking-meta">
                        <span>Customer</span>
                        <strong>{b.customer_name || "-"}</strong>
                      </div>
                      <div className="mobile-booking-meta">
                        <span>Service</span>
                        <strong>{b.services?.name || "Service"}</strong>
                      </div>
                      <div className="mobile-booking-meta">
                        <span>Date</span>
                        <strong>{b.preferred_time || new Date(b.created_at).toLocaleDateString()}</strong>
                      </div>
                      <div className="mobile-booking-action">
                        {renderBookingAction(b, "mobile")}
                      </div>
                    </article>
                  ))}
                </div>

                <table className="booking-table desktop-booking-table">
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
                              {renderBookingAction(b, "table")}
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
  serviceCatalog,
  onUpdateLocation,
  onSaveProfile,
  isSavingProfile,
  isUpdatingLocation,
  locationUpdateMessage,
}: {
  vendor: any;
  bookings: any[];
  email: string;
  serviceCatalog: Array<{ id: string; name: string; subServices: string[] }>;
  onUpdateLocation: () => Promise<void>;
  onSaveProfile: (payload: {
    name: string;
    phone: string;
    area: string;
    experience: number;
    aboutShop: string;
    selectedServiceNames: string[];
    serviceBasePrice: number;
    subServices: string[];
    shopImageUrls: string[];
    servicemen: VendorServiceman[];
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
    const [serviceBasePrice, setServiceBasePrice] = useState(String(vendor?.service_base_price || vendor?.minimum_order_value || 0));
    const [serviceNames, setServiceNames] = useState<string[]>(parseVendorListField(vendor?.selected_service_names));
    const [newServiceName, setNewServiceName] = useState("");
    const [subServiceRows, setSubServiceRows] = useState<Array<{ name: string; price: string }>>(parsePricedSubServiceRows(vendor?.sub_services));
    const [newSubServiceName, setNewSubServiceName] = useState("");
    const [newSubServicePrice, setNewSubServicePrice] = useState("");
    const [shopImageUrls, setShopImageUrls] = useState<string[]>(parseVendorListField(vendor?.shop_image_urls));
    const [shopImageMessage, setShopImageMessage] = useState<string | null>(null);
    const [servicemen, setServicemen] = useState<VendorServiceman[]>(
      parseVendorServicemen(
        vendor?.servicemen_details ?? vendor?.serviceman_details,
        Number(vendor?.servicemen_count ?? vendor?.serviceman_count ?? 0)
      )
    );

    const resolveServiceNames = (vendorPayload: any) => {
      const namesFromVendor = parseVendorListField(vendorPayload?.selected_service_names);
      if (namesFromVendor.length > 0) {
        return namesFromVendor;
      }

      const serviceIds = parseVendorListField(vendorPayload?.service_ids);
      if (serviceIds.length > 0) {
        const mapped = serviceIds
          .map((id) => serviceCatalog.find((serviceItem) => String(serviceItem.id) === String(id))?.name || "")
          .filter(Boolean);
        if (mapped.length > 0) {
          return mapped;
        }
      }

      if (vendorPayload?.service_id) {
        const single = serviceCatalog.find((serviceItem) => String(serviceItem.id) === String(vendorPayload.service_id))?.name;
        if (single) {
          return [single];
        }
      }

      return [] as string[];
    };

    useEffect(() => {
      setName(vendor?.name || "");
      setPhone(vendor?.phone || "");
      setArea(vendor?.area || "");
      setExperience(String(vendor?.experience || 0));
      setAboutShop(String(vendor?.about_shop || ""));
      setServiceBasePrice(String(vendor?.service_base_price || vendor?.minimum_order_value || 0));
      setServiceNames(resolveServiceNames(vendor));
      setNewServiceName("");
      setSubServiceRows(parsePricedSubServiceRows(vendor?.sub_services));
      setNewSubServiceName("");
      setNewSubServicePrice("");
      setShopImageUrls(parseVendorListField(vendor?.shop_image_urls));
      setShopImageMessage(null);
      setServicemen(
        parseVendorServicemen(
          vendor?.servicemen_details ?? vendor?.serviceman_details,
          Number(vendor?.servicemen_count ?? vendor?.serviceman_count ?? 0)
        )
      );
    }, [vendor, serviceCatalog]);

    const addServiceman = () => {
      setServicemen((current) => [
        ...current,
        {
          id: `serviceman-${Date.now()}-${current.length + 1}`,
          name: "",
          phone: "",
          aadharNumber: "",
          serviceCategory: "",
          photo: "",
          aadharPhoto: "",
        },
      ]);
    };

    const updateServiceman = (index: number, field: keyof VendorServiceman, value: string) => {
      setServicemen((current) => {
        const next = [...current];
        next[index] = {
          ...next[index],
          [field]: value,
        };
        return next;
      });
    };

    const removeServiceman = (index: number) => {
      setServicemen((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleShopImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        return;
      }

      const oversized = files.find((file) => file.size > 5 * 1024 * 1024);
      if (oversized) {
        setShopImageMessage("Each shop image must be smaller than 5MB.");
        event.target.value = "";
        return;
      }

      const unsupported = files.find((file) => !file.type.startsWith("image/"));
      if (unsupported) {
        setShopImageMessage("Only image files are supported.");
        event.target.value = "";
        return;
      }

      const nextImages = await readFilesAsDataUrl(files).catch(() => [] as string[]);
      if (nextImages.length === 0) {
        setShopImageMessage("Could not process uploaded image.");
        event.target.value = "";
        return;
      }

      setShopImageUrls((current) => Array.from(new Set([...current, ...nextImages.filter(Boolean)])));
      setShopImageMessage(null);
      event.target.value = "";
    };

    const removeShopImage = (index: number) => {
      setShopImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const addServiceName = () => {
      const normalized = newServiceName.trim();
      if (!normalized) {
        return;
      }

      setServiceNames((current) => {
        if (current.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
          return current;
        }

        return [...current, normalized];
      });
      setNewServiceName("");
    };

    const removeServiceName = (nameToRemove: string) => {
      setServiceNames((current) => current.filter((entry) => entry !== nameToRemove));
    };

    const toggleCatalogService = (serviceName: string) => {
      setServiceNames((current) => {
        if (current.some((entry) => entry.toLowerCase() === serviceName.toLowerCase())) {
          return current.filter((entry) => entry.toLowerCase() !== serviceName.toLowerCase());
        }

        return [...current, serviceName];
      });
    };

    const addSubServiceRow = () => {
      const normalized = newSubServiceName.trim();
      if (!normalized) {
        return;
      }

      setSubServiceRows((current) => {
        if (current.some((row) => row.name.toLowerCase() === normalized.toLowerCase())) {
          return current;
        }

        return [...current, { name: normalized, price: newSubServicePrice.trim() }];
      });

      setNewSubServiceName("");
      setNewSubServicePrice("");
    };

    const updateSubServiceRow = (index: number, field: "name" | "price", value: string) => {
      setSubServiceRows((current) => {
        const next = [...current];
        next[index] = {
          ...next[index],
          [field]: value,
        };
        return next;
      });
    };

    const removeSubServiceRow = (index: number) => {
      setSubServiceRows((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const submitProfile = async () => {
      const subServicesPayload = subServiceRows
        .map((row) => {
          const name = row.name.trim();
          if (!name) {
            return "";
          }

          const numericPrice = Number(row.price);
          if (Number.isFinite(numericPrice) && numericPrice > 0) {
            return `${name}::${Math.round(numericPrice)}`;
          }

          return name;
        })
        .filter(Boolean);

      await onSaveProfile({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        experience: Number(experience) || 0,
        aboutShop: aboutShop.trim(),
        selectedServiceNames: serviceNames.map((item) => item.trim()).filter(Boolean),
        serviceBasePrice: Number(serviceBasePrice) || 0,
        subServices: subServicesPayload,
        shopImageUrls,
        servicemen: servicemen
          .map((person, index) => ({
            id: String(person.id || `serviceman-${index + 1}`),
            name: String(person.name || "").trim(),
            phone: String(person.phone || "").trim(),
            aadharNumber: String(person.aadharNumber || "").trim(),
            serviceCategory: String(person.serviceCategory || "").trim(),
            photo: String(person.photo || "").trim(),
            aadharPhoto: String(person.aadharPhoto || "").trim(),
          }))
          .filter((person) => person.name),
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
                      { label: "Base Service Price", value: serviceBasePrice, setter: setServiceBasePrice, type: "number" },
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
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Website Services and Sub-services</label>
                      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                        {serviceCatalog.map((serviceItem) => {
                          const alreadyAdded = serviceNames.some((entry) => entry.toLowerCase() === serviceItem.name.toLowerCase());
                          return (
                            <div key={serviceItem.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "0.56rem 0.66rem", background: "#fff" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                <strong style={{ fontSize: 13, color: theme.dark }}>{serviceItem.name}</strong>
                                <button
                                  type="button"
                                  onClick={() => toggleCatalogService(serviceItem.name)}
                                  className="action-btn"
                                  style={{
                                    background: alreadyAdded ? "#fee2e2" : "#dcfce7",
                                    color: alreadyAdded ? "#b91c1c" : "#166534",
                                    border: alreadyAdded ? "1px solid #fecaca" : "1px solid #bbf7d0",
                                  }}
                                >
                                  {alreadyAdded ? "Remove" : "Add"}
                                </button>
                              </div>
                              <p style={{ margin: "0.38rem 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                                {serviceItem.subServices.length > 0 ? serviceItem.subServices.join(" • ") : "No sub-services configured"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Services</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {serviceNames.map((serviceName) => (
                          <span key={serviceName} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid #d7dbe6", background: "#f8fafc", padding: "0.26rem 0.56rem", fontSize: 12, fontWeight: 700 }}>
                            {serviceName}
                            <button type="button" onClick={() => removeServiceName(serviceName)} style={{ border: "none", background: "transparent", color: "#dc2626", fontWeight: 800, cursor: "pointer" }}>x</button>
                          </span>
                        ))}
                      </div>
                      <div className="inline-add-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                        <input
                          value={newServiceName}
                          onChange={(event) => setNewServiceName(event.target.value)}
                          placeholder="Add service name"
                          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                        />
                        <button type="button" className="action-btn accept" onClick={addServiceName}>Add</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Sub-services with price</label>
                      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                        {subServiceRows.map((row, index) => (
                          <div key={`${row.name}-${index}`} className="subservice-row" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr auto", gap: 8 }}>
                            <input
                              value={row.name}
                              onChange={(event) => updateSubServiceRow(index, "name", event.target.value)}
                              placeholder="Sub-service"
                              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                            />
                            <input
                              value={row.price}
                              type="number"
                              min={0}
                              onChange={(event) => updateSubServiceRow(index, "price", event.target.value)}
                              placeholder="Price"
                              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                            />
                            <button type="button" className="action-btn" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }} onClick={() => removeSubServiceRow(index)}>Remove</button>
                          </div>
                        ))}
                      </div>
                      <div className="subservice-row" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr auto", gap: 8 }}>
                        <input
                          value={newSubServiceName}
                          onChange={(event) => setNewSubServiceName(event.target.value)}
                          placeholder="New sub-service"
                          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                        />
                        <input
                          value={newSubServicePrice}
                          type="number"
                          min={0}
                          onChange={(event) => setNewSubServicePrice(event.target.value)}
                          placeholder="Price"
                          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                        />
                        <button type="button" className="action-btn accept" onClick={addSubServiceRow}>Add</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.6px" }}>Servicemen</label>
                        <button type="button" className="action-btn accept" onClick={addServiceman}>Add Serviceman</button>
                      </div>
                      {servicemen.length === 0 ? (
                        <p style={{ margin: "0.2rem 0 0", fontSize: 12, color: theme.muted }}>No serviceman added yet.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {servicemen.map((person, index) => (
                            <div key={`${person.id}-${index}`} style={{ border: "1px solid #EDEBE4", borderRadius: 10, padding: 10, background: "#fff" }}>
                              <div style={{ display: "grid", gap: 8 }}>
                                <input
                                  value={person.name}
                                  onChange={(event) => updateServiceman(index, "name", event.target.value)}
                                  placeholder="Serviceman name"
                                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                                />
                                <input
                                  value={person.phone}
                                  onChange={(event) => updateServiceman(index, "phone", event.target.value)}
                                  placeholder="Phone (XXXXXXXXXX)"
                                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                                />
                                <input
                                  value={person.serviceCategory || ""}
                                  onChange={(event) => updateServiceman(index, "serviceCategory", event.target.value)}
                                  placeholder="Service category handled"
                                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark }}
                                />
                                <button type="button" className="action-btn" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", justifyContent: "center" }} onClick={() => removeServiceman(index)}>
                                  Remove Serviceman
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Shop images (upload from device)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleShopImageUpload}
                        style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #EDEBE4", borderRadius: 10, fontSize: 14, background: "#fff", color: theme.dark, marginBottom: 8 }}
                      />
                      {shopImageMessage ? (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#b42318" }}>{shopImageMessage}</p>
                      ) : null}
                      {shopImageUrls.length > 0 ? (
                        <div className="shop-image-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                          {shopImageUrls.map((image, index) => (
                            <div key={`${index}-${image.slice(0, 24)}`} style={{ display: "grid", gap: 4 }}>
                              <img src={image} alt={`Shop ${index + 1}`} style={{ width: "100%", height: 82, objectFit: "cover", borderRadius: 8, border: "1px solid #EDEBE4" }} />
                              <button
                                type="button"
                                onClick={() => removeShopImage(index)}
                                className="action-btn"
                                style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", justifyContent: "center" }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: "0.2rem 0 0", fontSize: 12, color: theme.muted }}>No image uploaded yet.</p>
                      )}
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
  approval_status?: string | null;
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
  const [serviceCatalog, setServiceCatalog] = useState<Array<{ id: string; name: string; subServices: string[] }>>([]);
  const [locationUpdateMessage, setLocationUpdateMessage] = useState<string | null>(null);
  const [bookingServicemanSelection, setBookingServicemanSelection] = useState<Record<string, string>>({});
  const alertedRequestIdsRef = useRef<string[]>([]);
  const initializedAlertStateRef = useRef(false);
  const approvalStatusRef = useRef<string>("approved");

    useEffect(() => {
    let poller: number | undefined;

        const initialize = async () => {
            const canContinue = await loadVendor();
            if (!canContinue) return;
            await loadServiceCatalog();
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
        const approvalStatus = String(vendorData.approval_status || "approved").toLowerCase();
        approvalStatusRef.current = approvalStatus;
        const isApproved = !approvalStatus || approvalStatus === "approved";
        setOnline(isApproved && vendorData.is_active !== false);

        if (!isApproved) {
          setDashboardMessage(
            approvalStatus === "declined"
              ? "Your vendor profile request was declined by admin. Please update details and contact support."
              : "Your vendor profile is submitted and pending admin approval. You will go live after approval."
          );
        }
        setProfileChecked(true);
        return true;
    };

  useEffect(() => {
    if (!vendor?.auth_user_id) {
      return;
    }

    const channel = supabase
      .channel(`vendor-approval-${vendor.auth_user_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vendors",
          filter: `auth_user_id=eq.${vendor.auth_user_id}`,
        },
        (payload) => {
          const nextVendor = payload.new as VendorProfile;
          const nextStatus = String(nextVendor.approval_status || "approved").toLowerCase();
          const prevStatus = approvalStatusRef.current;
          approvalStatusRef.current = nextStatus;

          setVendor((current: VendorProfile | null) => ({
            ...(current || {}),
            ...nextVendor,
          }));

          const isApproved = !nextStatus || nextStatus === "approved";
          setOnline(isApproved && nextVendor.is_active !== false);

          if (prevStatus !== nextStatus) {
            if (nextStatus === "approved") {
              setDashboardMessage("Your vendor profile is approved. You are now listed and can take bookings.");
            } else if (nextStatus === "declined") {
              setDashboardMessage("Your vendor profile request was declined by admin. Please update details and contact support.");
            } else {
              setDashboardMessage("Your vendor profile is pending admin approval.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor?.auth_user_id]);

    const loadBookings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const res = await fetch(apiUrl(`/vendors/${user.id}/bookings`));
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    };

    const loadServiceCatalog = async () => {
      try {
        const response = await fetch(apiUrl("/services"), { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          return;
        }

        const nextCatalog = data
          .filter((item) => item?.id && item?.name)
          .map((item) => ({
            id: String(item.id),
            name: String(item.name),
            subServices: parseServiceSubservices(item.sub_services),
          }))
          .sort((left, right) => left.name.localeCompare(right.name));

        setServiceCatalog(nextCatalog);
      } catch {
        // Ignore catalog load errors in dashboard profile.
      }
    };

    const acceptBooking = async (id: string, servicemanId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/vendor/login");
        return;
      }

      if (!servicemanId) {
        setDashboardMessage("Please assign a serviceman before accepting this booking.");
        return;
      }

      const response = await fetch(apiUrl(`/booking/${id}/accept`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_auth_id: user.id, serviceman_id: servicemanId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setDashboardMessage(payload?.error || "This request is no longer available.");
        await loadBookings();
        return;
      }

      setBookingServicemanSelection((current) => {
        const next = { ...current };
        delete next[String(id)];
        return next;
      });
      setDashboardMessage("Booking accepted. The customer and admin can now see you as the assigned vendor.");
      await loadBookings();
    };

    const selectServicemanForBooking = (bookingId: string, servicemanId: string) => {
      setBookingServicemanSelection((current) => ({
        ...current,
        [bookingId]: servicemanId,
      }));
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

      const approvalStatus = String(vendor.approval_status || "approved").toLowerCase();
      if (approvalStatus && approvalStatus !== "approved") {
        setDashboardMessage(
          approvalStatus === "declined"
            ? "Your vendor request is declined. Availability cannot be enabled."
            : "Your profile is pending admin approval. Availability can be enabled after approval."
        );
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
      selectedServiceNames: string[];
      serviceBasePrice: number;
      subServices: string[];
      shopImageUrls: string[];
      servicemen: VendorServiceman[];
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

        const normalizedServicemen = payload.servicemen
          .map((person, index) => ({
            id: String(person.id || `serviceman-${index + 1}`),
            name: String(person.name || "").trim(),
            phone: String(person.phone || "").trim(),
            aadharNumber: String(person.aadharNumber || "").trim(),
            serviceCategory: String(person.serviceCategory || "").trim(),
            photo: String(person.photo || "").trim(),
            aadharPhoto: String(person.aadharPhoto || "").trim(),
          }))
          .filter((person) => person.name || person.phone || person.aadharNumber || person.serviceCategory || person.photo || person.aadharPhoto)
          .map((person, index) => ({
            ...person,
            name: person.name || `Serviceman ${index + 1}`,
          }));

        const extendedPayload = {
          name: payload.name,
          phone: payload.phone,
          area: payload.area,
          experience: payload.experience,
          about_shop: payload.aboutShop || null,
          selected_service_names: payload.selectedServiceNames,
          service_base_price: payload.serviceBasePrice,
          sub_services: payload.subServices,
          shop_image_urls: payload.shopImageUrls,
          servicemen_details: normalizedServicemen,
          servicemen_count: normalizedServicemen.length,
          serviceman_details: normalizedServicemen,
          serviceman_count: normalizedServicemen.length,
        };

        const error = await updateVendorWithSchemaCompatibility(user.id, extendedPayload as Record<string, unknown>);

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
          selected_service_names: payload.selectedServiceNames,
          service_base_price: payload.serviceBasePrice,
          sub_services: payload.subServices,
          shop_image_urls: payload.shopImageUrls,
          servicemen_details: normalizedServicemen,
          servicemen_count: normalizedServicemen.length,
          serviceman_details: normalizedServicemen,
          serviceman_count: normalizedServicemen.length,
        }));

        setDashboardMessage("Profile updated successfully.");
      } catch (error) {
        setDashboardMessage(error instanceof Error ? error.message : "Could not save profile changes.");
      } finally {
        setIsSavingProfile(false);
      }
    };

    const renderPage = () => {
        const parsedServicemen = parseVendorServicemen(
          vendor?.servicemen_details ?? vendor?.serviceman_details,
          Number(vendor?.servicemen_count ?? vendor?.serviceman_count ?? 0)
        );
        switch (activePage) {
            case "home": return <DashboardHome bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} vendor={vendor} pendingCount={bookings.filter((b: any) => b.status === "pending").length} openProfile={() => setActivePage("profile")} servicemen={parsedServicemen} bookingServicemanSelection={bookingServicemanSelection} onSelectServiceman={selectServicemanForBooking} />;
            case "bookings": return <BookingsPage bookings={bookings} acceptBooking={acceptBooking} completeBooking={completeBooking} servicemen={parsedServicemen} bookingServicemanSelection={bookingServicemanSelection} onSelectServiceman={selectServicemanForBooking} />;
            case "profile":
              return (
                <ProfilePage
                  vendor={vendor}
                  bookings={bookings}
                  email={vendorEmail}
                  serviceCatalog={serviceCatalog}
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
