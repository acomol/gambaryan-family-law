export const viewports = [
  { width: 360, height: 640 }, { width: 390, height: 844 },
  { width: 768, height: 1024 }, { width: 861, height: 800 },
  { width: 900, height: 800 }, { width: 960, height: 800 },
  { width: 1024, height: 768 }, { width: 1280, height: 800 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];
export const heroViewports = [{ width: 360, height: 600 }, { width: 390, height: 740 }];
export const allViewports = [...viewports, ...heroViewports];
export const sizeName = ({ width, height }: { width: number; height: number }) => `${width}x${height}`;
