const DEVICE_PRESETS = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, dpr: 2, category: 'iPhone' },
  { id: 'iphone-mini', name: 'iPhone 12/13 Mini', width: 360, height: 780, dpr: 3, category: 'iPhone' },
  { id: 'iphone-12', name: 'iPhone 12/13/14', width: 390, height: 844, dpr: 3, category: 'iPhone' },
  { id: 'iphone-12-pro-max', name: 'iPhone 12/13/14 Pro Max', width: 428, height: 926, dpr: 3, category: 'iPhone' },
  { id: 'iphone-14-plus', name: 'iPhone 14 Plus', width: 428, height: 926, dpr: 3, category: 'iPhone' },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852, dpr: 3, category: 'iPhone' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, dpr: 3, category: 'iPhone' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, dpr: 3, category: 'iPhone' },
  { id: 'iphone-15-plus', name: 'iPhone 15 Plus', width: 430, height: 932, dpr: 3, category: 'iPhone' },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852, dpr: 3, category: 'iPhone' },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932, dpr: 3, category: 'iPhone' },
  { id: 'iphone-se-3', name: 'iPhone SE (3rd gen)', width: 375, height: 667, dpr: 2, category: 'iPhone' },

  { id: 'pixel-5', name: 'Pixel 5', width: 412, height: 915, dpr: 2.625, category: 'Android' },
  { id: 'pixel-6', name: 'Pixel 6', width: 412, height: 915, dpr: 2.625, category: 'Android' },
  { id: 'pixel-6-pro', name: 'Pixel 6 Pro', width: 412, height: 915, dpr: 3.5, category: 'Android' },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, dpr: 2.625, category: 'Android' },
  { id: 'pixel-7-pro', name: 'Pixel 7 Pro', width: 412, height: 915, dpr: 3.5, category: 'Android' },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, dpr: 2.625, category: 'Android' },
  { id: 'pixel-8-pro', name: 'Pixel 8 Pro', width: 428, height: 926, dpr: 3.5, category: 'Android' },

  { id: 'galaxy-s21', name: 'Galaxy S21', width: 360, height: 800, dpr: 2.625, category: 'Samsung' },
  { id: 'galaxy-s22', name: 'Galaxy S22', width: 360, height: 780, dpr: 3, category: 'Samsung' },
  { id: 'galaxy-s23', name: 'Galaxy S23', width: 360, height: 780, dpr: 3, category: 'Samsung' },
  { id: 'galaxy-s23-ultra', name: 'Galaxy S23 Ultra', width: 384, height: 854, dpr: 3, category: 'Samsung' },
  { id: 'galaxy-s24', name: 'Galaxy S24', width: 360, height: 780, dpr: 3, category: 'Samsung' },
  { id: 'galaxy-s24-ultra', name: 'Galaxy S24 Ultra', width: 384, height: 854, dpr: 3.25, category: 'Samsung' },
  { id: 'galaxy-tab-s8', name: 'Galaxy Tab S8', width: 800, height: 1280, dpr: 2, category: 'Samsung' },
  { id: 'galaxy-tab-s8-ultra', name: 'Galaxy Tab S8 Ultra', width: 900, height: 1280, dpr: 2.5, category: 'Samsung' },

  { id: 'ipad-mini', name: 'iPad Mini (6th gen)', width: 768, height: 1024, dpr: 2, category: 'iPad' },
  { id: 'ipad-air', name: 'iPad Air (5th gen)', width: 820, height: 1180, dpr: 2, category: 'iPad' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, dpr: 2, category: 'iPad' },
  { id: 'ipad-pro-12', name: 'iPad Pro 12.9"', width: 1024, height: 1366, dpr: 2, category: 'iPad' },
  { id: 'ipad-10', name: 'iPad (10th gen)', width: 820, height: 1180, dpr: 2, category: 'iPad' },

  { id: 'laptop-720p', name: 'Laptop 720p', width: 1280, height: 720, dpr: 1, category: 'Desktop' },
  { id: 'laptop-1080p', name: 'Laptop 1080p', width: 1920, height: 1080, dpr: 1, category: 'Desktop' },
  { id: 'laptop-1440p', name: 'Laptop 1440p', width: 2560, height: 1440, dpr: 1, category: 'Desktop' },
  { id: 'desktop-1080p', name: 'Desktop 1080p', width: 1920, height: 1080, dpr: 1, category: 'Desktop' },
  { id: 'desktop-1440p', name: 'Desktop 1440p', width: 2560, height: 1440, dpr: 1, category: 'Desktop' },
  { id: 'desktop-4k', name: 'Desktop 4K', width: 3840, height: 2160, dpr: 1, category: 'Desktop' },

  { id: 'responsive-sm', name: 'Responsive SM (< 640px)', width: 375, height: 667, dpr: 1, category: 'Breakpoint' },
  { id: 'responsive-md', name: 'Responsive MD (640-768px)', width: 768, height: 1024, dpr: 1, category: 'Breakpoint' },
  { id: 'responsive-lg', name: 'Responsive LG (768-1024px)', width: 1024, height: 768, dpr: 1, category: 'Breakpoint' },
  { id: 'responsive-xl', name: 'Responsive XL (1024-1280px)', width: 1280, height: 800, dpr: 1, category: 'Breakpoint' },
  { id: 'responsive-2xl', name: 'Responsive 2XL (> 1280px)', width: 1536, height: 864, dpr: 1, category: 'Breakpoint' }
];

const BREAKPOINTS = [
  { name: 'sm', minWidth: 0, maxWidth: 639, label: 'SM' },
  { name: 'md', minWidth: 640, maxWidth: 767, label: 'MD' },
  { name: 'lg', minWidth: 768, maxWidth: 1023, label: 'LG' },
  { name: 'xl', minWidth: 1024, maxWidth: 1279, label: 'XL' },
  { name: '2xl', minWidth: 1280, maxWidth: Infinity, label: '2XL' }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEVICE_PRESETS, BREAKPOINTS };
}
