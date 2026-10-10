// Built-in stroke icons on a 24x24 grid, drawn for social-kit. Round caps and joins, no fills,
// so they read well at any size and take the colour of the surrounding text.
export const ICONS = {
  trophy:
    '<path d="M7 3.5h10V9a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5V7A3.5 3.5 0 0 0 7.6 10.5"/><path d="M17 5.5h2.5V7a3.5 3.5 0 0 1-3.1 3.5"/><path d="M12 14v3.5"/><path d="M8.5 20.5c0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3z"/>',
  quote:
    '<rect x="4" y="6" width="6" height="6" rx="1.2"/><path d="M10 11v1c0 3-1.6 5.2-4.8 6"/><rect x="14" y="6" width="6" height="6" rx="1.2"/><path d="M20 11v1c0 3-1.6 5.2-4.8 6"/>',
  zap: '<path d="M13.5 2.5 5 13.5h6.2l-1 8 8.8-11.2h-6.3z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 6.8 8.2 6.2 8.2-6.2"/>',
  star: '<path d="M12 3.4l2.47 5.8 6.28.56-4.76 4.14 1.42 6.14L12 16.8l-5.41 3.24 1.42-6.14-4.76-4.14 6.28-.56z"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8 14.5h.01M12 14.5h.01M16 14.5h.01"/>',
  chart:
    '<path d="M3.5 20.5h17"/><rect x="5.5" y="12.5" width="3" height="5" rx="1"/><rect x="10.5" y="8.5" width="3" height="9" rx="1"/><rect x="15.5" y="4.5" width="3" height="13" rx="1"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  chat: '<path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5v-8A2.5 2.5 0 0 1 6.5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  gift:
    '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/><path d="M12 8v12.5"/><path d="M12 8C10.8 5 7 4.2 7 6.3 7 7.6 9.4 8 12 8z"/><path d="M12 8c1.2-3 5-3.8 5-1.7C17 7.6 14.6 8 12 8z"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.6v6.8l5.6-3.4z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  heart: '<path d="M12 19.5C7 16 3.5 13 3.5 9.25A4.25 4.25 0 0 1 12 7.5a4.25 4.25 0 0 1 8.5 1.75C20.5 13 17 16 12 19.5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="m8.5 7 1.5-2.5h4L15.5 7"/><circle cx="12" cy="13.5" r="3.5"/>',
  bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
  home: '<path d="m3.5 11 8.5-7.5 8.5 7.5"/><path d="M6 9v11.5h12V9"/><path d="M10 20.5v-5h4v5"/>',
};

export const iconNames = Object.keys(ICONS);

export function icon(name, size, color, strokeWidth = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
