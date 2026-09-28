#!/usr/bin/env node
if (Number(process.versions.node.split('.')[0]) < 20) { console.error("[UsableNet AQA Browser] Node.js " + process.version + " is too old — this server needs Node.js 20 or newer. Install the LTS from https://nodejs.org/en/download (the .pkg / .msi installer needs no command line), then fully quit and reopen the app that runs this agent."); process.exit(1); }
import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);

// src/scripts/print-config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// ../shared/src/protocol.ts
var BRIDGE_PLUGIN_DEFAULT_PORT = 31773;
var BRIDGE_PLUGIN_SLOT_COUNT = 8;

// ../shared/src/report/report-template.html
var report_template_default = `<!DOCTYPE html>
<!--
  AQA Accessibility Report \u2014 template. Models the Usablenet AQA report
  design: dark teal banner + light "page card" with metadata strip,
  exposure badge, key-results stats, needs-fix breakdown (3 columns with
  horizontal bars), filter tabs, collapsible issue cards, and a placeholder
  heatmap section.

  Top-level {{ name }} placeholders consumed by \`buildHtmlReport\`:
    reportTitle          Needs-fix-only title, or audit title when manual review is included.
    reviewNavigation     Manual/reviewed-ok links, or empty.
    reviewSections       Manual/reviewed-ok sections, or empty.
    pageUrl              Escaped page URL (used in <title>, meta strip).
    ruleset              Pre-formatted ruleset label (e.g. "WCAG 2.2 AA").
    generatedAt          Human-readable timestamp for the meta strip.
    needsFixCount        Count of NEEDS_FIX notes (header card + tab).
    highCount            Needs-fix notes at High severity.
    mediumCount          ... Medium.
    lowCount             ... Low.
    notesTotal           Total note count (all statuses).
    exposureBlock        Full \`<div class="exposure">\` HTML, or empty
                         string for filtered exports (exposure is only
                         meaningful on the full evaluation).
    keyResultsCards      4\xD7<key-result-card> fragments, concatenated.
    complexityRows       <breakdown-row> fragments for each complexity.
    responsibilityRows   ... for responsibility.
    technologyRows       ... for technology.
    detailedIssues       <issue-block> fragments, one per Needs-fix note,
                         already sorted High\u2192Medium\u2192Low and carrying a
                         data-severity attribute so the JS tab filter
                         can show/hide them.

  Layout fragments for repeated blocks live in <template id="..."> elements
  at the bottom of <body>. The build step extracts and strips them; only
  the shell that remains is filled with top-level placeholders.

  Names in this comment use a space inside the braces (e.g. "{{ name }}")
  so the substitution regex (\`\\{\\{(\\w+)\\}\\}\`) skips them.
-->
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AQA Accessibility Report \u2014 {{pageUrl}}</title>
  <style>
    :root {
      --bg: #eef0f3;
      --card: #ffffff;
      --border: #e2e5ea;
      --border-strong: #cdd2d9;
      --text: rgba(0, 0, 0);
      --text-soft: rgba(0, 0, 0, 0.6);

      --muted: #6b7280;

      --banner-bg: linear-gradient(90deg, #0b7570 0%, #016796 100%);
      --banner-text: #ffffff;

      --accent: #0d6e90;
      --accent-soft: #e0f2fe;

      --exposure-bg: #dbe1e4;
      --exposure-tag-bg: #9c3b14;
      --exposure-tag-text: #ffffff;

      --sev-crit: #a62b1f;
      --sev-high: #9c3b14;
      --sev-medium: #5f443a;
      --sev-low: #235124;

      --bar-track: #e5e7eb;
      --bar-fill: #3895A5;

      --code-bg: #FFF;
      --code-text: rgba(0, 0, 0, 0.6);
      --code-tag: rgb(173, 68, 171);
      --code-attr-name: rgb(11, 117, 112);
      --code-attr-value: rgb(173, 58, 0);
      --diff-removed-text: #B71C1C;
      --diff-added-text: #1B5E20;

      --ai-badge-bg: rgba(0, 0, 0, 0.12);
      --ai-badge-text: rgba(0, 0, 0, 0.6);

      --fs-xs: 0.75rem;
      --fs-sm: 0.875rem;
      --fs-md: 0.9375rem;
      --fs-base: 1rem;
      --fs-lg: 1.0625rem;
      --fs-xl: 1.375rem;
      --fs-2xl: 1.625rem;
    }

    * {
      box-sizing: border-box;
    }

    *:focus-visible {
      outline: 2px solid var(--accent);

    }

    html,
    body {
      font-size: 18px;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    /* Page card */
    .page {
      max-width: 960px;
      margin: 0 auto;
      overflow: hidden;
    }

    .card {
      background: var(--card);
      padding: 16px;
      margin-bottom: 32px;
    }


    .banner {
      background: var(--banner-bg);
      color: var(--banner-text);
      padding: 16px 32px;
      font-weight: 600;
      font-size: var(--fs-sm);
      letter-spacing: 0.02em;
      display: flex;
      align-items: center;
    }

    /* Heading + metadata strip */
    .subtitle {
      color: var(--text);
      margin: 16px 0;
    }

    h1 {
      font-size: var(--fs-xl);
      margin: 0 0 22px;
      font-weight: 600;
      letter-spacing: -0.005em;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      margin: 0 0 24px;
      font-size: var(--fs-sm);
    }


    .meta-grid dt {
      font-weight: bold;
      color: var(--text);
      margin: 0;
      font-size: var(--fs-md);
    }

    .meta-grid dd {
      color: var(--text);
      font-size: var(--fs-md);
      word-break: break-word;
    }

    /* Exposure pill */
    .exposure {
      background: var(--exposure-bg);
      padding: 16px 16px 16px 13px;
      margin: 16px 0;
      font-size: var(--fs-sm);
      border-left: 3px solid var(--exposure-tag-bg);
    }

    .exposure-tag {
      display: inline-block;
      background: var(--exposure-tag-bg);
      color: var(--exposure-tag-text);
      padding: 0px 8px;
      border-radius: 16px;
      font-size: var(--fs-sm);
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }

    .exposure-critical {
      border-left: 3px solid var(--sev-crit);
    }

    .exposure-critical .exposure-tag {
      background: var(--sev-crit);
    }

    .exposure-medium {
      border-left: 3px solid var(--sev-medium);
    }

    .exposure-medium .exposure-tag {
      background: var(--sev-medium);
    }

    .exposure-low {
      border-left: 3px solid var(--sev-low);
    }

    .exposure-low .exposure-tag {
      background: var(--sev-low);
    }


    /* Section headings */
    h2 {
      font-size: var(--fs-xl);
      margin: 16px;
      font-weight: 600;
    }

    /* Key results cards */
    .kr-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .kr-card {
      padding: 8px;
      border-radius: 6px;
      background: var(--bg);
    }

    .kr-card-label {
      color: var(--text-soft);
      margin: 0 0 8px;
      font-size: var(--fs-xs);
      font-weight: bold;
    }

    .kr-card-value {
      font-size: var(--fs-2xl);
      font-weight: 600;
      margin: 0;
      line-height: 1.1;
    }

    .kr-card-sub {
      font-size: var(--fs-xs);
      color: var(--muted);
      margin: 16px 0 0;
    }

    #toc {
      padding: 16px;
      margin: 32px 0;
    }

    #toc h2 {
      font-size: var(--fs-base);
      margin: 0;
    }

    #toc ul {
      list-style: none;
      display: flex;
      margin: 0;
      padding: 0;
      gap: 16px;
    }

    #toc ul li {
      margin: 0;
      padding: 0;
    }

    /* Breakdown */
    .bd-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
    }

    .bd-col {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
    }

    .bd-col h3 {
      font-size: var(--fs-xs);
      color: var(--text);
      margin: 0 0 12px;
      font-weight: normal;
    }

    .bd-row {
      font-size: var(--fs-xs);
      margin: 0 0 10px;
    }

    .bd-row:last-child {
      margin-bottom: 0;
    }

    .bd-row-text {
      color: var(--text-soft);
      margin: 0 0 4px;
      font-variant-numeric: tabular-nums;
      font-size: var(--fs-xs);
    }

    .bd-row-bar {
      background: var(--bar-track);
      height: 8px;
      overflow: hidden;
      position: relative;
    }

    .bd-row-bar>span {
      display: block;
      height: 100%;
      background: var(--bar-fill);
      border-right: 1px solid #FFF;
    }

    .bd-row.is-zero .bd-row-text {
      color: var(--muted);
    }

    /* Issue details \u2014 tabs */
    .id-blurb {
      color: var(--text-soft);
      font-size: var(--fs-md);
      margin: -8px 0 12px;
      padding: 0 16px;

    }

    .tabs {
      display: flex;
      margin: 0 0 12px;
      flex-wrap: wrap;
      padding: 0 16px;
    }

    .tab {
      padding: 8px 8px;
      font-size: var(--fs-sm);
      background: #f3f4f6;
      border: 1px solid var(--border);
      cursor: pointer;
      color: var(--text-soft);
      font-family: inherit;
    }

    .tab:first-child {
      border-radius: 6px 0 0 6px;
    }

    .tab:last-child {
      border-radius: 0 6px 6px 0;
    }

    .tab+.tab {
      border-left: none;
    }

    .tab:hover {
      color: var(--text);
    }

    .tab.is-active {
      z-index: 111;
      box-shadow: inset 0 0 0 2px #464C4F;
      font-weight: bold;
    }

    /* Issue cards */
    .issue-card {
      border: 1px solid var(--border);
      padding: 0;
      margin-bottom: 16px;
      border-radius: 6px;
    }

    .issue-card[hidden] {
      display: none;
    }

    .issue-card-header {
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .issue-title {
      grid-column: 1;
      font-size: var(--fs-lg);
      color: var(--text);
      margin: 0;
    }

    .issue-severity {
      grid-column: 1;
      font-size: var(--fs-xs);
      margin: 0;
      text-transform: capitalize;
      color: var(--text-soft);
    }

    .issue-controls {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .issue-ai-badge {
      align-self: center;
      background: var(--ai-badge-bg);
      color: var(--ai-badge-text);
      font-size: var(--fs-xs);
      padding: 3px 7px;
      border-radius: 3px;

      font-family: monospace;
    }

    .issue-toggle {
      grid-column: 3;
      grid-row: 1 / span 2;
      align-self: center;
      font-size: var(--fs-xs);
      color: var(--accent);
    }

    .issue-card-header[aria-expanded="true"] .issue-toggle::before {
      content: "Hide";
    }

    .issue-card-header[aria-expanded="false"] .issue-toggle::before {
      content: "Show";
    }

    /* Expanded body */
    .issue-body {
      padding: 8px;
    }

    .issue-section {
      margin-top: 18px;
    }

    .issue-section:first-child {
      margin-top: 6px;
    }

    .issue-section>h4 {
      margin: 0 0 8px;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--text);
    }

    /* Review cards (check manually / reviewed ok) reuse the issue-card
       shell; these rules cover only what the needs-fix card lacks. */
    .review-status {
      text-transform: none;
    }

    .review-steps {
      margin: 0;
      padding-left: 20px;
      font-size: var(--fs-xs);
      color: var(--text-soft);
    }

    .review-step+.review-step {
      margin-top: 10px;
    }

    .review-step-title {
      margin: 0 0 4px;
      font-weight: 600;
      color: var(--text);
    }

    .review-step-text p {
      margin: 4px 0;
    }

    .review-step-outcomes {
      margin: 4px 0 0;
      color: var(--muted);
    }

    .activity-list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: var(--fs-xs);
      color: var(--text-soft);
    }

    .activity-item+.activity-item {
      margin-top: 10px;
    }

    .activity-meta {
      margin: 0 0 4px;
      font-weight: 600;
      color: var(--text);
    }

    .activity-description {
      margin: 0;
    }

    .ai-suggested-fix {
      border-left: 3px solid #016796;
      padding: 16px;
      background: var(--bg);
    }

    .ai-suggested-fix h4 {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-suggested-fix h4 svg {
      height: 14px;
    }

    .code-block {
      background: #FFF;
      color: var(--code-text);
      border-radius: 6px;
      padding: 12px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: var(--fs-xs);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      border: 1px solid var(--border);
      white-space: normal;
    }

    .code-block .diff-removed {
      color: var(--diff-removed-text);
      display: block;
    }

    .code-block .diff-added {
      color: var(--diff-added-text);
      display: block;
    }

    .code-lang {
      font-size: var(--fs-xs);
      color: var(--text-soft);
      line-height: 16px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .hlun-tag {
      color: var(--code-tag);
    }

    .hlun-attr-name,
    .hlun-css-sel {
      color: var(--code-attr-name);
    }

    .hlun-attr-value,
    .hlun-css-prop {
      color: var(--code-attr-value);
    }

    .fix-meta {
      font-size: var(--fs-xs);
      color: var(--text-soft);
      margin: 0 0 8px;
      font-weight: bold;
    }

    .fix-meta span {
      font-weight: normal;
    }


    .element-shot {
      display: block;
      max-width: 100%;
      height: auto;
      border: 1px solid var(--border);
      border-radius: 3px;
      background: #f0f0f0;
      margin: 10px 0;
    }

    .kv-list {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
      font-size: var(--fs-xs);
      margin: 0;
    }

    .kv-list dt {
      color: var(--text-soft);
    }

    .kv-list dd {
      margin: 0;
      color: var(--text);
      word-break: break-word;
    }

    .kv-list dd strong {
      color: var(--text-soft);
    }

    .kv-list code {
      font-size: var(--fs-xs);
    }

    .element-kv {
      margin-bottom: 10px;
    }

    .success-criterion {
      font-size: var(--fs-xs);
      color: var(--text-soft);
      margin: 0 0 6px;
    }

    .failure-text {
      font-size: var(--fs-xs);
      color: var(--text-soft);
      margin: 0;
    }

    .solutions-list {
      display: flex;
      flex-direction: column;
    }

    .solution {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);

    }

    .solution+.solution {
      border-top: none;
    }

    .solution-header {
      cursor: pointer;
      padding: 16px 8px;
      font-size: var(--fs-xs);
      color: var(--text-soft);
      font-weight: bold;
      width: 100%;
      position: relative;
    }

    .solution-header::after {
      content: "";
      color: var(--muted);
      font-size: var(--fs-xs);
      transition: transform 0.15s ease;
      width: 16px;
      height: 16px;
      position: absolute;
      right: 8px;
      background-repeat: no-repeat;
      background-position: center;
      background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNyIgdmlld0JveD0iMCAwIDEyIDciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMC42NjQ1IDAuMTI2QzEwLjg0NjUgLTAuMDQyIDExLjE0MDUgLTAuMDQyIDExLjMyMjUgMC4xMjZDMTEuNDkwNSAwLjMwOCAxMS40OTA1IDAuNjAyIDExLjMyMjUgMC43N0w2LjA0NDUgNS45OTJDNS44NjI1IDYuMTc0IDUuNTgyNSA2LjE3NCA1LjQwMDUgNS45OTJMMC4xMzY1IDAuNzdDLTAuMDQ1NSAwLjYwMiAtMC4wNDU1IDAuMzA4IDAuMTM2NSAwLjEyNkMwLjMwNDUgLTAuMDQyIDAuNTk4NSAtMC4wNDIgMC43ODA1IDAuMTI2TDUuNzIyNSA0Ljg4NkwxMC42NjQ1IDAuMTI2WiIgZmlsbD0iYmxhY2siIGZpbGwtb3BhY2l0eT0iMC42Ii8+Cjwvc3ZnPgo=");
    }

    .solution-header[aria-expanded="true"]::after {
      transform: rotate(180deg);
    }

    .solution-body {
      padding: 0 8px 8px 8px;
      font-size: var(--fs-xs);
      color: var(--text-soft);
    }

    .solution-body p {
      margin: 6px 0;
    }



    /* Heatmap placeholder */
    #heatmap-legend-box {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    #heatmap-legend-content {
      flex-grow: 1;
    }

    #heatmap-legend-chart {
      height: 6px;
      border: 1px solid var(--border-strong);
    }

    #heatmap-legend-ticks {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      font-size: var(--fs-xs);
      color: var(--text-soft);
    }

    #heatmap-legend-label {
      font-size: var(--fs-xs);
      color: var(--text-soft);
    }


    .heatmap-placeholder {
      min-height: 320px;
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0) 100%),
        linear-gradient(180deg, #e9ecef 0%, #f1f3f5 100%);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: var(--fs-sm);
      text-align: center;
      padding: 24px;
    }

    .heatmap-image {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 3px;
      background: #000;
    }
  </style>
</head>

<body>
  <header class="banner"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      version="1.1" x="0px" y="0px" viewBox="0 0 400 39.8703" style="width: 130px; height: 16px;" xml:space="preserve"
      alt="">
      <style type="text/css">
        .st0 {
          fill: #FFFFFF;
        }
      </style>
      <g>
        <path class="st0"
          d="M16.0869,39.3386C6.1058,39.3386,0,33.7645,0,22.8281V1.5929h8.1764v21.0234   c0,6.0518,3.0259,9.1836,8.0164,9.1836s8.0164-3.0259,8.0164-8.9177V1.5929h8.1742v20.9694   C32.3834,33.8186,26.0658,39.3386,16.0869,39.3386z" />
        <path class="st0"
          d="M48.5438,39.2868c-3.9812,0-8.44-1.3271-12.2094-4.3011l3.4495-5.3083   c3.0799,2.2283,6.3176,3.3976,8.9717,3.3976c2.3364,0,3.3976-0.8494,3.3976-2.1246v-0.1059c0-1.7507-2.76-2.3364-5.8918-3.2917   c-3.9812-1.1671-8.4941-3.0259-8.4941-8.546V18.901c0-5.7881,4.6707-9.0258,10.4047-9.0258c3.6094,0,7.5388,1.2212,10.6187,3.2917   l-3.0799,5.5741c-2.8141-1.6469-5.6281-2.6541-7.6987-2.6541c-1.9625,0-2.9718,0.8494-2.9718,1.9647v0.1059   c0,1.5929,2.7082,2.3343,5.7859,3.3976c3.9812,1.3271,8.6,3.2377,8.6,8.44v0.1059C59.4262,36.4187,54.7015,39.2868,48.5438,39.2868   z" />
        <path class="st0"
          d="M80.5684,38.7551v-3.0799c-1.9647,2.1765-4.6728,3.6116-8.6,3.6116c-5.3623,0-9.7693-3.0799-9.7693-8.7081   v-0.1059c0-6.2117,4.7247-9.0776,11.4681-9.0776c2.8659,0,4.9365,0.4777,6.953,1.1671v-0.4777   c0-3.3436-2.0706-5.2024-6.1036-5.2024c-3.0799,0-5.2564,0.5836-7.8587,1.541l-2.0165-6.1598   c3.1318-1.3789,6.2117-2.2824,11.0423-2.2824c8.814,0,12.6893,4.5669,12.6893,12.2635v16.5105H80.5684z M80.7284,27.287   c-1.3811-0.6354-3.1858-1.0612-5.1505-1.0612c-3.4517,0-5.5741,1.3811-5.5741,3.9293v0.1059c0,2.1765,1.8047,3.4517,4.407,3.4517   c3.7694,0,6.3176-2.0706,6.3176-4.9905V27.287z" />
        <path class="st0"
          d="M110.9526,39.2868c-4.3011,0-6.9552-1.9647-8.8658-4.247v3.7154h-8.0705V0h8.0705v14.3881   c1.9647-2.6541,4.6707-4.6188,8.8658-4.6188c6.6353,0,12.9529,5.2024,12.9529,14.7058v0.1059   C123.9055,34.0822,117.6938,39.2868,110.9526,39.2868z M115.8351,24.4751c0-4.7247-3.1837-7.8586-6.953-7.8586   c-3.7694,0-6.9012,3.1339-6.9012,7.8586v0.1059c0,4.7247,3.1318,7.8565,6.9012,7.8565c3.7694,0,6.953-3.0799,6.953-7.8565V24.4751z   " />
        <path class="st0" d="M128.9134,38.7551V0h8.0704v38.7551H128.9134z" />
        <path class="st0"
          d="M169.6936,27.341h-19.8001c0.7954,3.6635,3.3436,5.5741,6.953,5.5741c2.7082,0,4.6728-0.8494,6.9012-2.92   l4.6188,4.0871c-2.6541,3.2917-6.4754,5.3104-11.6259,5.3104c-8.546,0-14.8636-5.9999-14.8636-14.7058V24.581   c0-8.1223,5.7859-14.8117,14.0682-14.8117c9.5013,0,13.8564,7.3788,13.8564,15.4493v0.1059   C169.8017,26.1198,169.7477,26.5975,169.6936,27.341z M155.9453,16.2468c-3.3457,0-5.5222,2.3883-6.1598,6.0518h12.1576   C161.4654,18.687,159.343,16.2468,155.9453,16.2468z" />
        <path class="st0"
          d="M201.4049,38.7551l-17.9954-23.6235v23.6235h-8.0704V1.5929h7.5388l17.414,22.8822V1.5929h8.0683v37.1622   H201.4049z" />
        <path class="st0"
          d="M241.5605,27.341h-19.8001c0.7954,3.6635,3.3436,5.5741,6.953,5.5741c2.7082,0,4.6728-0.8494,6.9012-2.92   l4.6188,4.0871c-2.6541,3.2917-6.4754,5.3104-11.6259,5.3104c-8.546,0-14.8636-5.9999-14.8636-14.7058V24.581   c0-8.1223,5.7859-14.8117,14.0682-14.8117c9.5013,0,13.8542,7.3788,13.8542,15.4493v0.1059   C241.6664,26.1198,241.6145,26.5975,241.5605,27.341z M227.8122,16.2468c-3.3458,0-5.5222,2.3883-6.1598,6.0518h12.1576   C233.3323,18.687,231.2098,16.2468,227.8122,16.2468z" />
        <path class="st0"
          d="M255.9659,39.2327c-4.9365,0-8.2823-1.9647-8.2823-8.5481V17.2021h-3.3976v-6.9033h3.3976V3.0259h8.0705   v7.2729h6.6893v6.9033h-6.6893v12.1554c0,1.8588,0.7954,2.7622,2.6001,2.7622c1.487,0,2.8141-0.3718,3.9834-1.0093v6.4776   C260.6387,38.5951,258.674,39.2327,255.9659,39.2327z" />
        <path class="st0"
          d="M314.6464,38.7551l-4.7247-10.4047h-21.9268l-4.7247,10.4047h-2.8659l17.3059-37.428h2.6541l17.308,37.428   H314.6464z M298.9853,4.3551l-9.8212,21.4989h19.5883L298.9853,4.3551z" />
        <path class="st0"
          d="M356.2846,39.8703l-5.2023-4.7247c-3.134,2.6541-7.2211,4.247-11.9998,4.247   c-11.2541,0-18.633-8.9717-18.633-19.1128V20.174c0-10.1389,7.4847-19.2165,18.741-19.2165   c11.2541,0,18.6329,8.9717,18.6329,19.1106c0.054,0.054,0.054,0.054,0,0.1059c0,4.9365-1.7528,9.6093-4.8846,13.1129l5.3104,4.4589   L356.2846,39.8703z M354.9576,20.174c0-9.1836-6.6894-16.7223-15.8751-16.7223c-9.1836,0-15.767,7.4329-15.767,16.6164v0.1059   c0,9.1836,6.6894,16.7223,15.8751,16.7223c3.8753,0,7.2729-1.3271,9.873-3.5035l-7.2189-6.1577l1.9647-2.1765l7.113,6.4775   c2.5482-2.974,4.0352-6.9552,4.0352-11.2563V20.174z" />
        <path class="st0"
          d="M396.9741,38.7551l-4.7269-10.4047h-21.9247l-4.7247,10.4047h-2.8659l17.3059-37.428h2.6541L400,38.7551   H396.9741z M381.313,4.3551l-9.8211,21.4989h19.5883L381.313,4.3551z" />
      </g>
    </svg>
  </header>
  <div class="page">
    <main class="body-pad">
      <div id="intro" class="card">
        <p class="subtitle">UsableNet AQA for Agents report</p>
        <h1>{{reportTitle}}</h1>

        <dl class="meta-grid">
          <dt>Type</dt>
          <dd>Chrome Extension AI-assisted test</dd>

          <dt>URL</dt>
          <dd>{{pageUrl}}</dd>

          <dt>Ruleset</dt>
          <dd>{{ruleset}}</dd>

          <dt>Date</dt>
          <dd>{{generatedAt}}</dd>

        </dl>
      </div>

      <div id="toc">
        <h2>Contents:</h2>
        <ul>
          <li>
            <a href="#key-results">Key results</a>
          </li>
          <li>
            <a href="#needs-fix-br">Needs fix breakdown</a>
          </li>
          <li>
            <a href="#issue-details">Issue details</a>
          </li>
          {{reviewNavigation}}
          <li>
            <a href="#heatmap">Accessibility issue heatmap</a>
          </li>
        </ul>
      </div>

      {{exposureBlock}}

      <section id="key-results" aria-labelledby="key-results-title" tabindex="-1">
        <h2 id="key-results-title">Key results</h2>
        <div class="kr-cards card">{{keyResultsCards}}</div>
      </section>

      <section id="needs-fix-br" aria-labelledby="needs-fix-br-title" tabindex="-1">
        <h2 id="needs-fix-br-title">Needs fix breakdown</h2>
        <div class="bd-grid card">
          <section class="bd-col">
            <h3>Issues by complexity</h3>
            {{complexityRows}}
          </section>
          <section class="bd-col">
            <h3>Issues by responsibility</h3>
            {{responsibilityRows}}
          </section>
          <section class="bd-col">
            <h3>Issues by technology</h3>
            {{technologyRows}}
          </section>
        </div>
      </section>

      <section id="issue-details" aria-labelledby="issue-details-title" tabindex="-1">
        <h2 id="issue-details-title">Issue details</h2>
        <p class="id-blurb">{{needsFixCount}} Needs fix issues from this test run.</p>
        <div class="tabs" role="radiogroup" aria-label="Filter issues by severity">
          <button type="button" class="tab is-active" role="radio" aria-checked="true" tabindex="0"
            data-filter="all">All ({{needsFixCount}})</button>
          <button type="button" class="tab" role="radio" aria-checked="false" tabindex="-1" data-filter="high">High
            ({{highCount}})</button>
          <button type="button" class="tab" role="radio" aria-checked="false" tabindex="-1" data-filter="medium">Medium
            ({{mediumCount}})</button>
          <button type="button" class="tab" role="radio" aria-checked="false" tabindex="-1" data-filter="low">Low
            ({{lowCount}})</button>
        </div>
        <div class="card">
          <div class="issue-list">{{detailedIssues}}</div>
        </div>
      </section>

      {{reviewSections}}

      <section id="heatmap" aria-labelledby="heatmap-title" tabindex="-1">
        <h2 id="heatmap-title">Accessibility issue heatmap</h2>
        <p class="id-blurb">Visual distribution of Needs fix issues on the tested page.</p>
        <div class="heatmap card">
          <div id="heatmap-legend-box" aria-hidden="true">
            <div id="heatmap-legend-label">Issues</div>
            <div id="heatmap-legend-content">
              <div id="heatmap-legend-chart"
                style="background: linear-gradient(to right, rgba(252, 253, 191, 1), rgba(254, 159, 109, 1), rgba(222, 73, 104, 1), rgba(140, 41, 129, 1), rgba(59, 15, 112, 1))">
              </div>
              <div id="heatmap-legend-ticks">
                <div>1</div>
                <div>2</div>
                <div>3</div>
                <div>4</div>
                <div>5+</div>
              </div>
            </div>
          </div>
          {{heatmapBody}}
        </div>
      </section>
    </main>
  </div>

  <script>
    (function () {
      // Filter tabs \u2014 implemented as an ARIA radiogroup. The four tabs
      // are mutually-exclusive filters, so role="radio" + aria-checked is
      // the right semantic contract. Keyboard pattern follows WAI-ARIA:
      //   Tab           \u2192 enter the group, focus the checked option
      //   Arrow / Home / End \u2192 move focus + activate (roving tabindex)
      //   Tab again      \u2192 leave the group
      // Click also activates, same as the previous behavior.
      var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab[data-filter]'));
      // Scoped to the needs-fix section: review cards (check manually /
      // reviewed ok) share the .issue-card shell but carry no severity, so
      // the severity tabs must not hide them.
      var cards = document.querySelectorAll('#issue-details .issue-card');
      function apply(filter, focusActive) {
        tabs.forEach(function (t) {
          var on = t.dataset.filter === filter;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-checked', String(on));
          t.tabIndex = on ? 0 : -1;
          if (on && focusActive) t.focus();
        });
        cards.forEach(function (c) {
          c.hidden = filter !== 'all' && c.dataset.severity !== filter;
        });
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { apply(t.dataset.filter); });
        t.addEventListener('keydown', function (e) {
          var next = i;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = tabs.length - 1;
          else return;
          e.preventDefault();
          apply(tabs[next].dataset.filter, true);
        });
      });

      // Custom disclosure \u2014 both issue cards and solutions use
      // <div role="button"> + <div hidden> instead of <details>/<summary>
      // so the ARIA contract (aria-controls + aria-expanded) is explicit
      // and assertable by audit tooling. Click toggles, and Enter/Space
      // are forwarded to match native button activation.
      document.querySelectorAll('.issue-card-header, .solution-header').forEach(function (header) {
        var bodyId = header.getAttribute('aria-controls');
        var body = bodyId ? document.getElementById(bodyId) : null;
        if (!body) return;
        function toggle() {
          var expanded = header.getAttribute('aria-expanded') === 'true';
          header.setAttribute('aria-expanded', String(!expanded));
          body.hidden = expanded;
        }
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', function (e) {
          if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
            e.preventDefault();
            toggle();
          }
        });
      });
    })();
  </script>

  <!--
  Layout fragments. <template> content is inert in the browser and the
  build step strips these from the final output. Edit the markup here to
  change the report's layout/UI. Same {{name}} substitution as the shell.

  Fragment ids must be kebab-case (matched by \`[a-z][a-z0-9-]*\`); the
  extractor's regex deliberately ignores anything else so this comment
  can mention template ids without being eaten.
-->

  <!-- Optional fragments, used only when includeManualReview is true. -->
  <template id="review-navigation">
    <li><a href="#manual-review">Check manually</a></li>
    <li><a href="#reviewed-notes">Reviewed ok</a></li>
  </template>

  <template id="review-sections">
    <section id="manual-review" aria-labelledby="manual-review-title" tabindex="-1">
      <h2 id="manual-review-title">Check manually ({{checkManuallyCount}})</h2>
      <p>These notes are unresolved checks, not confirmed failures.</p>
      {{manualNotes}}
    </section>
    <section id="reviewed-notes" aria-labelledby="reviewed-notes-title" tabindex="-1">
      <h2 id="reviewed-notes-title">Reviewed ok ({{reviewedOkCount}})</h2>
      <p>Saved review outcomes. Activity records identify the rationale and reviewer when available.</p>
      {{reviewedNotes}}
    </section>
  </template>

  <!--
  review-block \u2014 one collapsible card for a "check manually" or
  "reviewed ok" note. Same shell and disclosure contract as issue-block
  (role="button" header + aria-controls + JS-synced aria-expanded, body
  collapsed via [hidden]) so audit tooling sees one pattern. Two
  deliberate differences: the body class is \`issue-body review-body\`, so
  the exact \`class="issue-body"\` string \`insertFixes\` keys on never
  matches a review card (apply-fixes stays needs-fix only), and the root
  carries data-status instead of data-severity, so the severity tabs
  leave it alone.
  Placeholders:
    id                Escaped issue id.
    title             Escaped AQA question, or the rule title when none.
    statusKey         "manually" / "reviewed" (data-status + CSS hook).
    statusLabel       Reader-facing status ("Check manually \xB7 unresolved").
    tagName           Escaped element tag (lowercased for display).
    selector          Escaped first selector.
    concernHeading    "What to verify" / "Reviewed concern".
    successCriterion  Escaped rule title.
    concernText       AQA problem HTML ('' when none).
    stepsBlock        Pre-rendered review-steps section ('' when none).
    activityBlock     Pre-rendered review-activity section ('' when none).
    severityLabel     Capitalized severity name.
    complexity        Capitalized complexity ("Easy" / "Average" / "Hard").
    responsibility    Free text or "Unknown".
    technology        Free text or "Unknown".
-->
  <template id="review-block">
    <div class="issue-card review-card" data-status="{{statusKey}}" data-issue-id="{{id}}" id="issue-{{id}}">
      <div class="issue-card-header" role="button" tabindex="0" aria-controls="issue-{{id}}-body" aria-expanded="false">
        <div>
          <p class="issue-title">{{title}}</p>
          <p class="issue-severity review-status review-status-{{statusKey}}">{{statusLabel}}</p>
        </div>
        <div class="issue-controls">
          <span class="issue-ai-badge">{{id}}</span>
          <span class="issue-toggle"></span>
        </div>
      </div>
      <div class="issue-body review-body" id="issue-{{id}}-body" hidden>
        <section class="issue-section">
          <h4>Element</h4>
          <dl class="kv-list element-kv">
            <dt>Element:</dt>
            <dd><code>&lt;<span class="hlun-tag">{{tagName}}</span>&gt;</code></dd>
            <dt>Selector:</dt>
            <dd><code><span class="hlun-css-sel">{{selector}}</span></code></dd>
          </dl>
        </section>
        <section class="issue-section">
          <h4>{{concernHeading}}</h4>
          <p class="success-criterion">Success criterion: <strong>{{successCriterion}}</strong></p>
          <div class="failure-text">{{concernText}}</div>
        </section>
        {{stepsBlock}}
        {{activityBlock}}
        <section class="issue-section">
          <h4>Issue meta</h4>
          <dl class="kv-list">
            <dt>Severity:</dt>
            <dd><strong>{{severityLabel}}</strong></dd>
            <dt>Complexity:</dt>
            <dd><strong>{{complexity}}</strong></dd>
            <dt>Responsibility:</dt>
            <dd><strong>{{responsibility}}</strong></dd>
            <dt>Technology:</dt>
            <dd><strong>{{technology}}</strong></dd>
          </dl>
        </section>
      </div>
    </div>
  </template>

  <!--
  review-steps \u2014 the AQA methodology of a review card as an ordered list,
  one review-step per step in AQA order.
  Placeholders:
    count  Integer step count.
    rows   Concatenated review-step fragments.
-->
  <template id="review-steps">
    <section class="issue-section">
      <h4>AQA methodology ({{count}} steps)</h4>
      <ol class="review-steps">{{rows}}</ol>
    </section>
  </template>

  <!--
  review-step \u2014 one methodology step. \`title\` and \`text\` are AQA-authored
  HTML (the panel renders them through DangerousHtml too), forwarded
  verbatim like solution rows. \`outcomes\` is the pre-rendered yes/no
  outcome line for question steps, '' for info steps.
-->
  <template id="review-step">
    <li class="review-step">
      <p class="review-step-title">{{title}}</p>
      <div class="review-step-text">{{text}}</div>
      {{outcomes}}
    </li>
  </template>

  <!--
  review-activity \u2014 a note's saved status changes in AQA order. Rendered
  on review cards and, when manual review is included, on needs-fix cards.
  Placeholders:
    count  Integer activity count.
    rows   Concatenated review-activity-row fragments.
-->
  <template id="review-activity">
    <section class="issue-section">
      <h4>Review activity ({{count}})</h4>
      <ul class="activity-list">{{rows}}</ul>
    </section>
  </template>

  <!--
  review-activity-row \u2014 one activity record. Everything here is escaped
  text: \`description\` is reviewer/AI prose, never markup.
  Placeholders:
    status       Reader-facing status label.
    actor        "AI-assisted" / "Reviewer".
    time         Formatted timestamp.
    description  Escaped rationale.
-->
  <template id="review-activity-row">
    <li class="activity-item">
      <p class="activity-meta">{{status}} \xB7 {{actor}} \xB7 {{time}}</p>
      <p class="activity-description">{{description}}</p>
    </li>
  </template>

  <!--
  key-result-card \u2014 one of four cards in the "Key results" row.
  Placeholders:
    tone   one of "total" / "high" / "medium" / "low" (styles the card).
    label  small uppercase-cased label (e.g. "Total issues").
    value  numeric value rendered large.
    sub    one-liner under the value (e.g. "Issues marked as Needs fix").
-->
  <template id="key-result-card">
    <div class="kr-card kr-card-{{tone}}">
      <p class="kr-card-label">{{label}}</p>
      <p class="kr-card-value">{{value}}</p>
      <p class="kr-card-sub">{{sub}}</p>
    </div>
  </template>

  <!--
  breakdown-row \u2014 one row inside a breakdown column.
  Placeholders:
    label    Dimension value name (e.g. "Easy", "Development").
    count    Integer count.
    pct      Integer percentage 0..100 used both in the label and as the
             bar's CSS width.
    zeroCls  Either "" or " is-zero" \u2014 appended to the row class so zero-
             value rows can be visually muted.
-->
  <template id="breakdown-row">
    <div class="bd-row{{zeroCls}}">
      <div class="bd-row-bar"><span style="width:{{pct}}%"></span></div>
      <p class="bd-row-text">{{label}}: {{count}} ({{pct}}%)</p>

    </div>
  </template>

  <!--
  solutions-section \u2014 wrapper around the solutions list, emitted inline
  in the issue body when at least one solution exists. Stays empty
  otherwise so the section isn't rendered.
  Placeholders:
    count          Integer count of solutions.
    solutionRows   Concatenated <solution-row> fragments.
-->
  <template id="solutions-section">
    <section class="issue-section">
      <h4>Solutions ({{count}})</h4>
      <div class="solutions-list">{{solutionRows}}</div>
    </section>
  </template>

  <!--
  solution-row \u2014 one collapsible item inside the solutions list. Custom
  disclosure (not <details>/<summary>) so the ARIA contract is explicit
  and assertable: the header carries role="button" + aria-controls + a
  JS-synced aria-expanded; the body is collapsed via [hidden].
  Placeholders:
    domId  DOM id base for this solution (e.g. "issue-AI3-solution-2"). The
           wrapper uses it directly; the body appends "-body" so the
           header's aria-controls can point to it.
    title  Plain text title.
    text   HTML body (already trusted AQA content).
-->
  <template id="solution-row">
    <div class="solution" id="{{domId}}">
      <div class="solution-header" role="button" tabindex="0" aria-controls="{{domId}}-body" aria-expanded="false">
        {{title}}</div>
      <div class="solution-body" id="{{domId}}-body" hidden>{{text}}</div>
    </div>
  </template>

  <!--
  issue-block \u2014 one collapsible issue card. The \`data-issue-id\` on the
  card root is the anchor the post-processing \`insertFixes\` pass keys
  on; it inserts the styled diff block at the top of \`.issue-body\` for
  the cards whose ids appear in the supplied \`fixes.json\`. Cards
  without a matching fix render as-is.
  Placeholders:
    title             Escaped note title.
    severity          "high" / "medium" / "low" (powers the tab filter + CSS).
    severityLabel     Capitalized severity name shown to the reader.
    id                Escaped issue id (used as the apply-fixes anchor).
    screenshot        Pre-rendered SVG block ('' when no crop or HTML/BODY).
    tagName           Escaped element tag (lowercased for display).
    selector          Escaped first selector.
    elementHtml       Pre-rendered <pre>+<code> block for outerHTML ('' when none).
    successCriterion  WCAG SC or rule title (free text).
    failureText       Plain-language failure description.
    solutionsBlock    Pre-rendered <section> with the solutions list ('' when none).
    complexity        Capitalized complexity ("Easy" / "Average" / "Hard").
    responsibility    Free text or "Unknown".
    technology        Free text or "Unknown".
-->
  <template id="issue-block">
    <div class="issue-card" data-severity="{{severity}}" data-issue-id="{{id}}" id="issue-{{id}}">
      <div class="issue-card-header" role="button" tabindex="0" aria-controls="issue-{{id}}-body" aria-expanded="false">
        <div>
          <p class="issue-title">{{title}}</p>
          <p class="issue-severity issue-severity-{{severity}}">{{severityLabel}} severity</p>
        </div>
        <div class="issue-controls">
          <span class="issue-ai-badge">{{id}}</span>
          <span class="issue-toggle"></span>
        </div>
      </div>
      <div class="issue-body" id="issue-{{id}}-body" hidden>
        <section class="issue-section">
          <h4>Element</h4>
          <dl class="kv-list element-kv">
            <dt>Element:</dt>
            <dd><code>&lt;<span class="hlun-tag">{{tagName}}</span>&gt;</code></dd>
            <dt>Selector:</dt>
            <dd><code><span class="hlun-css-sel">{{selector}}</span></code></dd>
          </dl>
          {{screenshot}}
          {{elementHtml}}
        </section>
        <section class="issue-section">
          <h4>Failure</h4>
          <p class="success-criterion">Success criterion: <strong>{{successCriterion}}</strong></p>
          <div class="failure-text">{{failureText}}</div>
        </section>
        {{solutionsBlock}}
        {{reviewActivity}}
        <section class="issue-section">
          <h4>Issue meta</h4>
          <dl class="kv-list">
            <dt>Severity:</dt>
            <dd><strong>{{severityLabel}}</strong></dd>
            <dt>Complexity:</dt>
            <dd><strong>{{complexity}}</strong></dd>
            <dt>Responsibility:</dt>
            <dd><strong>{{responsibility}}</strong></dd>
            <dt>Technology:</dt>
            <dd><strong>{{technology}}</strong></dd>
          </dl>
        </section>
      </div>
    </div>
  </template>
</body>

</html>
`;

// ../shared/src/report/html.ts
function extractFragments(source) {
  const fragments = {};
  const shell = source.replace(
    /<template id="([a-z][a-z0-9-]*)">([\s\S]*?)<\/template>\s*/g,
    (_match, id, body) => {
      fragments[id] = body.trim();
      return "";
    }
  );
  return { shell, fragments };
}
var TEMPLATE = extractFragments(report_template_default);

// src/scripts/print-config.ts
var HOSTS = ["json", "claude-code", "cursor", "codex", "gemini", "vscode"];
var DIALED_RANGE = `${BRIDGE_PLUGIN_DEFAULT_PORT}-${BRIDGE_PLUGIN_DEFAULT_PORT + BRIDGE_PLUGIN_SLOT_COUNT - 1}`;
var USAGE = `Usage: node print-config.js [host] [--bridge-port <port>] [--node]

  host                  One of: ${HOSTS.join(", ")}. Omit to print all.
  --bridge-port <port>  Bake a non-default base port into the snippets. The AQA
                        extension has no port setting and dials only ${DIALED_RANGE},
                        so this is for custom extension builds.
  --node                Register \`node mcp-server.js\` instead of the launcher,
                        for a host that does not run it (a Windows host that
                        does not resolve the .cmd). Needs Node.js ${"20"}+
                        on that host's PATH.
`;
function print(text) {
  process.stdout.write(`${text}
`);
}
function fail(message) {
  process.stderr.write(`[${"UsableNet AQA Browser"}] ${message}

${USAGE}`);
  process.exit(1);
}
function shellQuote(arg) {
  return /^[\w./:@=-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", String.raw`'\''`)}'`;
}
function parseCli() {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      options: {
        "bridge-port": { type: "string" },
        node: { type: "boolean", default: false },
        help: { type: "boolean", default: false }
      },
      allowPositionals: true
    }));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (values.help === true) {
    print(USAGE);
    process.exit(0);
  }
  if (positionals.length > 1) fail(`expected at most one host, got: ${positionals.join(" ")}`);
  const host2 = positionals[0] ?? "all";
  if (host2 !== "all" && !HOSTS.includes(host2)) fail(`unknown host "${host2}"`);
  const useNode2 = values.node === true;
  const raw = values["bridge-port"];
  if (raw === void 0) return { host: host2, bridgePort: void 0, useNode: useNode2 };
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    fail(`invalid --bridge-port "${raw}" \u2014 expected a port number (1-65535)`);
  }
  return { host: host2, bridgePort: port, useNode: useNode2 };
}
function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}
function shellCommand(server2) {
  return [server2.command, ...server2.args].map(shellQuote).join(" ");
}
function buildSnippet(host2, { server: server2, distDir: distDir2, bridgePort: bridgePort2 }) {
  const mcpServersJson = JSON.stringify({ mcpServers: { ["UsableNet AQA Browser"]: server2 } }, null, 2);
  switch (host2) {
    case "json":
      return `Generic \`mcpServers\` JSON \u2014 Windsurf, Claude Desktop, and most other MCP clients:

${mcpServersJson}`;
    case "cursor": {
      const workspaceArgs = [...server2.args, "--workspace-dir", "${workspaceFolder}"];
      const projectJson = JSON.stringify(
        { mcpServers: { ["UsableNet AQA Browser"]: { command: server2.command, args: workspaceArgs } } },
        null,
        2
      );
      const deepLinkConfig = Buffer.from(JSON.stringify(server2)).toString("base64");
      return `Cursor \u2014 RECOMMENDED: per-project registration at <project>/.cursor/mcp.json (Cursor sends no MCP roots, so \`--workspace-dir \${workspaceFolder}\` anchors relative report/flow paths in the project):

${projectJson}

Global alternatives \u2014 ~/.cursor/mcp.json (reports then need absolute outDir paths):

${mcpServersJson}

or the one-click deep link:

https://cursor.com/en/install-mcp?name=${encodeURIComponent("UsableNet AQA Browser")}&config=${deepLinkConfig}

After registering, verify the written entry: \`command\` must be ${JSON.stringify(server2.command)} with only the flags in \`args\` (a mangled entry spawns nothing, and Cursor shows a misleading "Connect/Authenticate" card \u2014 there is no OAuth; Skip it). Cursor also leases servers by CONFIG HASH: after fixing a broken entry, change any byte of the config (or rename the server) so a fresh process is spawned.

Recommended: also install the AQA plugin (skills Cursor loads on demand) by COPYING this whole dist folder to ~/.cursor/plugins/local/${"aqabrowser"} \u2014 real files, NOT a symlink (Cursor rejects symlinks that point outside plugins/local); re-copy after rebuilds. It carries a \`.cursor-plugin/plugin.json\` manifest and the \`skills/\` directory Cursor auto-discovers. Without it the agent gets the raw tools only.`;
    }
    case "claude-code":
      return `Claude Code \u2014 prefer installing the full plugin (skills + subagents included). This dist folder doubles as a local marketplace:

/plugin marketplace add ${distDir2}
/plugin install aqa@${"UsableNet"}

Or for development: claude --plugin-dir ${shellQuote(distDir2)}

To register ONLY the MCP server:

claude mcp add ${shellQuote("UsableNet AQA Browser")} --scope user -- ${shellCommand(server2)}`;
    case "codex": {
      const toml = `[mcp_servers.${tomlKey("UsableNet AQA Browser")}]
command = ${JSON.stringify(server2.command)}
args = [${server2.args.map((a) => JSON.stringify(a)).join(", ")}]`;
      return `Codex (CLI + ChatGPT desktop app) \u2014 prefer installing the full plugin (skills included). This dist folder doubles as a local Codex marketplace (\`.agents/plugins/marketplace.json\`):

codex plugin marketplace add ${shellQuote(distDir2)}
codex plugin add aqa@${"UsableNet"}

Then start a NEW Codex session \u2014 plugins load at session start. The plugin runs the server on the default bridge port (Codex has no per-plugin settings), so for a non-default port register the server manually instead. Codex negotiates no MCP roots and runs the server from inside the plugin folder, so relative report/flow paths anchor at $HOME (~/reports, ~/.aqa/flows) \u2014 pass absolute paths to place them elsewhere.

To register ONLY the MCP server${bridgePort2 === void 0 ? "" : ` (with --bridge-port ${bridgePort2})`}, add to ~/.codex/config.toml:

${toml}`;
    }
    case "gemini":
      return `Gemini CLI:

gemini mcp add ${shellQuote("UsableNet AQA Browser")} ${shellCommand(server2)}`;
    case "vscode":
      return `VS Code (GitHub Copilot):

code --add-mcp '${JSON.stringify({ name: "UsableNet AQA Browser", ...server2 })}'

Recommended: also install the AQA skills (workflow guidance Copilot loads on demand) by copying this dist's \`skills/\` folders into your project's \`.github/skills/\` directory. The subagent definitions in \`agents/\` can be copied alongside if your VS Code setup supports custom agents. Without them the agent gets the raw tools only.`;
    default:
      return fail(`unknown host "${String(host2)}"`);
  }
}
var { host, bridgePort, useNode } = parseCli();
var distDir = path.dirname(fileURLToPath(import.meta.url));
var portArgs = bridgePort === void 0 ? [] : ["--bridge-port", String(bridgePort)];
var launcherPath = path.join(
  distDir,
  ...process.platform === "win32" ? "launcher\\aqa-mcp.cmd".split("\\") : "launcher/aqa-mcp".split("/")
);
var server = useNode ? { command: "node", args: [path.join(distDir, "mcp-server.js"), ...portArgs] } : { command: launcherPath, args: portArgs };
print(`${"UsableNet AQA Browser"} v${"0.3.3"} \u2014 ${shellCommand(server)}`);
if (!useNode) {
  print(
    `The launcher finds a Node.js ${"20"}+ for the server (PATH, then the usual install locations \u2014 desktop apps start with a bare PATH) and, when there is none, answers the agent with the install steps instead of failing silently. Pass --node to register \`node mcp-server.js\` directly.`
  );
}
var selected = host === "all" ? HOSTS : [host];
for (const h of selected) {
  print(`
\u2500\u2500\u2500 ${h} ${"\u2500".repeat(Math.max(0, 60 - h.length))}`);
  print(`
${buildSnippet(h, { server, distDir, bridgePort })}`);
}
print(
  `
\u2500\u2500\u2500 first run ${"\u2500".repeat(51)}

On boot the server prints a pairing code to stderr (also visible via the aqa_setup_bridge tool). Paste it into the AQA extension \u2192 Settings \u2192 Connection to authorize the bridge${bridgePort === void 0 ? "" : `. Note the extension has no port setting and dials only ${DIALED_RANGE} \u2014 base port ${bridgePort} pairs only if the server lands inside that range (or with a custom extension build)`}.`
);
//# sourceMappingURL=print-config.js.map
