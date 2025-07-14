import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
// import withRspack from "next-rspack";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// export default withRspack(withNextIntl(nextConfig));
export default withNextIntl(nextConfig);
