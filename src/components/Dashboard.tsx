import React from 'react';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Eye,
  Car,
  ArrowRight,
} from 'lucide-react';
import { ActiveTab, MainOrder } from '../types';
import { FMSMetadata } from '../services/storageService';

interface DashboardProps {
  orders: MainOrder[];
  fmsMeta: FMSMetadata;
  onNavigate: (tab: ActiveTab) => void;
  onViewOrder: (order: MainOrder) => void;
  onDownloadExcel: (order: MainOrder) => void;
  onDownloadPdf: (order: MainOrder) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  fmsMeta,
  onNavigate,
  onViewOrder,
  onDownloadExcel,
  onDownloadPdf,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalOrders = orders.length;
  const ordersToday = orders.filter((o) => o.date === todayStr || o.createdDate.startsWith(todayStr)).length;
  const pendingOrders = orders.filter(
    (o) => o.status === 'Request Received' || o.status === 'Job Order Created' || o.status === 'Sent to Employee'
  ).length;
  const completedOrders = orders.filter(
    (o) => o.status === 'Completed' || o.status === 'Closed'
  ).length;
  const failedEmails = orders.filter((o) => o.emailStatus === 'Failed').length;

  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  ).slice(0, 5);

  const statCards = [
    {
      id: 'stat-total-orders',
      title: 'Total Orders',
      value: totalOrders,
      desc: 'All recorded job orders',
      icon: FileText,
      color: 'text-[#E1001A]',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      id: 'stat-orders-today',
      title: 'Orders Today',
      value: ordersToday,
      desc: todayStr,
      icon: Calendar,
      color: 'text-slate-800',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      id: 'stat-pending-orders',
      title: 'Pending Orders',
      value: pendingOrders,
      desc: 'In progress / sent',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      id: 'stat-completed-orders',
      title: 'Completed Orders',
      value: completedOrders,
      desc: 'Finished maintenance',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      id: 'stat-failed-emails',
      title: 'Failed Emails',
      value: failedEmails,
      desc: 'Delivery issues',
      icon: AlertTriangle,
      color: failedEmails > 0 ? 'text-red-600' : 'text-slate-500',
      bg: failedEmails > 0 ? 'bg-red-50' : 'bg-slate-50',
      border: failedEmails > 0 ? 'border-red-200' : 'border-slate-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E1001A]" />
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 rounded-xl bg-red-50 border border-red-100 p-2 items-center justify-center shrink-0">
            <img src="/logo.svg" alt="e& etisalat and" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                e& Fleet Maintenance Console
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-[#E1001A] border border-red-200 rounded-full uppercase">
                etisalat and
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active FMS Register: <span className="font-semibold text-slate-700">{fmsMeta.fileName}</span> ({fmsMeta.totalVehicles} registered fleet vehicles)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="btn-dashboard-new-order"
            onClick={() => onNavigate('new-order')}
            className="flex items-center gap-2 bg-[#E1001A] hover:bg-[#C70017] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Maintenance Order</span>
          </button>
        </div>
      </div>

      {/* 5 Required Simple Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={card.id}
              className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-md ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900">
                  {card.value}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Orders & Quick System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Job Orders</h2>
              <p className="text-xs text-slate-500">Latest active maintenance requests</p>
            </div>
            <button
              id="btn-view-all-orders"
              onClick={() => onNavigate('main-orders')}
              className="text-xs font-semibold text-[#E1001A] hover:text-[#B00014] flex items-center gap-1"
            >
              <span>View Main Orders Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">No maintenance orders created yet.</p>
              <button
                onClick={() => onNavigate('new-order')}
                className="mt-3 text-xs text-[#E1001A] hover:underline font-medium"
              >
                Create the first maintenance order
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <div
                  key={order.orderNumber}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <span className="font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {order.carCode}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        {order.carNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 truncate">
                      <span className="font-medium text-slate-800">{order.employeeName}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span>{order.maintenanceType}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span>{order.agency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        order.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.status === 'Sent to Employee'
                          ? 'bg-red-50 text-[#E1001A] border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.status}
                    </span>

                    <button
                      title="View Details"
                      onClick={() => onViewOrder(order)}
                      className="p-1.5 text-slate-600 hover:text-[#E1001A] hover:bg-slate-100 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="Download Job Order Excel"
                      onClick={() => onDownloadExcel(order)}
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FMS Health & Quick Info Widget */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-[#E1001A]" />
                <h3 className="font-bold text-sm text-slate-900">Current FMS Fleet</h3>
              </div>
              <button
                onClick={() => onNavigate('fms-upload')}
                className="text-xs text-[#E1001A] hover:underline font-medium"
              >
                Manage / Update
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Active File:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                  {fmsMeta.fileName}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Vehicles:</span>
                <span className="font-bold text-slate-800">{fmsMeta.totalVehicles}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Last Synced:</span>
                <span className="text-slate-700">
                  {new Date(fmsMeta.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('fms-upload')}
              className="mt-4 w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
            >
              Upload Latest FMS Excel
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 text-xs text-slate-600">
            <h4 className="font-bold text-slate-800 mb-2">V1 Core Workflow Rules</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li>Car Code is the primary lookup key from FMS.</li>
              <li>Official template is copied and preserved untouched.</li>
              <li>Completed Excel is converted directly into vector PDF.</li>
              <li>Generated PDF is automatically dispatched to employee email.</li>
              <li>Every order creates a permanent Main Orders record.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
