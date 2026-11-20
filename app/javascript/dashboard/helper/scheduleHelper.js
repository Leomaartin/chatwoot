import { format, isToday, isTomorrow, parseISO, isValid } from 'date-fns';

export const formatScheduledTime = value => {
  if (!value) return '';
  try {
    let date;
    if (typeof value === 'number') {
      date = new Date(value * 1000);
    } else if (typeof value === 'string') {
      date = parseISO(value);
      if (!isValid(date)) {
        date = new Date(value);
      }
    } else if (value instanceof Date) {
      date = value;
    }
    if (!date || !isValid(date)) {
      return String(value);
    }
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm')}`;
    }
    if (isTomorrow(date)) {
      return `Mañana, ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return String(value);
  }
};
