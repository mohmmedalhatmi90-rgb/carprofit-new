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
const supabase = createClient(
  fixUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  ascii(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

type Status = 'available' | 'shipping' | 'repair' | 'ready' | 'sold';
type Expense = { id: string | number; car_id?: string | number; title: string; amount: number | string };
type Car = {
  id: string | number;
  title: string;
  chassis_number?: string | null;
  purchase_price: number | string;
  selling_price?: number | string | null;
  buyer_name?: string | null;
  status?: string | null;
  created_at?: string;
  expenses?: Expense[];
};
type Meta = { label: string; icon: string; color: string; next: Status | null; nextLabel: string | null };

const fmt = (n?: number | string | null) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const sum = (arr?: Expense[]) => (arr || []).reduce((a, e) => a + Number(e.amount || 0), 0);

const STATUS_ORDER: Status[] = ['available', 'shipping', 'repair', 'ready', 'sold'];

const STATUS_META: Record<Status, Meta> = {
  available: { label: 'متاحة', icon: '🟠', color: 'var(--orange)', next: 'shipping', nextLabel: 'نقل إلى الشحن' },
  shipping: { label: 'في الشحن', icon: '🚢', color: 'var(--blue)', next: 'repair', nextLabel: 'بدء التصليح' },
  repair: { label: 'قيد التصليح', icon: '🔧', color: '#8B5CF6', next: 'ready', nextLabel: 'جاهزة للبيع' },
  ready: { label: 'جاهزة للبيع', icon: '🟢', color: 'var(--green)', next: 'sold', nextLabel: 'تسجيل البيع' },
  sold: { label: 'تم البيع', icon: '✓', color: 'var(--green)', next: null, nextLabel: null },
};
const statusOf = (s?: string | null): Status => (s && s in STATUS_META ? (s as Status) : 'available');

const TITLES: Record<string, [string, string]> = {
  dashboard: ['لوحة التحكم', 'نظرة شاملة على السيارات والتكاليف والمبيعات والأرباح'],
  cars: ['جميع السيارات', 'إدارة ومتابعة جميع السيارات المسجلة'],
  status: ['حالة السيارات', 'تابع مراحل كل سيارة من الشراء حتى البيع'],
  add: ['إضافة سيارة', 'أضف سيارة جديدة إلى النظام'],
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
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap');
:root{--primary:#183B56;--blue:#2F80ED;--blue-soft:#EAF3FF;--green:#159570;--green-soft:#EAF8F3;--orange:#D98924;--orange-soft:#FFF5E7;--red:#D94A4A;--red-soft:#FFF0F0;--text:#17212B;--muted:#718096;--bg:#F4F7FA;--card:#FFFFFF;--border:#E5EAF0;--shadow:0 10px 35px rgba(20,42,62,.07)}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg)}
button,input{font:inherit}
button{cursor:pointer}
.cp{min-height:100vh;min-height:100dvh;overflow-x:hidden;background:radial-gradient(circle at 10% 0%,rgba(47,128,237,.06),transparent 28%),var(--bg);color:var(--text);font-family:'Tajawal',system-ui,sans-serif;direction:rtl}
.cp *{box-sizing:border-box}
.cp button:focus-visible,.cp input:focus-visible{outline:3px solid rgba(47,128,237,.18);outline-offset:2px}
.cp .num{font-variant-numeric:tabular-nums}
.cp .layout{min-height:100vh;min-height:100dvh;display:flex}
.cp .drawerBackdrop{display:none}
.cp .sidebar{width:260px;background:linear-gradient(180deg,#15364F 0%,#183B56 55%,#102C42 100%);color:#fff;padding:24px 16px;position:fixed;right:0;top:0;bottom:0;z-index:20;display:flex;flex-direction:column;overflow-y:auto}
.cp .logo{display:flex;align-items:center;gap:12px;padding:4px 8px 28px;border-bottom:1px solid rgba(255,255,255,.1)}
.cp .logoIcon{width:43px;height:43px;border-radius:13px;background:linear-gradient(135deg,#2F80ED,#54B7FF);display:grid;place-items:center;font-size:21px;box-shadow:0 8px 22px rgba(47,128,237,.28)}
.cp .logoTitle{font-size:18px;font-weight:800;letter-spacing:.02em}
.cp .logoSub{font-size:10px;color:rgba(255,255,255,.55);margin-top:2px}
.cp .navTitle{font-size:10px;color:rgba(255,255,255,.38);margin:25px 10px 8px}
.cp .navItem{width:100%;border:0;background:transparent;color:rgba(255,255,255,.7);padding:12px 13px;border-radius:11px;display:flex;align-items:center;gap:11px;text-align:right;margin-bottom:4px;transition:.2s}
.cp .navItem:hover{background:rgba(255,255,255,.08);color:#fff}
.cp .navItem.active{background:rgba(47,128,237,.24);color:#fff;box-shadow:inset -3px 0 0 #54B7FF}
.cp .navIcon{width:27px;text-align:center;font-size:17px}
.cp .sidebarBottom{margin-top:auto;border-top:1px solid rgba(255,255,255,.1);padding-top:16px}
.cp .userBox{display:flex;align-items:center;gap:10px;padding:10px}
.cp .avatar{width:37px;height:37px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center}
.cp .userName{font-size:12px;font-weight:700}
.cp .userRole{font-size:10px;color:rgba(255,255,255,.45)}
.cp .content{flex:1;min-width:0;margin-right:260px;padding:28px clamp(18px,4vw,48px) 60px}
.cp .container{max-width:1450px;margin:auto}
.cp .topbar{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:28px}
.cp .pageTitle{font-size:25px;font-weight:800;margin:0}
.cp .pageSub{color:var(--muted);font-size:12px;margin-top:5px}
.cp .topActions{display:flex;gap:8px;flex-shrink:0}
.cp .iconBtn{width:42px;height:42px;border:1px solid var(--border);background:#fff;color:var(--text);border-radius:12px;box-shadow:var(--shadow)}
.cp .mobileMenu{display:none}
.cp .primaryBtn{border:0;background:var(--primary);color:#fff;padding:11px 17px;border-radius:11px;font-weight:700;box-shadow:0 8px 20px rgba(24,59,86,.15);transition:.2s}
.cp .primaryBtn:hover{transform:translateY(-1px);background:#214C6A}
.cp .hero{background:linear-gradient(120deg,#15364F,#205C7E);border-radius:22px;padding:28px;color:#fff;position:relative;overflow:hidden;box-shadow:0 18px 45px rgba(24,59,86,.16);margin-bottom:22px}
.cp .hero::before{content:'';position:absolute;width:330px;height:330px;border-radius:50%;background:rgba(255,255,255,.045);left:-80px;top:-130px}
.cp .hero::after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(84,183,255,.08);left:25%;bottom:-180px}
.cp .heroGrid{position:relative;z-index:2;display:grid;grid-template-columns:1.3fr 1fr;gap:35px;align-items:center}
.cp .heroLabel{color:rgba(255,255,255,.62);font-size:12px;margin-bottom:7px}
.cp .heroProfit{font-size:clamp(38px,6vw,68px);font-weight:800;line-height:1}
.cp .heroProfit small{font-size:17px;font-weight:400;margin-right:8px;color:rgba(255,255,255,.55)}
.cp .heroNote{margin-top:13px;color:rgba(255,255,255,.52);font-size:11px}
.cp .heroStats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cp .heroMini{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.09);border-radius:13px;padding:15px;min-width:0}
.cp .heroMini span{display:block;color:rgba(255,255,255,.53);font-size:10px;margin-bottom:6px}
.cp .heroMini b{font-size:18px}
.cp .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.cp .statCard{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:var(--shadow);overflow:hidden}
.cp .statTop{display:flex;justify-content:space-between;align-items:center}
.cp .statIcon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:17px}
.cp .statLabel{color:var(--muted);font-size:11px}
.cp .statValue{font-size:25px;font-weight:800;margin-top:11px}
.cp .statHint{font-size:10px;color:var(--muted);margin-top:5px}
.cp .blue{background:var(--blue-soft);color:var(--blue)}
.cp .green{background:var(--green-soft);color:var(--green)}
.cp .orange{background:var(--orange-soft);color:var(--orange)}
.cp .workspace{display:grid;grid-template-columns:330px 1fr;gap:20px;align-items:start}
.cp .card{background:#fff;border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow)}
.cp .addCard{padding:21px;position:sticky;top:20px}
.cp .cardTitle{font-size:15px;font-weight:800;margin:0}
.cp .cardSub{color:var(--muted);font-size:10px;margin-top:4px}
.cp .field{margin-top:15px}
.cp .field label{display:block;font-size:11px;color:#5E6B78;font-weight:600;margin-bottom:6px}
.cp .field input{width:100%;background:#F8FAFC;border:1px solid var(--border);color:var(--text);border-radius:10px;padding:11px 12px;transition:.2s}
.cp .field input:hover{border-color:#CBD5E1}
.cp .field input:focus{border-color:var(--blue);background:#fff;outline:none;box-shadow:0 0 0 4px rgba(47,128,237,.08)}
.cp .addSubmit{width:100%;margin-top:18px;border:0;padding:13px;border-radius:11px;background:linear-gradient(135deg,#2F80ED,#2369C9);color:#fff;font-weight:800;box-shadow:0 9px 22px rgba(47,128,237,.18)}
.cp .listArea{min-width:0}
.cp .listHeader{background:#fff;border:1px solid var(--border);border-radius:18px;padding:17px;margin-bottom:12px;box-shadow:var(--shadow)}
.cp .listHeaderTop{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}
.cp .tabs{display:flex;gap:5px;background:#F2F5F8;padding:4px;border-radius:11px}
.cp .tabs button{border:0;background:transparent;color:var(--muted);border-radius:8px;padding:7px 12px;font-size:11px}
.cp .tabs button.active{background:#fff;color:var(--primary);font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.cp .search{width:250px;max-width:100%;border:1px solid var(--border);background:#F8FAFC;border-radius:10px;padding:10px 13px}
.cp .search:focus{outline:none;border-color:var(--blue);background:#fff}
.cp .statusTabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.cp .statusTab{border:1px solid var(--border);background:#fff;border-radius:13px;padding:13px 8px;color:var(--muted);transition:.2s;box-shadow:var(--shadow)}
.cp .statusTab:hover{transform:translateY(-2px);border-color:#C9DDED}
.cp .statusTab.active{color:var(--primary);border-color:#9FC7E7;background:#F7FBFF;box-shadow:0 8px 22px rgba(20,42,62,.08)}
.cp .statusTabIcon{font-size:18px;display:block;margin-bottom:5px}
.cp .statusTabLabel{display:block;font-size:11px;font-weight:800}
.cp .statusTabCount{display:block;font-size:10px;margin-top:3px;color:var(--muted)}
.cp .statusAction{grid-column:1/-1;border:0;border-radius:9px;padding:9px 12px;color:#fff;font-size:11px;font-weight:800}
.cp .statusAction:hover{transform:translateY(-1px)}
.cp .carRow{background:#fff;border:1px solid var(--border);border-radius:17px;padding:17px;margin-bottom:10px;display:grid;grid-template-columns:1.25fr 1.7fr 115px;gap:20px;align-items:center;cursor:pointer;transition:.22s;box-shadow:0 5px 20px rgba(20,42,62,.035)}
.cp .carRow:hover{border-color:#BDD5EA;transform:translateY(-2px);box-shadow:0 12px 30px rgba(20,42,62,.08)}
.cp .carMain{min-width:0}
.cp .carName{font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp .vin{font-family:monospace;direction:ltr;display:inline-block;color:#8A96A3;font-size:10px;margin-top:5px}
.cp .status{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:99px;font-size:9px;font-weight:700;margin-right:7px}
.cp .status.available{background:var(--orange-soft);color:var(--orange)}
.cp .status.shipping{background:var(--blue-soft);color:var(--blue)}
.cp .status.repair{background:#F2EDFF;color:#8B5CF6}
.cp .status.ready,.cp .status.sold{background:var(--green-soft);color:var(--green)}
.cp .barWrap{min-width:0}
.cp .bar{height:7px;display:flex;overflow:hidden;border-radius:99px;background:#EDF1F5;direction:rtl}
.cp .barSegment{height:100%;transition:width .6s}
.cp .barInfo{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:9px;margin-top:7px}
.cp .profit{text-align:left;font-size:15px;font-weight:800}
.cp .profit small{display:block;font-size:9px;font-weight:500;margin-top:2px}
.cp .pending{color:var(--muted);font-size:11px;font-weight:600}
.cp .empty{padding:70px 20px;text-align:center;color:var(--muted);background:#fff;border:1px dashed var(--border);border-radius:17px}
.cp .emptyIcon{font-size:35px;margin-bottom:10px}
.cp .overlay{position:fixed;inset:0;z-index:100;background:rgba(12,25,38,.58);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px;animation:fade .2s ease}
.cp .modal{width:100%;max-width:700px;max-height:92vh;max-height:92dvh;overflow:auto;background:#fff;border-radius:23px;box-shadow:0 30px 90px rgba(0,0,0,.24);animation:rise .28s ease}
.cp .modalHead{padding:22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:15px;align-items:flex-start}
.cp .modalHead>div:first-child{min-width:0}
.cp .close{width:36px;height:36px;flex-shrink:0;border:1px solid var(--border);background:#F7F9FB;border-radius:10px;color:var(--muted)}
.cp .modalBody{padding:22px}
.cp .detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cp .detailBox{background:#F7F9FC;border:1px solid var(--border);border-radius:13px;padding:14px;min-width:0}
.cp .detailBox span{display:block;color:var(--muted);font-size:10px;margin-bottom:5px}
.cp .detailBox b{font-size:17px}
.cp .sectionTitle{margin:23px 0 11px;font-size:13px;font-weight:800}
.cp .carStatusBox{margin-top:18px;padding:14px;background:#F8FAFC;border:1px solid var(--border);border-radius:14px}
.cp .carStatusTitle{font-size:12px;font-weight:800;margin-bottom:12px}
.cp .carStatusLine{display:flex;align-items:center;gap:5px;direction:rtl;overflow-x:auto;padding-bottom:3px}
.cp .carStatusStep{flex:1;min-width:75px;text-align:center}
.cp .carStatusDot{width:29px;height:29px;border-radius:50%;margin:auto;display:grid;place-items:center;background:#EDF1F5;color:#9AA6B2;font-size:11px;font-weight:800}
.cp .carStatusStep.done .carStatusDot{background:var(--green-soft);color:var(--green)}
.cp .carStatusStep.current .carStatusDot{color:#fff;box-shadow:0 5px 14px rgba(47,128,237,.18)}
.cp .carStatusStep span{display:block;margin-top:5px;font-size:9px;color:var(--muted);white-space:nowrap}
.cp .carStatusConnector{height:3px;flex:1;min-width:18px;background:#E5EAF0;border-radius:99px;margin-bottom:17px}
.cp .carStatusConnector.done{background:var(--green)}
.cp .nextStatusBtn{width:100%;margin-top:13px;border:0;border-radius:10px;padding:12px;color:#fff;font-weight:800;background:linear-gradient(135deg,#2F80ED,#2369C9);box-shadow:0 8px 20px rgba(47,128,237,.16)}
.cp .repairForm{display:grid;grid-template-columns:1fr 115px auto;gap:7px}
.cp .repairForm input,.cp .saleForm input{width:100%;border:1px solid var(--border);background:#F8FAFC;border-radius:10px;padding:10px}
.cp .smallBtn{border:0;background:var(--orange);color:#fff;border-radius:10px;padding:0 16px;font-weight:700}
.cp .repairTable{margin-top:12px;border:1px solid var(--border);border-radius:13px;overflow:hidden}
.cp .repairHeader,.cp .repairRow{display:grid;grid-template-columns:1fr 130px;gap:10px;align-items:center;padding:12px 14px}
.cp .repairHeader{background:#F7F9FC;color:var(--muted);font-size:10px;font-weight:700;border-bottom:1px solid var(--border)}
.cp .repairRow{font-size:11px;border-bottom:1px dashed #DCE3EA}
.cp .repairRow:last-child{border-bottom:0}
.cp .repairName{min-width:0;overflow:hidden;text-overflow:ellipsis}
.cp .repairAmount{text-align:left;color:var(--orange);font-weight:800}
.cp .repairTotal{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:13px 14px;background:var(--orange-soft);border:1px solid #F2DFC2;border-radius:12px;font-size:11px}
.cp .repairTotal b{color:var(--orange);font-size:15px}
.cp .noRepairs{color:var(--muted);font-size:11px;padding:16px 2px}
.cp .saleBox{margin-top:22px;background:linear-gradient(135deg,#F0FAF6,#F8FCFA);border:1px solid #D5EEE4;border-radius:15px;padding:17px}
.cp .saleTitle{font-weight:800;color:var(--green);margin-bottom:12px}
.cp .saleForm{display:grid;gap:9px}
.cp .saleSubmit{border:0;background:var(--green);color:#fff;border-radius:10px;padding:12px;font-weight:800}
.cp .expected{background:#fff;border-radius:10px;padding:10px;font-size:11px;border:1px solid #E1EEE9}
.cp .soldBox{background:var(--green-soft);border:1px solid #D5EEE4;padding:15px;border-radius:13px;color:var(--green)}
.cp .saleHint{margin-top:18px;padding:13px;background:#F7F9FC;border:1px solid var(--border);border-radius:12px;color:var(--muted);font-size:11px}
.cp .modalFooter{display:flex;justify-content:space-between;gap:8px;padding:18px 22px;border-top:1px solid var(--border)}
.cp .dangerBtn{border:1px solid #F2CACA;color:var(--red);background:var(--red-soft);border-radius:9px;padding:8px 12px}
.cp .secondaryBtn{border:1px solid var(--border);color:var(--text);background:#fff;border-radius:9px;padding:8px 14px}
.cp .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;background:#17212B;color:#fff;padding:12px 20px;border-radius:99px;box-shadow:0 15px 40px rgba(0,0,0,.2);font-size:12px;font-weight:700}
.cp .toast.error{background:var(--red)}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(20px) scale(.97)}}
@media(max-width:1100px){
.cp .stats{grid-template-columns:1fr 1fr}
.cp .workspace{grid-template-columns:1fr}
.cp .addCard{position:static}
.cp .statusTabs{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:800px){
.cp .sidebar{width:min(280px,82vw);transform:translateX(100%);transition:transform .25s ease;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
.cp .sidebar.open{transform:none}
.cp .drawerBackdrop{display:block;position:fixed;inset:0;z-index:19;background:rgba(12,25,38,.5)}
.cp .content{margin-right:0;padding:18px 13px 40px}
.cp .topbar{margin-bottom:20px}
.cp .pageTitle{font-size:21px}
.cp .pageSub{font-size:11px}
.cp .mobileMenu{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--border);background:#fff;border-radius:12px;font-size:18px}
.cp .iconBtn{width:44px;height:44px}
.cp input{font-size:16px}
.cp .heroGrid{grid-template-columns:1fr;gap:22px}
.cp .hero{padding:22px}
.cp .heroMini b{font-size:15px;word-break:break-word}
.cp .statValue{font-size:22px}
.cp .addCard{order:2}
.cp .listArea{order:1}
.cp .listHeaderTop{align-items:stretch;flex-direction:column}
.cp .search{width:100%}
.cp .tabs button{padding:10px 8px;font-size:12px}
.cp .carRow{grid-template-columns:1fr;gap:13px}
.cp .carRow:hover{transform:none}
.cp .carName{white-space:normal;overflow:visible}
.cp .status{margin:4px 0 0;font-size:10px}
.cp .vin{font-size:11px}
.cp .barInfo{flex-wrap:wrap;font-size:10px}
.cp .profit{text-align:right}
.cp .statusAction{width:100%;padding:12px;font-size:12px}
.cp .statusTabs{grid-template-columns:repeat(2,1fr)}
.cp .statusTab:last-child:nth-child(odd){grid-column:1/-1}
.cp .overlay{padding:0;place-items:end center}
.cp .modal{max-width:100%;max-height:94vh;max-height:94dvh;border-radius:22px 22px 0 0}
.cp .modalHead,.cp .modalBody{padding:16px}
.cp .modalFooter{padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px))}
.cp .detailBox span{font-size:11px}
.cp .detailBox b{font-size:15px}
.cp .carStatusStep{min-width:54px}
.cp .carStatusConnector{min-width:8px}
.cp .repairRow{font-size:12px}
.cp .nextStatusBtn,.cp .saleSubmit{padding:14px}
.cp .dangerBtn,.cp .secondaryBtn{padding:11px 14px}
.cp .toast{width:calc(100% - 28px);max-width:420px;text-align:center;bottom:calc(16px + env(safe-area-inset-bottom,0px))}
}
@media(max-width:520px){
.cp .stats{grid-template-columns:1fr}
.cp .detailGrid{grid-template-columns:1fr}
.cp .repairForm{grid-template-columns:1fr}
.cp .smallBtn{padding:12px}
.cp .tabs{width:100%}
.cp .tabs button{flex:1}
.cp .topActions .primaryBtn{display:none}
.cp .repairHeader,.cp .repairRow{grid-template-columns:1fr 105px}
}
@media(hover:none){
.cp .carRow:hover,.cp .statusTab:hover,.cp .primaryBtn:hover,.cp .statusAction:hover{transform:none}
}
@media(prefers-reduced-motion:reduce){.cp *{animation-duration:.01s!important;transition-duration:.01s!important}}
`;

function ProfitBar({ purchase, expenses, revenue }: { purchase: number; expenses: number; revenue: number }) {
  const cost = purchase + expenses;
  const max = Math.max(cost, revenue, 1);
  return (
    <div className="bar">
      <div className="barSegment" style={{ width: `${(purchase / max) * 100}%`, background: '#8AA4B8' }} />
      <div className="barSegment" style={{ width: `${(expenses / max) * 100}%`, background: '#E3A044' }} />
      {revenue > cost && (
        <div className="barSegment" style={{ width: `${((revenue - cost) / max) * 100}%`, background: '#35AE88' }} />
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
  const [sel, setSel] = useState<Car | null>(null);
  const [repairTitle, setRepairTitle] = useState('');
  const [repairAmount, setRepairAmount] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean; id: number } | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const say = (message: string, error = false) => {
    setToast({ message, error, id: Date.now() });
    setTimeout(() => setToast(null), 2800);
  };

  const closeModal = () => {
    setSel(null);
    setAskDelete(false);
  };

  const goAdd = () => {
    setActiveSection('add');
    document.getElementById('add-car-form')?.scrollIntoView({ behavior: 'smooth' });
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

  useEffect(() => {
    fetchCars();
  }, []);

  const addCar = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) return say('أدخل اسم السيارة وسعر السيارة', true);
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return say('أدخل سعر سيارة صحيح بالريال العُماني', true);

    const { error } = await supabase.from('cars').insert([
      { title: title.trim(), chassis_number: chassis.trim(), purchase_price: parsedPrice, status: 'available' },
    ]);
    if (error) return say(`حدث خطأ: ${error.message}`, true);

    setTitle('');
    setChassis('');
    setPrice('');
    await fetchCars();
    say('تمت إضافة السيارة بنجاح');
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
    const { error } = await supabase.from('cars').delete().eq('id', sel.id);
    if (error) return say(error.message, true);
    closeModal();
    await fetchCars();
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

  const [pageTitle, pageSub] = TITLES[activeSection] || TITLES.dashboard;

  const nav = (key: string | null, icon: string, label: string, onClick: () => void) => (
    <button className={`navItem ${key && activeSection === key ? 'active' : ''}`} onClick={onClick}>
      <span className="navIcon">{icon}</span>
      {label}
    </button>
  );

  const statCards: [string, string, string, string | number, string][] = [
    ['إجمالي السيارات', 'blue', '🚘', cars.length, 'جميع السيارات المسجلة بالنظام'],
    ['السيارات قيد المتابعة', 'orange', '🔄', cars.filter((c) => c.status !== 'sold').length, 'سيارات لم يتم بيعها بعد'],
    ['السيارات المباعة', 'green', '✓', stats.sold.length, 'عمليات البيع المكتملة'],
    ['إجمالي قيمة السيارات', 'blue', '💳', fmt(stats.purchase), 'ريال عُماني — سعر السيارات فقط'],
  ];

  const heroMinis: [string, string][] = [
    ['رأس المال المستثمر', `${fmt(heroCapital)} ر.ع`],
    ['إجمالي المبيعات', `${fmt(stats.sales)} ر.ع`],
    ['إجمالي التصليح', `${fmt(stats.expenses)} ر.ع`],
    ['العائد على الاستثمار', `${stats.roi}%`],
  ];

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
            <div className="logoIcon">🚘</div>
            <div>
              <div className="logoTitle">CARPROFIT</div>
              <div className="logoSub">OMAN • إدارة السيارات</div>
            </div>
          </div>

          <div className="navTitle">الرئيسية</div>
          {nav('dashboard', '📊', 'لوحة التحكم', () => {
            setActiveSection('dashboard');
            setTab('all');
          })}

          <div className="navTitle">السيارات</div>
          {nav('cars', '🚘', 'جميع السيارات', () => {
            setActiveSection('cars');
            setTab('all');
          })}
          {nav('status', '🔄', 'حالة السيارات', () => {
            setActiveSection('status');
            setTab('available');
          })}
          {nav('add', '＋', 'إضافة سيارة', goAdd)}

          <div className="navTitle">الإدارة المالية</div>
          {nav(null, '💰', 'الأرباح والمبيعات', () => say('قسم الأرباح والمبيعات قيد التطوير'))}
          {nav(null, '🧾', 'المصاريف', () => say('قسم المصاريف قيد التطوير'))}
          {nav(null, '📈', 'التقارير', () => say('قسم التقارير قيد التطوير'))}

          <div className="sidebarBottom">
            <div className="userBox">
              <div className="avatar">👤</div>
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
                <button className="mobileMenu" onClick={() => setMenuOpen(true)} aria-label="القائمة">☰</button>
                <button className="iconBtn" onClick={fetchCars} title="تحديث البيانات">↻</button>
                <button className="primaryBtn" onClick={goAdd}>＋ إضافة سيارة</button>
              </div>
            </header>

            <section className="hero">
              <div className="heroGrid">
                <div>
                  <div className="heroLabel">صافي الأرباح من السيارات المباعة</div>
                  <div className="heroProfit num" style={{ color: stats.profit >= 0 ? '#62D1AC' : '#FF8D8D' }}>
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

            <section className="stats">
              {statCards.map(([label, color, icon, value, hint]) => (
                <div className="statCard" key={label}>
                  <div className="statTop">
                    <span className="statLabel">{label}</span>
                    <div className={`statIcon ${color}`}>{icon}</div>
                  </div>
                  <div className="statValue num">{value}</div>
                  <div className="statHint">{hint}</div>
                </div>
              ))}
            </section>

            <div className="workspace">
              <aside className="card addCard" id="add-car-form">
                <h2 className="cardTitle">إضافة سيارة جديدة</h2>
                <div className="cardSub">أضف السيارة لتبدأ متابعة تكلفتها وربحها</div>
                <form onSubmit={addCar}>
                  <div className="field">
                    <label>اسم السيارة والموديل</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم السيارة والموديل" />
                  </div>
                  <div className="field">
                    <label>رقم الشاسي VIN</label>
                    <input value={chassis} onChange={(e) => setChassis(e.target.value)} placeholder="VIN" />
                  </div>
                  <div className="field">
                    <label>سعر السيارة</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.000 ر.ع"
                    />
                  </div>
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
                      placeholder="البحث بالاسم أو رقم الشاسي"
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
                            <span className="statusTabIcon">{meta.icon}</span>
                            <span className="statusTabLabel">{meta.label}</span>
                            <span className="statusTabCount">{count} سيارة</span>
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
                    <div className="emptyIcon">⏳</div>
                    جاري تحميل السيارات...
                  </div>
                ) : filteredCars.length === 0 ? (
                  <div className="empty">
                    <div className="emptyIcon">🚘</div>
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
                      meta.next === 'sold' ? 'var(--green)' : meta.next === 'repair' ? '#8B5CF6' : 'var(--blue)';

                    return (
                      <div key={car.id} className="carRow" onClick={() => setSel(car)}>
                        <div className="carMain">
                          <div className="carName">
                            {car.title}
                            <span className={`status ${st}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </div>
                          <div className="vin">{car.chassis_number || 'رقم الشاسي غير مسجل'}</div>
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
            </div>
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
          <div className="modal">
            <div className="modalHead">
              <div>
                <div className="carName">{sel.title}</div>
                <div className="vin">{sel.chassis_number || 'رقم الشاسي غير مسجل'}</div>
              </div>
              <button className="close" onClick={closeModal}>✕</button>
            </div>

            <div className="modalBody">
              <div className="detailGrid">
                <div className="detailBox">
                  <span>سعر السيارة</span>
                  <b className="num">{fmt(sel.purchase_price)} ر.ع</b>
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
                  <b style={{ color: selMeta.color }}>{selMeta.icon} {selMeta.label}</b>
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
                            {isDone ? '✓' : STATUS_META[status].icon}
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
                <button className="smallBtn" type="submit">＋ إضافة</button>
              </form>

              {(sel.expenses || []).length === 0 ? (
                <div className="noRepairs">لا توجد أغراض تصليح مسجلة لهذه السيارة.</div>
              ) : (
                <div className="repairTable">
                  <div className="repairHeader">
                    <span>غرض التصليح</span>
                    <span style={{ textAlign: 'left' }}>القيمة</span>
                  </div>
                  {(sel.expenses || []).map((repair) => (
                    <div className="repairRow num" key={repair.id}>
                      <span className="repairName">{repair.title}</span>
                      <span className="repairAmount">{fmt(repair.amount)} ر.ع</span>
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
                    <button className="saleSubmit" type="submit">✓ إتمام عملية البيع</button>
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
                  <button className="dangerBtn" onClick={() => setAskDelete(true)}>حذف السيارة</button>
                )}
              </div>
              <button className="secondaryBtn" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`toast ${toast.error ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}