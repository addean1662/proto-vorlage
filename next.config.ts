import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Exclude build-time-only data files from serverless function bundles.
    // These are only used by scripts/ at build time — not at runtime.
    outputFileTracingExcludes: {
      '*': [
        // Lewis & Short Latin dictionary — used by build-vulgate.mjs only
        'data/vulgate/ls_*.json',
        // Duplicate sample files
        'data/vulgate/ls_C_sample.json',
        'data/vulgate/ls_D_sample.json',
        // Vulgate build data
        'data/vulgate/ADDONS.LAT',
        'data/vulgate/DICTLINE.GEN',
        'data/vulgate/dir.json',
        // LXX source/build files
        'data/lxx/*.csv',
        'data/lxx/*.txt',
        'data/lxx/dir.json',
        // OSHB source XML — pre-built JSON is what runs
        'data/oshb/*.xml',
        // DSS coverage — used by build-dss.mjs only
        'lib/*_dss_coverage.json',
        // Build scripts
        'scripts/**',
      ],
    },
  },
};

export default nextConfig;
