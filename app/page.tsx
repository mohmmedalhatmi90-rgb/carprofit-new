'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ينظّف القيم: يحذف المسافات والرموز المخفية وعلامات الاقتباس والـ / الأخيرة */
const ascii = (v?: string) => (v ?? '').replace(/[^\x21-\x7E]/g, '').replace(/["'`]/g, '');
const fixUrl = (v?: string) => {
  let u = ascii(v).replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = u.includes('.') ? `https://${u}` : `https://${u}.supabase.co`;
  return u;
};
const SUPABASE_URL = fixUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_KEY = ascii(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder');

type Status = 'available' | 'shipping' | 'repair' | 'ready' | 'sold';
type Expense = { id: string | number; car_id?: string | number; title: string; amount: number | string; created_at?: string };
type Car = {
  id: string | number;
  title: string;
  chassis_number?: string | null;
  purchase_price: number | string;
  selling_price?: number | string | null;
  buyer_name?: string | null;
  status?: string | null;
  created_at?: string;
  sale_date?: string | null;
  arrival_date?: string | null;
  tracking_url?: string | null;
  expenses?: Expense[];
};
type Goal = { id: string; name: string };
type Allocation = { id: string; car_id: string; goal_id: string; amount: number; created_at?: string };
type Meta = { label: string; icon: string; color: string; next: Status | null; nextLabel: string | null };

/* ---------- أيقونات خطية موحّدة بدل الإيموجي ---------- */
const ICONS: Record<string, string> = {
  dash: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  car: 'M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M3 13h18 M7.5 15.5h.01 M16.5 15.5h.01',
  plus: 'M12 5v14M5 12h14',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4 M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2 M16 14.5h.01',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.5 4.5L20 16 M20 20v-4h-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5',
  ship: 'M2 18c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 8 0 M5 15l-1-5h16l-1 5 M12 10V4h4 M8 10V7',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  flag: 'M5 21V4 M5 4h12l-2 4 2 4H5',
  sold: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M8 12l3 3 5-6',
  check: 'M5 12l5 5L20 7',
  user: 'M20 21a8 8 0 0 0-16 0 M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1 M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  trend: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  coins: 'M12 8a5 3 0 1 0 0-.01z M7 8v4c0 1.7 2.2 3 5 3s5-1.3 5-3V8 M7 12v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4',
};
function Icon({ n, size = 18 }: { n: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {(ICONS[n] || '').split(' M').map((d, i) => (
        <path key={i} d={(i === 0 ? '' : 'M') + d} />
      ))}
    </svg>
  );
}

const fmt = (n?: number | string | null) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const sum = (arr?: Expense[]) => (arr || []).reduce((a, e) => a + Number(e.amount || 0), 0);
const netOf = (c: Car) => Number(c.selling_price || 0) - Number(c.purchase_price || 0) - sum(c.expenses);

const STATUS_ORDER: Status[] = ['available', 'shipping', 'repair', 'ready', 'sold'];

const STATUS_META: Record<Status, Meta> = {
  available: { label: 'متاحة', icon: 'box', color: 'var(--orange)', next: 'shipping', nextLabel: 'نقل إلى الشحن' },
  shipping: { label: 'في الشحن', icon: 'ship', color: 'var(--blue)', next: 'repair', nextLabel: 'بدء التصليح' },
  repair: { label: 'قيد التصليح', icon: 'wrench', color: 'var(--violet)', next: 'ready', nextLabel: 'جاهزة للبيع' },
  ready: { label: 'جاهزة للبيع', icon: 'flag', color: 'var(--green)', next: 'sold', nextLabel: 'تسجيل البيع' },
  sold: { label: 'تم البيع', icon: 'sold', color: 'var(--green)', next: null, nextLabel: null },
};
const statusOf = (s?: string | null): Status => (s && s in STATUS_META ? (s as Status) : 'available');

const TITLES: Record<string, [string, string]> = {
  dashboard: ['لوحة التحكم', 'نظرة شاملة على السيارات والتكاليف والمبيعات والأرباح'],
  cars: ['جميع السيارات', 'إدارة ومتابعة جميع السيارات المسجلة'],
  status: ['حالة السيارات', 'تابع مراحل كل سيارة من الشراء حتى البيع'],
  add: ['إضافة سيارة', 'أضف سيارة جديدة إلى النظام'],
  allocations: ['توزيع الأرباح', 'وزّع صافي أرباح السيارات على أهدافكم واستخداماتكم'],
  expenses: ['المصاريف', 'جميع أغراض التصليح والمصاريف المسجلة على السيارات'],
  reports: ['التقارير', 'ملخص السيارات والمبيعات والمصاريف والأرباح'],
};

function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  const previous = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      previous.current = target;
      return;
    }
    const start = previous.current;
    const startTime = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / ms);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = progress === 1 ? target : Math.round(start + (target - start) * eased);
      setValue(next);
      previous.current = next;
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');
:root{--ink:#0F2B36;--ink2:#17394A;--primary:#0F2B36;--gold:#B08A3E;--gold-soft:#F6EFDF;--blue:#2B6CB0;--blue-soft:#E8F0F9;--green:#1F8A6B;--green-soft:#E6F4EF;--orange:#B7791F;--orange-soft:#FBF2E1;--violet:#6B5BB5;--violet-soft:#EFECF9;--red:#C2403D;--red-soft:#FBEAEA;--text:#16222B;--muted:#6B7885;--bg:#EDF0F2;--card:#FFFFFF;--border:#DDE3E8;--line:#E9EDF0;--shadow:0 1px 2px rgba(15,43,54,.04),0 4px 14px rgba(15,43,54,.04);--r:12px}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg)}
button,input,select{font:inherit}
button{cursor:pointer}
.cp{min-height:100vh;min-height:100dvh;overflow-x:hidden;background:var(--bg);color:var(--text);font-family:'IBM Plex Sans Arabic','Tajawal',system-ui,sans-serif;direction:rtl;line-height:1.55}
.cp *{box-sizing:border-box}
.cp button:focus-visible,.cp input:focus-visible,.cp select:focus-visible,.cp a:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.cp .num{font-variant-numeric:tabular-nums}
.cp .ic{display:inline-flex;align-items:center;gap:7px}
.cp .layout{min-height:100vh;min-height:100dvh;display:flex}
.cp .drawerBackdrop{display:none}

/* القائمة الجانبية */
.cp .sidebar{width:252px;background:var(--ink);color:#fff;padding:22px 14px;position:fixed;right:0;top:0;bottom:0;z-index:20;display:flex;flex-direction:column;overflow-y:auto}
.cp .logo{display:flex;align-items:center;gap:12px;padding:2px 10px 22px;border-bottom:1px solid rgba(255,255,255,.09)}
.cp .logoIcon{width:40px;height:40px;border-radius:10px;border:1px solid rgba(176,138,62,.7);color:#D9B76A;display:grid;place-items:center}
.cp .logoTitle{font-size:16px;font-weight:700;letter-spacing:.14em}
.cp .logoSub{font-size:10.5px;color:rgba(255,255,255,.5);margin-top:1px}
.cp .navTitle{font-size:11px;color:rgba(255,255,255,.4);margin:22px 12px 7px;font-weight:500}
.cp .navItem{width:100%;border:0;background:transparent;color:rgba(255,255,255,.72);padding:10px 12px;border-radius:9px;display:flex;align-items:center;gap:11px;text-align:right;margin-bottom:2px;transition:background .15s,color .15s;font-size:14px;position:relative}
.cp .navItem:hover{background:rgba(255,255,255,.07);color:#fff}
.cp .navItem.active{background:rgba(255,255,255,.1);color:#fff;font-weight:600}
.cp .navItem.active::before{content:'';position:absolute;right:-14px;top:9px;bottom:9px;width:3px;border-radius:3px 0 0 3px;background:#D9B76A}
.cp .sidebarBottom{margin-top:auto;border-top:1px solid rgba(255,255,255,.09);padding-top:14px}
.cp .userBox{display:flex;align-items:center;gap:10px;padding:8px 10px}
.cp .avatar{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.1);display:grid;place-items:center;color:rgba(255,255,255,.8)}
.cp .userName{font-size:13px;font-weight:600}
.cp .userRole{font-size:11px;color:rgba(255,255,255,.45)}

/* المحتوى */
.cp .content{flex:1;min-width:0;margin-right:252px;padding:26px clamp(16px,3.4vw,44px) 60px}
.cp .container{max-width:1400px;margin:auto}
.cp .topbar{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid var(--border)}
.cp .pageTitle{font-size:24px;font-weight:700;margin:0;letter-spacing:-.01em}
.cp .pageSub{color:var(--muted);font-size:13px;margin-top:3px}
.cp .topActions{display:flex;gap:8px;flex-shrink:0;align-items:center}
.cp .iconBtn{width:40px;height:40px;border:1px solid var(--border);background:#fff;color:var(--ink);border-radius:10px;display:grid;place-items:center;transition:border-color .15s,background .15s}
.cp .iconBtn:hover{border-color:#B9C4CD;background:#F8FAFB}
.cp .mobileMenu{display:none}
.cp .primaryBtn{border:0;background:var(--ink);color:#fff;padding:0 16px;height:40px;border-radius:10px;font-weight:600;font-size:14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:background .15s}
.cp .primaryBtn:hover{background:var(--ink2)}
.cp .primaryBtn:active,.cp .iconBtn:active,.cp .secondaryBtn:active{transform:translateY(1px)}

/* البطل */
.cp .hero{background:var(--ink);border-radius:16px;padding:28px 30px;color:#fff;position:relative;overflow:hidden;margin-bottom:18px;border:1px solid #1E4558}
.cp .hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 22px,rgba(255,255,255,.018) 22px 23px);pointer-events:none}
.cp .hero::after{content:'';position:absolute;right:0;top:0;bottom:0;width:4px;background:#D9B76A}
.cp .heroGrid{position:relative;z-index:2;display:grid;grid-template-columns:1.2fr 1fr;gap:34px;align-items:center}
.cp .heroLabel{color:rgba(255,255,255,.65);font-size:13px;margin-bottom:8px}
.cp .heroProfit{font-size:clamp(36px,5.6vw,60px);font-weight:600;line-height:1.05;letter-spacing:-.02em}
.cp .heroProfit small{font-size:16px;font-weight:400;margin-right:8px;color:rgba(255,255,255,.55);letter-spacing:0}
.cp .heroNote{margin-top:12px;color:rgba(255,255,255,.5);font-size:12px}
.cp .heroStats{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden}
.cp .heroMini{background:#15384A;padding:14px 16px;min-width:0}
.cp .heroMini span{display:block;color:rgba(255,255,255,.55);font-size:11.5px;margin-bottom:4px}
.cp .heroMini b{font-size:17px;font-weight:600}

/* مسار السيارات */
.cp .pipeline{display:grid;grid-template-columns:repeat(5,1fr);background:#fff;border:1px solid var(--border);border-radius:var(--r);margin-bottom:18px;box-shadow:var(--shadow);overflow:hidden}
.cp .pipeStep{border:0;background:#fff;padding:14px 16px;text-align:right;display:flex;align-items:center;gap:12px;border-left:1px solid var(--line);transition:background .15s}
.cp .pipeStep:last-child{border-left:0}
.cp .pipeStep:hover{background:#F8FAFB}
.cp .pipeIcon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.cp .pipeCount{font-size:20px;font-weight:700;line-height:1.1}
.cp .pipeLabel{font-size:12px;color:var(--muted)}

/* البطاقات الإحصائية */
.cp .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.cp .statCard{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow);overflow:hidden}
.cp .statTop{display:flex;justify-content:space-between;align-items:center}
.cp .statIcon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center}
.cp .statLabel{color:var(--muted);font-size:12.5px}
.cp .statValue{font-size:24px;font-weight:700;margin-top:10px;letter-spacing:-.01em}
.cp .statHint{font-size:11.5px;color:var(--muted);margin-top:3px}
.cp .blue{background:var(--blue-soft);color:var(--blue)}
.cp .green{background:var(--green-soft);color:var(--green)}
.cp .orange{background:var(--orange-soft);color:var(--orange)}
.cp .gold{background:var(--gold-soft);color:var(--gold)}

.cp .workspace{display:grid;grid-template-columns:320px 1fr;gap:18px;align-items:start}
.cp .card{background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
.cp .addCard{padding:20px;position:sticky;top:20px}
.cp .cardTitle{font-size:16px;font-weight:700;margin:0}
.cp .cardSub{color:var(--muted);font-size:12px;margin-top:3px}
.cp .field{margin-top:14px}
.cp .field label{display:block;font-size:12.5px;color:#4B5865;font-weight:500;margin-bottom:6px}
.cp .field input,.cp .plainForm input,.cp .repairForm input,.cp .saleForm input,.cp .allocationForm input,.cp .allocationForm select{width:100%;height:42px;background:#F7F9FA;border:1px solid var(--border);color:var(--text);border-radius:9px;padding:0 12px;transition:border-color .15s,background .15s,box-shadow .15s}
.cp .field input:hover,.cp .plainForm input:hover{border-color:#B9C4CD}
.cp .field input:focus,.cp .plainForm input:focus,.cp .repairForm input:focus,.cp .saleForm input:focus,.cp .allocationForm input:focus,.cp .allocationForm select:focus,.cp .search:focus{border-color:var(--blue);background:#fff;outline:none;box-shadow:0 0 0 3px rgba(43,108,176,.12)}
.cp .addSubmit{width:100%;margin-top:18px;border:0;height:44px;border-radius:10px;background:var(--ink);color:#fff;font-weight:600;transition:background .15s}
.cp .addSubmit:hover{background:var(--ink2)}
.cp .listArea{min-width:0}
.cp .listHeader{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow)}
.cp .listHeaderTop{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.cp .tabs{display:inline-flex;gap:2px;background:#EEF1F4;padding:3px;border-radius:10px}
.cp .tabs button{border:0;background:transparent;color:var(--muted);border-radius:8px;padding:7px 14px;font-size:13px;transition:background .15s,color .15s}
.cp .tabs button.active{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(15,43,54,.1)}
.cp .search{width:250px;max-width:100%;height:40px;border:1px solid var(--border);background:#F7F9FA;border-radius:9px;padding:0 13px;font-size:14px}
.cp .statusTabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.cp .statusTab{border:1px solid var(--border);background:#fff;border-radius:11px;padding:12px 8px;color:var(--muted);transition:border-color .15s,background .15s;display:flex;flex-direction:column;align-items:center;gap:3px}
.cp .statusTab:hover{border-color:#B9C4CD}
.cp .statusTab.active{color:var(--ink);border-color:var(--ink);background:#F4F8FA;box-shadow:inset 0 -2px 0 var(--ink)}
.cp .statusTabLabel{font-size:13px;font-weight:600}
.cp .statusTabCount{font-size:11.5px;color:var(--muted)}
.cp .statusAction{grid-column:1/-1;border:0;border-radius:9px;height:38px;color:#fff;font-size:13px;font-weight:600;transition:filter .15s}
.cp .statusAction:hover{filter:brightness(1.08)}
.cp .carRow{background:#fff;border:1px solid var(--border);border-radius:13px;padding:16px 18px;margin-bottom:9px;display:grid;grid-template-columns:1.25fr 1.7fr 120px;gap:20px;align-items:center;cursor:pointer;transition:border-color .15s,box-shadow .15s;box-shadow:var(--shadow)}
.cp .carRow:hover{border-color:#9FB3C2;box-shadow:0 6px 20px rgba(15,43,54,.08)}
.cp .carMain{min-width:0}
.cp .carName{font-size:15.5px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cp .vin{font-family:ui-monospace,Menlo,monospace;direction:ltr;display:inline-block;color:#7F8C99;font-size:11.5px;margin-top:4px;letter-spacing:.03em}
.cp .status{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:99px;font-size:11.5px;font-weight:600;line-height:1.7}
.cp .status.available{background:var(--orange-soft);color:var(--orange)}
.cp .status.shipping{background:var(--blue-soft);color:var(--blue)}
.cp .status.repair{background:var(--violet-soft);color:var(--violet)}
.cp .status.ready,.cp .status.sold{background:var(--green-soft);color:var(--green)}
.cp .barWrap{min-width:0}
.cp .bar{height:6px;display:flex;overflow:hidden;border-radius:99px;background:#EAEEF2;direction:rtl}
.cp .barSegment{height:100%;transition:width .6s}
.cp .barInfo{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:11.5px;margin-top:8px}
.cp .profit{text-align:left;font-size:16px;font-weight:700}
.cp .profit small{display:block;font-size:11px;font-weight:500;margin-top:1px;color:var(--muted)}
.cp .pending{color:var(--muted);font-size:12.5px;font-weight:500}
.cp .empty{padding:56px 20px;text-align:center;color:var(--muted);background:#fff;border:1px dashed #C9D2DA;border-radius:13px;font-size:14px}
.cp .emptyIcon{margin-bottom:10px;color:#9AA8B5;display:flex;justify-content:center}

/* النافذة المنبثقة */
.cp .overlay{position:fixed;inset:0;z-index:100;background:rgba(10,25,33,.55);backdrop-filter:blur(4px);display:grid;place-items:center;padding:18px;animation:fade .18s ease}
.cp .modal{width:100%;max-width:700px;max-height:92vh;max-height:92dvh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25);animation:rise .24s ease}
.cp .modalHead{padding:20px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:15px;align-items:flex-start;position:sticky;top:0;background:#fff;z-index:2}
.cp .modalHead>div:first-child{min-width:0}
.cp .close{width:34px;height:34px;flex-shrink:0;border:1px solid var(--border);background:#fff;border-radius:9px;color:var(--muted);display:grid;place-items:center}
.cp .close:hover{background:#F4F6F8;color:var(--text)}
.cp .modalBody{padding:22px}
.cp .detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cp .detailBox{background:#F7F9FA;border:1px solid var(--line);border-radius:11px;padding:13px 14px;min-width:0}
.cp .detailBox>span{display:block;color:var(--muted);font-size:12px;margin-bottom:6px}
.cp .detailBox b{font-size:17px;font-weight:700}
.cp .detailBox small{display:block;margin-top:6px;color:var(--muted);font-size:11.5px}
.cp .detailBox form{display:flex;gap:6px}
.cp .detailBox form input{height:38px}
.cp .sectionTitle{margin:24px 0 11px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
.cp .sectionTitle::after{content:'';flex:1;height:1px;background:var(--line)}
.cp .carStatusBox{margin-top:16px;padding:16px;background:#F7F9FA;border:1px solid var(--line);border-radius:12px}
.cp .carStatusTitle{font-size:13px;font-weight:700;margin-bottom:14px}
.cp .carStatusLine{display:flex;align-items:center;gap:5px;direction:rtl;overflow-x:auto;padding-bottom:3px}
.cp .carStatusStep{flex:1;min-width:72px;text-align:center}
.cp .carStatusDot{width:30px;height:30px;border-radius:50%;margin:auto;display:grid;place-items:center;background:#E7ECF0;color:#8D9AA7}
.cp .carStatusStep.done .carStatusDot{background:var(--green);color:#fff}
.cp .carStatusStep.current .carStatusDot{color:#fff;box-shadow:0 0 0 4px rgba(15,43,54,.08)}
.cp .carStatusStep span{display:block;margin-top:6px;font-size:11px;color:var(--muted);white-space:nowrap}
.cp .carStatusStep.current span{color:var(--text);font-weight:600}
.cp .carStatusConnector{height:2px;flex:1;min-width:16px;background:#D8DFE5;border-radius:99px;margin-bottom:19px}
.cp .carStatusConnector.done{background:var(--green)}
.cp .nextStatusBtn{width:100%;margin-top:14px;border:0;border-radius:10px;height:44px;color:#fff;font-weight:600;background:var(--ink);transition:background .15s}
.cp .nextStatusBtn:hover{background:var(--ink2)}
.cp .plainForm{padding:14px;display:grid;gap:11px}
.cp .plainForm label{display:grid;gap:5px;font-size:12.5px;color:#4B5865;font-weight:500}
.cp .plainForm a{color:var(--blue);font-size:13px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:500}
.cp .plainForm a:hover{text-decoration:underline}
.cp .repairForm{display:grid;grid-template-columns:1fr 120px auto;gap:7px}
.cp .smallBtn{border:0;background:var(--ink);color:#fff;border-radius:9px;padding:0 16px;height:42px;font-weight:600;display:inline-flex;align-items:center;gap:6px;justify-content:center}
.cp .smallBtn:hover{background:var(--ink2)}
.cp .repairTable{margin-top:12px;border:1px solid var(--border);border-radius:11px;overflow:hidden}
.cp .repairHeader,.cp .repairRow{display:grid;grid-template-columns:1fr 110px auto;gap:10px;align-items:center;padding:11px 14px}
.cp .repairHeader{background:#F4F7F9;color:var(--muted);font-size:11.5px;font-weight:600;border-bottom:1px solid var(--border)}
.cp .repairRow{font-size:13px;border-bottom:1px solid var(--line)}
.cp .repairRow:last-child{border-bottom:0}
.cp .repairRow input{height:36px}
.cp .repairName{min-width:0;overflow:hidden;text-overflow:ellipsis}
.cp .repairAmount{text-align:left;color:var(--orange);font-weight:700}
.cp .repairTotal{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:12px 14px;background:var(--gold-soft);border:1px solid #E8DBBA;border-radius:10px;font-size:13px}
.cp .repairTotal b{color:#7A5B1C;font-size:16px}
.cp .noRepairs{color:var(--muted);font-size:13px;padding:14px 2px}
.cp .saleBox{margin-top:22px;background:var(--green-soft);border:1px solid #C9E5DA;border-radius:13px;padding:17px}
.cp .saleTitle{font-weight:700;color:var(--green);margin-bottom:12px}
.cp .saleForm{display:grid;gap:9px}
.cp .saleSubmit{border:0;background:var(--green);color:#fff;border-radius:10px;height:44px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px}
.cp .saleSubmit:hover{filter:brightness(1.07)}
.cp .expected{background:#fff;border-radius:9px;padding:10px 12px;font-size:13px;border:1px solid #D3E8DF}
.cp .soldBox{color:var(--green)}
.cp .saleHint{margin-top:20px;padding:12px 14px;background:#F7F9FA;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:13px}
.cp .modalFooter{display:flex;justify-content:space-between;gap:8px;padding:16px 22px;border-top:1px solid var(--border)}
.cp .dangerBtn{border:1px solid #EBC3C2;color:var(--red);background:#fff;border-radius:9px;padding:0 13px;height:36px;font-size:13px;display:inline-flex;align-items:center;gap:6px;transition:background .15s}
.cp .dangerBtn:hover{background:var(--red-soft)}
.cp .secondaryBtn{border:1px solid var(--border);color:var(--text);background:#fff;border-radius:9px;padding:0 14px;height:36px;font-size:13px;display:inline-flex;align-items:center;gap:6px;transition:background .15s,border-color .15s}
.cp .secondaryBtn:hover{background:#F4F7F9;border-color:#B9C4CD}

/* التوزيع والتقارير */
.cp .financeSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}
.cp .financeCard{background:#F7F9FA;border:1px solid var(--line);border-radius:12px;padding:16px}
.cp .financeCard span{display:block;color:var(--muted);font-size:12.5px}
.cp .financeCard b{display:block;margin-top:6px;font-size:22px;color:var(--ink)}
.cp .goalGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:15px}
.cp .goalCard{border:1px solid var(--border);border-radius:12px;padding:15px;background:#fff;position:relative}
.cp .goalCardHead{display:flex;align-items:center;gap:9px;font-weight:600;padding-left:30px}
.cp .goalDot{width:9px;height:9px;border-radius:50%;background:var(--gold)}
.cp .goalCardValue{font-size:20px;font-weight:700;margin-top:10px;color:var(--ink)}
.cp .goalCard small{display:block;color:var(--muted);margin-top:3px;font-size:12px}
.cp .goalDel{position:absolute;left:10px;top:10px;width:28px;height:28px;border:0;background:transparent;color:#9AA8B5;border-radius:7px;display:grid;place-items:center}
.cp .goalDel:hover{background:var(--red-soft);color:var(--red)}
.cp .tableScroll{overflow-x:auto}
.cp .tableScroll .repairTable{min-width:640px}
.cp .allocationForm{display:grid;grid-template-columns:1.3fr 1.3fr 1fr auto;gap:9px;align-items:center}
.cp .allocationForm .primaryBtn{height:42px}
.cp .sectionIntro{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cp .sectionIntro h2{margin:0}
.cp .goalForm{display:flex;gap:8px;margin-top:16px}
.cp .goalForm .search{flex:1;width:auto;height:42px}
.cp .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;background:var(--ink);color:#fff;padding:12px 20px;border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.22);font-size:13.5px;font-weight:500;border-right:3px solid #D9B76A;animation:rise .2s ease}
.cp .toast.error{background:#8F2A28;border-right-color:#F0A3A1}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
@media(max-width:1100px){
.cp .stats{grid-template-columns:1fr 1fr}
.cp .workspace{grid-template-columns:1fr}
.cp .addCard{position:static}
.cp .statusTabs{grid-template-columns:repeat(3,1fr)}
.cp .pipeline{grid-template-columns:repeat(3,1fr)}
.cp .pipeStep{border-bottom:1px solid var(--line)}
}
@media(max-width:800px){
.cp .sidebar{width:min(280px,82vw);transform:translateX(100%);transition:transform .25s ease;padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))}
.cp .sidebar.open{transform:none}
.cp .drawerBackdrop{display:block;position:fixed;inset:0;z-index:19;background:rgba(10,25,33,.5)}
.cp .content{margin-right:0;padding:16px 13px 40px}
.cp .topbar{margin-bottom:18px;padding-bottom:14px}
.cp .pageTitle{font-size:20px}
.cp .pageSub{font-size:12px}
.cp .mobileMenu{display:grid}
.cp .iconBtn{width:42px;height:42px}
.cp input,.cp select{font-size:16px}
.cp .heroGrid{grid-template-columns:1fr;gap:20px}
.cp .hero{padding:22px 20px}
.cp .heroMini b{font-size:15px;word-break:break-word}
.cp .statValue{font-size:21px}
.cp .addCard{order:2}
.cp .listArea{order:1}
.cp .listHeaderTop{align-items:stretch;flex-direction:column}
.cp .search{width:100%}
.cp .tabs{display:flex}
.cp .tabs button{flex:1;padding:10px 6px}
.cp .carRow{grid-template-columns:1fr;gap:13px}
.cp .barInfo{flex-wrap:wrap}
.cp .profit{text-align:right}
.cp .statusAction{height:44px}
.cp .statusTabs{grid-template-columns:repeat(2,1fr)}
.cp .statusTab:last-child:nth-child(odd){grid-column:1/-1}
.cp .overlay{padding:0;place-items:end center}
.cp .modal{max-width:100%;max-height:94vh;max-height:94dvh;border-radius:18px 18px 0 0}
.cp .modalHead,.cp .modalBody{padding:16px}
.cp .modalFooter{padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px))}
.cp .carStatusStep{min-width:54px}
.cp .carStatusConnector{min-width:8px}
.cp .nextStatusBtn,.cp .saleSubmit{height:48px}
.cp .dangerBtn,.cp .secondaryBtn{height:42px}
.cp .toast{width:calc(100% - 28px);max-width:420px;text-align:center;bottom:calc(16px + env(safe-area-inset-bottom,0px))}
}
@media(max-width:520px){
.cp .stats{grid-template-columns:1fr}
.cp .detailGrid{grid-template-columns:1fr}
.cp .repairForm{grid-template-columns:1fr}
.cp .smallBtn{height:44px}
.cp .topActions .primaryBtn{display:none}
.cp .repairHeader,.cp .repairRow{grid-template-columns:1fr 105px}
.cp .financeSummary{grid-template-columns:1fr}
.cp .allocationForm{grid-template-columns:1fr}
.cp .pipeline{grid-template-columns:1fr 1fr}
.cp .goalForm{flex-direction:column}
}
@media(hover:none){
.cp .carRow:hover{box-shadow:var(--shadow);border-color:var(--border)}
}
@media(prefers-reduced-motion:reduce){.cp *{animation-duration:.01s!important;transition-duration:.01s!important}}
`;

function ProfitBar({ purchase, expenses, revenue }: { purchase: number; expenses: number; revenue: number }) {
  const cost = purchase + expenses;
  const max = Math.max(cost, revenue, 1);
  return (
    <div className="bar">
      <div className="barSegment" style={{ width: `${(purchase / max) * 100}%`, background: '#8FA6B6' }} />
      <div className="barSegment" style={{ width: `${(expenses / max) * 100}%`, background: '#D2A24C' }} />
      {revenue > cost && (
        <div className="barSegment" style={{ width: `${((revenue - cost) / max) * 100}%`, background: '#2FA17F' }} />
      )}
    </div>
  );
}

export default function CarProfitDashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [chassis, setChassis] = useState('');
  const [price, setPrice] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [sel, setSel] = useState<Car | null>(null);
  const [repairTitle, setRepairTitle] = useState('');
  const [repairAmount, setRepairAmount] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean; id: number } | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | number | null>(null);
  const [editExpenseTitle, setEditExpenseTitle] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [goalName, setGoalName] = useState('');
  const [allocationCarId, setAllocationCarId] = useState('');
  const [allocationGoalId, setAllocationGoalId] = useState('');
  const [allocationAmount, setAllocationAmount] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (message: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, error, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const closeModal = () => {
    setSel(null);
    setAskDelete(false);
  };

  const goAdd = () => {
    setActiveSection('add');
    setTimeout(() => document.getElementById('add-car-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const fetchCars = async () => {
    const { data, error } = await supabase
      .from('cars')
      .select('*, expenses(*)')
      .order('created_at', { ascending: false });

    if (error) {
      say(`تعذر جلب البيانات: ${error.message}`, true);
    } else {
      const rows = (data || []) as Car[];
      setCars(rows);
      setSel((current) => (current ? rows.find((car) => car.id === current.id) || null : current));
    }
    setLoading(false);
  };

  const fetchProfitPlans = async () => {
    const [{ data: goalRows, error: goalsError }, { data: allocationRows, error: allocationsError }] = await Promise.all([
      supabase.from('profit_goals').select('id,name').order('created_at', { ascending: true }),
      supabase.from('profit_allocations').select('id,car_id,goal_id,amount,created_at').order('created_at', { ascending: false }),
    ]);
    if (goalsError || allocationsError) {
      say('تعذر تحميل أهداف توزيع الأرباح. تأكد من تشغيل ملف supabase-setup.sql في Supabase.', true);
      return;
    }
    setGoals((goalRows || []) as Goal[]);
    setAllocations((allocationRows || []) as Allocation[]);
  };

  const refreshAll = async () => {
    await Promise.all([fetchCars(), fetchProfitPlans()]);
    say('تم تحديث البيانات');
  };

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setLoading(false);
      say('متغيرات Supabase غير مضبوطة. أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في Vercel ثم أعد النشر.', true);
      return;
    }
    fetchCars();
    fetchProfitPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setEditPrice(sel ? String(sel.purchase_price) : '');
  }, [sel?.id, sel?.purchase_price]);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel]);

  const addCar = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) return say('أدخل اسم السيارة وسعر السيارة', true);
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return say('أدخل سعر سيارة صحيح بالريال العُماني', true);

    const { error } = await supabase.from('cars').insert([
      {
        title: title.trim(),
        chassis_number: chassis.trim(),
        purchase_price: parsedPrice,
        status: 'available',
        arrival_date: arrivalDate || null,
        tracking_url: trackingUrl.trim() || null,
      },
    ]);
    if (error) return say(`حدث خطأ: ${error.message}`, true);

    setTitle('');
    setChassis('');
    setPrice('');
    setArrivalDate('');
    setTrackingUrl('');
    await fetchCars();
    say('تمت إضافة السيارة بنجاح');
  };

  const updateExpense = async (expense: Expense) => {
    const amount = Number(editExpenseAmount);
    if (!editExpenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) return say('أدخل اسمًا وقيمة صحيحة للمصروف', true);
    const { error } = await supabase.from('expenses').update({ title: editExpenseTitle.trim(), amount }).eq('id', expense.id);
    if (error) return say(`تعذر تعديل الغرض: ${error.message}`, true);
    setEditingExpense(null);
    await fetchCars();
    say('تم تعديل غرض التصليح');
  };

  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm(`حذف «${expense.title}»؟`)) return;
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) return say(`تعذر حذف الغرض: ${error.message}`, true);
    await fetchCars();
    say('تم حذف غرض التصليح');
  };

  const updateCarPrice = async () => {
    if (!sel) return;
    const amount = Number(editPrice);
    if (!Number.isFinite(amount) || amount <= 0) return say('أدخل سعرًا صحيحًا أكبر من صفر', true);
    const { error } = await supabase.from('cars').update({ purchase_price: amount }).eq('id', sel.id);
    if (error) return say(`تعذر تعديل السعر: ${error.message}`, true);
    await fetchCars();
    say('تم تعديل سعر شراء السيارة');
  };

  const saveCarShipping = async (car: Car, values: { arrival_date: string | null; tracking_url: string | null }) => {
    const { error } = await supabase.from('cars').update(values).eq('id', car.id);
    if (error) return say(`تعذر حفظ بيانات الوصول والتتبع: ${error.message}`, true);
    await fetchCars();
    say('تم حفظ بيانات الوصول والتتبع');
  };

  const addGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return say('اكتب اسم الهدف', true);
    const { error } = await supabase.from('profit_goals').insert([{ name: goalName.trim() }]);
    if (error) return say(`تعذر إضافة الهدف: ${error.message}`, true);
    setGoalName('');
    await fetchProfitPlans();
    say('تمت إضافة الهدف');
  };

  const deleteGoal = async (goal: Goal) => {
    const used = allocations.filter((a) => a.goal_id === goal.id).length;
    const msg = used
      ? `حذف الهدف «${goal.name}» سيحذف أيضًا ${used} توزيع مرتبط به. متابعة؟`
      : `حذف الهدف «${goal.name}»؟`;
    if (!window.confirm(msg)) return;
    const { error: allocError } = await supabase.from('profit_allocations').delete().eq('goal_id', goal.id);
    if (allocError) return say(`تعذر حذف توزيعات الهدف: ${allocError.message}`, true);
    const { error } = await supabase.from('profit_goals').delete().eq('id', goal.id);
    if (error) return say(`تعذر حذف الهدف: ${error.message}`, true);
    await fetchProfitPlans();
    say('تم حذف الهدف');
  };

  const addAllocation = async (e: FormEvent) => {
    e.preventDefault();
    const car = cars.find((item) => String(item.id) === allocationCarId);
    const amount = Number(allocationAmount);
    if (!car || !allocationGoalId || !Number.isFinite(amount) || amount <= 0) return say('اختر سيارة وهدفًا وأدخل مبلغًا صحيحًا', true);
    const alreadyAllocated = allocations.filter((item) => item.car_id === String(car.id)).reduce((total, item) => total + Number(item.amount), 0);
    if (amount > Math.max(0, netOf(car) - alreadyAllocated) + 1e-9) return say('المبلغ يتجاوز صافي الربح المتبقي لهذه السيارة', true);
    const { error } = await supabase.from('profit_allocations').insert([{ car_id: String(car.id), goal_id: allocationGoalId, amount }]);
    if (error) return say(`تعذر تسجيل التوزيع: ${error.message}`, true);
    setAllocationAmount('');
    await fetchProfitPlans();
    say('تم تسجيل توزيع المبلغ');
  };

  const deleteAllocation = async (allocationId: string) => {
    if (!window.confirm('حذف هذا التوزيع من السجل؟')) return;
    const { error } = await supabase.from('profit_allocations').delete().eq('id', allocationId);
    if (error) return say(`تعذر حذف التوزيع: ${error.message}`, true);
    await fetchProfitPlans();
    say('تم حذف التوزيع وتحديث الرصيد');
  };

  const addRepair = async (e: FormEvent) => {
    e.preventDefault();
    if (!repairTitle.trim() || !repairAmount || !sel) return say('أدخل اسم غرض التصليح وقيمته', true);
    const amount = parseFloat(repairAmount);
    if (Number.isNaN(amount) || amount <= 0) return say('أدخل قيمة صحيحة لغرض التصليح', true);

    const { error } = await supabase.from('expenses').insert([{ car_id: sel.id, title: repairTitle.trim(), amount }]);
    if (error) return say(`حدث خطأ: ${error.message}`, true);

    setRepairTitle('');
    setRepairAmount('');
    await fetchCars();
    say('تمت إضافة غرض التصليح');
  };

  const changeCarStatus = async (car: Car, newStatus: Status) => {
    const currentIndex = STATUS_ORDER.indexOf(statusOf(car.status));
    const newIndex = STATUS_ORDER.indexOf(newStatus);
    if (newIndex !== currentIndex + 1) return say('يجب نقل السيارة إلى المرحلة التالية بالترتيب', true);

    if (newStatus === 'sold') {
      setSel(car);
      setSellingPrice('');
      setBuyer('');
      setAskDelete(false);
      setTimeout(() => document.getElementById('sale-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      return;
    }

    const { error } = await supabase.from('cars').update({ status: newStatus }).eq('id', car.id);
    if (error) return say(`حدث خطأ: ${error.message}`, true);

    await fetchCars();
    say(`تم نقل السيارة إلى: ${STATUS_META[newStatus].label}`);
  };

  const sellCar = async (e: FormEvent) => {
    e.preventDefault();
    if (!sellingPrice || !sel) return say('أدخل سعر البيع', true);
    const parsed = parseFloat(sellingPrice);
    if (Number.isNaN(parsed) || parsed <= 0) return say('أدخل سعر بيع صحيح', true);

    const profit = parsed - Number(sel.purchase_price || 0) - sum(sel.expenses);

    const { error } = await supabase
      .from('cars')
      .update({ selling_price: parsed, buyer_name: buyer.trim(), status: 'sold', sale_date: new Date().toISOString() })
      .eq('id', sel.id);
    if (error) return say(error.message, true);

    setSellingPrice('');
    setBuyer('');
    setSel(null);
    await fetchCars();
    say(
      profit >= 0
        ? `تم البيع بنجاح — صافي الربح ${fmt(profit)} ر.ع`
        : `تم البيع — صافي الخسارة ${fmt(Math.abs(profit))} ر.ع`
    );
  };

  const deleteCar = async () => {
    if (!sel) return;
    const carId = sel.id;
    // حذف التوزيعات والمصاريف المرتبطة أولًا حتى لا يمنع الحذف أي قيد في قاعدة البيانات
    await supabase.from('profit_allocations').delete().eq('car_id', String(carId));
    await supabase.from('expenses').delete().eq('car_id', carId);
    const { error } = await supabase.from('cars').delete().eq('id', carId);
    if (error) return say(error.message, true);
    closeModal();
    await Promise.all([fetchCars(), fetchProfitPlans()]);
    say('تم حذف السيارة');
  };

  const stats = useMemo(() => {
    const sold = cars.filter((c) => c.status === 'sold');
    const available = cars.filter((c) => c.status === 'available');
    const purchase = cars.reduce((t, c) => t + Number(c.purchase_price || 0), 0);
    const expenses = cars.reduce((t, c) => t + sum(c.expenses), 0);
    const sales = sold.reduce((t, c) => t + Number(c.selling_price || 0), 0);
    const soldCost = sold.reduce((t, c) => t + Number(c.purchase_price || 0) + sum(c.expenses), 0);
    const profit = sales - soldCost;
    const capital = purchase + expenses;
    const roi = soldCost > 0 ? ((profit / soldCost) * 100).toFixed(1) : '0.0';
    return { sold, available, purchase, expenses, sales, profit, capital, roi };
  }, [cars]);

  const heroProfit = useCountUp(Math.round(stats.profit));
  const heroCapital = useCountUp(Math.round(stats.capital));

  const search = q.toLowerCase().trim();
  const filteredCars = cars.filter((car) => {
    let matchesTab = true;
    if (activeSection === 'status') matchesTab = statusOf(car.status) === tab;
    else if (activeSection === 'cars') matchesTab = tab === 'all' || car.status === tab;
    const matchesSearch =
      !search ||
      (car.title || '').toLowerCase().includes(search) ||
      (car.chassis_number || '').toLowerCase().includes(search);
    return matchesTab && matchesSearch;
  });

  const selStatus = sel ? statusOf(sel.status) : 'available';
  const selMeta = STATUS_META[selStatus];
  const selectedExpenses = sel ? sum(sel.expenses) : 0;
  const selectedCost = sel ? Number(sel.purchase_price || 0) + selectedExpenses : 0;
  const expectedProfit = sel && sellingPrice ? parseFloat(sellingPrice) - selectedCost : 0;
  const currentStatusIndex = sel ? STATUS_ORDER.indexOf(selStatus) : -1;
  const allocatedByGoal = goals.map((goal) => ({
    ...goal,
    amount: allocations.filter((item) => item.goal_id === goal.id).reduce((total, item) => total + Number(item.amount), 0),
  }));
  const totalAllocated = allocations.reduce((total, item) => total + Number(item.amount), 0);
  const totalNetProfit = stats.sold.reduce((total, car) => total + Math.max(0, netOf(car)), 0);
  const unallocatedProfit = Math.max(0, totalNetProfit - totalAllocated);

  const allExpenses = useMemo(
    () =>
      cars
        .flatMap((car) => (car.expenses || []).map((ex) => ({ ex, car })))
        .sort((a, b) => String(b.ex.created_at || '').localeCompare(String(a.ex.created_at || ''))),
    [cars]
  );

  const [pageTitle, pageSub] = TITLES[activeSection] || TITLES.dashboard;

  const nav = (key: string | null, icon: string, label: string, onClick: () => void) => (
    <button className={`navItem ${key && activeSection === key ? 'active' : ''}`} onClick={onClick}>
      <Icon n={icon} />
      {label}
    </button>
  );

  const statCards: [string, string, string, string | number, string][] = [
    ['إجمالي السيارات', 'blue', 'car', cars.length, 'جميع السيارات المسجلة بالنظام'],
    ['قيد المتابعة', 'orange', 'layers', cars.filter((c) => c.status !== 'sold').length, 'سيارات لم يتم بيعها بعد'],
    ['السيارات المباعة', 'green', 'sold', stats.sold.length, 'عمليات البيع المكتملة'],
    ['إجمالي قيمة السيارات', 'gold', 'coins', fmt(stats.purchase), 'ريال عُماني — سعر السيارات فقط'],
  ];

  const heroMinis: [string, string][] = [
    ['رأس المال المستثمر', `${fmt(heroCapital)} ر.ع`],
    ['إجمالي المبيعات', `${fmt(stats.sales)} ر.ع`],
    ['إجمالي التصليح', `${fmt(stats.expenses)} ر.ع`],
    ['العائد على الاستثمار', `${stats.roi}%`],
  ];

  const reportRows = stats.sold.map((car) => ({
    car,
    cost: Number(car.purchase_price || 0) + sum(car.expenses),
    profit: netOf(car),
  }));

  const stageBg: Record<Status, string> = {
    available: 'orange',
    shipping: 'blue',
    repair: '',
    ready: 'green',
    sold: 'green',
  };

  return (
    <div className="cp">
      <style>{CSS}</style>

      <div className="layout">
        {menuOpen && <div className="drawerBackdrop" onClick={() => setMenuOpen(false)} />}

        <aside
          className={`sidebar ${menuOpen ? 'open' : ''}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.navItem')) setMenuOpen(false);
          }}
        >
          <div className="logo">
            <div className="logoIcon"><Icon n="car" size={21} /></div>
            <div>
              <div className="logoTitle">CARPROFIT</div>
              <div className="logoSub">سلطنة عُمان — إدارة السيارات</div>
            </div>
          </div>

          <div className="navTitle">الرئيسية</div>
          {nav('dashboard', 'dash', 'لوحة التحكم', () => {
            setActiveSection('dashboard');
            setTab('all');
          })}

          <div className="navTitle">السيارات</div>
          {nav('cars', 'car', 'جميع السيارات', () => {
            setActiveSection('cars');
            setTab('all');
          })}
          {nav('status', 'layers', 'حالة السيارات', () => {
            setActiveSection('status');
            setTab('available');
          })}
          {nav('add', 'plus', 'إضافة سيارة', goAdd)}

          <div className="navTitle">الإدارة المالية</div>
          {nav('allocations', 'wallet', 'توزيع الأرباح', () => setActiveSection('allocations'))}
          {nav('expenses', 'receipt', 'المصاريف', () => setActiveSection('expenses'))}
          {nav('reports', 'chart', 'التقارير', () => setActiveSection('reports'))}

          <div className="sidebarBottom">
            <div className="userBox">
              <div className="avatar"><Icon n="user" size={17} /></div>
              <div>
                <div className="userName">مدير النظام</div>
                <div className="userRole">إدارة السيارات</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="content">
          <div className="container">
            <header className="topbar">
              <div>
                <h1 className="pageTitle">{pageTitle}</h1>
                <div className="pageSub">{pageSub}</div>
              </div>
              <div className="topActions">
                <button className="iconBtn mobileMenu" onClick={() => setMenuOpen(true)} aria-label="القائمة"><Icon n="menu" /></button>
                <button className="iconBtn" onClick={refreshAll} title="تحديث البيانات" aria-label="تحديث البيانات"><Icon n="refresh" /></button>
                <button className="primaryBtn" onClick={goAdd}><Icon n="plus" size={16} /> إضافة سيارة</button>
              </div>
            </header>

            {activeSection === 'dashboard' && <>
            <section className="hero">
              <div className="heroGrid">
                <div>
                  <div className="heroLabel">صافي الأرباح من السيارات المباعة</div>
                  <div className="heroProfit num" style={{ color: stats.profit >= 0 ? '#6FD8B4' : '#FF9A9A' }}>
                    {stats.profit >= 0 ? '+' : '−'}
                    {fmt(Math.abs(heroProfit))}
                    <small>ر.ع</small>
                  </div>
                  <div className="heroNote">إجمالي النتائج المحققة من السيارات المباعة</div>
                </div>
                <div className="heroStats">
                  {heroMinis.map(([label, value]) => (
                    <div className="heroMini" key={label}>
                      <span>{label}</span>
                      <b className="num">{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="pipeline" aria-label="مراحل السيارات">
              {STATUS_ORDER.map((status) => {
                const meta = STATUS_META[status];
                const count = cars.filter((c) => statusOf(c.status) === status).length;
                return (
                  <button
                    key={status}
                    className="pipeStep"
                    onClick={() => {
                      setActiveSection('status');
                      setTab(status);
                    }}
                  >
                    <span className={`pipeIcon ${stageBg[status]}`} style={status === 'repair' ? { background: 'var(--violet-soft)', color: 'var(--violet)' } : undefined}>
                      <Icon n={meta.icon} />
                    </span>
                    <span>
                      <span className="pipeCount num" style={{ display: 'block' }}>{count}</span>
                      <span className="pipeLabel">{meta.label}</span>
                    </span>
                  </button>
                );
              })}
            </section>

            <section className="stats">
              {statCards.map(([label, color, icon, value, hint]) => (
                <div className="statCard" key={label}>
                  <div className="statTop">
                    <span className="statLabel">{label}</span>
                    <div className={`statIcon ${color}`}><Icon n={icon} size={17} /></div>
                  </div>
                  <div className="statValue num">{value}</div>
                  <div className="statHint">{hint}</div>
                </div>
              ))}
            </section>
            </>}

            {activeSection === 'allocations' && <section className="card" style={{ padding: 22, marginBottom: 20 }}>
              <div className="sectionIntro">
                <div>
                  <h2 className="cardTitle">توزيع صافي الأرباح</h2>
                  <div className="cardSub">خصص أرباح كل سيارة لأهدافكم، مثل بناء المنزل أو الفواتير أو التقسيم بينكم.</div>
                </div>
                <span className="status ready">من السيارات المباعة فقط</span>
              </div>
              <div className="financeSummary">
                <div className="financeCard"><span>صافي الأرباح القابلة للتوزيع</span><b className="num">{fmt(totalNetProfit)} ر.ع</b></div>
                <div className="financeCard"><span>تم تخصيصه للأهداف</span><b className="num">{fmt(totalAllocated)} ر.ع</b></div>
                <div className="financeCard"><span>متبقي للتوزيع</span><b className="num">{fmt(unallocatedProfit)} ر.ع</b></div>
              </div>
              <form onSubmit={addGoal} className="goalForm">
                <input className="search" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="أضف هدفًا: بناء المنزل، الفواتير، أو اسم شخص" />
                <button className="primaryBtn" type="submit"><Icon n="plus" size={16} /> إضافة هدف</button>
              </form>
              {goals.length === 0 ? <div className="empty" style={{ marginTop: 14 }}>أضف هدفًا للبدء بتوزيع الأرباح.</div> : <div className="goalGrid">
                {allocatedByGoal.map((goal) => (
                  <div className="goalCard" key={goal.id}>
                    <button className="goalDel" onClick={() => deleteGoal(goal)} aria-label={`حذف الهدف ${goal.name}`} title="حذف الهدف"><Icon n="trash" size={15} /></button>
                    <div className="goalCardHead"><span className="goalDot" />{goal.name}</div>
                    <div className="goalCardValue num">{fmt(goal.amount)} ر.ع</div>
                    <small>إجمالي ما تم تخصيصه لهذا الهدف</small>
                  </div>
                ))}
              </div>}
              <form onSubmit={addAllocation} className="card" style={{ padding: 16, marginTop: 18, boxShadow: 'none' }}>
                <h3 className="cardTitle" style={{ marginBottom: 12, fontSize: 14 }}>تسجيل توزيع جديد</h3>
                <div className="allocationForm">
                  <select value={allocationCarId} onChange={(e) => setAllocationCarId(e.target.value)}>
                    <option value="">اختر السيارة المباعة</option>
                    {stats.sold.map((car) => {
                      const used = allocations.filter((item) => item.car_id === String(car.id)).reduce((n, item) => n + Number(item.amount), 0);
                      return <option key={car.id} value={String(car.id)}>{car.title} — متاح {fmt(Math.max(0, netOf(car) - used))} ر.ع</option>;
                    })}
                  </select>
                  <select value={allocationGoalId} onChange={(e) => setAllocationGoalId(e.target.value)}>
                    <option value="">اختر الهدف أو الاستخدام</option>
                    {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={allocationAmount} onChange={(e) => setAllocationAmount(e.target.value)} placeholder="المبلغ (ر.ع)" />
                  <button className="primaryBtn" type="submit">حفظ التوزيع</button>
                </div>
              </form>
              <h3 className="sectionTitle">سجل التوزيعات</h3>
              {allocations.length === 0 ? <div className="empty">ستظهر هنا التوزيعات المسجلة.</div> : <div className="tableScroll"><div className="repairTable">
                <div className="repairHeader" style={{ gridTemplateColumns: '1fr 1fr 130px 120px auto' }}><span>السيارة</span><span>الهدف</span><span>المبلغ</span><span>التاريخ</span><span /></div>
                {allocations.map((entry) => (
                  <div className="repairRow num" key={entry.id} style={{ gridTemplateColumns: '1fr 1fr 130px 120px auto' }}>
                    <span>{cars.find((car) => String(car.id) === entry.car_id)?.title || 'سيارة غير موجودة'}</span>
                    <span>{goals.find((goal) => goal.id === entry.goal_id)?.name || 'هدف محذوف'}</span>
                    <b>{fmt(entry.amount)} ر.ع</b>
                    <span>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('ar-OM') : '—'}</span>
                    <button className="dangerBtn" onClick={() => deleteAllocation(entry.id)}><Icon n="trash" size={14} /> حذف</button>
                  </div>
                ))}
              </div></div>}
            </section>}

            {activeSection === 'expenses' && <section className="card" style={{ padding: 22, marginBottom: 20 }}>
              <div className="sectionIntro">
                <div>
                  <h2 className="cardTitle">سجل المصاريف</h2>
                  <div className="cardSub">اضغط على أي سطر لفتح السيارة وتعديل أغراض التصليح.</div>
                </div>
                <span className="status available">{allExpenses.length} بند</span>
              </div>
              <div className="financeSummary">
                <div className="financeCard"><span>إجمالي المصاريف</span><b className="num">{fmt(stats.expenses)} ر.ع</b></div>
                <div className="financeCard"><span>سيارات عليها مصاريف</span><b className="num">{cars.filter((c) => (c.expenses || []).length > 0).length}</b></div>
                <div className="financeCard"><span>متوسط المصاريف للسيارة</span><b className="num">{fmt(cars.length ? stats.expenses / cars.length : 0)} ر.ع</b></div>
              </div>
              {allExpenses.length === 0 ? <div className="empty">لا توجد مصاريف مسجلة بعد. أضف أغراض التصليح من صفحة أي سيارة.</div> : <div className="tableScroll"><div className="repairTable">
                <div className="repairHeader" style={{ gridTemplateColumns: '1.2fr 1fr 120px 110px' }}><span>السيارة</span><span>البند</span><span>القيمة</span><span>التاريخ</span></div>
                {allExpenses.map(({ ex, car }) => (
                  <div className="repairRow num" key={String(ex.id)} style={{ gridTemplateColumns: '1.2fr 1fr 120px 110px', cursor: 'pointer' }} onClick={() => setSel(car)}>
                    <span className="repairName">{car.title}</span>
                    <span className="repairName">{ex.title}</span>
                    <b style={{ color: 'var(--orange)' }}>{fmt(ex.amount)} ر.ع</b>
                    <span>{ex.created_at ? new Date(ex.created_at).toLocaleDateString('ar-OM') : '—'}</span>
                  </div>
                ))}
              </div></div>}
            </section>}

            {activeSection === 'reports' && <section className="card" style={{ padding: 22, marginBottom: 20 }}>
              <h2 className="cardTitle">تقرير السيارات والمبيعات</h2>
              <div className="stats" style={{ marginTop: 16 }}>
                {[
                  ['عدد السيارات', cars.length], ['المباعة', stats.sold.length], ['إجمالي المبيعات', `${fmt(stats.sales)} ر.ع`],
                  ['إجمالي المصاريف', `${fmt(stats.expenses)} ر.ع`], ['صافي الربح المحقق', `${fmt(stats.profit)} ر.ع`], ['رأس المال المسجل', `${fmt(stats.capital)} ر.ع`],
                ].map(([label, value]) => <div className="statCard" key={String(label)} style={{ boxShadow: 'none' }}><div className="statLabel">{label}</div><div className="statValue num">{value}</div></div>)}
              </div>
              <h3 className="sectionTitle">تفاصيل السيارات المباعة</h3>
              {reportRows.length === 0 ? <div className="empty">لا توجد مبيعات مسجلة بعد.</div> : <div className="tableScroll"><div className="repairTable">
                <div className="repairHeader" style={{ gridTemplateColumns: '1fr 110px 110px 110px' }}><span>السيارة</span><span>سعر الشراء</span><span>سعر البيع</span><span>صافي الربح</span></div>
                {reportRows.map(({ car, cost, profit }) => (
                  <div className="repairRow num" key={car.id} style={{ gridTemplateColumns: '1fr 110px 110px 110px' }}>
                    <span>{car.title}<small style={{ display: 'block', color: 'var(--muted)' }}>تكلفة شاملة {fmt(cost)} ر.ع</small></span>
                    <span>{fmt(car.purchase_price)}</span>
                    <span>{fmt(car.selling_price)} ر.ع</span>
                    <b style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(profit)} ر.ع</b>
                  </div>
                ))}
              </div></div>}
            </section>}

            {['dashboard', 'cars', 'status', 'add'].includes(activeSection) && <div className="workspace">
              <aside className="card addCard" id="add-car-form">
                <h2 className="cardTitle">إضافة سيارة جديدة</h2>
                <div className="cardSub">أضف السيارة لتبدأ متابعة تكلفتها وربحها</div>
                <form onSubmit={addCar}>
                  <div className="field">
                    <label htmlFor="f-title">اسم السيارة والموديل</label>
                    <input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تويوتا لاند كروزر 2022" />
                  </div>
                  <div className="field">
                    <label htmlFor="f-vin">رقم الشاصي VIN</label>
                    <input id="f-vin" value={chassis} onChange={(e) => setChassis(e.target.value)} placeholder="VIN" style={{ direction: 'ltr', textAlign: 'right' }} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-price">سعر السيارة</label>
                    <input
                      id="f-price"
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.000 ر.ع"
                    />
                  </div>
                  <div className="field"><label htmlFor="f-date">تاريخ الوصول (اختياري)</label><input id="f-date" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} /></div>
                  <div className="field"><label htmlFor="f-track">رابط تتبع الشحنة</label><input id="f-track" type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." style={{ direction: 'ltr', textAlign: 'right' }} /></div>
                  <button className="addSubmit" type="submit">إضافة السيارة</button>
                </form>
              </aside>

              <section className="listArea">
                <div className="listHeader">
                  <div className="listHeaderTop">
                    <div>
                      <div className="cardTitle">{activeSection === 'status' ? 'مراحل السيارات' : 'السيارات'}</div>
                      <div className="cardSub">
                        {activeSection === 'status'
                          ? 'اختر حالة لمشاهدة السيارات الموجودة فيها'
                          : 'إدارة ومتابعة جميع المركبات'}
                      </div>
                    </div>
                    <input
                      className="search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="البحث بالاسم أو رقم الشاصي"
                      aria-label="بحث"
                    />
                  </div>

                  {activeSection === 'status' ? (
                    <div className="statusTabs">
                      {STATUS_ORDER.map((status) => {
                        const meta = STATUS_META[status];
                        const count = cars.filter((car) => statusOf(car.status) === status).length;
                        return (
                          <button
                            key={status}
                            className={`statusTab ${tab === status ? 'active' : ''}`}
                            onClick={() => setTab(status)}
                          >
                            <span style={{ color: meta.color }}><Icon n={meta.icon} size={20} /></span>
                            <span className="statusTabLabel">{meta.label}</span>
                            <span className="statusTabCount num">{count} سيارة</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="tabs">
                      {(
                        [
                          ['all', 'الكل', cars.length],
                          ['available', 'المتاحة', stats.available.length],
                          ['sold', 'المباعة', stats.sold.length],
                        ] as [string, string, number][]
                      ).map(([key, label, count]) => (
                        <button
                          key={key}
                          className={tab === key ? 'active' : ''}
                          onClick={() => {
                            setActiveSection('cars');
                            setTab(key);
                          }}
                        >
                          {label} ({count})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="empty">
                    <div className="emptyIcon"><Icon n="refresh" size={30} /></div>
                    جاري تحميل السيارات...
                  </div>
                ) : filteredCars.length === 0 ? (
                  <div className="empty">
                    <div className="emptyIcon"><Icon n="car" size={32} /></div>
                    {cars.length ? 'لا توجد سيارة مطابقة للبحث.' : 'لا توجد سيارات مسجلة حتى الآن.'}
                  </div>
                ) : (
                  filteredCars.map((car) => {
                    const purchase = Number(car.purchase_price || 0);
                    const expenses = sum(car.expenses);
                    const cost = purchase + expenses;
                    const revenue = Number(car.selling_price || 0);
                    const profit = revenue - cost;
                    const st = statusOf(car.status);
                    const sold = st === 'sold';
                    const meta = STATUS_META[st];
                    const actionBg =
                      meta.next === 'sold' ? 'var(--green)' : meta.next === 'repair' ? 'var(--violet)' : 'var(--blue)';

                    return (
                      <div key={car.id} className="carRow" onClick={() => setSel(car)}>
                        <div className="carMain">
                          <div className="carName">
                            {car.title}
                            <span className={`status ${st}`}>
                              <Icon n={meta.icon} size={13} /> {meta.label}
                            </span>
                          </div>
                          <div className="vin">{car.chassis_number || 'رقم الشاصي غير مسجل'}</div>
                        </div>

                        <div className="barWrap">
                          <ProfitBar purchase={purchase} expenses={expenses} revenue={sold ? revenue : 0} />
                          <div className="barInfo num">
                            <span>سعر السيارة {fmt(purchase)}</span>
                            <span>التصليح {fmt(expenses)}</span>
                            <span>التكلفة {fmt(cost)}</span>
                          </div>
                        </div>

                        <div
                          className="profit num"
                          style={{ color: sold ? (profit >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}
                        >
                          {sold ? (
                            <>
                              {profit >= 0 ? '+' : '−'}
                              {fmt(Math.abs(profit))}
                              <small>صافي الربح</small>
                            </>
                          ) : (
                            <span className="pending">{meta.label}</span>
                          )}
                        </div>

                        {activeSection === 'status' && meta.next && (
                          <button
                            className="statusAction"
                            style={{ background: actionBg }}
                            onClick={(e) => {
                              e.stopPropagation();
                              changeCarStatus(car, meta.next as Status);
                            }}
                          >
                            {meta.nextLabel}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            </div>}
          </div>
        </main>
      </div>

      {sel && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label={sel.title}>
            <div className="modalHead">
              <div>
                <div className="carName">{sel.title}</div>
                <div className="vin">{sel.chassis_number || 'رقم الشاصي غير مسجل'}</div>
              </div>
              <button className="close" onClick={closeModal} aria-label="إغلاق"><Icon n="close" size={16} /></button>
            </div>

            <div className="modalBody">
              <div className="detailGrid">
                <div className="detailBox">
                  <span>سعر السيارة</span>
                  <form onSubmit={(e) => { e.preventDefault(); updateCarPrice(); }}>
                    <input aria-label="سعر الشراء" type="number" min="0.001" step="0.001" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    <button className="secondaryBtn" type="submit" style={{ height: 38 }}>حفظ</button>
                  </form>
                  <small className="num">السعر الحالي: {fmt(sel.purchase_price)} ر.ع</small>
                </div>
                <div className="detailBox">
                  <span>إجمالي التصليح</span>
                  <b className="num" style={{ color: 'var(--orange)' }}>{fmt(selectedExpenses)} ر.ع</b>
                </div>
                <div className="detailBox">
                  <span>إجمالي تكلفة السيارة</span>
                  <b className="num">{fmt(selectedCost)} ر.ع</b>
                </div>
                <div className="detailBox">
                  <span>حالة السيارة</span>
                  <b className="ic" style={{ color: selMeta.color }}><Icon n={selMeta.icon} /> {selMeta.label}</b>
                </div>
              </div>

              <div className="carStatusBox">
                <div className="carStatusTitle">مراحل السيارة</div>
                <div className="carStatusLine">
                  {STATUS_ORDER.map((status, index) => {
                    const isDone = index < currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    return (
                      <Fragment key={status}>
                        <div className={`carStatusStep ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                          <div
                            className="carStatusDot"
                            style={isCurrent ? { background: STATUS_META[status].color } : {}}
                          >
                            <Icon n={isDone ? 'check' : STATUS_META[status].icon} size={15} />
                          </div>
                          <span>{STATUS_META[status].label}</span>
                        </div>
                        {index < STATUS_ORDER.length - 1 && (
                          <div className={`carStatusConnector ${index < currentStatusIndex ? 'done' : ''}`} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>

                {selMeta.next && (
                  <button className="nextStatusBtn" onClick={() => changeCarStatus(sel, selMeta.next as Status)}>
                    {selMeta.nextLabel}
                  </button>
                )}
              </div>

              <h3 className="sectionTitle">الوصول والتتبع</h3>
              <form
                key={sel.id}
                className="card plainForm"
                style={{ boxShadow: 'none' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const date = String(data.get('arrival_date') || '');
                  void saveCarShipping(sel, {
                    arrival_date: date || null,
                    tracking_url: String(data.get('tracking_url') || '').trim() || null,
                  });
                }}
              >
                <label>تاريخ الوصول<input name="arrival_date" type="date" defaultValue={sel.arrival_date || ''} /></label>
                <label>رابط تتبع الشحنة<input name="tracking_url" type="url" defaultValue={sel.tracking_url || ''} placeholder="https://..." style={{ direction: 'ltr', textAlign: 'right' }} /></label>
                {sel.tracking_url && <a href={sel.tracking_url} target="_blank" rel="noreferrer"><Icon n="link" size={15} /> فتح رابط التتبع</a>}
                <button className="secondaryBtn" type="submit" style={{ justifyContent: 'center', height: 40 }}>حفظ بيانات الوصول</button>
              </form>

              <h3 className="sectionTitle">أغراض التصليح</h3>

              <form className="repairForm" onSubmit={addRepair}>
                <input value={repairTitle} onChange={(e) => setRepairTitle(e.target.value)} placeholder="اسم غرض التصليح" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={repairAmount}
                  onChange={(e) => setRepairAmount(e.target.value)}
                  placeholder="القيمة ر.ع"
                />
                <button className="smallBtn" type="submit"><Icon n="plus" size={15} /> إضافة</button>
              </form>

              {(sel.expenses || []).length === 0 ? (
                <div className="noRepairs">لا توجد أغراض تصليح مسجلة لهذه السيارة.</div>
              ) : (
                <div className="repairTable">
                  <div className="repairHeader">
                    <span>غرض التصليح</span>
                    <span style={{ textAlign: 'left' }}>القيمة</span>
                    <span />
                  </div>
                  {(sel.expenses || []).map((repair) => (
                    <div className="repairRow num" key={repair.id}>
                      {editingExpense === repair.id ? <>
                        <input value={editExpenseTitle} onChange={(e) => setEditExpenseTitle(e.target.value)} aria-label="اسم غرض التصليح" />
                        <input type="number" min="0.001" step="0.001" value={editExpenseAmount} onChange={(e) => setEditExpenseAmount(e.target.value)} aria-label="قيمة غرض التصليح" />
                        <span style={{ display: 'flex', gap: 5 }}><button className="secondaryBtn" onClick={() => updateExpense(repair)}>حفظ</button><button className="secondaryBtn" onClick={() => setEditingExpense(null)}>إلغاء</button></span>
                      </> : <>
                        <span className="repairName">{repair.title}</span>
                        <span className="repairAmount">{fmt(repair.amount)} ر.ع</span>
                        <span style={{ display: 'flex', gap: 5 }}>
                          <button className="secondaryBtn" onClick={() => { setEditingExpense(repair.id); setEditExpenseTitle(repair.title); setEditExpenseAmount(String(repair.amount)); }}><Icon n="edit" size={14} /> تعديل</button>
                          <button className="dangerBtn" onClick={() => deleteExpense(repair)} aria-label="حذف"><Icon n="trash" size={14} /></button>
                        </span>
                      </>}
                    </div>
                  ))}
                </div>
              )}

              <div className="repairTotal num">
                <span>إجمالي أغراض التصليح</span>
                <b>{fmt(selectedExpenses)} ر.ع</b>
              </div>

              {selStatus === 'ready' ? (
                <div className="saleBox" id="sale-box">
                  <div className="saleTitle">تسجيل البيع</div>
                  <form className="saleForm" onSubmit={sellCar}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="سعر البيع النهائي — ر.ع"
                    />
                    <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="اسم المشتري" />
                    {sellingPrice && (
                      <div className="expected num">
                        الربح المتوقع:{' '}
                        <b style={{ color: expectedProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {expectedProfit >= 0 ? '+' : '−'}
                          {fmt(Math.abs(expectedProfit))} ر.ع
                        </b>
                      </div>
                    )}
                    <button className="saleSubmit" type="submit"><Icon n="check" size={17} /> إتمام عملية البيع</button>
                  </form>
                </div>
              ) : selStatus === 'sold' ? (
                <div className="saleBox">
                  <div className="soldBox num">
                    <strong>تم بيع السيارة</strong>
                    <div style={{ marginTop: 7 }}>
                      سعر البيع: <b>{fmt(sel.selling_price)} ر.ع</b>
                    </div>
                    {sel.buyer_name && <div style={{ marginTop: 5 }}>المشتري: {sel.buyer_name}</div>}
                    <div style={{ marginTop: 5 }}>صافي الربح: <b>{fmt(netOf(sel))} ر.ع</b></div>
                  </div>
                </div>
              ) : (
                <div className="saleHint">البيع متاح بعد انتقال السيارة إلى مرحلة «جاهزة للبيع».</div>
              )}
            </div>

            <div className="modalFooter">
              <div>
                {askDelete ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="dangerBtn" onClick={deleteCar}>تأكيد الحذف</button>
                    <button className="secondaryBtn" onClick={() => setAskDelete(false)}>تراجع</button>
                  </div>
                ) : (
                  <button className="dangerBtn" onClick={() => setAskDelete(true)}><Icon n="trash" size={14} /> حذف السيارة</button>
                )}
              </div>
              <button className="secondaryBtn" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`toast ${toast.error ? 'error' : ''}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}