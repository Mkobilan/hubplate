"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    DollarSign,
    Calendar,
    Clock,
    ChevronRight,
    Plus,
    FileText,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Download,
    Coins,
    ArrowRight,
    ListFilter,
    X,
    Loader2,
    Trash2
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, startOfISOWeek, endOfISOWeek } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { calculateEmployeePayroll } from "@/lib/payroll";

export default function PayrollPage() {
    const { t } = useTranslation();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRunModal, setShowRunModal] = useState(false);

    // Run Wizard State
    const [step, setStep] = useState(1);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 14), "yyyy-MM-dd"), // Default 2 weeks ago
        end: format(new Date(), "yyyy-MM-dd")
    });
    const [calculating, setCalculating] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);

    const fetchPeriods = async () => {
        if (!currentLocation) return;
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch periods
            const { data: periodData, error: pError } = await supabase
                .from("payroll_periods")
                .select("*")
                .eq("location_id", currentLocation.id)
                .order("start_date", { ascending: false });

            if (pError) throw pError;

            // Fetch runs for these periods to get totals
            const { data: runsData, error: rError } = await supabase
                .from("payroll_runs")
                .select("*")
                .in("period_id", ((periodData as any[]) || []).map((p: any) => p.id));

            if (rError) throw rError;

            // Map aggregates to periods
            const enrichedPeriods = ((periodData as any[]) || []).map((p: any) => {
                const periodRuns = ((runsData as any[]) || []).filter((r: any) => r.period_id === p.id);
                const totalGross = periodRuns.reduce((sum: number, r: any) => sum + (Number(r.net_pay_estimated) || 0), 0);
                const totalTips = periodRuns.reduce((sum: number, r: any) => sum + (Number(r.tips_earned) || 0), 0);
                return {
                    ...(p as any),
                    employeeCount: periodRuns.length,
                    totalGross,
                    totalTips
                };
            });

            setPeriods(enrichedPeriods);
        } catch (err) {
            console.error("Error fetching payroll periods:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, [currentLocation?.id]);

    const handleRunPayroll = async () => {
        if (!currentLocation) return;
        try {
            setCalculating(true);
            const supabase = createClient();

            // 1. Fetch all active employees
            const { data: employeesData, error: empError } = await supabase
                .from("employees")
                .select("*")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);

            if (empError) throw empError;
            const employees = (employeesData || []) as any[];

            // 2. Calculate for each employee
            const results = [];
            for (const emp of employees) {
                const calc = await calculateEmployeePayroll(
                    supabase,
                    emp.id,
                    dateRange.start,
                    dateRange.end
                );
                results.push({
                    employee: emp,
                    ...calc
                });
            }

            setPreviewData(results);
            setStep(2);
        } catch (err) {
            console.error("Error calculating payroll:", err);
            alert("Failed to calculate payroll preview.");
        } finally {
            setCalculating(false);
        }
    };

    const handleFinalize = async () => {
        if (!currentLocation) return;
        try {
            setCalculating(true);
            const supabase = createClient();

            // 0. Duplicate Check
            const { data: existing } = await supabase
                .from("payroll_periods")
                .select("id")
                .eq("location_id", currentLocation.id)
                .eq("start_date", dateRange.start)
                .eq("end_date", dateRange.end)
                .maybeSingle();

            if (existing) {
                alert("A payroll record already exists for this date range.");
                setCalculating(false);
                return;
            }

            // 1. Create Period
            const { data: period, error: periodError } = await (supabase
                .from("payroll_periods") as any)
                .insert({
                    location_id: currentLocation.id,
                    organization_id: (currentLocation as any).organization_id,
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                    status: 'completed'
                } as any)
                .select()
                .single();

            if (periodError) throw periodError;

            // 2. Create Runs
            const runs = previewData.map(d => ({
                period_id: (period as any).id,
                employee_id: d.employee.id,
                regular_hours: d.regularHours,
                overtime_hours: d.otHours,
                gross_regular_pay: d.grossRegularPay,
                gross_overtime_pay: d.grossOTPay,
                tips_earned: d.totalTips,
                net_pay_estimated: d.totalGross,
                metadata: {
                    calculation_date: new Date().toISOString()
                }
            }));

            const { error: runsError } = await supabase
                .from("payroll_runs")
                .insert(runs as any);

            if (runsError) throw runsError;

            setShowRunModal(false);
            setStep(1);
            fetchPeriods();
        } catch (err) {
            console.error("Error finalizing payroll:", err);
            alert("Failed to finalize payroll.");
        } finally {
            setCalculating(false);
        }
    };

    const handleExportCSV = async (period: any) => {
        try {
            const supabase = createClient();
            const { data: runs, error } = await supabase
                .from("payroll_runs")
                .select(`
                    *,
                    employee:employees(first_name, last_name, email)
                `)
                .eq("period_id", period.id);

            if (error) throw error;
            if (!runs || runs.length === 0) {
                alert("No payroll records found for this period.");
                return;
            }

            // Generate CSV
            const headers = ["Employee", "Email", "Regular Hours", "OT Hours", "Gross Reg Pay", "Gross OT Pay", "Tips", "Total Gross"];
            const rows = runs.map((r: any) => [
                `"${r.employee?.first_name} ${r.employee?.last_name}"`,
                `"${r.employee?.email || ""}"`,
                r.regular_hours,
                r.overtime_hours,
                r.gross_regular_pay,
                r.gross_overtime_pay,
                r.tips_earned,
                r.net_pay_estimated
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `payroll_${period.start_date}_to_${period.end_date}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error exporting CSV:", err);
            alert("Failed to export payroll data.");
        }
    };

    const handleDeletePeriod = async (periodId: string) => {
        if (!confirm("Are you sure you want to delete this payroll record? This will also remove all associated employee pay records for this period.")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("payroll_periods")
                .delete()
                .eq("id", periodId);

            if (error) throw error;
            fetchPeriods();
        } catch (err) {
            console.error("Error deleting period:", err);
            alert("Failed to delete payroll record.");
        }
    };

    const totalPeriodCost = periods[0] ? 0 : 0; // In a real app, sum the runs for the latest period

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Payroll Dashboard</h1>
                    <p className="text-slate-400 mt-1">Manage labor costs</p>
                </div>
                <button
                    onClick={() => setShowRunModal(true)}
                    className="btn btn-primary"
                >
                    <Plus className="h-4 w-4" />
                    Run Payroll
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStat
                    label="Latest Payroll"
                    value={periods[0] ? format(new Date(periods[0].end_date), "MMM d") : "--"}
                    icon={<DollarSign className="h-4 w-4" />}
                />
                <QuickStat
                    label="Average Hourly"
                    value="$18.50"
                    icon={<Clock className="h-4 w-4" />}
                />
                <QuickStat
                    label="Open Tips"
                    value="$420.00"
                    icon={<Coins className="h-4 w-4" />}
                    variant="success"
                />
                <QuickStat
                    label="Labor %"
                    value="24.2%"
                    icon={<TrendingUp className="h-4 w-4" />}
                />
            </div>

            {/* Past Periods */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold">Payroll History</h2>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100">
                        <ListFilter className="h-4 w-4" />
                        Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/50">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Period</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Employees</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Total Labor</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Tips</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : periods.length > 0 ? (
                                periods.map((period) => (
                                    <tr key={period.id} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-4 w-4 text-slate-500" />
                                                <span className="font-medium">
                                                    {format(new Date(period.start_date), "MMM d")} - {format(new Date(period.end_date), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "badge text-[10px]",
                                                period.status === 'completed' ? "badge-success" : "badge-secondary"
                                            )}>
                                                {period.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{period.employeeCount || "0"}</td>
                                        <td className="px-6 py-4 font-mono">{formatCurrency(period.totalGross || 0)}</td>
                                        <td className="px-6 py-4 font-mono">{formatCurrency(period.totalTips || 0)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleExportCSV(period)}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-400 transition-colors"
                                                    title="Export CSV"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePeriod(period.id)}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No payroll history yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Run Payroll Modal */}
            <Modal
                isOpen={showRunModal}
                onClose={() => {
                    setShowRunModal(false);
                    setStep(1);
                }}
                title="Run Payroll Wizard"
            >
                <div className="space-y-6">
                    {/* Stepper */}
                    <div className="flex items-center justify-between px-10 relative">
                        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-800 -z-10" />
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                            step >= 1 ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-500"
                        )}>1</div>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                            step >= 2 ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-500"
                        )}>2</div>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors",
                            step >= 3 ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-500"
                        )}>3</div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 text-orange-200 text-sm">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p>Ensure all time entries for this period are finalized before running payroll.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Start Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">End Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleRunPayroll}
                                disabled={calculating}
                                className="btn btn-primary w-full h-12"
                            >
                                {calculating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                                    <>
                                        Calculate Payroll
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                                {previewData.map((row, idx) => (
                                    <div key={idx} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between group hover:border-orange-500/30 transition-all">
                                        <div>
                                            <p className="font-bold">{row.employee.first_name} {row.employee.last_name}</p>
                                            <p className="text-xs text-slate-500">{row.regularHours}h Reg • {row.otHours}h OT • {formatCurrency(row.totalTips)} Tips</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-orange-400">{formatCurrency(row.totalGross)}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-600">Gross Estimate</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleFinalize}
                                    disabled={calculating}
                                    className="btn btn-primary flex-1"
                                >
                                    {calculating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Finalize & Record"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

function QuickStat({ label, value, icon, variant = "default" }: { label: string, value: string, icon: React.ReactNode, variant?: "default" | "success" }) {
    return (
        <div className="card flex items-center gap-4 group hover:border-orange-500/30 transition-all">
            <div className={cn(
                "p-3 rounded-xl transition-transform group-hover:scale-110",
                variant === "success" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"
            )}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </div>
        </div>
    );
}
