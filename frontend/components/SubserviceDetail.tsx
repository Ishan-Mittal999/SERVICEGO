"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/booking-flow";
import styles from "./SubserviceDetail.module.css";

interface DetailItem {
  name: string;
  included?: string[] | string;
  notIncluded?: string[] | string;
  note?: string;
}

interface SubserviceDetailProps {
  item: DetailItem;
  onSelect: () => void;
  visualGradient?: string;
  imageSrc?: string;
  startingPrice?: number | null;
}

const parseArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fallback
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export function SubserviceDetail({ item, onSelect, visualGradient, imageSrc, startingPrice }: SubserviceDetailProps) {
  const [expandedSection, setExpandedSection] = useState<"included" | "notIncluded" | null>(null);

  const included = parseArray(item.included || []);
  const notIncluded = parseArray(item.notIncluded || []);
  const hasDetails = included.length > 0 || notIncluded.length > 0 || item.note;

  const toggleSection = (section: "included" | "notIncluded") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <article className={styles.detailCard} role="button" tabIndex={0}>
      <div className={styles.visualHero} style={{ background: visualGradient }}>
        {imageSrc ? <img src={imageSrc} alt={item.name} className={styles.visualImage} /> : <span>Service</span>}
      </div>

      <div className={styles.cardHeader}>
        <div className={styles.headerContent}>
          <span className={styles.badge}>Verified</span>
          <h3>{item.name}</h3>
          {startingPrice !== null && startingPrice !== undefined ? (
            <p className={styles.startingPrice}>Starting from {formatPrice(startingPrice)}</p>
          ) : null}
          {item.note && <p className={styles.note}>{item.note}</p>}
        </div>

        <button
          type="button"
          className={styles.selectBtn}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Select
        </button>
      </div>

      {hasDetails && (
        <div className={styles.detailsSection}>
          {included.length > 0 && (
            <div className={styles.expandable}>
              <button
                className={styles.expandBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection("included");
                }}
                aria-expanded={expandedSection === "included"}
              >
                <span className={styles.expandIcon}>
                  {expandedSection === "included" ? "▼" : "▶"}
                </span>
                <span className={styles.expandLabel}>✓ What's Included</span>
                <span className={styles.count}>({included.length})</span>
              </button>

              {expandedSection === "included" && (
                <div className={styles.expandedContent}>
                  <ul className={styles.itemList}>
                    {included.map((item, idx) => (
                      <li key={idx} className={styles.includedItem}>
                        <span className={styles.bullet}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {notIncluded.length > 0 && (
            <div className={styles.expandable}>
              <button
                className={styles.expandBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection("notIncluded");
                }}
                aria-expanded={expandedSection === "notIncluded"}
              >
                <span className={styles.expandIcon}>
                  {expandedSection === "notIncluded" ? "▼" : "▶"}
                </span>
                <span className={styles.expandLabel}>✗ What's NOT Included</span>
                <span className={styles.count}>({notIncluded.length})</span>
              </button>

              {expandedSection === "notIncluded" && (
                <div className={styles.expandedContent}>
                  <ul className={styles.itemList}>
                    {notIncluded.map((item, idx) => (
                      <li key={idx} className={styles.excludedItem}>
                        <span className={styles.bullet}>✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
