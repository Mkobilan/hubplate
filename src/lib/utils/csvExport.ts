/**
 * CSV Export Utilities for Analytics Reports
 */

interface ExportOptions {
    filename: string;
    headers: string[];
    rows: (string | number)[][];
}

/**
 * Generate and download a CSV file
 */
export async function downloadCSV({ filename, headers, rows }: ExportOptions) {
    // Escape values that contain commas, quotes, or newlines
    const escapeValue = (value: string | number): string => {
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Build CSV content
    const headerRow = headers.map(escapeValue).join(',');
    const dataRows = rows.map(row => row.map(escapeValue).join(',')).join('\n');
    const csvContent = `${headerRow}\n${dataRows}`;

    // Try File System Access API first (supported in Chrome/Edge)
    // This opens the native "Save As" dialog allowing user to choose folder and name
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: `${filename}.csv`,
                types: [{
                    description: 'CSV File',
                    accept: { 'text/csv': ['.csv'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(csvContent);
            await writable.close();
            return;
        } catch (err) {
            // If user cancels, we just stop. If other error, we fall back.
            if ((err as Error).name === 'AbortError') return;
            console.error('File Picker error, falling back:', err);
        }
    }

    // Fallback to traditional download (auto-download)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


/**
 * Format date for CSV filename
 */
export function formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Export Sales Data to CSV
 */
export function exportSalesCSV(
    orders: {
        id: string;
        created_at: string;
        order_type: string;
        status: string;
        subtotal: number;
        tax: number;
        tip: number;
        total: number;
        payment_status: string;
        payment_method?: string;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `sales_report_${dateRange.start}_to_${dateRange.end}`;
    const headers = ['Order ID', 'Date', 'Type', 'Status', 'Subtotal', 'Tax', 'Tip', 'Total', 'Payment Status', 'Payment Method'];
    const rows = orders.map(order => [
        order.id,
        new Date(order.created_at).toLocaleString(),
        order.order_type || 'N/A',
        order.status,
        (Number(order.subtotal) || 0).toFixed(2),
        (Number(order.tax) || 0).toFixed(2),
        (Number(order.tip) || 0).toFixed(2),
        (Number(order.total) || 0).toFixed(2),
        order.payment_status || 'unpaid',
        order.payment_method || 'N/A'
    ]);


    downloadCSV({ filename, headers, rows });
}

/**
 * Export Labor Hours to CSV
 */
export function exportLaborCSV(
    entries: {
        employee_name: string;
        role: string;
        clock_in: string;
        clock_out: string | null;
        total_hours: number | null;
        hourly_rate: number | null;
        total_pay: number | null;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `labor_report_${dateRange.start}_to_${dateRange.end}`;
    const headers = ['Employee', 'Role', 'Clock In', 'Clock Out', 'Hours Worked', 'Hourly Rate', 'Total Pay'];
    const rows = entries.map(entry => [
        entry.employee_name,
        entry.role,
        new Date(entry.clock_in).toLocaleString(),
        entry.clock_out ? new Date(entry.clock_out).toLocaleString() : 'Still Clocked In',
        entry.total_hours?.toFixed(2) || '0.00',
        entry.hourly_rate?.toFixed(2) || '0.00',
        entry.total_pay?.toFixed(2) || '0.00'
    ]);

    downloadCSV({ filename, headers, rows });
}

/**
 * Export Inventory to CSV
 */
export function exportInventoryCSV(
    items: {
        name: string;
        category: string | null;
        stock_quantity: number;
        par_level: number | null;
        unit: string;
        cost_per_unit: number | null;
        supplier: string | null;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `inventory_report_${dateRange.start}_to_${dateRange.end}`;
    const headers = ['Item Name', 'Category', 'Stock Quantity', 'Par Level', 'Unit', 'Cost Per Unit', 'Supplier', 'Total Value'];
    const rows = items.map(item => [
        item.name,
        item.category || 'Uncategorized',
        item.stock_quantity?.toString() || '0',
        item.par_level?.toString() || 'N/A',
        item.unit,
        item.cost_per_unit?.toFixed(2) || '0.00',
        item.supplier || 'N/A',
        ((item.stock_quantity || 0) * (item.cost_per_unit || 0)).toFixed(2)
    ]);

    downloadCSV({ filename, headers, rows });
}

/**
 * Export Customer Feedback to CSV
 */
export function exportFeedbackCSV(
    feedback: {
        id: string;
        created_at: string;
        customer_name: string | null;
        rating: number;
        comment: string | null;
        source: string | null;
        sentiment: string | null;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `feedback_report_${dateRange.start}_to_${dateRange.end}`;
    // Header changed from "ID" to "Feedback ID" to avoid Excel SYLK file error
    const headers = ['Feedback ID', 'Date', 'Customer', 'Rating', 'Comment', 'Source', 'Sentiment'];
    const rows = feedback.map(fb => [
        fb.id,
        new Date(fb.created_at).toLocaleString(),
        fb.customer_name || 'Anonymous',
        fb.rating.toString(),
        fb.comment || '',
        fb.source || 'N/A',
        fb.sentiment || 'N/A'
    ]);

    downloadCSV({ filename, headers, rows });
}


/**
 * Export Menu Performance to CSV
 */
export function exportMenuPerformanceCSV(
    items: {
        name: string;
        category: string | null;
        quantity_sold: number;
        revenue: number;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `menu_performance_${dateRange.start}_to_${dateRange.end}`;
    const headers = ['Item Name', 'Category', 'Quantity Sold', 'Revenue'];
    const rows = items.map(item => [
        item.name,
        item.category || 'Uncategorized',
        item.quantity_sold.toString(),
        item.revenue.toFixed(2)
    ]);

    downloadCSV({ filename, headers, rows });
}

/**
 * Export Kitchen Performance Data to CSV
 */
export function exportKitchenPerformanceCSV(
    data: {
        item_name: string;
        prep_time: number;
        window_time: number;
        total_time: number;
    }[],
    dateRange: { start: string; end: string }
) {
    const filename = `kitchen_performance_${dateRange.start}_to_${dateRange.end}`;
    const headers = ['Item Name', 'Avg Prep Time (min)', 'Avg Window Time (min)', 'Avg Total Time (min)'];
    const rows = data.map(item => [
        item.item_name,
        item.prep_time.toFixed(1),
        item.window_time.toFixed(1),
        item.total_time.toFixed(1)
    ]);

    downloadCSV({ filename, headers, rows });
}
