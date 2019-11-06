export function formatDate(date: Date): string {
    return `${ date.getFullYear() }-${ (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) }-${ (date.getDate() < 10 ? '0' : '') + date.getDate() }`;
}

export function getMonthAndDay(date: Date): string {
    return `${ (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) }-${ (date.getDate() < 10 ? '0' : '') + date.getDate() }`;
}

export function isDateBetween(date: Date, from: Date, to: Date): boolean {
    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}
