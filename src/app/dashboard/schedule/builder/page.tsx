"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Wand2,
    Settings,
    Plus,
    Trash2,
    Save,
    Eye,
    Send,
    Loader2,
    ArrowLeft,
    FileCheck,
    AlertCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/stores";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Modal } from "@/components/ui/modal";

type StaffingTemplate = {
    id: string;
    name: string;
    description: string;
    is_default: boolean;
};

type StaffingRule = {
    id: string;
    template_id: string;
    role: string;
    start_time: string;
    end_time: string;
    min_staff: number;
    days_of_week: number[];
};

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    secondary_roles: string[];
    max_weekly_hours: number;
    hourly_rate: number;
    is_active: boolean;
};

type Availability = {
    employee_id: string;
    date: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
};

type GeneratedShift = {
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    role: string;
    warning?: string;
};

const ROLES = ["server", "bartender", "cook", "host", "busser", "dishwasher"];

export default function ScheduleBuilderPage() {
    const router = useRouter();
    const currentLocation = useAppStore((state) => state.currentLocation);
    const currentEmployee = useAppStore((state) => state.currentEmployee);

    // Step management
    const [currentStep, setCurrentStep] = useState(1);

    // Date range
    const [startDate, setStartDate] = useState<Date>(startOfWeek(addDays(new Date(), 7)));
    const [endDate, setEndDate] = useState<Date>(endOfWeek(addDays(new Date(), 7)));

    // Templates and rules
    const [templates, setTemplates] = useState<StaffingTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<StaffingTemplate | null>(null);
    const [rules, setRules] = useState<StaffingRule[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<StaffingTemplate | null>(null);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDesc, setNewTemplateDesc] = useState("");

    // Staff data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);

    // Generated schedule
    const [generatedShifts, setGeneratedShifts] = useState<GeneratedShift[]>([]);
    const [warnings, setWarnings] = useState<{ type: string; message: string; employeeId?: string }[]>([]);
    const [coverageGaps, setCoverageGaps] = useState<{ date: string; role: string; slot: string; needed: number; scheduled: number }[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);

    // Rule editing modal
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<StaffingRule> | null>(null);

    useEffect(() => {
        fetchData();
    }, [currentLocation?.id]);

    const fetchData = async () => {
        if (!currentLocation) return;

        try {
            setLoading(true);
            const supabase = createClient();

            // 1. Robust orgId resolution (Check store first, then DB as fallback)
            let orgId = currentEmployee?.organization_id || (currentLocation as any)?.organization_id;

            if (!orgId) {
                console.log("orgId missing from store, fetching from DB...");
                const { data: loc } = await (supabase
                    .from("locations") as any)
                    .select("organization_id")
                    .eq("id", currentLocation.id)
                    .single();

                if (loc?.organization_id) {
                    orgId = loc.organization_id;
                    // Self-heal the store
                    useAppStore.getState().setCurrentLocation({
                        ...currentLocation,
                        organization_id: orgId
                    } as any);
                }
            }

            setResolvedOrgId(orgId);
            console.log("Resolved Org ID:", orgId);

            // Fetch templates
            const { data: templatesData } = await (supabase
                .from("staffing_templates") as any)
                .select("*")
                .eq("location_id", currentLocation.id);

            setTemplates(templatesData || []);

            // Auto-select default template
            const defaultTemplate = (templatesData || []).find((t: any) => t.is_default);
            if (defaultTemplate) {
                setSelectedTemplate(defaultTemplate);
                await fetchRulesForTemplate(defaultTemplate.id);
            }

            // Fetch employees
            const { data: employeesData } = await (supabase
                .from("employees") as any)
                .select("*")
                .eq("location_id", currentLocation.id)
                .eq("is_active", true);

            setEmployees(employeesData || []);

            // Fetch availability for the selected date range
            const { data: availData } = await (supabase
                .from("availability") as any)
                .select("*")
                .in("employee_id", (employeesData || []).map((e: any) => e.id));

            setAvailability(availData || []);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRulesForTemplate = async (templateId: string) => {
        const supabase = createClient();
        const { data } = await (supabase
            .from("staffing_rules") as any)
            .select("*")
            .eq("template_id", templateId)
            .order("start_time");

        setRules(data || []);
    };

    const handleSaveTemplate = async () => {
        if (!currentLocation || !newTemplateName.trim()) return;

        try {
            setSaving(true);
            const supabase = createClient();

            // Use the already resolved orgId or fallback
            const orgId = resolvedOrgId || currentEmployee?.organization_id ||
                (currentLocation as any)?.organization_id;

            console.log("Saving template for org:", orgId, "location:", currentLocation.id);

            if (!orgId) {
                throw new Error("Missing organization_id. Please refresh the page.");
            }

            if (editingTemplate) {
                const { error } = await (supabase
                    .from("staffing_templates") as any)
                    .update({
                        name: newTemplateName,
                        description: newTemplateDesc
                    })
                    .eq("id", editingTemplate.id);

                if (error) throw error;
            } else {
                const { data, error } = await (supabase
                    .from("staffing_templates") as any)
                    .insert({
                        location_id: currentLocation.id,
                        organization_id: orgId,
                        name: newTemplateName,
                        description: newTemplateDesc,
                        is_default: templates.length === 0
                    })
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    setSelectedTemplate(data);
                }
            }

            setIsTemplateModalOpen(false);
            setNewTemplateName("");
            setNewTemplateDesc("");
            setEditingTemplate(null);
            await fetchData();
        } catch (err) {
            console.error("Error saving template:", err);
            setStatus("error");
            setMessage("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRule = async () => {
        if (!selectedTemplate || !editingRule) return;

        try {
            setSaving(true);
            const supabase = createClient();

            const ruleData = {
                template_id: selectedTemplate.id,
                role: editingRule.role,
                start_time: editingRule.start_time,
                end_time: editingRule.end_time,
                min_staff: editingRule.min_staff || 1,
                days_of_week: editingRule.days_of_week || [0, 1, 2, 3, 4, 5, 6]
            };

            if (editingRule.id) {
                const { error } = await (supabase
                    .from("staffing_rules") as any)
                    .update(ruleData)
                    .eq("id", editingRule.id);

                if (error) throw error;
            } else {
                const { error } = await (supabase
                    .from("staffing_rules") as any)
                    .insert(ruleData);

                if (error) throw error;
            }

            setIsRuleModalOpen(false);
            setEditingRule(null);
            await fetchRulesForTemplate(selectedTemplate.id);
        } catch (err) {
            console.error("Error saving rule:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("Delete this staffing rule?")) return;

        try {
            const supabase = createClient();
            await (supabase.from("staffing_rules") as any).delete().eq("id", ruleId);
            await fetchRulesForTemplate(selectedTemplate!.id);
        } catch (err) {
            console.error("Error deleting rule:", err);
        }
    };

    const getEmployeeAvailability = (employeeId: string, date: Date): Availability | null => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayOfWeek = date.getDay();

        // First check for specific date availability
        const specificAvail = availability.find(a =>
            a.employee_id === employeeId && a.date === dateStr
        );

        if (specificAvail) return specificAvail;

        // Fall back to weekly default
        const weeklyAvail = availability.find(a =>
            a.employee_id === employeeId && a.date === null && a.day_of_week === dayOfWeek
        );

        return weeklyAvail || null;
    };

    const canEmployeeWorkShift = (employee: Employee, date: Date, startTime: string, endTime: string, role: string): boolean => {
        const avail = getEmployeeAvailability(employee.id, date);

        if (!avail || !avail.is_available) return false;

        // Check if shift time overlaps with availability
        const availStart = avail.start_time.slice(0, 5);
        const availEnd = avail.end_time.slice(0, 5);
        const shiftStart = startTime.slice(0, 5);
        const shiftEnd = endTime.slice(0, 5);

        // Employee must be available for the entire shift
        if (shiftStart < availStart || shiftEnd > availEnd) return false;

        // Check if employee can work this role
        if (employee.role !== role && !(employee.secondary_roles || []).includes(role)) {
            return false;
        }

        return true;
    };

    const generateSchedule = async () => {
        if (!selectedTemplate || rules.length === 0) {
            setStatus("error");
            setMessage("Please select a template with staffing rules first.");
            return;
        }

        try {
            setGenerating(true);
            setWarnings([]);
            setCoverageGaps([]);

            const shifts: GeneratedShift[] = [];
            const employeeHours: Record<string, number> = {};
            const newWarnings: typeof warnings = [];
            const newGaps: typeof coverageGaps = [];

            // Initialize hours tracking
            employees.forEach(e => {
                employeeHours[e.id] = 0;
            });

            // Get all days in the range
            const days = eachDayOfInterval({ start: startDate, end: endDate });

            for (const day of days) {
                const dayOfWeek = day.getDay();
                const dateStr = format(day, "yyyy-MM-dd");

                // Get rules for this day
                const dayRules = rules.filter(r =>
                    r.days_of_week.includes(dayOfWeek)
                );

                // Group rules by role and time slot
                for (const rule of dayRules) {
                    const shiftHours = calculateHours(rule.start_time, rule.end_time);
                    let scheduledCount = 0;

                    // Find available employees for this role and time slot
                    const availableEmployees = employees
                        .filter(emp => canEmployeeWorkShift(emp, day, rule.start_time, rule.end_time, rule.role))
                        .sort((a, b) => {
                            // Prioritize by: lowest hours first (fairness)
                            const hoursA = employeeHours[a.id] || 0;
                            const hoursB = employeeHours[b.id] || 0;
                            return hoursA - hoursB;
                        });

                    // Assign shifts until requirement is met
                    for (const emp of availableEmployees) {
                        if (scheduledCount >= rule.min_staff) break;

                        // Check if already scheduled at this time
                        const alreadyScheduled = shifts.some(s =>
                            s.employee_id === emp.id &&
                            s.date === dateStr &&
                            timeOverlaps(s.start_time, s.end_time, rule.start_time, rule.end_time)
                        );

                        if (alreadyScheduled) continue;

                        const currentHours = employeeHours[emp.id] || 0;
                        const newHours = currentHours + shiftHours;
                        let warning: string | undefined;

                        // Check for overtime
                        if (newHours > (emp.max_weekly_hours || 40)) {
                            warning = `Overtime: ${newHours.toFixed(1)}h / ${emp.max_weekly_hours || 40}h max`;
                            newWarnings.push({
                                type: "overtime",
                                message: `${emp.first_name} ${emp.last_name} scheduled for ${newHours.toFixed(1)}h (max: ${emp.max_weekly_hours || 40}h)`,
                                employeeId: emp.id
                            });
                        }

                        shifts.push({
                            employee_id: emp.id,
                            date: dateStr,
                            start_time: rule.start_time,
                            end_time: rule.end_time,
                            role: rule.role,
                            warning
                        });

                        employeeHours[emp.id] = newHours;
                        scheduledCount++;
                    }

                    // Track coverage gaps
                    if (scheduledCount < rule.min_staff) {
                        newGaps.push({
                            date: dateStr,
                            role: rule.role,
                            slot: `${rule.start_time.slice(0, 5)} - ${rule.end_time.slice(0, 5)}`,
                            needed: rule.min_staff,
                            scheduled: scheduledCount
                        });
                    }
                }
            }

            setGeneratedShifts(shifts);
            setWarnings(newWarnings);
            setCoverageGaps(newGaps);
            setCurrentStep(3);
        } catch (err) {
            console.error("Error generating schedule:", err);
            setStatus("error");
            setMessage("Failed to generate schedule");
        } finally {
            setGenerating(false);
        }
    };

    const calculateHours = (start: string, end: string): number => {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        return (eh * 60 + em - sh * 60 - sm) / 60;
    };

    const timeOverlaps = (s1: string, e1: string, s2: string, e2: string): boolean => {
        const toMinutes = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        };
        const start1 = toMinutes(s1), end1 = toMinutes(e1);
        const start2 = toMinutes(s2), end2 = toMinutes(e2);
        return start1 < end2 && start2 < end1;
    };

    const handlePublishSchedule = async () => {
        if (generatedShifts.length === 0) return;

        try {
            setSaving(true);
            const supabase = createClient();
            const orgId = resolvedOrgId || currentEmployee?.organization_id ||
                (currentLocation as any)?.organization_id;

            console.log("Publishing schedule for org:", orgId);

            if (!orgId) {
                throw new Error("Missing organization_id for publishing");
            }

            // Create schedule batch
            const { data: batch, error: batchError } = await (supabase
                .from("schedule_batches") as any)
                .insert({
                    location_id: currentLocation!.id,
                    organization_id: orgId,
                    template_id: selectedTemplate?.id,
                    start_date: format(startDate, "yyyy-MM-dd"),
                    end_date: format(endDate, "yyyy-MM-dd"),
                    status: "published",
                    created_by: currentEmployee?.id,
                    approved_by: currentEmployee?.id,
                    approved_at: new Date().toISOString(),
                    published_at: new Date().toISOString(),
                    overtime_warnings: warnings,
                    coverage_gaps: coverageGaps
                })
                .select()
                .single();

            if (batchError) throw batchError;

            // Create shifts
            const shiftsToInsert = generatedShifts.map(shift => ({
                location_id: currentLocation!.id,
                organization_id: orgId,
                employee_id: shift.employee_id,
                date: shift.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                role: shift.role,
                batch_id: batch.id,
                is_published: true
            }));

            const { error: shiftsError } = await (supabase
                .from("shifts") as any)
                .insert(shiftsToInsert);

            if (shiftsError) throw shiftsError;

            setStatus("success");
            setMessage("Schedule published successfully!");
            setTimeout(() => {
                router.push("/dashboard/schedule");
            }, 1500);
        } catch (err) {
            console.error("Error publishing schedule:", err);
            setStatus("error");
            setMessage("Failed to publish schedule");
        } finally {
            setSaving(false);
        }
    };

    const getEmployeeById = (id: string) => employees.find(e => e.id === id);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!currentLocation) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarIcon className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Location Selected</h2>
                <p className="text-slate-400 mb-6">Please select a location first.</p>
            </div>
        );
    }

    const steps = [
        { num: 1, title: "Date Range & Template", icon: CalendarIcon },
        { num: 2, title: "Staffing Rules", icon: Settings },
        { num: 3, title: "Review & Publish", icon: FileCheck },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push("/dashboard/schedule")}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Schedule Builder</h1>
                    <p className="text-slate-400 mt-1">Create and publish weekly schedules</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                {steps.map((step, idx) => (
                    <div key={step.num} className="flex items-center">
                        <button
                            onClick={() => step.num <= currentStep && setCurrentStep(step.num)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl transition-all",
                                currentStep === step.num
                                    ? "bg-orange-500 text-white"
                                    : currentStep > step.num
                                        ? "bg-green-500/20 text-green-400 cursor-pointer"
                                        : "bg-slate-800 text-slate-500"
                            )}
                        >
                            {currentStep > step.num ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                <step.icon className="h-5 w-5" />
                            )}
                            <span className="font-medium hidden sm:block">{step.title}</span>
                        </button>
                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "w-8 h-0.5 mx-2",
                                currentStep > step.num ? "bg-green-500" : "bg-slate-700"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="card p-6">
                {currentStep === 1 && (
                    <div className="space-y-8">
                        {/* Date Range Selection */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-orange-500" />
                                Select Date Range
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="label">Start Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={format(startDate, "yyyy-MM-dd")}
                                        onChange={(e) => setStartDate(parseISO(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="label">End Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={format(endDate, "yyyy-MM-dd")}
                                        onChange={(e) => setEndDate(parseISO(e.target.value))}
                                        min={format(startDate, "yyyy-MM-dd")}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <p className="text-sm text-blue-400">
                                    <strong>Scheduling:</strong> {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                                    ({eachDayOfInterval({ start: startDate, end: endDate }).length} days)
                                </p>
                            </div>
                        </div>

                        {/* Template Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-orange-500" />
                                    Staffing Template
                                </h2>
                                <button
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setNewTemplateName("");
                                        setNewTemplateDesc("");
                                        setIsTemplateModalOpen(true);
                                    }}
                                    className="btn btn-secondary gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Template
                                </button>
                            </div>

                            {templates.length === 0 ? (
                                <div className="p-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 text-center">
                                    <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold mb-2">No Templates Yet</h3>
                                    <p className="text-slate-400 text-sm mb-4">
                                        Create a staffing template to define your role requirements
                                    </p>
                                    <button
                                        onClick={() => setIsTemplateModalOpen(true)}
                                        className="btn btn-primary gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create First Template
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {templates.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={async () => {
                                                setSelectedTemplate(template);
                                                await fetchRulesForTemplate(template.id);
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border-2 text-left transition-all",
                                                selectedTemplate?.id === template.id
                                                    ? "bg-orange-500/10 border-orange-500"
                                                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold">{template.name}</h3>
                                                    <p className="text-sm text-slate-400 mt-1">{template.description || "No description"}</p>
                                                </div>
                                                {template.is_default && (
                                                    <span className="badge badge-primary text-[10px]">Default</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setCurrentStep(2)}
                                disabled={!selectedTemplate}
                                className="btn btn-primary gap-2"
                            >
                                Continue to Staffing Rules
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 2 && selectedTemplate && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="h-5 w-5 text-orange-500" />
                                Staffing Rules: {selectedTemplate.name}
                            </h2>
                            <button
                                onClick={() => {
                                    setEditingRule({
                                        role: "server",
                                        start_time: "09:00",
                                        end_time: "17:00",
                                        min_staff: 1,
                                        days_of_week: [0, 1, 2, 3, 4, 5, 6]
                                    });
                                    setIsRuleModalOpen(true);
                                }}
                                className="btn btn-primary gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Rule
                            </button>
                        </div>

                        {rules.length === 0 ? (
                            <div className="p-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 text-center">
                                <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-lg font-bold mb-2">No Staffing Rules</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Add rules to define how many staff you need for each role and time slot
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {ROLES.filter(role => rules.some(r => r.role === role)).map(role => (
                                    <div key={role} className="space-y-3">
                                        <h3 className="text-lg font-bold capitalize flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                                            {role}s
                                        </h3>
                                        <div className="grid gap-2">
                                            {rules.filter(r => r.role === role).map(rule => (
                                                <div
                                                    key={rule.id}
                                                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                                            <Clock className="h-4 w-4 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">
                                                                {rule.start_time.slice(0, 5)} - {rule.end_time.slice(0, 5)}
                                                            </p>
                                                            <p className="text-sm text-slate-400">
                                                                {rule.days_of_week.length === 7
                                                                    ? "All days"
                                                                    : rule.days_of_week
                                                                        .sort((a, b) => a - b)
                                                                        .map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                                                                        .join(", ")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-bold text-orange-400">{rule.min_staff}</p>
                                                            <p className="text-xs text-slate-500">staff needed</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setEditingRule(rule);
                                                                setIsRuleModalOpen(true);
                                                            }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg"
                                                        >
                                                            <Settings className="h-4 w-4 text-slate-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRule(rule.id)}
                                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="btn btn-secondary gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </button>
                            <button
                                onClick={generateSchedule}
                                disabled={rules.length === 0 || generating}
                                className="btn btn-primary gap-2"
                            >
                                {generating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Wand2 className="h-4 w-4" />
                                )}
                                Generate Schedule
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Eye className="h-5 w-5 text-orange-500" />
                            Review Generated Schedule
                        </h2>

                        {/* Warnings & Gaps */}
                        {(warnings.length > 0 || coverageGaps.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {warnings.length > 0 && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2">
                                        <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Overtime Warnings ({warnings.length})
                                        </h3>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {warnings.map((w, i) => (
                                                <p key={i} className="text-sm text-yellow-400/80">{w.message}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {coverageGaps.length > 0 && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                                        <h3 className="font-bold text-red-400 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Coverage Gaps ({coverageGaps.length})
                                        </h3>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {coverageGaps.map((g, i) => (
                                                <p key={i} className="text-sm text-red-400/80">
                                                    {g.date} - {g.role} {g.slot}: {g.scheduled}/{g.needed} staff
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <p className="text-sm text-slate-500">Total Shifts</p>
                                <p className="text-2xl font-bold">{generatedShifts.length}</p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <p className="text-sm text-slate-500">Employees</p>
                                <p className="text-2xl font-bold">
                                    {new Set(generatedShifts.map(s => s.employee_id)).size}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <p className="text-sm text-slate-500">Total Hours</p>
                                <p className="text-2xl font-bold">
                                    {generatedShifts.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0).toFixed(0)}h
                                </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <p className="text-sm text-slate-500">Est. Labor Cost</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {formatCurrency(generatedShifts.reduce((sum, s) => {
                                        const emp = getEmployeeById(s.employee_id);
                                        const hours = calculateHours(s.start_time, s.end_time);
                                        return sum + (hours * (emp?.hourly_rate || 0));
                                    }, 0))}
                                </p>
                            </div>
                        </div>

                        {/* Schedule Grid */}
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                <div className="grid grid-cols-8 border border-slate-800 rounded-xl overflow-hidden">
                                    {/* Header */}
                                    <div className="p-3 bg-slate-900 font-bold text-sm border-r border-slate-800">Staff</div>
                                    {eachDayOfInterval({ start: startDate, end: endDate }).slice(0, 7).map(day => (
                                        <div key={day.toISOString()} className="p-3 bg-slate-900 text-center border-r border-slate-800 last:border-r-0">
                                            <p className="text-xs text-slate-500 uppercase">{format(day, "EEE")}</p>
                                            <p className="font-bold">{format(day, "MMM d")}</p>
                                        </div>
                                    ))}

                                    {/* Rows */}
                                    {Array.from(new Set(generatedShifts.map(s => s.employee_id))).map(empId => {
                                        const emp = getEmployeeById(empId);
                                        if (!emp) return null;

                                        return (
                                            <div key={empId} className="contents">
                                                <div className="p-3 border-t border-r border-slate-800 bg-slate-900/50">
                                                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">{emp.role}</p>
                                                </div>
                                                {eachDayOfInterval({ start: startDate, end: endDate }).slice(0, 7).map(day => {
                                                    const dateStr = format(day, "yyyy-MM-dd");
                                                    const dayShifts = generatedShifts.filter(
                                                        s => s.employee_id === empId && s.date === dateStr
                                                    );

                                                    return (
                                                        <div key={dateStr} className="p-2 border-t border-r border-slate-800 last:border-r-0 min-h-[80px]">
                                                            {dayShifts.map((shift, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={cn(
                                                                        "p-2 rounded-lg text-xs mb-1",
                                                                        shift.warning
                                                                            ? "bg-yellow-500/10 border border-yellow-500/30"
                                                                            : "bg-blue-500/10 border border-blue-500/30"
                                                                    )}
                                                                >
                                                                    <p className="font-bold">
                                                                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                                                    </p>
                                                                    <p className="text-slate-400 capitalize">{shift.role}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {status !== "idle" && (
                            <div className={cn(
                                "p-4 rounded-xl flex items-center gap-3",
                                status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            )}>
                                {status === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                {message}
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setCurrentStep(2)}
                                className="btn btn-secondary gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back to Edit
                            </button>
                            <button
                                onClick={handlePublishSchedule}
                                disabled={saving || generatedShifts.length === 0}
                                className="btn btn-primary gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Publish Schedule
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Modal */}
            <Modal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                title={editingTemplate ? "Edit Template" : "New Staffing Template"}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="label">Template Name</label>
                        <input
                            type="text"
                            className="input"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="e.g., Weekday, Weekend, Holiday"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="label">Description (optional)</label>
                        <textarea
                            className="input min-h-[80px]"
                            value={newTemplateDesc}
                            onChange={(e) => setNewTemplateDesc(e.target.value)}
                            placeholder="Describe when to use this template..."
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsTemplateModalOpen(false)}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveTemplate}
                            disabled={saving || !newTemplateName.trim()}
                            className="btn btn-primary flex-1 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Rule Modal */}
            <Modal
                isOpen={isRuleModalOpen}
                onClose={() => setIsRuleModalOpen(false)}
                title={editingRule?.id ? "Edit Staffing Rule" : "Add Staffing Rule"}
            >
                {editingRule && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="label">Role</label>
                            <select
                                className="input"
                                value={editingRule.role}
                                onChange={(e) => setEditingRule({ ...editingRule, role: e.target.value })}
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="label">Start Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={editingRule.start_time}
                                    onChange={(e) => setEditingRule({ ...editingRule, start_time: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="label">End Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={editingRule.end_time}
                                    onChange={(e) => setEditingRule({ ...editingRule, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="label">Minimum Staff Needed</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                value={editingRule.min_staff}
                                onChange={(e) => setEditingRule({ ...editingRule, min_staff: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="label">Applies To</label>
                            <div className="flex flex-wrap gap-2">
                                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => {
                                    const isSelected = editingRule.days_of_week?.includes(idx);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                const current = editingRule.days_of_week || [];
                                                const next = isSelected
                                                    ? current.filter(d => d !== idx)
                                                    : [...current, idx].sort((a, b) => a - b);
                                                setEditingRule({ ...editingRule, days_of_week: next });
                                            }}
                                            className={cn(
                                                "w-10 h-10 rounded-lg font-bold transition-all",
                                                isSelected
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                                            )}
                                            title={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx]}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => {
                                        const all = [0, 1, 2, 3, 4, 5, 6];
                                        const isAll = editingRule.days_of_week?.length === 7;
                                        setEditingRule({ ...editingRule, days_of_week: isAll ? [] : all });
                                    }}
                                    className="px-3 h-10 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700"
                                >
                                    {editingRule.days_of_week?.length === 7 ? "None" : "All"}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsRuleModalOpen(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRule}
                                disabled={saving}
                                className="btn btn-primary flex-1 gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Rule
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
