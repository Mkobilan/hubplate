import { startOfISOWeek, parseISO } from 'date-fns';

export interface PayrollCalculation {
    regularHours: number;
    otHours: number;
    grossRegularPay: number;
    grossOTPay: number;
    totalTips: number;
    totalGross: number;
}

/**
 * Calculates payroll for a specific employee over a date range.
 * Applies weekly overtime rules (hours > 40 in a Monday-Sunday window).
 */
export async function calculateEmployeePayroll(
    supabase: any,
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<PayrollCalculation> {
    // 1. Fetch time entries (must be clocked out)
    const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out, total_hours, hourly_rate')
        .eq('employee_id', employeeId)
        .gte('clock_in', `${startDate}T00:00:00`)
        .lte('clock_in', `${endDate}T23:59:59`)
        .not('clock_out', 'is', null);

    if (entriesError) throw entriesError;

    // 2. Fetch tips from paid orders
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('tip')
        .eq('server_id', employeeId)
        .eq('payment_status', 'paid')
        .gte('paid_at', `${startDate}T00:00:00`)
        .lte('paid_at', `${endDate}T23:59:59`);

    if (ordersError) {
        console.error("Error fetching tips:", ordersError);
    }

    const tipsData = orders || [];
    const totalTips = tipsData.reduce((sum: number, o: any) => sum + (Number(o.tip) || 0), 0);

    // 3. Calculate Hours (Weekly OT Logic)
    // Group entries by ISO week (Monday-Sunday)
    const weeks: Record<string, any[]> = {};
    (entries || []).forEach((entry: any) => {
        const weekStart = startOfISOWeek(parseISO(entry.clock_in)).toISOString();
        if (!weeks[weekStart]) weeks[weekStart] = [];
        weeks[weekStart].push(entry);
    });

    // Sort entries within each week by clock_in to process chronologically
    Object.keys(weeks).forEach(key => {
        weeks[key].sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
    });

    let regularHours = 0;
    let otHours = 0;
    let grossRegularPay = 0;
    let grossOTPay = 0;

    Object.values(weeks).forEach(weekEntries => {
        let weekAccumulatedHours = 0;

        weekEntries.forEach(entry => {
            const hours = Number(entry.total_hours) || 0;
            const rate = Number(entry.hourly_rate) || 0;

            if (weekAccumulatedHours >= 40) {
                // Entire shift is OT
                otHours += hours;
                grossOTPay += hours * (rate * 1.5);
            } else if (weekAccumulatedHours + hours > 40) {
                // Shift crosses the 40h threshold
                const reg = 40 - weekAccumulatedHours;
                const ot = hours - reg;
                regularHours += reg;
                otHours += ot;
                grossRegularPay += reg * rate;
                grossOTPay += ot * (rate * 1.5);
            } else {
                // Entire shift is regular
                regularHours += hours;
                grossRegularPay += hours * rate;
            }
            weekAccumulatedHours += hours;
        });
    });

    return {
        regularHours: Number(regularHours.toFixed(2)),
        otHours: Number(otHours.toFixed(2)),
        grossRegularPay: Number(grossRegularPay.toFixed(2)),
        grossOTPay: Number(grossOTPay.toFixed(2)),
        totalTips: Number(totalTips.toFixed(2)),
        totalGross: Number((grossRegularPay + grossOTPay + totalTips).toFixed(2))
    };
}
