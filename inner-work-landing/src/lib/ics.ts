import { berlinLocalToUtc } from './berlin-time';
import type { OpenGroupSession } from '../data/sessions';

function formatIcsUtc(date: Date): string {
	return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function foldLine(line: string): string {
	// RFC 5545 requires lines to be folded at 75 octets.
	if (line.length <= 75) return line;
	let folded = '';
	let rest = line;
	while (rest.length > 75) {
		folded += rest.slice(0, 75) + '\r\n ';
		rest = rest.slice(75);
	}
	return folded + rest;
}

export function buildSessionIcs(session: OpenGroupSession, uid: string, zoomLink: string): string {
	const start = berlinLocalToUtc(session.date, session.time);
	const end = new Date(start.getTime() + session.durationMinutes * 60_000);
	const now = new Date();

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Learning group for inner work//Open group//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${uid}@inner-work-landing`,
		`DTSTAMP:${formatIcsUtc(now)}`,
		`DTSTART:${formatIcsUtc(start)}`,
		`DTEND:${formatIcsUtc(end)}`,
		'SUMMARY:Inner work — open group session',
		`DESCRIPTION:Join link: ${zoomLink}`,
		`LOCATION:${zoomLink}`,
		'STATUS:CONFIRMED',
		'SEQUENCE:0',
		'END:VEVENT',
		'END:VCALENDAR',
	];

	return lines.map(foldLine).join('\r\n');
}

export function buildGoogleCalendarLink(session: OpenGroupSession, zoomLink: string): string {
	const start = berlinLocalToUtc(session.date, session.time);
	const end = new Date(start.getTime() + session.durationMinutes * 60_000);
	const dates = `${formatIcsUtc(start)}/${formatIcsUtc(end)}`;

	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: 'Inner work — open group session',
		dates,
		details: `Join link: ${zoomLink}`,
		location: zoomLink,
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
