export function formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1)}-${(date.getDate() < 10 ? '0' : '') + date.getDate()}`;
}

// Parses yyyy-MM-dd as local midnight; new Date('yyyy-MM-dd') would be UTC midnight
export function parseDate(date: string): Date {
    const [year, month, day] = date.split('-').map((part) => parseInt(part, 10));
    return new Date(year, month - 1, day);
}

export function getMonthAndDay(date: Date): string {
    return `${(date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1)}-${(date.getDate() < 10 ? '0' : '') + date.getDate()}`;
}

export function isDateBetween(date: Date, from: Date, to?: Date): boolean {
    if (!to) {
        to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
    }
    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}
